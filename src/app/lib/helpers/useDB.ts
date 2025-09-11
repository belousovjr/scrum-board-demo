import { useCallback, useEffect, useState } from "react";
import { getData, removeData, setData } from "../db";
import { ScrumBoardDBSchemaRaw } from "../types";

export function useDB<
  T extends keyof ScrumBoardDBSchemaRaw,
  D extends ScrumBoardDBSchemaRaw[T]["value"]
>(
  name: T
  // initialValue: ScrumBoardDBSchemaRaw[T]["value"] | null = null
): {
  data: ScrumBoardDBSchemaRaw[T]["value"] | null;
  update: (newData: D | null) => Promise<void>;
  isLoading: boolean;
} {
  const [data, setDataState] = useState<D | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const update = useCallback(
    async (newData: D | null) => {
      setIsLoading(true);
      if (newData) {
        await setData(name, newData);
      } else {
        await removeData(name);
      }
      setDataState(newData);
      setIsLoading(false);
    },
    [name]
  );

  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      setIsLoading(true);
      const storedData = (await getData(name)) as D;
      if (isMounted) {
        setDataState(storedData ?? null);
        setIsLoading(false);
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [name]);

  return { data, update, isLoading };
}
