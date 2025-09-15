import { BoardContext } from "@/app/providers/BoardContextProvider";
import { useContext } from "react";

export default function useBoardManager() {
  const manager = useContext(BoardContext);
  return manager!;
}
