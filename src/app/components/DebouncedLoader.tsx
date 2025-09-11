import { Loader } from "@belousovjr/uikit";
import { useEffect, useState } from "react";

export default function DebouncedLoader({ active }: { active: boolean }) {
  const [debActive, setDevActive] = useState(active);
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (active) {
      setDevActive(true);
    } else {
      timeout = setTimeout(() => {
        setDevActive(false);
      }, 200);
    }
    return () => clearTimeout(timeout!);
  }, [active]);
  return debActive && <Loader />;
}
