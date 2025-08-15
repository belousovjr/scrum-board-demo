import { useEffect, useRef, useState } from "react";
import PeerProvider, { PeerProviderData } from "../PeerProvider";
import { BoardData, TaskData, TasksSnapshot, WithId } from "../types";

interface UsePeerProviderOptions {
  boardData: BoardData | null;
  tasksSnapshot: TasksSnapshot | null;
  enabled: boolean;
  onFailedConnection?: () => void;
}

export default function usePeerProvider({
  boardData,
  tasksSnapshot,
  enabled,
  onFailedConnection,
}: UsePeerProviderOptions) {
  const provider = useRef<PeerProvider>(null);
  const [providerData, setProviderData] = useState<PeerProviderData | null>(
    null
  );
  const [isConsensus, setIsConsensus] = useState<boolean>();

  useEffect(() => {
    if (enabled && boardData) {
      if (!provider.current && tasksSnapshot) {
        provider.current = new PeerProvider(boardData, tasksSnapshot);
        provider.current.on("updatedData", () => {
          setProviderData(
            provider.current!.data ? { ...provider.current!.data } : null
          );
          setIsConsensus(provider!.current?.isDataConsensus);
        });
        provider.current.on("failedConnection", () => {
          alert("failed ref connection");
          onFailedConnection?.();
        });
      }
    } else if (provider) {
      provider.current?.destroy();
      provider.current = null;
    }
  }, [boardData, tasksSnapshot, enabled]);

  return {
    providerData,
    requestUpdate: (newList: WithId<TaskData>[], ids: string[]) => {
      return provider.current?.requestUpdate(newList, ids);
    },
    isConsensus,
  };
}
