import { Button, Tooltip } from "@belousovjr/uikit";
import { ReactNode, useMemo, ComponentProps } from "react";
import { EditIcon, GripHorizontalIcon } from "lucide-react";
import { TutorialStatusOption } from "../lib/types";
import useTutorial from "../lib/helpers/useTutorial";

export default function TutorialTip({
  hidden,
  disabled,
  status,
  defaultPosition = "bottom",
  children,
}: {
  hidden?: boolean;
  disabled?: boolean;
  status: TutorialStatusOption;
  defaultPosition?: ComponentProps<typeof Tooltip>["defaultPosition"];
  children: ReactNode;
}) {
  const content = useMemo<ReactNode>(() => {
    switch (status) {
      case "ADD_TASK":
        return (
          <span>
            Add a <span className="font-bold">New Task</span> with the{" "}
            <span className="font-bold">TODO</span> status.
            <span className="lg:hidden "> it is selected by default.</span>
          </span>
        );
      case "CHANGE_TASK_STATUS":
        return (
          <div className="grid gap-2">
            <span>
              <span className="font-bold">Edit your Task</span> by clicking:{" "}
              <EditIcon className="inline ml-3 bg-primary-70 outline-2 outline-primary-70 rounded-sm" />
            </span>
            <span className="hidden lg:inline">
              Or <span className="font-bold">Change Status</span> by holding
              down:{" "}
              <GripHorizontalIcon className="inline ml-3 bg-primary-70 outline-2 outline-primary-70 rounded-sm" />
            </span>
          </div>
        );
      case "TURN_ON_OFFLINE_MODE":
        return (
          <span>
            Turn on <span className="font-bold">Offline Mode</span> using the
            switch,
            <br />
            or <span className="font-bold">Disable Internet</span> on your
            device.
          </span>
        );
      case "ADD_OFFLINE_TASK":
        return (
          <span>
            Add <span className="font-bold">Offline Task</span>. Changes will be
            made locally.
          </span>
        );
      case "TURN_OFF_OFFLINE_MODE":
        return (
          <span>
            Turn off <span className="font-bold">Offline Mode</span>.
          </span>
        );
      case "SYNC":
        return (
          <span>
            <span className="font-bold">Sync</span> your{" "}
            <span className="font-bold">Offline Tasks</span> with the online
            list.
          </span>
        );
      case "ADD_MEMBER":
        return (
          <span>
            Add a <span className="font-bold">New Member</span> using an{" "}
            <span className="font-bold">Invite Link</span>
            <br /> or <span className="font-bold">QR Code</span>.
          </span>
        );
      case "FINAL":
        return null;
      default:
        const unknown: unknown = status;
        throw Error(`Unknown status: ${unknown}`);
    }
  }, [status]);

  const { lastActiveStatus, checkStatus } = useTutorial();

  return !hidden ? (
    <Tooltip
      isOpen={lastActiveStatus === status && !disabled}
      defaultPosition={defaultPosition}
      className="p-7 z-30"
      arrowDistance={13}
      content={
        <div className="grid gap-6">
          {content}
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => {
                checkStatus("FINAL");
              }}
              size="sm"
              variant="secondary"
            >
              Skip Tutorial
            </Button>
          </div>
        </div>
      }
    >
      <span className="flex rounded-md outline-3 outline-transparent outline-offset-3 group-data-[opened=true]/tooltip-activator:outline-primary-100">
        {children}
      </span>
    </Tooltip>
  ) : (
    children
  );
}
