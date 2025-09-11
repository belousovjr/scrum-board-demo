import { useDroppable } from "@dnd-kit/core";
import { TaskData, TaskStatus, TaskType, WithId } from "../lib/types";
import TaskItem from "./TaskItem";
import { useMemo } from "react";
import { Button } from "@belousovjr/uikit";
import { PlusIcon } from "lucide-react";

export default function TasksListSection({
  tasks,
  type,
  isOffline,
  providerIsReady,
  onDelete,
  setStatus,
  onShow,
  setEditTask,
}: {
  tasks: WithId<TaskData>[];
  type: TaskType;
  isOffline?: boolean;
  providerIsReady: boolean;
  onDelete: (task: WithId<TaskData>) => unknown;
  setStatus: (task: TaskStatus) => unknown;
  onShow: (task: WithId<TaskData>) => unknown;
  setEditTask: (task: WithId<TaskData>) => unknown;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: type,
  });
  const isOverEffect = useMemo(() => isOver, [isOver]);
  const isMobile = type === "MOBILE";

  return (
    <div ref={setNodeRef} className="flex flex-col gap-y-4">
      {!isMobile && (
        <div className="relative text-lg font-medium border-b-1 border-general-80 py-4 transition-colors">
          {type}
          <span
            className={`absolute right-1/2 translate-x-1/2 -bottom-px w-0 transition-[width] bg-primary-100 h-0.5 ${
              isOverEffect ? "w-full" : ""
            }`}
          />
        </div>
      )}
      <Button
        variant="white"
        icon={<PlusIcon />}
        size="sm"
        onClick={() => {
          setStatus(!isMobile ? type : "TODO");
        }}
        disabled={isOffline !== !providerIsReady}
      >
        {!isOffline ? "New Task" : "New Offline Task"}
      </Button>
      <div className="flex flex-col gap-y-4 transition-transform">
        {tasks!.map((item) => (
          <TaskItem
            key={item.id}
            task={item}
            onDelete={() => {
              onDelete(item);
            }}
            onEdit={() => {
              setStatus(item.status);
              setEditTask(item);
            }}
            onShow={() => {
              onShow(item);
            }}
            disabled={!providerIsReady && !item.isOffline}
            hideActions={isOffline === !item.isOffline}
          />
        ))}
      </div>
    </div>
  );
}
