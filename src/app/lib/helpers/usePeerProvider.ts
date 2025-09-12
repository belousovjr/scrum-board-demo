import { useEffect, useRef, useState } from "react";
import PeerProvider from "../PeerProvider";
import {
  PeerProviderData,
  TaskData,
  UsePeerProviderOptions,
  WithId,
} from "../types";
import { compareIds } from "../utils";
import useServiceContext from "./useServiceContext";

export default function usePeerProvider({
  boardData,
  tasksSnapshot,
  onFailedConnection,
}: UsePeerProviderOptions) {
  const { isOffline, isPrimaryPage, isVisible } = useServiceContext();
  const [isConsensus, setIsConsensus] = useState(false);

  const providerRef = useRef<PeerProvider | null>(null);
  const idlePeers = useRef<string[]>([]);

  const [providerData, setProviderData] = useState<PeerProviderData | null>(
    null
  );

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
        onFailedConnection?.();
      });
      providerRef.current.on("closedPeer", ({ id }) => {
        if (!isVisible) {
          idlePeers.current.push(id);
        }
      });
    }
  }, [
    boardData,
    isPrimaryPage,
    isOffline,
    onFailedConnection,
    tasksSnapshot,
    isVisible,
  ]);

  useEffect(() => {
    if (providerRef.current && isVisible && idlePeers.current.length) {
      providerRef.current.connectPeers(idlePeers.current);
      idlePeers.current = [];
    }
  }, [isVisible]);

  return {
    providerData,
    isConsensus,
    requestUpdate: (newList: WithId<TaskData>[], ids: string[]) =>
      providerRef.current?.requestUpdate(newList, ids),
  };
}
