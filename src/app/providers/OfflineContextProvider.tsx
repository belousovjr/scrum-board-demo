"use client";
import {
  ReactNode,
  useState,
  createContext,
  useEffect,
  useCallback,
} from "react";
import { checkIsOffline } from "../lib/utils";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setOffline } from "../store/slices/appSlice";

export const OfflineContext = createContext<{
  value: boolean;
  nativeValue: boolean;
  setValue?: (value: boolean) => void;
}>({
  value: checkIsOffline(),
  nativeValue: checkIsOffline(),
});

export default function OfflineContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [isNativeOffline, setIsNativeOffline] = useState(checkIsOffline);
  const isOffline = useAppSelector((store) => store.app.offline);
  const appDispatch = useAppDispatch();

  const setIsOffline = useCallback(
    (value: boolean) => {
      appDispatch(setOffline(value));
    },
    [appDispatch]
  );

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

  return (
    <OfflineContext
      value={{
        value: isNativeOffline || isOffline,
        nativeValue: isNativeOffline,
        setValue: setIsOffline,
      }}
    >
      {children}
    </OfflineContext>
  );
}
