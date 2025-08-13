export type TaskStatus = "TODO" | "PROCESS" | "COMPLETED";

export interface TaskData {
  title: string;
  content: string;
  status: TaskStatus;
  updatedAt: number;
}

export interface BoardData {
  name: string;
}

export type WithId<T extends object> = T & { id: string };
