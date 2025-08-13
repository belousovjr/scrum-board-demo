"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useBoardManager from "../lib/helpers/useBoardManager ";
import { TaskData, TaskStatus } from "../lib/types";

const statuses: TaskStatus[] = ["TODO", "PROCESS", "COMPLETED"];

export default function TasksManager() {
  const { boardData, offlineTasks } = useBoardManager();
  const form = useRef<HTMLFormElement>(null);
  const [editedItemId, setEditedItemId] = useState<string | null>(null);

  const cancelEditing = useCallback(() => {
    setEditedItemId(null);
  }, []);

  const editedItem = useMemo(
    () => offlineTasks.data?.find((item) => item.id === editedItemId),
    [editedItemId, offlineTasks.data]
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
      <button
        onClick={() => {
          boardData.update({ name: Math.random().toString() });
        }}
      >
        set random
      </button>
      {boardData.isLoading ? "Loading..." : boardData.data?.name}

      <p>TASKS:</p>

      <>
        <form
          key={editedItemId}
          ref={form}
          action={(data) => {
            const formData = Object.fromEntries(data.entries()) as object;
            if (!editedItemId) {
              const newItem = {
                ...formData,
                updatedAt: Date.now(),
              } as TaskData;
              offlineTasks.add(newItem);
            } else {
              offlineTasks.update(editedItemId, {
                ...editedItem,
                ...formData,
                updatedAt: Date.now(),
              } as TaskData);
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
          <button disabled={offlineTasks.isLoading}>
            {!editedItem ? "Add" : "Update"}
          </button>
        </form>
        {offlineTasks.data?.length
          ? offlineTasks.data.map((item) => (
              <div key={item.id}>
                <span>{item.title}</span>
                {" | "}
                <span>{item.content}</span>
                {" | "}
                <span>{item.status}</span>
                <button
                  onClick={() => {
                    offlineTasks.remove(item.id);
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
          : !offlineTasks.isLoading && <p>{"is empty :("}</p>}
        {offlineTasks.isLoading && "Loading list..."}
      </>
    </div>
  );
}
