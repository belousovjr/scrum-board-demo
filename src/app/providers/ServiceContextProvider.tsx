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
import { BChannelEvent, SnackbarData } from "../lib/types";
import { checkIsDesktop, getCurrentTimeOffset } from "../lib/utils";

export const ServiceContext = createContext<{
  isPrimaryPage: boolean;
  isDesktop: boolean;
  isTimeValid: boolean;
  isVisible: boolean;
  notification: SnackbarData | null;
  setNotification?: (value: Omit<SnackbarData, "timestamp"> | null) => void;
}>({
  isPrimaryPage: true,
  isTimeValid: true,
  isVisible: true,
  notification: null,
  isDesktop: checkIsDesktop(),
});

export default function ServiceContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [isPrimary, setIsPrimary] = useState(true);
  const id = useRef(uuidv4());

  const [isDesktop, setIsDesktop] = useState(checkIsDesktop);
  const [isVisible, setIsVisible] = useState(() =>
    typeof window !== "undefined"
      ? window.document.visibilityState === "visible"
      : false
  );
  const [timeOffset, setTimeOffset] = useState<number | null>(null);
  const lastTimestamp = useRef<number | null>(null);

  const [snackbarData, setSnackbarData] = useState<SnackbarData | null>(null);

  const syncTime = useCallback(() => {
    const expectedTimestamp =
      lastTimestamp.current && lastTimestamp.current + 1000;

    const now = Date.now();

    if (expectedTimestamp === null || now - expectedTimestamp >= 1000) {
      getCurrentTimeOffset().then(setTimeOffset);
    }
    lastTimestamp.current = now;
  }, []);

  const setNotification = useCallback(
    (data: Omit<SnackbarData, "timestamp"> | null) => {
      setSnackbarData(data && { ...data, timestamp: Date.now() });
    },
    []
  );

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
      setIsVisible(
        !!document.activeElement && document.visibilityState === "visible"
      );
    };

    document.addEventListener("visibilitychange", changeVisHandler);
    document.addEventListener("focus", changeVisHandler);
    document.addEventListener("blur", changeVisHandler);
    return () => {
      document.removeEventListener("visibilitychange", changeVisHandler);
      document.removeEventListener("focus", changeVisHandler);
      document.removeEventListener("blur", changeVisHandler);
    };
  }, []);

  return (
    <ServiceContext
      value={{
        isPrimaryPage: isPrimary,

        isDesktop,
        isTimeValid: !timeOffset,
        isVisible,
        notification: snackbarData,
        setNotification: setNotification,
      }}
    >
      {children}
    </ServiceContext>
  );
}
