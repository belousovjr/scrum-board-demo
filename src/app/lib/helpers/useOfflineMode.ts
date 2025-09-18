import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { useCallback, useEffect, useState } from "react";
import { checkIsNativeOffline } from "../utils";
import { setOffline } from "@/app/store/slices/appSlice";

export default function useOfflineMode() {
  const isOffline = useAppSelector((store) => store.app.offline);

  const appDispatch = useAppDispatch();
  const [isNativeOffline, setIsNativeOffline] = useState(checkIsNativeOffline);

  useEffect(() => {
    const handleOnline = () => setIsNativeOffline(false);
    const handleOffline = () => setIsNativeOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const setIsOffline = useCallback(
    (value: boolean) => {
      appDispatch(setOffline(value));
    },
    [appDispatch]
  );

  return {
    isNativeOffline,
    isOffline: isOffline || isNativeOffline,
    setIsOffline,
  };
}
