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
  compareIds,
  cutIdBase,
  filterOpenableConnections,
  genId,
  getSnapshotData,
  isDataMessage,
} from "./utils";
import { checkHeartbeatMs, lifeTimeMs, reInitHeartbeatMs } from "./constants";

export default class PeerProvider {
  #peer: Peer;
  data: PeerProviderData | null = null;
  #callbacks: {
    [K in PeerProviderEvent]?: (() => void)[];
  } = {};
  #heartbeatInterval: NodeJS.Timeout | undefined;
  #membersCheckInterval: NodeJS.Timeout | undefined;
  #requestedUpdate: RequestedUpdate | undefined;
  #isVisible = true;
  #idlePeers = new Set<string>();

  constructor(boardData: BoardData, tasksSnapshot: TasksSnapshot) {
    this.#peer = this.#setupPeer(boardData, tasksSnapshot, boardData.peerId);
  }

  get isDataConsensus() {
    if (!this.data) return false;
    const connIds = [...this.data.connections.values()].map(
      (item) => item.memberData.snapshotData?.id
    );

    return connIds.every((id) => id && id === this.data!.tasksSnapshot.id);
  }
  #setupPeer(
    boardData: BoardData,
    tasksSnapshot: TasksSnapshot,
    peerId: string
  ) {
    const peer = new Peer(peerId);
    peer.on("open", () => {
      const isReconnect = !!this.data;
      if (!isReconnect) {
        this.#setData({
          peerId,
          peerName: boardData.peerName,
          tasksSnapshot,
          lobbyName: boardData.name,
          connections: new Map(),
          memberNames: new Map(boardData.memberNames),
        });

        if (boardData.peers.length) {
          this.#connectPeers(boardData.peers);
        }

        this.#heartbeatInterval = setInterval(() => {
          const { id, timestamp, ids } = this.data!.tasksSnapshot;
          this.#broadcastMessage({
            type: "HEARTBEAT",
            payload: { id, timestamp, ids },
          });
        }, reInitHeartbeatMs);

        this.#membersCheckInterval = setInterval(() => {
          const nowMs = Date.now();
          const deadConnectionsIds = [...this.data!.connections.values()]
            .filter((connData) => nowMs - connData.lastHeartbeat >= lifeTimeMs)
            .map((item) => item.memberData.id);
          this.#removeConnections(deadConnectionsIds);
        }, checkHeartbeatMs);

        peer.on("connection", (connection: DataConnection) =>
          this.#addConnections([connection])
        );
      } else {
        this.#reconnectIdlePeers();
      }
    });

    peer.on("error", (e) => {
      const { type, message } = e as { type: string; message: string };
      if (type === "unavailable-id" && message.includes("is taken")) {
        this.destroy();
        this.#peer = this.#setupPeer(
          boardData,
          tasksSnapshot,
          genId(boardData.peerId)
        );
      }
    });
    return peer;
  }
  #reconnectIdlePeers() {
    const ids = [...this.#idlePeers];
    this.#removeConnections(ids);
    this.#idlePeers.clear();
    this.#connectPeers(ids);
  }
  #connectPeers(ids: string[]) {
    const filteredIds = ids.filter(
      (id) => !this.data?.connections.has(cutIdBase(id))
    );
    if (filteredIds.length) {
      this.#addConnections(filteredIds.map((id) => this.#peer.connect(id)));
    }
  }
  visibleChange(value: boolean) {
    this.#isVisible = value;
    if (value) {
      if (!this.#peer.open) {
        this.#peer.reconnect();
      } else {
        this.#reconnectIdlePeers();
      }
    }
  }

  requestUpdate(newList: WithId<TaskData>[], ids: string[]) {
    if (this.#requestedUpdate) throw Error("Requested update already exists");

    const newSnapshot: TasksSnapshot = {
      id: uuidv4(),
      timestamp: Date.now(),
      ids,
      tasks: newList,
    };

    let result = Promise.resolve();
    if (this.data?.connections.size) {
      result = new Promise((resolve, reject) => {
        this.#requestedUpdate = {
          snapshot: newSnapshot,
          resolve,
          reject,
        };
      });
    }

    this.#setData({ tasksSnapshot: newSnapshot });
    this.#broadcastMessage({
      type: "DATA_SNAPSHOT",
      payload: newSnapshot,
    });
    return result;
  }
  #removeConnections(ids: string[]) {
    if (!ids.length || !this.data) return;

    const { connections, memberNames } = this.data;
    let updated = false;
    for (const id of ids) {
      if (connections.has(cutIdBase(id))) {
        if (!this.#isVisible) {
          this.#idlePeers.add(id);
        } else {
          updated = true;
          connections.delete(cutIdBase(id));
          memberNames.delete(cutIdBase(id));
        }
      }
    }
    if (updated) {
      this.#setData({
        connections: new Map(connections),
        memberNames: new Map(memberNames),
      });
    }
  }
  async #addConnections(connections: DataConnection[]) {
    const newConns = await filterOpenableConnections(connections, this.#peer);

    if (!newConns.length || !this.data) {
      if (!this.data?.connections.size && this.data?.lobbyName === null) {
        //connect by inv failed
        this.#emit("failedConnection");
      }
      return;
    }
    const { connections: updatedConns, memberNames } = this.data;

    for (const conn of newConns) {
      const id = conn.peer;

      conn.on("close", () => {
        this.#removeConnections([id]);
      });
      conn.on("data", (data) => {
        const connData = this.data?.connections.get(cutIdBase(id));
        if (!isDataMessage(data) || !this.data || !connData) return;
        switch (data.type) {
          case "NAMES_UPDATED":
            let updated = false;
            for (const [memberId, memberName] of data.payload) {
              if (
                !compareIds(memberId, this.data.peerId) &&
                this.data.memberNames.get(memberId) !== memberName
              ) {
                updated = true;
                memberNames.set(memberId, memberName);
              }
            }
            if (updated) {
              this.#setData({ memberNames: new Map(memberNames) });
              this.#broadcastMessage({
                type: "NAMES_UPDATED",
                payload: [
                  [cutIdBase(this.data.peerId), this.data.peerName],
                  ...memberNames,
                ],
              });
            }
            break;
          case "LOBBY_UPDATED":
            const newPeers = data.payload.membersData.filter(
              (item) =>
                !this.data!.connections.has(cutIdBase(item.id)) &&
                !compareIds(item.id, this.data!.peerId)
            );

            if (newPeers.length) {
              this.#connectPeers(newPeers.map((item) => item.id));
            }
            if (
              data.payload.name &&
              data.payload.name !== this.data.lobbyName
            ) {
              this.#setData({
                lobbyName: data.payload.name,
              });
            }
            break;
          case "DATA_SNAPSHOT":
            connData.memberData.snapshotData = getSnapshotData(data.payload);

            const { id: localId, timestamp: localTs } = this.data.tasksSnapshot;
            const { id: remoteId, timestamp: remoteTs } = data.payload;

            if (localId === remoteId) {
              if (
                this.#requestedUpdate?.snapshot.id === remoteId &&
                this.isDataConsensus
              ) {
                this.#requestedUpdate.resolve();
                this.#requestedUpdate = undefined;
              }
              this.#setData({});
            } else {
              const isRemoteNewer =
                remoteTs > localTs ||
                (remoteTs === localTs && remoteId > localId);
              if (isRemoteNewer) {
                this.#setData({ tasksSnapshot: data.payload });
                this.handleUpdateConflict();
                this.#broadcastMessage({
                  type: "DATA_SNAPSHOT",
                  payload: data.payload,
                });
              } else {
                this.#setData({});
              }
            }
            break;
          case "HEARTBEAT":
            connData.lastHeartbeat = Date.now();
            if (connData.memberData.snapshotData?.id !== data.payload.id) {
              connData.memberData.snapshotData = data.payload;
              this.#setData({});
            }
            break;
        }
      });
      updatedConns.set(cutIdBase(id), {
        connection: conn,
        memberData: { id },
        lastHeartbeat: Date.now(),
      });
    }

    this.#setData({
      connections: updatedConns,
    });

    this.#broadcastMessage(
      {
        type: "DATA_SNAPSHOT",
        payload: this.data.tasksSnapshot,
      },
      newConns.map((item) => item.peer)
    );
    this.#broadcastMessage(
      {
        type: "NAMES_UPDATED",
        payload: [
          [cutIdBase(this.data.peerId), this.data.peerName],
          ...(this.data.memberNames ?? []),
        ],
      },
      newConns.map((item) => item.peer)
    );
    this.#broadcastMessage({
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
    if (!this.#requestedUpdate || !this.isDataConsensus) return;
    const requestedUpd = this.#requestedUpdate;
    const { tasksSnapshot } = this.data!;
    if (
      tasksSnapshot.ids.some((id) => requestedUpd.snapshot.ids.includes(id))
    ) {
      //update request rejected
      requestedUpd.reject();
      this.#requestedUpdate = undefined;
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
      this.#requestedUpdate = {
        ...requestedUpd,
        snapshot: {
          ...requestedUpd.snapshot,
          tasks: newRequestedTasks,
          timestamp: Date.now(),
        },
      };
    }
  }
  #broadcastMessage(
    message: DataMessage,
    ids = Array.from(this.data!.connections).map(([id]) => id)
  ) {
    for (const id of ids) {
      const connectionData = this.data!.connections.get(cutIdBase(id))!;
      connectionData.connection.send(message);
    }
  }

  #setData(data: PeerProviderDataUpdate | null) {
    this.data = data && ({ ...this.data, ...data } as PeerProviderData);
    this.#emit("updatedData");
  }
  destroy() {
    clearInterval(this.#heartbeatInterval);
    clearInterval(this.#membersCheckInterval);
    this.#setData(null);
    this.#requestedUpdate = undefined;
    this.#peer.disconnect();
    this.#peer.destroy();
  }
  on(event: PeerProviderEvent, callback: () => void) {
    if (!this.#callbacks[event]) {
      this.#callbacks[event] = [];
    }
    this.#callbacks[event]!.push(callback);
  }
  #emit(type: PeerProviderEvent) {
    const callbacks = this.#callbacks[type];
    if (callbacks?.length) {
      for (const callback of callbacks) {
        callback();
      }
    }
  }
}
