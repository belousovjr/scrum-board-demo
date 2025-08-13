"use client";

import useBoardManager from "../lib/helpers/useBoardManager ";
import { BoardData } from "../lib/types";
import TasksListEditor from "./TasksListEditor";

export default function TasksManager() {
  const { boardData, offlineTasks } = useBoardManager();

  return (
    <div>
      {!boardData.data && boardData.isLoading ? (
        "Loading board..."
      ) : !boardData.data ? (
        <form
          action={(data) => {
            const formData = {
              ...Object.fromEntries(data),
              peers: [],
            } as object as BoardData;
            boardData.update(formData);
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
