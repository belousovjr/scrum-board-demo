import { DataConnection, Peer } from "peerjs";
import { v4 as uuidv4 } from "uuid";
import {
  BoardData,
  DataMessage,
  PeerProviderData,
  PeerProviderDataUpdate,
  PeerProviderEvent,
  RequestedUpdate,
  TaskData,
  TasksSnapshot,
  WithId,
} from "./types";
import {
  filterOpenableConnections,
  getSnapshotData,
  isDataMessage,
  snackbar,
} from "./utils";
import { checkHeartbeatMs, lifeTimeMs, reInitHeartbeatMs } from "./constants";

export default class PeerProvider {
  peer: Peer;
  data: PeerProviderData | null = null;
  callbacks: { [key in PeerProviderEvent]?: (() => void)[] } = {};
  heartbeatInterval: NodeJS.Timeout | undefined;
  membersCheckInterval: NodeJS.Timeout | undefined;
  requestedUpdate: RequestedUpdate | undefined;

  constructor(boardData: BoardData, tasksSnapshot: TasksSnapshot) {
    this.peer = new Peer(boardData.peerId);

    this.peer.on("open", () => {
      this.setData({
        peerId: boardData.peerId,
        peerName: boardData.peerName,
        tasksSnapshot,
        lobbyName: boardData.name,
        connections: new Map(),
        memberNames: new Map(boardData.memberNames),
      });

      if (boardData.peers.length) {
        this.addConnections(
          boardData.peers.map((peer) => this.peer.connect(peer))
        );
      }

      this.heartbeatInterval = setInterval(() => {
        const { id, timestamp, ids } = this.data!.tasksSnapshot;
        this.broadcastMessage({
          type: "HEARTBEAT",
          payload: { id, timestamp, ids },
        });
      }, reInitHeartbeatMs);

      this.membersCheckInterval = setInterval(() => {
        const nowMs = Date.now();
        const deadConnectionsIds = [...this.data!.connections.values()]
          .filter((connData) => nowMs - connData.lastHeartbeat >= lifeTimeMs)
          .map((item) => item.memberData.id);
        this.removeConnections(deadConnectionsIds);
      }, checkHeartbeatMs);

      this.peer.on("connection", (connection: DataConnection) =>
        this.addConnections([connection])
      );
    });

    this.peer.on("error", (e) => {
      const { type, message } = e as { type: string; message: string };
      snackbar({ text: message, variant: "error" });
      if (type === "unavailable-id" && message.includes("is taken")) {
        this.emit("failedTab");
      }
    });
  }

