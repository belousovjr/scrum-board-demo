import { useCallback, useEffect, useState } from "react";
import { getData, removeData, setData, TaskMeshDBSchemaRaw } from "../db";

export function useDB<
  T extends keyof TaskMeshDBSchemaRaw,
  D extends TaskMeshDBSchemaRaw[T]["value"]
>(
  name: T,
  initialValue: TaskMeshDBSchemaRaw[T]["value"] | null = null
): {
  data: TaskMeshDBSchemaRaw[T]["value"] | null;
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

  return { data: data ?? initialValue, update, isLoading };
}
