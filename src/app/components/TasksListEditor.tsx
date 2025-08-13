"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TaskData, TaskStatus, WithId } from "../lib/types";
import { v4 as uuidv4 } from "uuid";

const statuses: TaskStatus[] = ["TODO", "PROCESS", "COMPLETED"];

interface TasksListEditorProps {
  list: WithId<TaskData>[] | null;
  update: (items: WithId<TaskData>[]) => Promise<void>;
  isLoading: boolean;
  title: string;
}

export default function TasksListEditor({
  list,
  update,
  isLoading,
  title,
}: TasksListEditorProps) {
  const form = useRef<HTMLFormElement>(null);
  const [editedItemId, setEditedItemId] = useState<string | null>(null);

  const cancelEditing = useCallback(() => {
    setEditedItemId(null);
  }, []);

  const editedItem = useMemo(
    () => list?.find((item) => item.id === editedItemId),
    [editedItemId, list]
  );

  useEffect(() => {
    if (editedItem) {
      for (const [value, key] of Object.entries(editedItem)) {
        const input = form.current?.elements.namedItem(
          value
        ) as HTMLInputElement | null;
        if (input) {
          input.value = key;
        }
      }
    }
  }, [editedItem]);

  return (
    <div>
      <p>{title}</p>
      <form
        key={editedItemId}
        ref={form}
        action={(data) => {
          const formData = Object.fromEntries(data.entries()) as object;
          if (!editedItem) {
            const newItem = {
              ...formData,
              updatedAt: Date.now(),
              id: uuidv4(),
            } as WithId<TaskData>;
            update([...(list || []), newItem]);
          } else {
            update(
              (list || []).map((item) =>
                item.id !== editedItemId
                  ? item
                  : { ...editedItem, ...formData, updatedAt: Date.now() }
              )
            );
          }
        }}
      >
        <label>
          Tite: <input name="title" required />
        </label>
        <label>
          Content: <input name="content" />
        </label>
        <select
          name="status"
          defaultValue={statuses[0]}
          title="select task status"
        >
          {statuses.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        {editedItem && (
          <button onClick={cancelEditing} type="button">
            CANCEL
          </button>
        )}
        <button disabled={isLoading}>{!editedItem ? "Add" : "Update"}</button>
      </form>
      {list?.length
        ? list.map((item) => (
            <div key={item.id}>
              <span>{item.title}</span>
              {" | "}
              <span>{item.content}</span>
              {" | "}
              <span>{item.status}</span>
              <button
                onClick={() => {
                  update(list.filter((el) => el.id !== item.id));
                }}
              >
                REMOVE
              </button>
              <button
                onClick={() => {
                  setEditedItemId(item.id);
                }}
              >
                UPDATE
              </button>
            </div>
          ))
        : !isLoading && <p>{"is empty :("}</p>}
      {isLoading && "Loading list..."}
    </div>
  );
}
