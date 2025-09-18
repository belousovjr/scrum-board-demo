import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { TutorialStatusOption } from "../types";
import { useCallback, useMemo } from "react";
import { markStatus } from "@/app/store/slices/tutorialSlice";
import { tutorialStatuses } from "../constants";

export default function useTutorial() {
  const appDispatch = useAppDispatch();
  const statuses = useAppSelector((store) => store.tutorial.statuses);

  const lastActiveStatus = useMemo(() => {
    const lastActive = tutorialStatuses.findLast((item) => statuses[item]);
    return lastActive;
  }, [statuses]);

  const checkStatus = useCallback(
    (status: TutorialStatusOption, checkFn?: () => boolean) => {
      if (!statuses[status] && (!checkFn || checkFn())) {
        appDispatch(markStatus(status));
      }
    },
    [appDispatch, statuses]
  );

  return {
    checkStatus,
    lastActiveStatus,
  };
}
