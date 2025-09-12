import { useEffect, useRef, useState } from "react";
import PeerProvider from "../PeerProvider";
import {
  PeerProviderData,
  TaskData,
  UsePeerProviderOptions,
  WithId,
} from "../types";
import { compareIds, snackbar } from "../utils";
import useServiceContext from "./useServiceContext";

export default function usePeerProvider({
  boardData,
  tasksSnapshot,
  onFailedConnection,
}: UsePeerProviderOptions) {
  const { isOffline, isPrimaryPage } = useServiceContext();

  const providerRef = useRef<PeerProvider | null>(null);
  const [providerData, setProviderData] = useState<PeerProviderData | null>(
    null
  );

  const [isConsensus, setIsConsensus] = useState(false);

  useEffect(() => {
    if (
      !boardData ||
      (providerRef.current?.data &&
        !compareIds(boardData.peerId, providerRef.current.data.peerId)) ||
      isOffline
    ) {
      providerRef.current?.destroy();
      providerRef.current = null;
      setIsConsensus(false);
    } else if (tasksSnapshot && !providerRef.current && isPrimaryPage) {
      providerRef.current = new PeerProvider(boardData, tasksSnapshot);
      providerRef.current.on("updatedData", () => {
        setProviderData(
          providerRef.current?.data ? { ...providerRef.current.data } : null
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
    }
  }, [boardData, isPrimaryPage, isOffline, onFailedConnection, tasksSnapshot]);
  return {
    providerData,
    isConsensus,
    requestUpdate: (newList: WithId<TaskData>[], ids: string[]) =>
      providerRef.current?.requestUpdate(newList, ids),
  };
}
