"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TaskData, TaskStatus, WithId } from "../lib/types";
import { v4 as uuidv4 } from "uuid";

const statuses: TaskStatus[] = ["TODO", "PROCESS", "COMPLETED"];

interface TasksListEditorProps {
  list: WithId<TaskData>[] | null;
  update: (items: WithId<TaskData>[], editedId: string) => Promise<void>;
  isLoading: boolean;
  title: string;
  disabled?: boolean;
}

export default function TasksListEditor({
  list,
  update,
  isLoading,
  title,
  disabled,
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
    } else if (editedItemId) {
      cancelEditing();
    }
  }, [cancelEditing, editedItem, editedItemId]);

  return (
    <div>
      <p>{title}</p>
      {!disabled && (
        <form
          key={editedItemId}
          ref={form}
          action={(data) => {
            const formData = Object.fromEntries(data.entries());
            if (!editedItem) {
              const newItem = {
                ...formData,
                updatedAt: Date.now(),
                id: uuidv4(),
              } as WithId<TaskData>;
              update([...(list || []), newItem], newItem.id);
            } else {
              update(
                (list || []).map((item) =>
                  item.id !== editedItemId
                    ? item
                    : { ...editedItem, ...formData, updatedAt: Date.now() }
                ),
                editedItemId!
              );
              cancelEditing();
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
      )}
      {list?.length
        ? list.map((item) => (
            <div key={item.id}>
              <span>{item.title}</span>
              {" | "}
              <span>{item.content}</span>
              {" | "}
              <span>{item.status}</span>
              {!disabled && (
                <>
                  {" "}
                  <button
                    onClick={() => {
                      update(
                        list.filter((el) => el.id !== item.id),
                        item.id
                      );
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
                </>
              )}
            </div>
          ))
        : !isLoading && <p>{"is empty :("}</p>}
      <p>{isLoading ? "Loading list..." : <span>&nbsp;</span>}</p>
    </div>
  );
}
