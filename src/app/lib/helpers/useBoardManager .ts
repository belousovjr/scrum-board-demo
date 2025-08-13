import { useCallback } from "react";
import { useDB } from "./useDB";
import { TaskData } from "../types";
import { v4 as uuidv4 } from "uuid";

export default function useBoardManager() {
  const boardData = useDB("boardData");
  const offlineTasks = useDB("offlineTasks", []);

  const addToOfflineList = useCallback(
    async (item: TaskData) => {
      if (!offlineTasks.isLoading) {
        await offlineTasks.update([
          ...(offlineTasks.data || []),
          { ...item, id: uuidv4() },
        ]);
      }
    },
    [offlineTasks]
  );
  const removeFromOfflineList = useCallback(
    async (id: string) => {
      if (!offlineTasks.isLoading && offlineTasks.data?.length) {
        await offlineTasks.update([
          ...offlineTasks.data.filter((item) => item.id !== id),
        ]);
      }
    },
    [offlineTasks]
  );

  const updateInOfflineList = useCallback(
    async (id: string, data: TaskData) => {
      if (!offlineTasks.isLoading && offlineTasks.data?.length) {
        await offlineTasks.update([
          ...offlineTasks.data.map((item) =>
            item.id !== id ? item : { ...data, id }
          ),
        ]);
      }
    },
    [offlineTasks]
  );

  return {
    boardData,
    offlineTasks: {
      data: offlineTasks.data,
      isLoading: offlineTasks.isLoading,
      add: addToOfflineList,
      remove: removeFromOfflineList,
      update: updateInOfflineList,
    },
  };
}
