"use client";

import useBoardManager from "../lib/helpers/useBoardManager ";
import { BoardData } from "../lib/types";
import OfflineToggler from "./OfflineToggler";
import TasksListEditor from "./TasksListEditor";
import { v4 as uuidv4 } from "uuid";

export default function TasksManager() {
  const { boardData, offlineTasks } = useBoardManager();

  return (
    <div>
      <OfflineToggler />
      {!boardData.data && boardData.isLoading ? (
        "Loading board..."
      ) : !boardData.data ? (
        <form
          action={(data) => {
            const newBoardData = {
              ...Object.fromEntries(data),
              peerId: "MT_" + uuidv4(),
              peers: [],
            } as object as BoardData;

            boardData.update(newBoardData);
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
          <button
            onClick={() => {
              boardData.update(null);
              offlineTasks.update(null);
            }}
          >
            EXIT BOARD DATA
          </button>
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
