import { useEffect, useState } from "react";
import { checkIsDesktop } from "../utils";

export default function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(checkIsDesktop);

  useEffect(() => {
    const resizeHandler = () => {
      setIsDesktop(checkIsDesktop());
    };
    window.addEventListener("resize", resizeHandler);
    return () => {
      window.removeEventListener("resize", resizeHandler);
    };
  }, []);

  return isDesktop;
}
