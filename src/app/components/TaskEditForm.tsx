"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TaskData, TaskStatus, WithId } from "../lib/types";
import { v4 as uuidv4 } from "uuid";
import { Button, ColorPicker, Select, Textfield } from "@belousovjr/uikit";
import { statuses, statusesTitles } from "../lib/constants";
import randomColor from "randomcolor";
import { snackbar } from "../lib/utils";
import useServiceContext from "../lib/helpers/useServiceContext";

interface TaskEditFormProps {
  editTask?: WithId<TaskData> | null;
  status?: TaskStatus | null;
  update: (items: WithId<TaskData>) => Promise<void>;
  cancelEdit: () => unknown;
  loading: boolean;
}

export default function TaskEditForm({
  editTask,
  update,
  cancelEdit,
  status,
  loading,
}: TaskEditFormProps) {
  const form = useRef<HTMLFormElement>(null);

  const [editLoading, setEditLoading] = useState(false);
  const [color, setColor] = useState<string>();

  const { isOffline } = useServiceContext();

  const edit = useCallback(
    async (data: FormData) => {
      const formData = Object.fromEntries(data.entries());
      const newItem = {
        id: uuidv4(),
        ...(editTask || {}),
        ...formData,
        updatedAt: Date.now(),
      } as Omit<WithId<TaskData>, "isOffline">;

      try {
        setEditLoading(true);
        await update({ ...newItem, isOffline });
      } catch (e) {
        snackbar({ text: String(e), variant: "error" });
      } finally {
        setEditLoading(false);
        cancelEdit();
      }
    },
    [cancelEdit, editTask, isOffline, update]
  );

  useEffect(() => {
    if (editTask) {
      for (const [key, value] of Object.entries(editTask)) {
        const input = form.current?.elements.namedItem(
          key
        ) as HTMLInputElement | null;
        if (input) {
          if (key !== "color") {
            input.value = value;
          } else {
            setColor(value);
          }
        }
      }
    } else {
      const input = form.current?.elements.namedItem(
        "color"
      ) as HTMLInputElement | null;
      if (input) {
        setColor(randomColor({ luminosity: "light" }));
      }
    }
  }, [cancelEdit, editTask]);
  return (
    <form
      className="grid gap-6"
      key={editTask?.id ?? null}
      ref={form}
      action={edit}
    >
      <Textfield
        label="Title"
        name="title"
        required
        readOnly={loading}
        autoFocus
      />
      <Textfield
        label="Content"
        name="content"
        multiline
        rows={3}
        readOnly={loading}
      />
      <div className="flex gap-4 items-end">
        <Select
          defaultValue={status || statuses[0]}
          name="status"
          disabled={loading}
          options={statuses.map((item) => ({
            value: item,
            name: statusesTitles[item],
          }))}
          label="Status"
          className="flex-1"
        />
        <ColorPicker name="color" defaultValue={color} onChange={setColor} />
      </div>
      <div className="flex justify-end gap-2">
        <Button
          disabled={loading}
          variant="secondary"
          onClick={cancelEdit}
          type="button"
        >
          Cancel
        </Button>
        <Button disabled={loading} loading={editLoading}>
          {!editTask ? "Add" : "Update"}
        </Button>
      </div>
    </form>
  );
}
