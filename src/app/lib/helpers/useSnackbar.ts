import { SnackbarData } from "../types";
import { useCallback, useState } from "react";

export default function useSnackbar() {
  const [value, setValue] = useState<SnackbarData | null>(null);

  const setNotification = useCallback(
    (data: Omit<SnackbarData, "timestamp"> | null) => {
      setValue(data && { ...data, timestamp: Date.now() });
    },
    []
  );

  return { notification: value, setNotification };
}
