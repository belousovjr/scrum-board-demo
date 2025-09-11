import { DataConnection } from "peerjs";
import { useDB } from "./helpers/useDB";
import { DBSchema } from "idb";
import usePeerProvider from "./helpers/usePeerProvider";
import { ComponentProps } from "react";
import { Notification } from "@belousovjr/uikit";

export type TaskStatus = "TODO" | "PROGRESS" | "DONE";

export interface TaskData {
  title: string;
  content: string;
  status: TaskStatus;
  updatedAt: number;
  isOffline: boolean;
  color: string;
}

// For IndexDB
export interface BoardData {
  name: string | null;
  peerId: string;
  peerName: string;
  memberNames: [string, string][];
  peers: string[];
}

export type WithId<T extends object> = T & { id: string };

export type PeerProviderEvent =
  | "updatedData"
  | "failedConnection"
  | "failedTab";

export interface BoardMemberData {
  id: string;
  snapshotData?: TasksSnapshotData;
}

//For runtime
export interface LobbyData {
  name: string | null;
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
export type MemberNamesMessage = {
  type: "NAMES_UPDATED";
  payload: [string, string][];
};

export type DataMessage =
  | LobbyUpdatedMessage
  | HeartbeatMessage
  | DataSnapshotMessage
  | MemberNamesMessage;

export interface TasksSnapshotData {
  id: string;
  timestamp: number;
  ids: string[];
}

export interface TasksSnapshot extends TasksSnapshotData {
  tasks: WithId<TaskData>[];
}

export interface PeerProviderData {
  tasksSnapshot: TasksSnapshot;
  peerId: string;
  peerName: string;
  memberNames: Map<string, string>;
  connections: Map<string, ConnectionDataWrapped>;
  lobbyName: string | null; //null - when connect by ref
}
export type PeerProviderDataUpdate = {
  [K in keyof PeerProviderData]?: PeerProviderData[K];
};

export interface RequestedUpdate {
  snapshot: TasksSnapshot;
  resolve: () => void;
  reject: () => void;
}

export interface UsePeerProviderOptions {
  boardData: BoardData | null;
  tasksSnapshot: TasksSnapshot | null;
  enabled: boolean;
  onFailedConnection?: () => void;
  onFailedTab?: () => void;
}

export interface ScrumBoardDBSchemaRaw {
  boardData: {
    key: "data";
    value: BoardData;
  };
  offlineTasks: {
    key: "data";
    value: WithId<TaskData>[];
  };
  onlineTasksSnapshot: {
    key: "data";
    value: TasksSnapshot;
  };
}

export interface ScrumBoardDBSchema extends ScrumBoardDBSchemaRaw, DBSchema {}

export interface BoardManager {
  boardData: ReturnType<typeof useDB<"boardData", BoardData>>;
  offlineTasks: ReturnType<typeof useDB<"offlineTasks", WithId<TaskData>[]>>;
  onlineTasksSnapshot: ReturnType<
    typeof useDB<"onlineTasksSnapshot", TasksSnapshot>
  >;
  providerData: PeerProviderData | null;
  tabError: boolean;
  isLoading: boolean;
  refOffer: boolean;
  refAnswer: (createWithPeerName: string | false) => Promise<void>;
  removeBoardData: () => Promise<unknown>;
  requestUpdate: ReturnType<typeof usePeerProvider>["requestUpdate"];
  syncOfflineTasks: () => Promise<void>;
}

export type TaskType = TaskStatus | "MOBILE";

export interface ModalState {
  editTask: WithId<TaskData> | null;
  selectedStatus: TaskStatus | null;
  deleteTask: WithId<TaskData> | null;
  showTask: WithId<TaskData> | null;
}

export interface SnackbarData {
  text: string;
  variant?: ComponentProps<typeof Notification>["variant"];
  id: string;
}
