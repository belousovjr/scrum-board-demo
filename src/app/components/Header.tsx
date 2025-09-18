import {
  CircleXIcon,
  KanbanIcon,
  LinkIcon,
  RotateCcwIcon,
  UserRoundPlusIcon,
  RefreshCcwIcon,
} from "lucide-react";

import OfflineToggle from "./OfflineToggle";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { MemberAvatar } from "./MemberAvatar";
import { Button, Modal } from "@belousovjr/uikit";
import { useShortenLink } from "../lib/helpers/useShortenLink";
import { QRCodeSVG } from "qrcode.react";
import DebouncedLoader from "./DebouncedLoader";
import useBoardManager from "../lib/helpers/useBoardManager";
import useServiceContext from "../lib/helpers/useServiceContext";
import dynamic from "next/dynamic";
import useOfflineMode from "../lib/helpers/useOfflineMode";
import useTutorial from "../lib/helpers/useTutorial";
const TutorialTip = dynamic(() => import("./TutorialTip"));

export default function Header({
  onCloseBoard,
}: {
  onCloseBoard?: () => unknown;
}) {
  const manager = useBoardManager();
  const { checkStatus, lastActiveStatus } = useTutorial();

  const { setNotification } = useServiceContext();
  const { isOffline } = useOfflineMode();
  const defIsOffline = useDeferredValue(isOffline);

  const [isScrolled, setIsScrolled] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);

  const link = useMemo(
    () =>
      manager.providerData &&
      window.location.origin + "/?inv=" + manager.providerData.peerId,
    [manager.providerData]
  );
  const shortLink = useShortenLink(link ?? null);

  const namedMembers = useMemo(
    () =>
      [...(manager.providerData?.memberNames || [])].filter(([id]) =>
        manager.providerData?.connections.has(id)
      ),
    [manager.providerData]
  );

  const offlineTasksCount = useMemo(
    () => manager.offlineTasks.data?.length,
    [manager.offlineTasks.data]
  );

  useEffect(() => {
    const scrollHandler = () => {
      setIsScrolled(window.scrollY > 0);
    };
    document.addEventListener("scroll", scrollHandler);
    return () => {
      document.removeEventListener("scroll", scrollHandler);
    };
  });

  useEffect(() => {
    if (!defIsOffline && manager.providerData && namedMembers.length) {
      checkStatus("FINAL");
      setNotification?.({
        text: "The tutorial is complete. Enjoy!",
        variant: "success",
      });
    }
  }, [
    checkStatus,
    defIsOffline,
    manager.providerData,
    namedMembers.length,
    setNotification,
  ]);

  useEffect(() => {
    checkStatus("SYNC", () => !defIsOffline && !!offlineTasksCount);
  }, [checkStatus, defIsOffline, offlineTasksCount]);

  return (
    <div className="fixed w-full z-10 bg-white">
      <div
        data-scrolled={isScrolled}
        className="flex gap-5 items-center md:px-8 h-16 mx-auto px-2 w-full max-w-[1920px] transition-[box-shadow] data-[scrolled=true]:shadow-xs"
      >
        <div className="flex gap-4 items-center overflow-hidden">
          <KanbanIcon
            strokeWidth={2.5}
            className="hidden lg:flex flex-1 min-w-6"
          />
          {manager.boardData.data?.name && (
            <div className="text-2xl font-medium text-nowrap overflow-hidden overflow-ellipsis">
              {manager.boardData.data.name}
            </div>
          )}
          <DebouncedLoader active={manager.isLoading} className="shrink-0" />
        </div>
        <div className="flex flex-1 gap-5 items-center justify-end">
          {!defIsOffline && manager.providerData && (
            <>
              {!!namedMembers.length && (
                <button
                  className="flex shrink-0 gap-2 cursor-pointer"
                  onClick={() => {
                    setIsMembersOpen(true);
                  }}
                >
                  {namedMembers
                    .slice(0, namedMembers.length > 2 ? 1 : 2)
                    .map(([id, name]) => (
                      <MemberAvatar key={id} value={name} title={name} />
                    ))}
                  {namedMembers.length > 2 && (
                    <div
                      title={namedMembers
                        .slice(1)
                        .map(([, name]) => name)
                        .join(" ")}
                      className="w-5 h-5 rounded-full px-1 font-medium bg-primary-100 text-white text-[0.625rem]/[1.25rem] font-mono select-none"
                    >
                      +{namedMembers.length - 1}
                    </div>
                  )}
                </button>
              )}
              {!!offlineTasksCount && (
                <TutorialTip status="SYNC">
                  <button
                    onClick={() => {
                      manager.syncOfflineTasks().then(() => {
                        checkStatus("ADD_MEMBER");
                      });
                    }}
                    title={`Synchronize ${offlineTasksCount} Offline Tasks`}
                    className={`relative cursor-pointer text-primary-100`}
                  >
                    <RefreshCcwIcon />
                    <span className="absolute right-0 -top-0.5 bg-primary-100 rounded-full font-mono text-white font-medium text-[0.5rem]/[0.75rem] h-3 min-w-3 px-0.5">
                      {offlineTasksCount}
                    </span>
                  </button>
                </TutorialTip>
              )}
              <TutorialTip status="ADD_MEMBER">
                <button
                  onClick={() => {
                    setIsShareOpen(true);
                  }}
                  title="Invite Members"
                  className="cursor-pointer text-primary-100"
                >
                  <UserRoundPlusIcon />
                </button>
              </TutorialTip>
            </>
          )}
          {manager.boardData.data && (
            <button
              onClick={onCloseBoard}
              title="Close Board"
              className="cursor-pointer text-red-100"
            >
              <CircleXIcon />
            </button>
          )}
          <TutorialTip
            status={
              lastActiveStatus === "TURN_ON_OFFLINE_MODE" ||
              lastActiveStatus === "ADD_OFFLINE_TASK"
                ? "TURN_ON_OFFLINE_MODE"
                : "TURN_OFF_OFFLINE_MODE"
            }
            disabled={isOffline && !offlineTasksCount}
            hidden={!manager.boardData.data}
          >
            <OfflineToggle />
          </TutorialTip>
        </div>
      </div>
      <Modal
        isOpen={isShareOpen && !defIsOffline}
        onClose={() => {
          setIsShareOpen(false);
        }}
        className="w-full max-w-[400px] grid gap-5"
      >
        <p className="text-xl font-bold">Invite Members</p>
        <Button
          icon={<LinkIcon />}
          size="sm"
          variant="secondary"
          onClick={() => {
            navigator.clipboard.writeText(link!).then(() => {
              setNotification?.({ text: "Link copied", variant: "success" });
            });
          }}
          autoFocus
        >
          Copy Invite Link
        </Button>
        <div className="relative flex items-center justify-center w-full aspect-square">
          <QRCodeSVG
            value={shortLink.value || ""}
            className={`w-full h-full transition-[filter,opacity] ${
              !shortLink.value ? "blur-xs opacity-50" : ""
            }`}
          />
          {!shortLink.value && (
            <Button
              size="lg"
              onClick={() => {
                shortLink.activate();
              }}
              loading={shortLink.isLoading}
              icon={<RotateCcwIcon />}
              className="absolute"
            >
              Generate QR
            </Button>
          )}
        </div>
      </Modal>
      <Modal
        isOpen={isMembersOpen}
        onClose={() => {
          setIsMembersOpen(false);
        }}
        className="grid gap-5"
      >
        <p className="text-xl font-bold">Members ({namedMembers.length})</p>
        <div className="grid gap-4 content-start min-w-[400px] min-h-[200px]">
          {namedMembers.map(([id, name]) => (
            <div key={id} className="flex items-center gap-4 font-medium">
              <MemberAvatar key={id} value={name} />
              <span>{name}</span>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
