import { useCallback, useEffect, useState } from "react";
import { getData, setData, TaskMeshDBSchemaRaw } from "../db";

export function useDB<
  T extends keyof TaskMeshDBSchemaRaw,
  D extends TaskMeshDBSchemaRaw[T]["value"],
  I = TaskMeshDBSchemaRaw[T]["value"]
>(name: T, initialValue: I | null = null) {
  const [data, setDataState] = useState<D | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const update = useCallback(
    async (newData: D) => {
      setIsLoading(true);
      await setData(name, newData);
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
