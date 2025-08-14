import { useEffect, useRef, useState } from "react";
import PeerProvider, { PeerProviderData } from "../PeerProvider";
import { BoardData } from "../types";

interface UsePeerProviderOptions {
  boardData?: BoardData | null;
  enabled?: boolean;
}

export default function usePeerProvider({
  boardData,
  enabled,
}: UsePeerProviderOptions) {
  const provider = useRef<PeerProvider>(null);
  const [providerData, setProviderData] = useState<PeerProviderData | null>(
    null
  );

  useEffect(() => {
    if (enabled && boardData) {
      if (!provider.current) {
        provider.current = new PeerProvider(boardData);
        provider.current.on("updatedData", () => {
          setProviderData(
            provider.current!.data ? { ...provider.current!.data } : null
          );
        });
      }
    } else if (provider) {
      provider.current?.destroy();
      provider.current = null;
    }
  }, [boardData, enabled]);

  return providerData;
}
