import { useDB } from "./useDB";

export default function useBoardManager() {
  const boardData = useDB("boardData");
  const offlineTasks = useDB("offlineTasks", []);

  return {
    boardData,
    offlineTasks,
  };
}
