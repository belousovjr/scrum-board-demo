export type TaskStatus = "TODO" | "PROCESS" | "COMPLETED";

export interface TaskData {
  title: string;
  content: string;
  status: TaskStatus;
  online: boolean;
  updatedAt: number;
}

export interface BoardData {
  name: string;
  peers: string[];
}

export type WithId<T extends object> = T & { id: string };
