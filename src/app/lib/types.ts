import { DataConnection } from "peerjs";

export type TaskStatus = "TODO" | "PROCESS" | "COMPLETED";

export interface TaskData {
  title: string;
  content: string;
  status: TaskStatus;
  online: boolean;
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
export type HeartbeatMessage = { type: "HEARTBEAT" };

export type DataMessage = LobbyUpdatedMessage | HeartbeatMessage;

export interface RefData {
  id: string;
  name: string;
}
