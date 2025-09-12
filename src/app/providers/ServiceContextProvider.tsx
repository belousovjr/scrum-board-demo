"use client";
import {
  ReactNode,
  useState,
  createContext,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { BChannelEvent } from "../lib/types";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setOffline } from "../store/slices/appSlice";
import {
  checkIsDesktop,
  checkIsNativeOffline,
  getCurrentTimeOffset,
} from "../lib/utils";

export const ServiceContext = createContext<{
  isPrimaryPage: boolean;
  isOffline: boolean;
  isNativeOffline: boolean;
  isDesktop: boolean;
  isTimeValid: boolean;
  isVisible: boolean;
  setIsOffline?: (value: boolean) => void;
}>({
  isPrimaryPage: true,
  isTimeValid: true,
  isVisible: true,
  isOffline: checkIsNativeOffline(),
  isNativeOffline: checkIsNativeOffline(),
  isDesktop: checkIsDesktop(),
});

export default function ServiceContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [isPrimary, setIsPrimary] = useState(true);
  const id = useRef(uuidv4());

  const [isNativeOffline, setIsNativeOffline] = useState(checkIsNativeOffline);
  const [isDesktop, setIsDesktop] = useState(checkIsDesktop);
  const [isVisible, setIsVisible] = useState(() =>
    typeof window !== "undefined"
      ? window.document.visibilityState === "visible"
      : false
  );
  const isOffline = useAppSelector((store) => store.app.offline);
  const [timeOffset, setTimeOffset] = useState<number | null>(null);
  const lastTimestamp = useRef<number | null>(null);

  const appDispatch = useAppDispatch();

  const setIsOffline = useCallback(
    (value: boolean) => {
      appDispatch(setOffline(value));
    },
    [appDispatch]
  );

  const syncTime = useCallback(() => {
    const expectedTimestamp =
      lastTimestamp.current && lastTimestamp.current + 1000;

    const now = Date.now();

    if (expectedTimestamp === null || now - expectedTimestamp >= 1000) {
      getCurrentTimeOffset().then(setTimeOffset);
    }
    lastTimestamp.current = now;
  }, []);

  useEffect(() => {
    const bc = new BroadcastChannel("board-channel");
    const handleMessage = (event: MessageEvent<BChannelEvent>) => {
      if (event.data?.type === "hello" && event.data.sender !== id.current) {
        bc?.postMessage({ type: "exists" });
      } else if (event.data?.type === "exists") {
        setIsPrimary(false);
      }
    };
    bc.onmessage = handleMessage;
    bc.postMessage({ type: "hello", sender: id.current });
    return () => {
      bc?.close();
    };
  }, []);

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

  useEffect(() => {
    const resizeHandler = () => {
      setIsDesktop(checkIsDesktop());
    };
    window.addEventListener("resize", resizeHandler);
    return () => {
      window.removeEventListener("resize", resizeHandler);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      syncTime();
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, [syncTime]);

  useEffect(() => {
    const changeVisHandler = () => {
      setIsVisible(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", changeVisHandler);
    return () => {
      document.removeEventListener("visibilitychange", changeVisHandler);
    };
  }, []);

  return (
    <ServiceContext
      value={{
        isPrimaryPage: isPrimary,
        isNativeOffline,
        isOffline: isOffline || isNativeOffline,
        isDesktop,
        isTimeValid: !timeOffset,
        isVisible,
        setIsOffline,
      }}
    >
      {children}
    </ServiceContext>
  );
}
