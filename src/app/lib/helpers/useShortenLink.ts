import { useCallback, useEffect, useState } from "react";
import { getShortenLink } from "../actions";

export function useShortenLink(link: string | null) {
  const [shortenLink, setShortenLink] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [active, setActive] = useState(false);

  const shortLink = useCallback(async (url: string) => {
    setIsLoading(true);

    if (url) {
      const result = await getShortenLink(url);
      setShortenLink(result);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    setShortenLink(null);
    if (link && active) {
      const isDev = process.env.NODE_ENV === "development";
      shortLink(!isDev ? link : "https://google.com");
    }
  }, [link, active, shortLink]);

  useEffect(() => {
    setActive(false);
  }, [link]);

  return {
    value: shortenLink,
    isLoading,
    activate: () => {
      setActive(true);
    },
  };
}
