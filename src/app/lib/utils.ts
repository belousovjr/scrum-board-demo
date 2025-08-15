import { v4 as uuidv4 } from "uuid";
import { DataMessage, TasksSnapshot, TasksSnapshotData } from "./types";
import Peer, { DataConnection } from "peerjs";

export const messageTypes: DataMessage["type"][] = [
  "LOBBY_UPDATED",
  "DATA_SNAPSHOT",
  "HEARTBEAT",
];

export const isDataMessage = (data: unknown): data is DataMessage =>
  messageTypes.includes((data as DataMessage)?.type);

export const lifeTimeMs = 5000;
export const reInitHeartbeatMs = 2000;
export const checkHeartbeatMs = 500;

export const genPeerId = () => "MT_" + uuidv4();

export const filterOpenableConnections = async (
  connections: DataConnection[],
  peer: Peer
) => {
  const results = await Promise.allSettled(
    connections.map(
      (item) =>
        new Promise((resolve, reject) => {
          const connectErrorHandler = (e: unknown) => {
            const { type, message } = e as { type: string; message: string };
            console.log("PEER ERROR", e);
            if (type === "peer-unavailable") {
              const id = message.slice("Could not connect to peer ".length);
              if (id === item.peer) {
                peer.off("error", connectErrorHandler);
                alert("CONNECT ERROR " + id);
                reject();
              }
            }
          };
          peer.on("error", connectErrorHandler);
          item.on("open", () => {
            resolve(item);
          });
        })
    )
  );
  return results
    .filter((item) => item.status === "fulfilled")
    .map((item) => item.value as DataConnection);
};

export const initialTasksSnapshot: TasksSnapshot = {
  timestamp: 0,
  id: uuidv4(),
  ids: [],
  tasks: [],
};

export const getSnapshotData = (
  snapshot: TasksSnapshot
): TasksSnapshotData => ({
  id: snapshot.id,
  timestamp: snapshot.timestamp,
  ids: snapshot.ids,
});
