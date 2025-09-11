import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ModalState,
  TaskData,
  TaskStatus,
  TaskType,
  WithId,
} from "../lib/types";
import TaskItem from "./TaskItem";
import useIsDesktop from "../lib/helpers/useIsDesktop";
import { DndContext, DragEndEvent, DragOverlay } from "@dnd-kit/core";
import { Button, Modal } from "@belousovjr/uikit";
import TaskEditForm from "./TaskEditForm";
import TasksListByType from "./TasksListSection";
import { useOffline } from "../lib/helpers/useOffline";
import useBoardManager from "../lib/helpers/useBoardManager ";
import { snackbar } from "../lib/utils";

export default function TasksList() {
  const manager = useBoardManager();

  const isDesktop = useIsDesktop();
  const defIsDesktop = useDeferredValue(isDesktop);
  const offlineMode = useOffline();
  const defIsOffline = useDeferredValue(offlineMode.value);

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
      if (index !== -1 && list[index].status !== updatedTask.status) {
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
        } else {
          await manager.offlineTasks.update(newTasks);
        }
      } catch {
        snackbar({
          text: "Editing failed to save due to collision",
          variant: "error",
        });
      }
    },
    [manager, offlineTasks, onlineTasks]
  );

  const deleteItem = useCallback(async () => {
    if (!modalState.deleteTask) return;

    const tasks = modalState.deleteTask.isOffline ? offlineTasks : onlineTasks;
    const newTasks = tasks.filter(
      (item) => item.id !== modalState.deleteTask!.id
    );

    try {
      setLoadingState((prev) => ({ ...prev, delete: true }));

      if (!modalState.deleteTask.isOffline) {
        await manager.requestUpdate?.(newTasks, [modalState.deleteTask.id]);
      } else {
        await manager.offlineTasks.update(newTasks);
      }

      if (modalState.deleteTask.id === modalState.showTask?.id) {
        setModalState((prev) => ({ ...prev, showTask: null }));
      }
      setModalState((prev) => ({ ...prev, deleteTask: null }));
    } catch {
      snackbar({
        text: "Removal failed to save due to collision",
        variant: "error",
      });
    } finally {
      setLoadingState((prev) => ({ ...prev, delete: false }));
    }
  }, [
    manager,
    modalState.deleteTask,
    modalState.showTask?.id,
    offlineTasks,
    onlineTasks,
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

  useEffect(() => {
    if (!manager.boardData.data && !manager.boardData.isLoading) {
      setModalState({
        editTask: null,
        selectedStatus: null,
        deleteTask: null,
        showTask: null,
      });
    }
  }, [manager.boardData.data, manager.boardData.isLoading]);

  useEffect(() => {
    if (
      (modalState.editTask && modalState.editTask.isOffline !== defIsOffline) ||
      (modalState.deleteTask &&
        modalState.deleteTask.isOffline !== defIsOffline)
    ) {
      setModalState((prev) => ({
        ...prev,
        editTask: null,
        selectedStatus: null,
        deleteTask: null,
      }));
    }
  }, [modalState.editTask, modalState.deleteTask, defIsOffline]);

  return (
    <DndContext
      onDragStart={(event) => setActiveId(event.active.id as string)}
      onDragEnd={dragEndHandler}
    >
      <div className="grid lg:grid-cols-3 gap-8 min-h-[calc(100dvh-theme(spacing.24))]">
        {tasksList.map(({ type, tasks }) => {
          return (
            <TasksListByType
              key={type}
              tasks={tasks}
              type={type}
              isOffline={defIsOffline}
              providerIsReady={!!manager.providerData}
              onDelete={(task) =>
                setModalState((prev) => ({ ...prev, deleteTask: task }))
              }
              setStatus={(status) =>
                setModalState((prev) => ({ ...prev, selectedStatus: status }))
              }
              onShow={(task) =>
                setModalState((prev) => ({ ...prev, showTask: task }))
              }
              setEditTask={(task) =>
                setModalState((prev) => ({ ...prev, editTask: task }))
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
          {modalState.editTask
            ? "Update Task"
            : defIsOffline
            ? "Create New Offline Task"
            : "Create New Task"}
        </p>
        <TaskEditForm
          editTask={modalState.editTask}
          status={modalState.selectedStatus}
          update={updateItem}
          cancelEdit={cancelEdit}
          loading={manager.isLoading}
        />
      </Modal>
      <Modal
        isOpen={!!modalState.deleteTask}
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
        isOpen={!!modalState.showTask}
        onClose={() => setModalState((prev) => ({ ...prev, showTask: null }))}
        className="w-[600px] grid gap-5"
      >
        <p className="text-xl font-bold break-all">
          {modalState.showTask?.title}
        </p>
        <pre className="text-base font-sans whitespace-pre-wrap break-all">
          {modalState.showTask?.content}
        </pre>{" "}
      </Modal>{" "}
    </DndContext>
  );
}
