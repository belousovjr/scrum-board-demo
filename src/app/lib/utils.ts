import { setNotification } from "../store/slices/notificationsSlice";
import { store } from "../store/store";
import { messageTypes } from "./constants";
import {
  DataMessage,
  SnackbarData,
  TasksSnapshot,
  TasksSnapshotData,
} from "./types";
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
            const { type, message } = e as { type: string; message: string };
            snackbar({ text: message, variant: "error" });
            if (type === "peer-unavailable") {
              const id = message.slice("Could not connect to peer ".length);
              if (id === item.peer) {
                peer.off("error", connectErrorHandler);
                snackbar({
                  text: `Failed to connect to ${id}`,
                  variant: "error",
                });
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

export function checkIsOffline() {
  return typeof window !== "undefined" ? !window.navigator.onLine : false;
}

export function snackbar(data: Omit<SnackbarData, "id">) {
  store.dispatch(setNotification({ ...data, id: uuidv4() }));
}
