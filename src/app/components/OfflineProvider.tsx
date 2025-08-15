"use client";
import { ReactNode, useState, createContext } from "react";

export const OfflineContext = createContext<
  | {
      value: boolean;
      setValue: (value: boolean) => void;
    }
  | undefined
>(undefined);

export default function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOffline, setIsOffline] = useState(
    typeof window !== "undefined" ? !window.navigator.onLine : false
  );

  return (
    <OfflineContext value={{ value: isOffline, setValue: setIsOffline }}>
      {children}
    </OfflineContext>
  );
}
