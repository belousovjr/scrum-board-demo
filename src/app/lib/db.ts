import { openDB, IDBPDatabase } from "idb";
import { ScrumBoardDBSchema, ScrumBoardDBSchemaRaw } from "./types";

export async function getDb(): Promise<IDBPDatabase<ScrumBoardDBSchema>> {
  return openDB<ScrumBoardDBSchema>("Scrum BoardDB", 1, {
    upgrade(db) {
      db.createObjectStore("boardData");
      db.createObjectStore("offlineTasks");
      db.createObjectStore("onlineTasksSnapshot");
    },
  });
}

export async function setData<T extends keyof ScrumBoardDBSchemaRaw>(
  store: T,
  value: ScrumBoardDBSchema[T]["value"]
) {
  const db = await getDb();
  return db.put(store, value, "data");
}

export async function getData<T extends keyof ScrumBoardDBSchemaRaw>(store: T) {
  const db = await getDb();
  return db.get(store, "data");
}

export async function removeData<T extends keyof ScrumBoardDBSchemaRaw>(
  store: T
) {
  const db = await getDb();
  return db.delete(store, "data");
}
