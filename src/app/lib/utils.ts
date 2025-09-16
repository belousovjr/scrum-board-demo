import { getCurrentTime } from "./actions";
import { messageTypes } from "./constants";
import { DataMessage, TasksSnapshot, TasksSnapshotData } from "./types";
import Peer, { DataConnection } from "peerjs";
import { v4 as uuidv4 } from "uuid";

export function isDataMessage(data: unknown): data is DataMessage {
  return messageTypes.includes((data as DataMessage)?.type);
}

export async function filterOpenableConnections(
  connections: DataConnection[],
  peer: Peer
) {
  const results = await Promise.allSettled(
    connections.map(
      (item) =>
        new Promise((resolve, reject) => {
          const connectErrorHandler = (e: unknown) => {
            peer.off("error", connectErrorHandler);
            item.off("open", openHandler);
            const { type, message } = e as { type: string; message: string };

            if (type === "peer-unavailable" && message.includes(item.peer)) {
              reject();
            }
          };
          const openHandler = () => {
            peer.off("error", connectErrorHandler);
            item.off("open", openHandler);
            resolve(item);
          };
          peer.on("error", connectErrorHandler);
          item.on("open", openHandler);
        })
    )
  );
  return results
    .filter((item) => item.status === "fulfilled")
    .map((item) => item.value as DataConnection);
}

export function getSnapshotData(snapshot: TasksSnapshot): TasksSnapshotData {
  return {
    id: snapshot.id,
    timestamp: snapshot.timestamp,
    ids: snapshot.ids,
  };
}

export function checkIsDesktop() {
  return typeof window !== "undefined" ? window.innerWidth >= 1024 : true;
}

export function checkIsNativeOffline() {
  return typeof window !== "undefined" ? !window.navigator.onLine : false;
}

export async function getCurrentTimeOffset() {
  const start = Date.now();
  const remoteTime = await getCurrentTime();
  const end = Date.now();
  const requestDiff = end - start;
  const diff = (remoteTime - start + requestDiff) / 2;
  return Math.round(diff / (1000 * 60));
}

export function cutIdBase(id: string) {
  return id.slice(0, 24 - 1);
}

export function genId(baseId?: string) {
  const id = uuidv4();
  if (baseId) {
    return `${cutIdBase(baseId)}-${id.slice(-12)}`;
  }
  return id;
}

export function compareIds(a: string, b: string) {
  return cutIdBase(a) === cutIdBase(b);
}
