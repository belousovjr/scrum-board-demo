import { useCallback, useEffect, useMemo, useState } from "react";
import { useDB } from "./useDB";
import { useOffline } from "./useOffline";
import usePeerProvider from "./usePeerProvider";
import { usePathname, useRouter } from "next/navigation";
import { genPeerId } from "../utils";
import { RefData } from "../types";

export default function useBoardManager() {
  const boardData = useDB("boardData");
  const offlineTasks = useDB("offlineTasks", []);
  const offlineMode = useOffline();
  const router = useRouter();
  const pathName = usePathname();

  const [refData, setRefData] = useState<RefData>();

  const isProviderNeeded = useMemo(() => {
    return !!(boardData.data && !offlineMode.value);
  }, [boardData.data, offlineMode.value]);

  const providerData = usePeerProvider({
    boardData: boardData.data,
    enabled: isProviderNeeded,
  });

  const isLoading = useMemo(
    () =>
      !!(
        boardData.isLoading ||
        (isProviderNeeded && !providerData) ||
        (refData && !providerData)
      ),
    [boardData.isLoading, isProviderNeeded, providerData, refData]
  );

  const removeBoardData = useCallback(() => {
    setRefData(undefined);
    return Promise.all([boardData.update(null), offlineTasks.update(null)]);
  }, [boardData, offlineTasks]);

  const createBoardByRef = useCallback(
    async ({ name, id }: RefData) => {
      offlineTasks.update(null);
      await boardData.update({ name, peerId: genPeerId(), peers: [id] });
    },
    [offlineTasks, boardData]
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refDataString = params.get("ref_data");

    if (refDataString) {
      setRefData(JSON.parse(refDataString) as RefData);
      router.replace(pathName, { scroll: false });
    }
  }, [pathName, router]);

  useEffect(() => {
    if (
      refData &&
      !providerData &&
      !boardData.isLoading &&
      !boardData.data?.peers.includes(refData.id) &&
      boardData.data?.peerId !== refData.id
    ) {
      createBoardByRef(refData);
    }
  }, [
    boardData.data?.peerId,
    boardData.data?.peers,
    boardData.isLoading,
    createBoardByRef,
    providerData,
    refData,
  ]);

  useEffect(() => {
    if (providerData && !boardData.isLoading && boardData.data) {
      const providerPeersIds = Array.from(providerData?.connections)
        .map(([id]) => id)
        .toSorted();
      const boardPeersIds = boardData.data.peers.toSorted();
      if (JSON.stringify(providerPeersIds) !== JSON.stringify(boardPeersIds)) {
        boardData.update({
          ...boardData.data,
          peers: providerPeersIds,
        });
      }
    }
  }, [providerData, boardData]);

  return {
    boardData,
    offlineTasks,
    providerData,
    removeBoardData,
    isLoading,
  };
}
