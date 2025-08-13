import { openDB, DBSchema, IDBPDatabase } from "idb";
import { TaskData, WithId } from "./types";

interface BoardData {
  name: string;
}

export interface TaskMeshDBSchemaRaw {
  boardData: {
    key: "data";
    value: BoardData;
  };
  offlineTasks: {
    key: "data";
    value: WithId<TaskData>[];
  };
  onlineTasks: {
    key: "data";
    value: WithId<TaskData>[];
  };
}

interface TaskMeshDBSchema extends TaskMeshDBSchemaRaw, DBSchema {}

export async function getDb(): Promise<IDBPDatabase<TaskMeshDBSchema>> {
  return openDB<TaskMeshDBSchema>("TaskMeshDB", 1, {
    upgrade(db) {
      db.createObjectStore("boardData");
      db.createObjectStore("offlineTasks");
      db.createObjectStore("onlineTasks");
    },
  });
}

export async function setData<T extends keyof TaskMeshDBSchemaRaw>(
  store: T,
  value: TaskMeshDBSchema[T]["value"]
) {
  const db = await getDb();
  return db.put(store, value, "data");
}

export async function getData<T extends keyof TaskMeshDBSchemaRaw>(store: T) {
  const db = await getDb();
  return db.get(store, "data");
}
