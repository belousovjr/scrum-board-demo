import { v4 as uuidv4 } from "uuid";
import { DataMessage } from "./types";
import { DataConnection } from "peerjs";

export const messageTypes: DataMessage["type"][] = [
  "LOBBY_UPDATED",
  "HEARTBEAT",
];

export const isDataMessage = (data: unknown): data is DataMessage =>
  messageTypes.includes((data as DataMessage)?.type);

export const lifeTimeMs = 5000;
export const reInitHeartbeatMs = 2000;
export const checkHeartbeatMs = 500;

export const genPeerId = () => "MT_" + uuidv4();

export const waitUntilConnectionsOpen = (connections: DataConnection[]) =>
  Promise.all(
    connections.map(
      (item) =>
        new Promise((resolve) => {
          item.on("open", () => {
            resolve(true);
          });
        })
    )
  );
