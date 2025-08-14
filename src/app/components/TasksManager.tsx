"use client";

import { useCallback, useEffect } from "react";
import useBoardManager from "../lib/helpers/useBoardManager ";
import { BoardData } from "../lib/types";
import OfflineToggler from "./OfflineToggler";
import TasksListEditor from "./TasksListEditor";
import { useOffline } from "../lib/helpers/useOffline";
import { genPeerId } from "../lib/utils";

export default function TasksManager() {
  const { boardData, offlineTasks, isLoading, providerData, removeBoardData } =
    useBoardManager();
  const offlineMode = useOffline();

  const createBoard = useCallback(
    async (newBoardData: BoardData) => {
      await boardData.update(newBoardData);
    },
    [boardData]
  );

  return (
    <div>
      <OfflineToggler />
      {!boardData.data ? (
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
      ) : (
        <div>
          <p>BOARD: {boardData.data.name}</p>

          {!offlineMode.value && providerData && (
            <div>
              <p>{providerData!.peerData.id}</p>
              <button
                onClick={() => {
                  navigator.clipboard
                    .writeText(
                      window.location.origin +
                        "/?ref_data=" +
                        JSON.stringify({
                          id: providerData!.peerData.id,
                          name: providerData!.lobbyName,
                        })
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
