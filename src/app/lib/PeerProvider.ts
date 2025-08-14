import { DataConnection, Peer } from "peerjs";
import {
  BoardMemberData,
  ConnectionDataWrapped,
  DataMessage,
  PeerProviderEvent,
  TaskData,
} from "./types";
import { isDataMessage } from "./utils";

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

  constructor(id: string, name: string) {
    this.peer = new Peer(id);
    this.peer.on("open", () => {
      this.setData({
        peerData: { id },
        tasks: [],
        connections: new Map(),
        lobbyName: name,
      });
    });
    this.peer.on("connection", (conn: DataConnection) => {
      this.addConnections([conn]);
    });
  }
  removeConnections(ids: string[]) {
    const isDiff = ids.some((id) => this.data?.connections.has(id));
    if (isDiff) {
      for (const id of ids) {
        this.data?.connections.delete(id);
      }
      this.emit("updatedData");
    }
  }
  addConnections(connections: DataConnection[]) {
    const newConnections = connections.filter(
      (item) => !this.data?.connections.has(item.peer)
    );
    if (newConnections.length) {
      for (const connection of newConnections) {
        const id = connection.peer;
        connection.on("close", () => {
          this.removeConnections([id]);
        });
        connection.on("data", (data) => {
          if (isDataMessage(data)) {
            switch (data.type) {
              case "LOBBY_UPDATED":
                const newPeers = data.payload.membersData.filter(
                  (item) =>
                    this.data?.connections.has(item.id) &&
                    item.id !== this.data.peerData.id
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
                connectionData!.lastHeartbeat = Date.now();
                break;
            }
          }
        });
      }
      this.broadcastMessage({
        type: "LOBBY_UPDATED",
        payload: {
          name: this.data!.lobbyName,
          membersData: Array.from(this.data!.connections).map(
            ([, item]) => item.memberData
          ),
        },
      });

      this.emit("updatedData");
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
