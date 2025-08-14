"use client";

import { useCallback, useDeferredValue } from "react";
import useBoardManager from "../lib/helpers/useBoardManager ";
import { BoardData, TaskData, WithId } from "../lib/types";
import OfflineToggler from "./OfflineToggler";
import TasksListEditor from "./TasksListEditor";
import { useOffline } from "../lib/helpers/useOffline";
import { genPeerId } from "../lib/utils";

export default function TasksManager() {
  const {
    boardData,
    offlineTasks,
    onlineTasksSnapshot,
    isLoading,
    providerData,
    removeBoardData,
    requestUpdate,
  } = useBoardManager();
  const offlineMode = useOffline();

  const defOffline = useDeferredValue(offlineMode.value);

  const createBoard = useCallback(
    async (newBoardData: BoardData) => {
      await boardData.update(newBoardData);
    },
    [boardData]
  );

  const updateOnlineHandler = useCallback(
    async (tasks: WithId<TaskData>[], id: string) => {
      if (requestUpdate) {
        try {
          await requestUpdate(tasks, [id]);
        } catch {
          alert("ERROR! COLLISION ");
        }
      }
    },
    [requestUpdate]
  );

  return (
    <div>
      <OfflineToggler />
      {!boardData.data ? (
        !isLoading && (
          <form
            action={(data) => {
              const newBoardData = {
                ...Object.fromEntries(data),
                peerId: genPeerId(),
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
        )
      ) : (
        <div>
          <p>BOARD: {boardData.data.name}</p>

          {!defOffline && providerData && (
            <div>
              <p>{providerData!.peerId}</p>
              <button
                onClick={() => {
                  navigator.clipboard
                    .writeText(
                      window.location.origin +
                        "/?ref_id=" +
                        providerData!.peerId
                    )
                    .then(() => {
                      alert("LINK COPIED");
                    });
                }}
                className="bg-green-400"
              >
                COPY LINK
              </button>
              <p>MEMBERS</p>
              {providerData!.connections.size ? (
                [...providerData!.connections.values()].map((item) => (
                  <div key={item.memberData.id}>{item.memberData.id}</div>
                ))
              ) : (
                <p>{"No members :("}</p>
              )}
            </div>
          )}
          <button onClick={removeBoardData}>EXIT BOARD DATA</button>

          <TasksListEditor
            list={onlineTasksSnapshot.data?.tasks || null}
            update={updateOnlineHandler}
            isLoading={onlineTasksSnapshot.isLoading}
            disabled={defOffline}
            title="ONLINE TASKS"
          />
          <TasksListEditor
            list={offlineTasks.data}
            update={offlineTasks.update}
            isLoading={offlineTasks.isLoading}
            title="OFFLINE TASKS"
          />
        </div>
      )}
      {isLoading ? "Loading..." : ""}
    </div>
  );
}
