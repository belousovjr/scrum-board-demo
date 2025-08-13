import { useEffect, useState } from "react";

export function useOffline() {
  const [isOffline, setIsOffline] = useState(
    typeof window !== "undefined" ? !window.navigator.onLine : false
  );
  const [customOffline, setCustomOffline] = useState(isOffline);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return {
    value: isOffline || customOffline,
    setValue: setCustomOffline,
    nativeOffline: isOffline,
  };
}
