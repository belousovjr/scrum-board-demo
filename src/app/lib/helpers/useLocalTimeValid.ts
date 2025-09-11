import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentTimeOffset } from "../utils";

export default function useLocalTimeValid() {
  const [offset, setOffset] = useState<number | null>(null);
  const lastTimestamp = useRef<number | null>(null);

  const syncTime = useCallback(() => {
    const expectedTimestamp =
      lastTimestamp.current && lastTimestamp.current + 1000;

    const now = Date.now();

    if (expectedTimestamp === null || now - expectedTimestamp >= 1000) {
      getCurrentTimeOffset().then(setOffset);
    }
    lastTimestamp.current = now;
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      syncTime();
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, [syncTime]);

  return !offset;
}
