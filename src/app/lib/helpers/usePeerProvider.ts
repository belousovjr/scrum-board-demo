import { useEffect, useRef, useState } from "react";
import PeerProvider, { PeerProviderData } from "../PeerProvider";

interface UsePeerProviderOptions {
  id?: string;
  lobbyName?: string;
  enabled?: boolean;
}

export default function usePeerProvider({
  id,
  lobbyName,
  enabled,
}: UsePeerProviderOptions) {
  const provider = useRef<PeerProvider>(null);
  const [providerData, setProviderData] = useState<PeerProviderData | null>(
    null
  );

  useEffect(() => {
    if (enabled && id && lobbyName) {
      if (!provider.current) {
        provider.current = new PeerProvider(id, lobbyName);
        provider.current.on("updatedData", () => {
          setProviderData(provider.current!.data);
        });
      }
    } else if (provider) {
      provider.current?.destroy();
      provider.current = null;
    }
  }, [id, lobbyName, enabled]);

  return providerData;
}
