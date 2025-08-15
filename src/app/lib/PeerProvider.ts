import { DataConnection, Peer } from "peerjs";
import { v4 as uuidv4 } from "uuid";
import {
  BoardData,
  ConnectionDataWrapped,
  DataMessage,
  PeerProviderEvent,
  TaskData,
  TasksSnapshot,
  WithId,
} from "./types";
import {
  checkHeartbeatMs,
  filterOpenableConnections,
  getSnapshotData,
  isDataMessage,
  lifeTimeMs,
  reInitHeartbeatMs,
} from "./utils";

export interface PeerProviderData {
  tasksSnapshot: TasksSnapshot;
  peerId: string;
  connections: Map<string, ConnectionDataWrapped>;
  lobbyName: string | null; //null - when connect by ref
}
export type PeerProviderDataUpdate = {
  [K in keyof PeerProviderData]?: PeerProviderData[K];
};

interface RequestedUpdate {
  snapshot: TasksSnapshot;
  resolve: (value: true) => void;
  reject: (value: false) => void;
}

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
        tasksSnapshot,
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
        const snapshot = this.data!.tasksSnapshot;
        this.broadcastMessage({
          type: "HEARTBEAT",
          payload: {
            id: snapshot.id,
            timestamp: snapshot.timestamp,
            ids: snapshot.ids,
          },
        });
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

  get isDataConsensus() {
    if (this.data) {
      const connectionsData = [...this.data.connections.values()].map(
        (item) => item.memberData.snapshotData?.id
      );
      return (
        connectionsData.every((item) => item) &&
        new Set([this.data.tasksSnapshot.id, ...connectionsData]).size === 1
      );
    }
    return false;
  }
  requestUpdate(newList: WithId<TaskData>[], ids: string[]) {
    if (!this.requestedUpdate) {
      const newSnapshot: TasksSnapshot = {
        id: uuidv4(),
        timestamp: Date.now(),
        ids,
        tasks: newList,
      };

      let result = new Promise((res) => res(true));

      if (this.data?.connections.size) {
        let resolve = (value: true) => {},
          reject = (value: false) => {};
        result = new Promise((res, rej) => {
          resolve = res;
          reject = rej;
        });
        this.requestedUpdate = {
          snapshot: { ...newSnapshot },
          resolve,
          reject,
        };
      }

      this.setData({ tasksSnapshot: newSnapshot });
      this.broadcastMessage({
        type: "DATA_SNAPSHOT",
        payload: newSnapshot,
      });
      return result;
    } else {
      throw Error("Requested update already exist");
    }
  }
  removeConnections(ids: string[]) {
    const isDiff = ids.some((id) => this.data?.connections.has(id));
    if (isDiff) {
      const newConnections = new Map(this.data!.connections);
      for (const id of ids) {
        newConnections.delete(id);
      }
      this.setData({ connections: newConnections });
    }
  }
  async addConnections(connections: DataConnection[]) {
    const newConnections = await filterOpenableConnections(
      connections.filter((item) => !this.data?.connections.has(item.peer)),
      this.peer
    );

    if (newConnections.length) {
      const updatedConnections = new Map(this.data!.connections);
      for (const connection of newConnections) {
        const id = connection.peer;
        connection.on("close", () => {
          this.removeConnections([id]);
        });
        connection.on("data", (data) => {
          if (isDataMessage(data)) {
            switch (data.type) {
              case "LOBBY_UPDATED":
                {
                  const newPeers = data.payload.membersData.filter(
                    (item) =>
                      !this.data?.connections.has(item.id) &&
                      item.id !== this.data?.peerId
                  );
                  if (newPeers.length) {
                    const newConns = newPeers.map((item) =>
                      this.peer.connect(item.id)
                    );
                    this.addConnections(newConns);
                  }
                  if (this.data?.lobbyName !== data.payload.name) {
                    this.setData({ lobbyName: data.payload.name });
                  }
                }
                break;
              case "DATA_SNAPSHOT":
                {
                  let isWins = false;
                  const connectionData = this.data?.connections.get(id);
                  connectionData!.memberData.snapshotData = getSnapshotData(
                    data.payload
                  );
                  if (this.data!.tasksSnapshot.id === data.payload.id) {
                    if (
                      data.payload.id === this.requestedUpdate?.snapshot.id &&
                      this.isDataConsensus
                    ) {
                      //update request resolved
                      this.requestedUpdate.resolve(true);
                      this.requestedUpdate = undefined;
                    }
                  } else {
                    const diffMs =
                      data.payload.timestamp -
                      this.data!.tasksSnapshot.timestamp;

                    isWins =
                      diffMs < 0
                        ? false
                        : diffMs > 0 ||
                          data.payload.id > this.data!.tasksSnapshot.id;

                    if (isWins) {
                      this.setData({ tasksSnapshot: data.payload });

                      if (this.requestedUpdate && this.isDataConsensus) {
                        if (
                          this.data?.tasksSnapshot.ids.some((id) =>
                            this.requestedUpdate!.snapshot.ids.includes(id)
                          )
                        ) {
                          //update request rejected
                          this.requestedUpdate.reject(false);
                          this.requestedUpdate = undefined;
                        } else {
                          const mergedTasksMap = new Map<
                            string,
                            WithId<TaskData>
                          >(
                            this.data!.tasksSnapshot.tasks.map((task) => [
                              task.id,
                              task,
                            ])
                          );
                          for (const id of this.requestedUpdate!.snapshot.ids) {
                            const item =
                              this.requestedUpdate!.snapshot.tasks.find(
                                (task) => task.id === id
                              )!;
                            mergedTasksMap.set(id, item);
                          }
                          const newRequestedTasks = [
                            ...mergedTasksMap.values(),
                          ];

                          //retry update request
                          this.requestedUpdate = {
                            ...this.requestedUpdate,
                            snapshot: {
                              ...this.requestedUpdate.snapshot,
                              tasks: newRequestedTasks,
                              timestamp: Date.now(),
                            },
                          };
                        }
                      }
                      this.broadcastMessage({
                        type: "DATA_SNAPSHOT",
                        payload: data.payload,
                      });
                    }
                  }
                  if (!isWins) {
                    this.setData({});
                  }
                }
                break;
              case "HEARTBEAT":
                {
                  const connectionData = this.data?.connections.get(id);
                  if (connectionData) {
                    connectionData.lastHeartbeat = Date.now();
                    if (
                      connectionData.memberData.snapshotData?.id !==
                      data.payload.id
                    ) {
                      connectionData.memberData.snapshotData = data.payload;
                      this.setData({});
                    }
                  }
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
      this.setData({ connections: updatedConnections });

      this.broadcastMessage(
        {
          type: "DATA_SNAPSHOT",
          payload: this.data!.tasksSnapshot,
        },
        newConnections.map((item) => item.peer)
      );

      this.broadcastMessage({
        type: "LOBBY_UPDATED",
        payload: {
          name: this.data!.lobbyName,
          membersData: [...this.data!.connections.values()].map(
            (item) => item.memberData
          ),
        },
      });
    } else if (!this.data?.connections.size && this.data?.lobbyName === null) {
      //failed ref connection
      this.emit("failedConnection");
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
    this.peer.disconnect();
    this.peer.destroy();
    clearInterval(this.heartbeatInterval);
    clearInterval(this.membersCheckInterval);
    this.requestedUpdate = undefined;
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
