import { TaskData, WithId } from "../lib/types";
import {
  CalendarIcon,
  EditIcon,
  GripHorizontalIcon,
  TrashIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import StatusChip from "./StatusChip";
import { useDraggable } from "@dnd-kit/core";
import { reCalcTimeMs } from "../lib/constants";
import TimeAgo from "javascript-time-ago";

const timeAgo = new TimeAgo("en-US");

export default function TaskItem({
  task,
  onDelete,
  onEdit,
  onShow,
  hideActions,
  disabled,
  isDraggable,
}: {
  task: WithId<TaskData>;
  onDelete?: () => unknown;
  onEdit?: () => unknown;
  onShow?: () => unknown;
  hideActions?: boolean;
  disabled?: boolean;
  isDraggable?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
  });

  const calcTime = useCallback(() => {
    const str = timeAgo.format(task.updatedAt, "mini");
    return str === "0s" ? "just now" : str;
  }, [task.updatedAt]);

  const [time, setTime] = useState(calcTime);

  useEffect(() => {
    const timeoutMs = (Date.now() - task.updatedAt) % reCalcTimeMs;

    let interval: NodeJS.Timeout;
    const timeout = setTimeout(() => {
      interval = setInterval(() => {
        setTime(calcTime());
      }, reCalcTimeMs);
    }, reCalcTimeMs - timeoutMs);

    return () => {
      clearTimeout(timeout!);
      clearInterval(interval!);
    };
  }, [calcTime, task.updatedAt]);

  return (
    <div
      ref={setNodeRef}
      className={`relative rounded-lg bg-white border-1 border-general-50 overflow-hidden ${
        isDragging ? "invisible" : ""
      } ${isDraggable ? "shadow-lg" : ""}`}
      key={task.id}
      {...attributes}
    >
      <div onClick={onShow} className="p-4 w-full text-left cursor-pointer">
        <p className="text-xl font-bold text-ellipsis overflow-hidden max-w-full line-clamp-1 pr-8">
          {task.title}
        </p>
        {task.content && (
          <pre className="font-medium font-sans text-general-80 text-ellipsis overflow-hidden max-w-full line-clamp-2 mt-4">
            {task.content}
          </pre>
        )}
        <div className="gap-2 justify-start flex">
          {task && (
            <StatusChip status={task.status} className="block md:hidden mt-4" />
          )}
          {task?.isOffline && <StatusChip status="OFFLINE" className="mt-4" />}
        </div>
      </div>
      <div className="flex items-center gap-4 p-4 border-t-1 border-general-50">
        {!hideActions && (
          <>
            <button
              title="Delete Task"
              onClick={onDelete}
              disabled={disabled}
              className="text-general-80 cursor-pointer transition disabled:text-general-50"
            >
              <TrashIcon />
            </button>
            <button
              title="Edit Task"
              onClick={onEdit}
              disabled={disabled}
              className="text-general-80 cursor-pointer transition disabled:text-general-50"
            >
              <EditIcon />
            </button>
          </>
        )}
        <div className="flex justify-end gap-2 flex-1 text-general-80">
          <CalendarIcon />
          <p className="font-medium">{time}</p>
        </div>
      </div>
      <span
        className="absolute left-0 bottom-0 flex w-full h-1"
        style={{ background: task.color }}
      />
      {!hideActions && (
        <button
          title="Show Task"
          onClick={onShow}
          disabled={disabled}
          className="absolute text-general-80 transition disabled:text-general-50 top-2 right-3 cursor-grab hidden lg:block"
          {...listeners}
        >
          <GripHorizontalIcon />
        </button>
      )}
    </div>
  );
}
