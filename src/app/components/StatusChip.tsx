import { statusClasses } from "../lib/constants";
import { TaskStatus } from "../lib/types";

export default function StatusChip({
  status,
  className,
}: {
  status: TaskStatus | "OFFLINE";
  className?: string;
}) {
  return (
    <div
      className={`rounded-sm px-2 py-1 font-normal ${statusClasses[status]} ${
        className ?? ""
      }`}
    >
      {status}
    </div>
  );
}
