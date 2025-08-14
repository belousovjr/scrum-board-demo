import { DataMessage } from "./types";

export const messageTypes: DataMessage["type"][] = [
  "LOBBY_UPDATED",
  "HEARTBEAT",
];

export const isDataMessage = (data: unknown): data is DataMessage =>
  messageTypes.includes((data as DataMessage)?.type);

export const lifeTimeMs = 5000;
export const reInitHeartbeatMs = 2000;
export const checkHeartbeatMs = 500;
