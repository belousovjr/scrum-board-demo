import { DataConnection, Peer } from "peerjs";
import {
  BoardData,
  BoardMemberData,
  ConnectionDataWrapped,
  DataMessage,
  PeerProviderEvent,
  TaskData,
} from "./types";
import {
  checkHeartbeatMs,
  isDataMessage,
  lifeTimeMs,
  reInitHeartbeatMs,
  waitUntilConnectionsOpen,
} from "./utils";

export interface PeerProviderData {
  tasks: TaskData[];
  peerData: BoardMemberData;
  connections: Map<string, ConnectionDataWrapped>;
  lobbyName: string;
}

export default class PeerProvider {
  peer: Peer;
  data: PeerProviderData | null = null;
  callbacks: { [key in PeerProviderEvent]?: (() => void)[] } = {};
  heartbeatInterval: NodeJS.Timeout | undefined;
  membersCheckInterval: NodeJS.Timeout | undefined;

  constructor(boardData: BoardData) {
    this.peer = new Peer(boardData.peerId);
    this.peer.on("error", (e: unknown) => {
      console.log("PEER ERROR", e);
      alert(e);
    });
    this.peer.on("open", () => {
      this.setData({
        peerData: { id: boardData.peerId },
        tasks: [],
        connections: new Map(),
        lobbyName: boardData.name,
      });

      if (boardData.peers.length) {
        const defaultConnections = boardData.peers.map((peer) =>
          this.peer.connect(peer)
        );
        this.addConnections(defaultConnections);
      }

      this.heartbeatInterval = setInterval(() => {
        this.broadcastMessage({ type: "HEARTBEAT" });
      }, reInitHeartbeatMs);

      this.membersCheckInterval = setInterval(() => {
        const nowMs = Date.now();
        const deadConnectionsIds = [...this.data!.connections.values()]
          .filter((connData) => nowMs - connData.lastHeartbeat >= lifeTimeMs)
          .map((item) => item.memberData.id);
        this.removeConnections(deadConnectionsIds);
      }, checkHeartbeatMs);
    });

    this.peer.on("connection", (connection: DataConnection) => {
      this.addConnections([connection]);
    });
  }
  removeConnections(ids: string[]) {
    const isDiff = ids.some((id) => this.data?.connections.has(id));
    if (isDiff) {
      const newConnections = new Map(this.data!.connections);
      for (const id of ids) {
        newConnections.delete(id);
      }
      this.setData({ ...this.data!, connections: newConnections });
    }
  }
  async addConnections(connections: DataConnection[]) {
    const notOpenConnections = connections.filter((item) => !item.open);

    if (notOpenConnections.length) {
      await waitUntilConnectionsOpen(notOpenConnections);
    }

    const newConnections = connections.filter(
      (item) => !this.data?.connections.has(item.peer)
    );
    if (newConnections.length) {
      const updatedConnections = new Map(this.data!.connections);
      for (const connection of newConnections) {
        const id = connection.peer;
        connection.on("close", () => {
          this.removeConnections([id]);
        });
        connection.on("error", (e: unknown) => {
          console.log("CONN ERROR", e, connection.open);
          this.removeConnections([id]);
        });
        connection.on("data", (data) => {
          if (isDataMessage(data)) {
            switch (data.type) {
              case "LOBBY_UPDATED":
                const newPeers = data.payload.membersData.filter(
                  (item) =>
                    !this.data?.connections.has(item.id) &&
                    item.id !== this.data?.peerData.id
                );
                if (newPeers.length) {
                  const newConns = newPeers.map((item) =>
                    this.peer.connect(item.id)
                  );
                  this.addConnections(newConns);
                }
                break;
              case "HEARTBEAT":
                const connectionData = this.data?.connections.get(id);
                if (connectionData) {
                  connectionData.lastHeartbeat = Date.now();
                }
                break;
            }
          }
        });
        updatedConnections.set(id, {
          connection,
          memberData: { id },
          lastHeartbeat: Date.now(),
        });
      }
      this.setData({ ...this.data!, connections: updatedConnections });
      this.broadcastMessage({
        type: "LOBBY_UPDATED",
        payload: {
          name: this.data!.lobbyName,
          membersData: [...this.data!.connections.values()].map(
            (item) => item.memberData
          ),
        },
      });
    }
  }
  broadcastMessage(message: DataMessage) {
    for (const [id] of this.data!.connections) {
      this.sendMessage(id, message);
    }
  }
  sendMessage(peerId: string, message: DataMessage) {
    const connectionData = this.data!.connections.get(peerId)!;
    connectionData.connection.send(message);
  }
  setData(data: PeerProviderData | null) {
    this.data = data;
    this.emit("updatedData");
  }
  destroy() {
    this.peer.disconnect();
    this.peer.destroy();
    clearInterval(this.heartbeatInterval);
    clearInterval(this.membersCheckInterval);
    this.setData(null);
  }
  on(event: PeerProviderEvent, callback: () => void) {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event]!.push(callback);
  }
  emit(event: PeerProviderEvent) {
    if (this.callbacks[event]?.length) {
      for (const callback of this.callbacks[event]) {
        callback();
      }
    }
  }
}
