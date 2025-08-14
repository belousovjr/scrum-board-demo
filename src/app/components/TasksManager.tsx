"use client";

import { useCallback } from "react";
import useBoardManager from "../lib/helpers/useBoardManager ";
import { BoardData } from "../lib/types";
import OfflineToggler from "./OfflineToggler";
import TasksListEditor from "./TasksListEditor";
import { v4 as uuidv4 } from "uuid";
import { useOffline } from "../lib/helpers/useOffline";

export default function TasksManager() {
  const { boardData, offlineTasks, isLoading, providerData } =
    useBoardManager();
  const offlineMode = useOffline();

  const createBoard = useCallback(
    async (newBoardData: BoardData) => {
      await boardData.update(newBoardData);
    },
    [boardData]
  );

  const exitBoard = useCallback(() => {
    boardData.update(null);
    offlineTasks.update(null);
  }, [boardData, offlineTasks]);

  return (
    <div>
      <OfflineToggler />
      {isLoading ? (
        "Loading..."
      ) : !boardData.data ? (
        <form
          action={(data) => {
            const newBoardData = {
              ...Object.fromEntries(data),
              peerId: "MT_" + uuidv4(),
              peers: [],
            } as object as BoardData;

            createBoard(newBoardData);
          }}
        >
          <label>
            Name <input name="name" required />
          </label>
          <button disabled={boardData.isLoading}>Create Board</button>
        </form>
      ) : (
        <div>
          <p>BOARD: {boardData.data.name}</p>
          {!offlineMode.value && <p>{providerData!.peerId}</p>}
          <button onClick={exitBoard}>EXIT BOARD DATA</button>
          <TasksListEditor
            list={offlineTasks.data}
            update={offlineTasks.update}
            isLoading={offlineTasks.isLoading}
            title="OFFLINE TASKS"
          />
        </div>
      )}
    </div>
  );
}
