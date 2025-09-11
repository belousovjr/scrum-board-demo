import { DataMessage, TasksSnapshot, TaskStatus } from "./types";
import { v4 as uuidv4 } from "uuid";

export const messageTypes: DataMessage["type"][] = [
  "LOBBY_UPDATED",
  "DATA_SNAPSHOT",
  "HEARTBEAT",
  "NAMES_UPDATED",
];

export const initialTasksSnapshot: TasksSnapshot = {
  timestamp: 0,
  id: uuidv4(),
  ids: [],
  tasks: [],
};

export const lifeTimeMs = 5000;
export const reInitHeartbeatMs = 2000;
export const checkHeartbeatMs = 500;

export const statuses: TaskStatus[] = ["TODO", "PROGRESS", "DONE"];

export const statusClasses: Record<TaskStatus | "OFFLINE", string> = {
  TODO: "bg-red-40 text-red-100",
  PROGRESS: "bg-yellow-40 text-yellow-100",
  DONE: "bg-green-40 text-green-100",
  OFFLINE: "bg-general-40 text-general-100",
};

export const reCalcTimeMs = 2000;