  get isDataConsensus() {
    if (!this.data) return false;
    const connIds = [...this.data.connections.values()].map(
      (item) => item.memberData.snapshotData?.id
    );
    return connIds.every((id) => id && id === this.data!.tasksSnapshot.id);
  }
  requestUpdate(newList: WithId<TaskData>[], ids: string[]) {
    if (this.requestedUpdate) throw Error("Requested update already exists");

    const newSnapshot: TasksSnapshot = {
      id: uuidv4(),
      timestamp: Date.now(),
      ids,
      tasks: newList,
    };

    let result = Promise.resolve();
    if (this.data?.connections.size) {
      result = new Promise((resolve, reject) => {
        this.requestedUpdate = {
          snapshot: newSnapshot,
          resolve,
          reject,
        };
      });
    }

    this.setData({ tasksSnapshot: newSnapshot });
    this.broadcastMessage({
      type: "DATA_SNAPSHOT",
      payload: newSnapshot,
    });
    return result;
  }
  removeConnections(ids: string[]) {
    if (!ids.length || !this.data) return;
    const { connections } = this.data;
    let updated = false;
    for (const id of ids) {
      if (connections.delete(id)) {
        updated = true;
      }
    }
    if (updated)
      this.setData({
        connections: new Map(connections),
      });
  }
  async addConnections(connections: DataConnection[]) {
    const newConns = await filterOpenableConnections(
      connections.filter((item) => !this.data?.connections.has(item.peer)),
      this.peer
    );

    if (!newConns.length || !this.data) {
      if (!this.data?.connections.size && this.data?.lobbyName === null) {
        //connect by inv failed
        this.emit("failedConnection");
      }
      return;
    }

    const { connections: updatedConns, memberNames } = this.data;

    for (const conn of newConns) {
      const id = conn.peer;
      conn.on("close", () => this.removeConnections([id]));
      conn.on("data", (data) => {
        if (!isDataMessage(data) || !this.data) return;
        const connData = this.data.connections.get(id);
        switch (data.type) {
          case "NAMES_UPDATED":
            const updatedNames: [string, string][] = [];
            for (const [memberId, memberName] of data.payload) {
              if (
                memberId !== this.data.peerId &&
                this.data.memberNames.get(memberId) !== memberName
              ) {
                updatedNames.push([memberId, memberName]);
                memberNames.set(memberId, memberName);
              }
            }
            if (updatedNames.length) {
              this.setData({ memberNames: new Map(memberNames) });
              this.broadcastMessage({
                type: "NAMES_UPDATED",
                payload: [
                  [this.data.peerId, this.data.peerName],
                  ...memberNames,
                ],
              });
            }
            break;
          case "LOBBY_UPDATED":
            const newPeers = data.payload.membersData.filter(
              (item) =>
                !this.data!.connections.has(item.id) &&
                item.id !== this.data!.peerId
            );

            if (newPeers.length) {
              this.addConnections(
                newPeers.map((item) => this.peer.connect(item.id))
              );
            }
            if (
              data.payload.name &&
              data.payload.name !== this.data.lobbyName
            ) {
              this.setData({
                lobbyName: data.payload.name,
              });
            }
            break;
          case "DATA_SNAPSHOT":
            if (!connData) return;
            connData.memberData.snapshotData = getSnapshotData(data.payload);

            const { id: localId, timestamp: localTs } = this.data.tasksSnapshot;
            const { id: remoteId, timestamp: remoteTs } = data.payload;

            if (localId === remoteId) {
              if (
                this.requestedUpdate?.snapshot.id === remoteId &&
                this.isDataConsensus
              ) {
                this.requestedUpdate.resolve();
                this.requestedUpdate = undefined;
              }
              this.setData({});
            } else {
              const isRemoteNewer =
                remoteTs > localTs ||
                (remoteTs === localTs && remoteId > localId);
              if (isRemoteNewer) {
                this.setData({ tasksSnapshot: data.payload });
                this.handleUpdateConflict();
                this.broadcastMessage({
                  type: "DATA_SNAPSHOT",
                  payload: data.payload,
                });
              } else {
                this.setData({});
              }
            }
            break;
          case "HEARTBEAT":
            if (!connData) return;
            connData.lastHeartbeat = Date.now();
            if (connData.memberData.snapshotData?.id !== data.payload.id) {
              connData.memberData.snapshotData = data.payload;
              this.setData({});
            }
            break;
        }
      });
      updatedConns.set(id, {
        connection: conn,
        memberData: { id },
        lastHeartbeat: Date.now(),
      });
    }

    this.setData({ connections: updatedConns });
    this.broadcastMessage(
      {
        type: "DATA_SNAPSHOT",
        payload: this.data.tasksSnapshot,
      },
      newConns.map((item) => item.peer)
    );
    this.broadcastMessage(
      {
        type: "NAMES_UPDATED",
        payload: [
          [this.data.peerId, this.data.peerName],
          ...(this.data.memberNames ?? []),
        ],
      },
      newConns.map((item) => item.peer)
    );
    this.broadcastMessage({
      type: "LOBBY_UPDATED",
      payload: {
        name: this.data.lobbyName,
        membersData: [...this.data.connections.values()].map(
          (item) => item.memberData
        ),
      },
    });
  }
  private handleUpdateConflict() {
    if (!this.requestedUpdate || !this.isDataConsensus) return;
    const requestedUpd = this.requestedUpdate;
    const { tasksSnapshot } = this.data!;
    if (
      tasksSnapshot.ids.some((id) => requestedUpd.snapshot.ids.includes(id))
    ) {
      //update request rejected
      requestedUpd.reject();
      this.requestedUpdate = undefined;
    } else {
      const mergedTasksMap = new Map<string, WithId<TaskData>>(
        tasksSnapshot.tasks.map((task) => [task.id, task])
      );
      for (const id of requestedUpd.snapshot.ids) {
        const item = requestedUpd.snapshot.tasks.find(
          (task) => task.id === id
        )!;
        mergedTasksMap.set(id, item);
      }
      const newRequestedTasks = [...mergedTasksMap.values()];

      //retry update request
      this.requestedUpdate = {
        ...requestedUpd,
        snapshot: {
          ...requestedUpd.snapshot,
          tasks: newRequestedTasks,
          timestamp: Date.now(),
        },
      };
    }
  }
  broadcastMessage(
    message: DataMessage,
    ids = Array.from(this.data!.connections).map(([id]) => id)
  ) {
    for (const id of ids) {
      this.sendMessage(id, message);
    }
  }
  sendMessage(peerId: string, message: DataMessage) {
    const connectionData = this.data!.connections.get(peerId)!;
    connectionData.connection.send(message);
  }
  setData(data: PeerProviderDataUpdate | null) {
    this.data = data && ({ ...this.data, ...data } as PeerProviderData);
    this.emit("updatedData");
  }
  destroy() {
    clearInterval(this.heartbeatInterval);
    clearInterval(this.membersCheckInterval);
    this.setData(null);
    this.peer.disconnect();
    this.peer.destroy();
    this.requestedUpdate = undefined;
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
