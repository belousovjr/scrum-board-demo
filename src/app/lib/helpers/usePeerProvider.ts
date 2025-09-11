import { useEffect, useRef, useState } from "react";
import PeerProvider from "../PeerProvider";
import {
  PeerProviderData,
  TaskData,
  UsePeerProviderOptions,
  WithId,
} from "../types";
import { snackbar } from "../utils";
import { useOffline } from "./useOffline";

export default function usePeerProvider({
  boardData,
  tasksSnapshot,
  enabled,
  onFailedConnection,
  onFailedTab,
}: UsePeerProviderOptions) {
  const offlineMode = useOffline();

  const providerRef = useRef<PeerProvider | null>(null);
  const [providerData, setProviderData] = useState<PeerProviderData | null>(
    null
  );

  const [isConsensus, setIsConsensus] = useState(false);

  useEffect(() => {
    if (!enabled || !boardData) {
      if (!offlineMode.value) {
        providerRef.current?.destroy();
        providerRef.current = null;
      }
      setIsConsensus(false);
      return;
    }
    if (!providerRef.current && tasksSnapshot && !offlineMode.value) {
      providerRef.current = new PeerProvider(boardData, tasksSnapshot);
      providerRef.current.on("updatedData", () => {
        setProviderData(
          providerRef.current!.data ? { ...providerRef.current!.data } : null
        );
        setIsConsensus(!!providerRef.current?.isDataConsensus);
      });
      providerRef.current.on("failedConnection", () => {
        snackbar({
          text: "Failed to connect via invite",
          variant: "error",
        });
        onFailedConnection?.();
      });
      providerRef.current.on("failedTab", () => {
        onFailedTab?.();
      });
    }
  }, [
    boardData,
    enabled,
    offlineMode.value,
    onFailedConnection,
    onFailedTab,
    tasksSnapshot,
  ]);
  return {
    providerData,
    isConsensus,
    requestUpdate: (newList: WithId<TaskData>[], ids: string[]) =>
      providerRef.current?.requestUpdate(newList, ids),
  };
}
