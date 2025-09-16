"use client";
import {
  ReactNode,
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { BoardManager } from "../lib/types";
import { useDB } from "../lib/helpers/useDB";
import { usePathname, useRouter } from "next/navigation";
import { initialTasksSnapshot } from "../lib/constants";
import usePeerProvider from "../lib/helpers/usePeerProvider";
import { compareIds, genId } from "../lib/utils";
import useServiceContext from "../lib/helpers/useServiceContext";

export const BoardContext = createContext<BoardManager | null>(null);

export default function BoardContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  const boardData = useDB("boardData");
  const offlineTasks = useDB("offlineTasks");
  const onlineTasksSnapshot = useDB("onlineTasksSnapshot");
  const { isOffline, setNotification } = useServiceContext();
  const router = useRouter();
  const pathname = usePathname();
  const [refId, setRefId] = useState<string | undefined>();
  const isInvChecked = useRef(false);

  const prepTasksSnapshot = useMemo(
    () =>
      onlineTasksSnapshot.isLoading
        ? null
        : onlineTasksSnapshot.data ?? { ...initialTasksSnapshot },
    [onlineTasksSnapshot.data, onlineTasksSnapshot.isLoading]
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
    tasksSnapshot: prepTasksSnapshot,
    onFailedConnection: () => {
      setNotification?.({
        text: "Failed to connect via invite",
        variant: "error",
      });
      removeBoardData();
    },
  });

  const membersNamesIsLoading = useMemo(
    () =>
      !!providerData &&
      [...providerData.connections].some(
        ([id]) => !providerData.memberNames.has(id)
      ),
    [providerData]
  );

  const isLoading = useMemo(
    () =>
      !!(
        boardData.isLoading ||
        boardData.data?.name === null ||
        onlineTasksSnapshot.isLoading ||
        membersNamesIsLoading ||
        (providerData && !onlineTasksSnapshot.data) ||
        (boardData.data && !isOffline && !providerData) ||
        refId
      ),
    [
      boardData.isLoading,
      boardData.data,
      onlineTasksSnapshot.isLoading,
      onlineTasksSnapshot.data,
      membersNamesIsLoading,
      providerData,
      isOffline,
      refId,
    ]
  );

  const createBoardByRef = useCallback(
    async (id: string, peerName: string) => {
      await removeBoardData();
      await boardData.update({
        name: null,
        peerId: genId(),
        peerName,
        peers: [id],
        memberNames: [],
      });
    },
    [removeBoardData, boardData]
  );

  const syncOfflineTasks = useCallback(async () => {
    if (
      isOffline ||
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
      const now = Date.now();
      await requestUpdate(
        [
          ...onlineTasksSnapshot.data.tasks,
          ...offlineTasks.data.map((task) => ({
            ...task,
            updatedAt: now,
            isOffline: false,
          })),
        ],
        offlineTasks.data.map((item) => item.id)
      );

      if (providerData.tasksSnapshot.id !== onlineTasksSnapshot.data.id) {
        await onlineTasksSnapshot.update(providerData!.tasksSnapshot);
      }
      await offlineTasks.update([]);
      setNotification?.({
        text: `${offlineTasksCount} Offline Tasks Synced`,
        variant: "success",
      });
    } catch (e) {
      setNotification?.({ text: String(e), variant: "error" });
    }
  }, [
    isOffline,
    offlineTasks,
    onlineTasksSnapshot,
    providerData,
    requestUpdate,
    setNotification,
  ]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refIdParam = params.get("inv");
    if (refIdParam && !isInvChecked.current) {
      setRefId(refIdParam);
      isInvChecked.current = true;
      router.replace(pathname, { scroll: false });
    }
  }, [pathname, router]);

  useEffect(() => {
    if (
      providerData &&
      boardData.data &&
      compareIds(boardData.data?.peerId, providerData.peerId) &&
      !boardData.isLoading
    ) {
      const providerPeersIds = [...providerData.connections.values()]
        .map((con) => con.connection.peer)
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
      providerData &&
      boardData.data &&
      compareIds(boardData.data.peerId, providerData.peerId) &&
      !onlineTasksSnapshot.isLoading &&
      providerData.tasksSnapshot.id !== onlineTasksSnapshot.data?.id &&
      isConsensus
    ) {
      onlineTasksSnapshot.update(providerData.tasksSnapshot);
    }
  }, [boardData.data, isConsensus, onlineTasksSnapshot, providerData]);

  const isRefExcess = useMemo(
    () =>
      refId &&
      (boardData.data?.peers.some((id) => compareIds(id, refId)) ||
        (boardData.data && compareIds(boardData.data.peerId, refId))),
    [boardData, refId]
  );

  const refOffer = useMemo(
    () => !!(refId && !isRefExcess && !isOffline && !boardData.isLoading),
    [boardData.isLoading, isRefExcess, isOffline, refId]
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
    if (isRefExcess || isOffline) {
      setRefId(undefined);
    }
  }, [isRefExcess, isOffline, refAnswer]);

  return (
    <BoardContext
      value={{
        boardData,
        offlineTasks,
        onlineTasksSnapshot,
        providerData,
        isLoading,
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
