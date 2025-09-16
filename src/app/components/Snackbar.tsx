import { Notification } from "@belousovjr/uikit";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import useServiceContext from "../lib/helpers/useServiceContext";

export default function Snackbar() {
  const [isMounted, setIsMounted] = useState(false);
  const [lastInteractive, setLastInteractive] = useState<number | null>(null);
  const { notification, setNotification } = useServiceContext();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (notification) {
      const now = Date.now();
      const interactive = lastInteractive ?? now;

      const duration = interactive - now + 4000;

      const timeout = setTimeout(() => {
        setNotification?.(null);
        setLastInteractive(null);
      }, duration);

      setLastInteractive(interactive);
      return () => {
        clearTimeout(timeout);
        setLastInteractive(null);
      };
    }
  }, [notification, lastInteractive, setNotification]);

  return (
    isMounted &&
    notification &&
    createPortal(
      <div
        key={notification.timestamp}
        onMouseMove={() => {
          setLastInteractive(Date.now());
        }}
        className="fixed right-0 bottom-0 px-4 pointer-events-none w-[400px] max-w-full z-50 p-2"
      >
        <Notification
          light
          variant={notification.variant}
          className="pointer-events-auto animate-fade-up"
          onClose={() => {
            setNotification?.(null);
          }}
        >
          {notification.text}
        </Notification>
      </div>,
      document.body
    )
  );
}
