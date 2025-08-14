import { useCallback, useEffect, useMemo, useState } from "react";
import { useDB } from "./useDB";
import { useOffline } from "./useOffline";
import usePeerProvider from "./usePeerProvider";
import { usePathname, useRouter } from "next/navigation";
import { genPeerId, initialTasksSnapshot } from "../utils";

export default function useBoardManager() {
  const boardData = useDB("boardData");
  const offlineTasks = useDB("offlineTasks");
  const onlineTasksSnapshot = useDB("onlineTasksSnapshot");
  const offlineMode = useOffline();
  const router = useRouter();
  const pathName = usePathname();
  const [refId, setRefData] = useState<string>();

  const isProviderNeeded = useMemo(() => {
    return !!(boardData.data && !offlineMode.value);
  }, [boardData.data, offlineMode.value]);

  const { providerData, requestUpdate, isConsensus } = usePeerProvider({
    boardData: boardData.data,
    enabled: isProviderNeeded,
    tasksSnapshot:
      !onlineTasksSnapshot.data && onlineTasksSnapshot.isLoading
        ? null
        : onlineTasksSnapshot.data || { ...initialTasksSnapshot },
  });

  const isLoading = useMemo(
    () =>
      !!(
        boardData.isLoading ||
        onlineTasksSnapshot.isLoading ||
        (isProviderNeeded && !providerData) ||
        (refId && !providerData)
      ),
    [
      boardData.isLoading,
      isProviderNeeded,
      providerData,
      refId,
      onlineTasksSnapshot,
    ]
  );

  const removeBoardData = useCallback(() => {
    setRefData(undefined);
    return Promise.all([
      boardData.update(null),
      offlineTasks.update(null),
      onlineTasksSnapshot.update(null),
    ]);
  }, [boardData, offlineTasks, onlineTasksSnapshot]);

  const createBoardByRef = useCallback(
    async (id: string) => {
      await removeBoardData();
      boardData.update({ name: "", peerId: genPeerId(), peers: [id] });
    },
    [removeBoardData, boardData]
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refIdParam = params.get("ref_id");

    if (refIdParam) {
      setRefData(refIdParam);
      router.replace(pathName, { scroll: false });
    }
  }, [pathName, router]);

  useEffect(() => {
    if (
      refId &&
      !providerData &&
      !boardData.isLoading &&
      !boardData.data?.peers.includes(refId) &&
      boardData.data?.peerId !== refId
    ) {
      createBoardByRef(refId);
    }
  }, [
    boardData.data?.peerId,
    boardData.data?.peers,
    boardData.isLoading,
    createBoardByRef,
    providerData,
    refId,
  ]);

  useEffect(() => {
    if (providerData && !boardData.isLoading && boardData.data) {
      const providerPeersIds = Array.from(providerData?.connections)
        .map(([id]) => id)
        .toSorted();
      const boardPeersIds = boardData.data.peers.toSorted();

      if (
        JSON.stringify(providerPeersIds) !== JSON.stringify(boardPeersIds) ||
        (providerData.lobbyName &&
          providerData.lobbyName !== boardData.data.name)
      ) {
        boardData.update({
          ...boardData.data,
          name: providerData.lobbyName || boardData.data.name,
          peers: providerPeersIds,
        });
      }
    }
  }, [providerData, boardData, onlineTasksSnapshot, isConsensus]);

  useEffect(() => {
    if (
      providerData &&
      !onlineTasksSnapshot.isLoading &&
      providerData.tasksSnapshot.id !== onlineTasksSnapshot.data?.id &&
      isConsensus
    ) {
      onlineTasksSnapshot.update(providerData.tasksSnapshot);
    }
  }, [isConsensus, onlineTasksSnapshot, providerData]);

  return {
    boardData,
    offlineTasks,
    onlineTasksSnapshot,
    providerData,
    removeBoardData,
    requestUpdate,
    isLoading,
  };
}
