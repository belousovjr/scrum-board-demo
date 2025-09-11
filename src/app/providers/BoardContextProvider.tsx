"use client";
import {
  ReactNode,
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { BoardManager } from "../lib/types";
import { useDB } from "../lib/helpers/useDB";
import { useOffline } from "../lib/helpers/useOffline";
import { usePathname, useRouter } from "next/navigation";
import { initialTasksSnapshot } from "../lib/constants";
import usePeerProvider from "../lib/helpers/usePeerProvider";
import { v4 as uuidv4 } from "uuid";
import { snackbar } from "../lib/utils";

export const BoardContext = createContext<BoardManager | null>(null);

export default function BoardContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  const boardData = useDB("boardData");
  const offlineTasks = useDB("offlineTasks");
  const onlineTasksSnapshot = useDB("onlineTasksSnapshot");
  const offlineMode = useOffline();
  const router = useRouter();
  const pathName = usePathname();
  const [refId, setRefId] = useState<string | undefined>();
  const [tabError, setTabError] = useState(false);

  const prepTasksSnapshot = useMemo(
    () =>
      onlineTasksSnapshot.isLoading
        ? null
        : onlineTasksSnapshot.data ?? { ...initialTasksSnapshot },
    [onlineTasksSnapshot.data, onlineTasksSnapshot.isLoading]
  );

  const isProviderNeeded = useMemo(
    () => !!(boardData.data && !offlineMode.value),
    [boardData.data, offlineMode.value]
  );

  const removeBoardData = useCallback(() => {
    setRefId(undefined);
    return Promise.all([
      boardData.update(null),
      offlineTasks.update(null),
      onlineTasksSnapshot.update(null),
    ]);
  }, [boardData, offlineTasks, onlineTasksSnapshot]);

  const { providerData, requestUpdate, isConsensus } = usePeerProvider({
    boardData: boardData.data,
    enabled: !!boardData.data,
    tasksSnapshot: prepTasksSnapshot,
    onFailedConnection: removeBoardData,
    onFailedTab: () => {
      setTabError(true);
    },
  });

  const isLoading = useMemo(
    () =>
      boardData.isLoading ||
      onlineTasksSnapshot.isLoading ||
      (providerData && onlineTasksSnapshot.data === null) ||
      (isProviderNeeded && !providerData) ||
      !!refId,
    [
      boardData.isLoading,
      isProviderNeeded,
      providerData,
      refId,
      onlineTasksSnapshot,
    ]
  );

  const createBoardByRef = useCallback(
    async (id: string, peerName: string) => {
      await removeBoardData();
      await boardData.update({
        name: null,
        peerId: uuidv4(),
        peerName,
        peers: [id],
        memberNames: [],
      });
    },
    [removeBoardData, boardData]
  );

  const syncOfflineTasks = useCallback(async () => {
    if (
      offlineMode.value ||
      onlineTasksSnapshot.isLoading ||
      offlineTasks.isLoading ||
      !onlineTasksSnapshot.data ||
      !offlineTasks.data ||
      !providerData ||
      !requestUpdate
    ) {
      return;
    }
    try {
      const offlineTasksCount = offlineTasks.data.length;
      await requestUpdate(
        [
          ...onlineTasksSnapshot.data.tasks,
          ...offlineTasks.data.map((task) => ({ ...task, isOffline: false })),
        ],
        offlineTasks.data.map((item) => item.id)
      );

      if (providerData.tasksSnapshot.id !== onlineTasksSnapshot.data.id) {
        await onlineTasksSnapshot.update(providerData!.tasksSnapshot);
      }
      await offlineTasks.update([]);
      snackbar({
        text: `${offlineTasksCount} Offline Tasks Synced`,
        variant: "success",
      });
    } catch (e) {
      snackbar({ text: String(e), variant: "error" });
    }
  }, [
    offlineMode.value,
    offlineTasks,
    onlineTasksSnapshot,
    providerData,
    requestUpdate,
  ]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refIdParam = params.get("inv");
    if (refIdParam) {
      setRefId(refIdParam);
      router.replace(pathName, { scroll: false });
    }
  }, [pathName, router]);

  useEffect(() => {
    if (providerData && !boardData.isLoading && boardData.data) {
      const providerPeersIds = Array.from(providerData?.connections)
        .map(([id]) => id)
        .toSorted();
      const boardPeersIds = boardData.data.peers.toSorted();
      const providerMemberNames = [...providerData.memberNames];

      if (
        JSON.stringify(providerPeersIds) !== JSON.stringify(boardPeersIds) ||
        JSON.stringify(providerMemberNames) !==
          JSON.stringify(boardData.data.memberNames) ||
        (providerData.lobbyName !== null &&
          providerData.lobbyName !== boardData.data.name)
      ) {
        boardData.update({
          ...boardData.data,
          name: providerData.lobbyName || boardData.data.name,
          peers: providerPeersIds,
          memberNames: providerMemberNames,
        });
      }
    }
  }, [boardData, providerData]);

  useEffect(() => {
    if (
      !onlineTasksSnapshot.isLoading &&
      providerData &&
      providerData.tasksSnapshot.id !== onlineTasksSnapshot.data?.id &&
      isConsensus
    ) {
      onlineTasksSnapshot.update(providerData.tasksSnapshot);
    }
  }, [isConsensus, onlineTasksSnapshot, providerData]);

  const isRefExcess = useMemo(
    () =>
      refId &&
      (boardData.data?.peers.includes(refId) ||
        boardData.data?.peerId === refId),
    [boardData, refId]
  );

  const refOffer = useMemo(
    () =>
      !!(refId && !isRefExcess && !offlineMode.value && !boardData.isLoading),
    [boardData.isLoading, isRefExcess, offlineMode.value, refId]
  );

  const refAnswer = useCallback(
    async (createWithPeerName: string | false) => {
      if (refId && createWithPeerName) {
        await createBoardByRef(refId, createWithPeerName);
      } else {
        setRefId(undefined);
      }
    },
    [createBoardByRef, refId]
  );

  useEffect(() => {
    if (isRefExcess) {
      setRefId(undefined);
    }
  }, [isRefExcess, refAnswer]);

  return (
    <BoardContext
      value={{
        boardData,
        offlineTasks,
        onlineTasksSnapshot,
        providerData,
        isLoading,
        tabError,
        refOffer,
        refAnswer,
        removeBoardData,
        requestUpdate,
        syncOfflineTasks,
      }}
    >
      {children}
    </BoardContext>
  );
}
