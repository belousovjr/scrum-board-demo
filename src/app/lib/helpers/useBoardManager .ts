import { useMemo } from "react";
import { useDB } from "./useDB";
import { useOffline } from "./useOffline";
import usePeerProvider from "./usePeerProvider";

export default function useBoardManager() {
  const boardData = useDB("boardData");
  const offlineTasks = useDB("offlineTasks", []);
  const offlineMode = useOffline();

  const isProviderNeeded = useMemo(() => {
    return !!(boardData.data && !offlineMode.value);
  }, [boardData.data, offlineMode.value]);

  const providerData = usePeerProvider({
    id: boardData.data?.peerId,
    lobbyName: boardData.data?.name,
    enabled: isProviderNeeded,
  });

  const isLoading = useMemo(
    () => boardData.isLoading || !!(isProviderNeeded && !providerData),
    [boardData.isLoading, isProviderNeeded, providerData]
  );

  return {
    boardData,
    offlineTasks,
    providerData,
    isLoading,
  };
}
