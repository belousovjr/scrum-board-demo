import { OfflineContext } from "@/app/providers/OfflineContextProvider";
import { useContext } from "react";

export function useOffline() {
  const { value, nativeValue, setValue } = useContext(OfflineContext);

  return {
    value,
    nativeValue,
    setValue: (value: boolean) => {
      setValue?.(value);
    },
  };
}
