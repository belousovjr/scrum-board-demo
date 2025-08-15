"use client";

import { useCallback, useDeferredValue, useMemo } from "react";
import useBoardManager from "../lib/helpers/useBoardManager ";
import { BoardData, TaskData, WithId } from "../lib/types";
import OfflineToggler from "./OfflineToggler";
import TasksListEditor from "./TasksListEditor";
import { useOffline } from "../lib/helpers/useOffline";
import { genPeerId } from "../lib/utils";
import { useShortenLink } from "../lib/helpers/useShortenLink";
import { QRCodeSVG } from "qrcode.react";

export default function TasksManager() {
  const {
    boardData,
    offlineTasks,
    onlineTasksSnapshot,
    isLoading,
    providerData,
    removeBoardData,
    requestUpdate,
    syncOfflineTasks,
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

  const link = useMemo(
    () =>
      providerData &&
      window.location.origin + "/?ref_id=" + providerData.peerId,
    [providerData]
  );

  const shortLinkData = useShortenLink(link);

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
              {link && (
                <>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(link).then(() => {
                        alert("LINK COPIED");
                      });
                    }}
                    className="bg-green-400"
                  >
                    COPY LINK
                  </button>
                  {shortLinkData.value ? (
                    <QRCodeSVG
                      size={500}
                      value={shortLinkData.value}
                      className="border-white border-2"
                    />
                  ) : !shortLinkData.isLoading ? (
                    <button
                      onClick={() => {
                        shortLinkData.activate();
                      }}
                    >
                      GENERATE QR
                    </button>
                  ) : (
                    "GENERATE..."
                  )}
                </>
              )}
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
          {!!offlineTasks.data?.length && !offlineMode.value && (
            <button onClick={syncOfflineTasks} disabled={isLoading}>
              SYNC OFFLINE
            </button>
          )}
        </div>
      )}
      <p>{isLoading ? "Loading..." : <span>&nbsp;</span>}</p>
    </div>
  );
}
