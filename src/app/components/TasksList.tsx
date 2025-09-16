import { useCallback, useDeferredValue, useMemo, useState } from "react";
import {
  ModalState,
  TaskData,
  TaskStatus,
  TaskType,
  WithId,
} from "../lib/types";
import TaskItem from "./TaskItem";
import { DndContext, DragEndEvent, DragOverlay } from "@dnd-kit/core";
import { Button, Modal } from "@belousovjr/uikit";
import TaskEditForm from "./TaskEditForm";
import TasksListSection from "./TasksListSection";
import useBoardManager from "../lib/helpers/useBoardManager";
import useServiceContext from "../lib/helpers/useServiceContext";
import { useAppDispatch } from "../store/hooks";
import { markStatus } from "../store/slices/tutorialSlice";

export default function TasksList() {
  const manager = useBoardManager();

  const { isDesktop, isOffline, setNotification } = useServiceContext();
  const defIsDesktop = useDeferredValue(isDesktop);

  const appDispatch = useAppDispatch();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [updatedTask, setUpdatedTask] = useState<WithId<TaskData> | null>(null);
  const [modalState, setModalState] = useState<ModalState>({
    editTask: null,
    selectedStatus: null,
    deleteTask: null,
    showTask: null,
  });
  const [loadingState, setLoadingState] = useState({
    delete: false,
    close: false,
  });

  const onlineTasks = useMemo(
    () => manager.onlineTasksSnapshot.data?.tasks ?? [],
    [manager.onlineTasksSnapshot.data]
  );
  const offlineTasks = useMemo(
    () => manager.offlineTasks.data ?? [],
    [manager.offlineTasks.data]
  );

  const sortedTasks = useMemo(() => {
    const list = [...(offlineTasks ?? []), ...(onlineTasks ?? [])];
    if (updatedTask) {
      const index = list.findIndex((item) => item.id === updatedTask.id);
      if (
        index !== -1 &&
        updatedTask.updatedAt > list[index].updatedAt &&
        list[index].status !== updatedTask.status
      ) {
        list.splice(index, 1, updatedTask);
      }
    }
    return new Map(
      list
        .toSorted((a, b) => b.updatedAt - a.updatedAt)
        .map((item) => [item.id, item])
    );
  }, [offlineTasks, onlineTasks, updatedTask]);

  const activeTask = useMemo(
    () => (activeId ? sortedTasks.get(activeId) : undefined),
    [activeId, sortedTasks]
  );

  const tasksList = useMemo<
    {
      type: TaskType;
      tasks: WithId<TaskData>[];
    }[]
  >(() => {
    if (defIsDesktop) {
      const tasksByStatus: Record<TaskStatus, WithId<TaskData>[]> = {
        TODO: [],
        PROGRESS: [],
        DONE: [],
      };
      for (const [, task] of sortedTasks) {
        tasksByStatus[task.status].push(task);
      }
      return [
        { type: "TODO", tasks: tasksByStatus.TODO },
        { type: "PROGRESS", tasks: tasksByStatus.PROGRESS },
        { type: "DONE", tasks: tasksByStatus.DONE },
      ];
    } else {
      return [
        {
          type: "MOBILE",
          tasks: [...sortedTasks.values()],
        },
      ];
    }
  }, [sortedTasks, defIsDesktop]);

  const modelTasks = useMemo(() => {
    const [editTask, deleteTask, showTask] = [
      sortedTasks.get(modalState.editTask!),
      sortedTasks.get(modalState.deleteTask!),
      sortedTasks.get(modalState.showTask!),
    ];
    return {
      editTask: editTask?.isOffline === isOffline ? editTask : null,
      deleteTask: deleteTask?.isOffline === isOffline ? deleteTask : null,
      showTask,
    };
  }, [sortedTasks, modalState, isOffline]);

  const cancelEdit = useCallback(() => {
    setModalState((prev) => ({
      ...prev,
      editTask: null,
      selectedStatus: null,
    }));
  }, []);

  const updateItem = useCallback(
    async (task: WithId<TaskData>) => {
      const tasks = task.isOffline ? offlineTasks : onlineTasks;
      const newTasks = [...tasks];
      const oldIndex = newTasks.findIndex((item) => item.id === task.id);

      if (oldIndex !== -1) {
        newTasks.splice(oldIndex, 1, task);
      } else {
        newTasks.push(task);
      }

      try {
        if (!task.isOffline) {
          await manager.requestUpdate?.(newTasks, [task.id]);
          if (oldIndex !== -1) {
            appDispatch(markStatus("TURN_ON_OFFLINE_MODE"));
          }
        } else {
          await manager.offlineTasks.update(newTasks);
          if (oldIndex === -1) {
            appDispatch(markStatus("TURN_OFF_OFFLINE_MODE"));
          }
        }
      } catch {
        setNotification?.({
          text: "Editing failed to save due to collision",
          variant: "error",
        });
      }
    },
    [appDispatch, manager, offlineTasks, onlineTasks, setNotification]
  );

  const deleteItem = useCallback(async () => {
    const task = modelTasks.deleteTask;
    if (!task) return;

    const newTasks = [...(task.isOffline ? offlineTasks : onlineTasks)];
    const index = newTasks.indexOf(task);
    newTasks.splice(index, 1);

    try {
      setLoadingState((prev) => ({ ...prev, delete: true }));

      if (!task.isOffline) {
        await manager.requestUpdate?.(newTasks, [task.id]);
      } else {
        await manager.offlineTasks.update(newTasks);
      }
    } catch {
      setNotification?.({
        text: "Removal failed to save due to collision",
        variant: "error",
      });
    } finally {
      setLoadingState((prev) => ({ ...prev, delete: false }));
    }
  }, [
    manager,
    modelTasks.deleteTask,
    offlineTasks,
    onlineTasks,
    setNotification,
  ]);

  const dragEndHandler = useCallback(
    async (event: DragEndEvent) => {
      setActiveId(null);
      if (activeTask && event.over && activeTask.status !== event.over.id) {
        const newTask = {
          ...activeTask!,
          status: event.over.id as TaskStatus,
          updatedAt: Date.now(),
        };
        try {
          setUpdatedTask(newTask);
          await updateItem(newTask);
        } catch {
          setUpdatedTask(null);
        }
      }
    },
    [activeTask, updateItem]
  );

  return (
    <DndContext
      onDragStart={(event) => setActiveId(event.active.id as string)}
      onDragEnd={dragEndHandler}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[calc(100dvh-theme(spacing.24))]">
        {tasksList.map(({ type, tasks }) => {
          return (
            <TasksListSection
              key={type}
              tasks={tasks}
              type={type}
              providerIsReady={!!manager.providerData}
              onDelete={(id) =>
                setModalState((prev) => ({ ...prev, deleteTask: id }))
              }
              setStatus={(status) =>
                setModalState((prev) => ({ ...prev, selectedStatus: status }))
              }
              onShow={(id) =>
                setModalState((prev) => ({ ...prev, showTask: id }))
              }
              setEditTask={(id) =>
                setModalState((prev) => ({ ...prev, editTask: id }))
              }
            />
          );
        })}
      </div>
      <DragOverlay>
        {activeTask ? <TaskItem task={activeTask} isDraggable /> : null}
      </DragOverlay>
      <Modal
        isOpen={!!modalState.selectedStatus}
        onClose={cancelEdit}
        className="w-[520px]"
      >
        <p className="text-xl font-bold text-center mb-3">
          {modelTasks.editTask
            ? "Update Task"
            : isOffline
            ? "Create New Offline Task"
            : "Create New Task"}
        </p>
        <TaskEditForm
          editTask={modelTasks.editTask}
          status={modalState.selectedStatus}
          update={updateItem}
          cancelEdit={cancelEdit}
          loading={manager.isLoading}
        />
      </Modal>
      <Modal
        isOpen={!!modelTasks.deleteTask}
        onClose={() => setModalState((prev) => ({ ...prev, deleteTask: null }))}
        className="w-[520px] grid gap-5"
      >
        <p className="text-xl font-bold">Delete Task</p>
        <p className="text-base">Are you sure you want to delete the item?</p>
        <div className="flex justify-end gap-2">
          <Button
            variant="destructiveSecondary"
            onClick={() =>
              setModalState((prev) => ({ ...prev, deleteTask: null }))
            }
            type="button"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={deleteItem}
            loading={loadingState.delete}
            autoFocus
          >
            Delete
          </Button>
        </div>
      </Modal>
      <Modal
        isOpen={!!modelTasks.showTask}
        onClose={() => setModalState((prev) => ({ ...prev, showTask: null }))}
        className="w-[600px] grid gap-5"
      >
        <p className="text-xl font-bold break-all">
          {modelTasks.showTask?.title}
        </p>
        <pre className="text-base font-sans whitespace-pre-wrap break-all">
          {modelTasks.showTask?.content}
        </pre>{" "}
      </Modal>{" "}
    </DndContext>
  );
}
