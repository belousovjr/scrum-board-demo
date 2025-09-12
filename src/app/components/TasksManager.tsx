"use client";

import { useCallback, useState } from "react";
import useBoardManager from "../lib/helpers/useBoardManager ";
import { BoardData } from "../lib/types";
import { Button, Modal } from "@belousovjr/uikit";
import dynamic from "next/dynamic";
import InviteForm from "./InviteForm";
const Header = dynamic(() => import("./Header"));
const CreateBoardForm = dynamic(() => import("./CreateBoardForm"));
const TasksList = dynamic(() => import("./TasksList"));
const Snackbar = dynamic(() => import("./Snackbar"));
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en";
import useServiceContext from "../lib/helpers/useServiceContext";

TimeAgo.addDefaultLocale(en);

export default function TasksManager() {
  const manager = useBoardManager();
  const { isPrimaryPage, isTimeValid } = useServiceContext();
  const [modalState, setModalState] = useState({
    showClose: false,
  });
  const [loadingState, setLoadingState] = useState({
    ref: false,
    close: false,
  });

  const createBoard = useCallback(
    async (newBoardData: BoardData) => {
      await manager.boardData.update(newBoardData);
    },
    [manager]
  );

  const closeBoard = useCallback(async () => {
    try {
      setLoadingState((prev) => ({ ...prev, close: true }));
      await manager.removeBoardData();
      setModalState({
        showClose: false,
      });
    } finally {
      setLoadingState((prev) => ({ ...prev, close: false }));
    }
  }, [manager]);

  const connectByRefWithPeerName = useCallback(
    async (createWithPeerName: string | false) => {
      try {
        setLoadingState((prev) => ({ ...prev, ref: true }));
        await manager.refAnswer(createWithPeerName);
      } finally {
        setLoadingState((prev) => ({ ...prev, ref: false }));
      }
    },
    [manager]
  );

  return (
    <>
      <Header
        onCloseBoard={() =>
          setModalState((prev) => ({ ...prev, showClose: true }))
        }
      />
      <div className="grid grid-cols-4 lg:grid-cols-12 gap-8 items-center px-2 pt-16 pb-8 md:px-8 mx-auto w-full min-h-dvh max-w-[1920px]">
        {manager && !manager.boardData.data ? (
          !manager.isLoading && (
            <div className="col-span-4 lg:col-start-5">
              <CreateBoardForm create={createBoard} />
            </div>
          )
        ) : (
          <div className="col-span-4 lg:col-span-12 min-h-full">
            <TasksList />
          </div>
        )}
      </div>

      {!!manager && (
        <>
          <Modal
            isOpen={manager.refOffer}
            className="w-[520px] bg-primary-100 text-white"
          >
            <InviteForm
              defaultName={manager.boardData.data?.peerName}
              loading={loadingState.ref}
              connect={connectByRefWithPeerName}
              close={() => connectByRefWithPeerName(false)}
            />
          </Modal>
          <Modal
            isOpen={!!modalState.showClose}
            onClose={() =>
              setModalState((prev) => ({ ...prev, showClose: false }))
            }
            className="w-[600px] grid gap-5"
          >
            <p className="text-xl font-bold">Close Board</p>
            <p className="text-base">Data may be lost permanently.</p>
            <div className="flex justify-end gap-2">
              <Button
                variant="destructiveSecondary"
                onClick={() =>
                  setModalState((prev) => ({ ...prev, showClose: false }))
                }
                type="button"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={closeBoard}
                loading={loadingState.close}
                autoFocus
              >
                Delete
              </Button>
            </div>
          </Modal>
          <Modal
            isOpen={!isPrimaryPage}
            className="w-[520px] bg-red-100 text-white grid gap-5 z-50"
          >
            <p className="text-xl font-bold">
              The application is open in another tab
            </p>
            <div className="font-sans">Please close the rest of the pages.</div>
            <div className="flex justify-end gap-2">
              <Button
                variant="destructive"
                onClick={() => {
                  window.location.reload();
                }}
                loading={loadingState.close}
                autoFocus
              >
                Reload Page
              </Button>
            </div>
          </Modal>
          <Modal
            isOpen={!isTimeValid}
            className="w-[520px] bg-red-100 text-white grid gap-5 z-50"
          >
            <p className="text-xl font-bold">Incorrect Local Time</p>
            <p className="text-base">Please update your device clock.</p>
            <div className="flex justify-end gap-2">
              <Button
                variant="destructive"
                onClick={() => {
                  window.location.reload();
                }}
                loading={loadingState.close}
                autoFocus
              >
                Reload Page
              </Button>
            </div>
          </Modal>
        </>
      )}
      <Snackbar />
    </>
  );
}
