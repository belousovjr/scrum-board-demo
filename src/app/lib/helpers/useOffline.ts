import { OfflineContext } from "@/app/components/OfflineProvider";
import { useContext, useEffect, useState } from "react";

export function useOffline() {
  const customOffline = useContext(OfflineContext);
  const [isOffline, setIsOffline] = useState(!!customOffline?.value);

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
    value: isOffline || customOffline?.value,
    setValue: (value: boolean) => {
      customOffline?.setValue(value);
    },
    nativeOffline: isOffline,
  };
}
