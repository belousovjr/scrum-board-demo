import { openDB, DBSchema, IDBPDatabase } from "idb";
import { BoardData, TaskData, TasksSnapshot, WithId } from "./types";

export interface TaskMeshDBSchemaRaw {
  boardData: {
    key: "data";
    value: BoardData;
  };
  offlineTasks: {
    key: "data";
    value: WithId<TaskData>[];
  };
  onlineTasksSnapshot: {
    key: "data";
    value: TasksSnapshot;
  };
}

interface TaskMeshDBSchema extends TaskMeshDBSchemaRaw, DBSchema {}

export async function getDb(): Promise<IDBPDatabase<TaskMeshDBSchema>> {
  return openDB<TaskMeshDBSchema>("TaskMeshDB", 1, {
    upgrade(db) {
      db.createObjectStore("boardData");
      db.createObjectStore("offlineTasks");
      db.createObjectStore("onlineTasksSnapshot");
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

export async function removeData<T extends keyof TaskMeshDBSchemaRaw>(
  store: T
) {
  const db = await getDb();
  return db.delete(store, "data");
}
