import { useDroppable } from "@dnd-kit/core";
import { TaskData, TaskStatus, TaskType, WithId } from "../lib/types";
import TaskItem from "./TaskItem";
import { useMemo } from "react";
import { Button } from "@belousovjr/uikit";
import { PlusIcon } from "lucide-react";
import { statusesTitles } from "../lib/constants";
import useServiceContext from "../lib/helpers/useServiceContext";
import TutorialTip from "./TutorialTip";

export default function TasksListSection({
  tasks,
  type,
  providerIsReady,
  onDelete,
  setStatus,
  onShow,
  setEditTask,
}: {
  tasks: WithId<TaskData>[];
  type: TaskType;
  providerIsReady: boolean;
  onDelete: (taskId: string) => unknown;
  setStatus: (status: TaskStatus) => unknown;
  onShow: (taskId: string) => unknown;
  setEditTask: (taskId: string) => unknown;
}) {
  const { isOffline } = useServiceContext();
  const { isOver, setNodeRef, active } = useDroppable({
    id: type,
  });
  const isMobile = type === "MOBILE";

  const disabled = useMemo(
    () => !isOffline && !providerIsReady,
    [isOffline, providerIsReady]
  );

  return (
    <div ref={setNodeRef} className="flex flex-col gap-y-4">
      {!isMobile && (
        <div className="relative text-lg font-medium border-b-1 border-general-80 py-4 transition-colors">
          {statusesTitles[type]}
          <span
            className={`absolute right-1/2 translate-x-1/2 -bottom-px w-0 transition-[width] bg-primary-100 h-0.5 ${
              isOver ? "w-full" : ""
            }`}
          />
        </div>
      )}
      <div className="pt-2 w-full">
        <TutorialTip
          status={!isOffline ? "ADD_TASK" : "ADD_OFFLINE_TASK"}
          hidden={type !== "TODO" && type != "MOBILE"}
          active
          disabled={disabled}
        >
          <Button
            variant="white"
            icon={<PlusIcon />}
            size="sm"
            disabled={disabled}
            onClick={() => {
              setStatus(!isMobile ? type : "TODO");
            }}
            className="w-full"
          >
            {!isOffline ? "New Task" : "New Offline Task"}
          </Button>
        </TutorialTip>
      </div>
      <div className="flex flex-col gap-y-4 transition-transform0">
        {tasks!.map((item, i) => (
          <TutorialTip
            status="CHANGE_TASK_STATUS"
            active
            disabled={!!active || disabled}
            hidden={(type !== "TODO" && type != "MOBILE") || !!i}
            key={item.id}
          >
            <TaskItem
              task={item}
              onDelete={() => {
                onDelete(item.id);
              }}
              onEdit={() => {
                setStatus(item.status);
                setEditTask(item.id);
              }}
              onShow={() => {
                onShow(item.id);
              }}
              disabled={disabled}
              hideActions={isOffline === !item.isOffline}
            />
          </TutorialTip>
        ))}
      </div>
    </div>
  );
}
