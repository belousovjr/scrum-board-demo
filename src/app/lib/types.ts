import { DataConnection } from "peerjs";

export type TaskStatus = "TODO" | "PROCESS" | "COMPLETED";

export interface TaskData {
  title: string;
  content: string;
  status: TaskStatus;
  updatedAt: number;
}

// For IndexDB
export interface BoardData {
  name: string;
  peerId: string;
  peers: string[];
}

export type WithId<T extends object> = T & { id: string };

export type PeerProviderEvent = "updatedData";

export interface BoardMemberData {
  id: string;
  snapshotData?: TasksSnapshotData;
}

//For runtime
export interface LobbyData {
  name: string;
  membersData: BoardMemberData[];
}

export interface ConnectionDataWrapped {
  connection: DataConnection;
  memberData: BoardMemberData;
  lastHeartbeat: number;
}

export type LobbyUpdatedMessage = {
  type: "LOBBY_UPDATED";
  payload: LobbyData;
};
export type DataSnapshotMessage = {
  type: "DATA_SNAPSHOT";
  payload: TasksSnapshot;
};
export type HeartbeatMessage = {
  type: "HEARTBEAT";
  payload: TasksSnapshotData;
};

export type DataMessage =
  | LobbyUpdatedMessage
  | HeartbeatMessage
  | DataSnapshotMessage;

export interface TasksSnapshotData {
  id: string;
  timestamp: number;
  ids: string[];
}

export interface TasksSnapshot extends TasksSnapshotData {
  tasks: WithId<TaskData>[];
}
