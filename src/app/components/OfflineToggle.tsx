"use client";
import { WifiIcon, WifiOffIcon } from "lucide-react";
import { Toggle } from "@belousovjr/uikit";
import useOfflineMode from "../lib/helpers/useOfflineMode";

export default function OfflineToggle() {
  const { isOffline, isNativeOffline, setIsOffline } = useOfflineMode();
  return (
    <Toggle
      active={isOffline}
      onChange={setIsOffline}
      disabled={isNativeOffline}
      className="bg-green-100 has-checked:bg-red-100 group-hover/toggle-wrap:bg-green-90"
      circleElement={
        <span className="relative">
          <WifiIcon
            className="absolute opacity-100 group-has-checked/checkbox:opacity-0 transition-opacity"
            size={16}
          />
          <WifiOffIcon
            className="absolute opacity-0 group-has-checked/checkbox:opacity-100 transition-[opacity,color] group-has-disabled/toggle-wrap:text-red-100"
            size={16}
          />
        </span>
      }
    />
  );
}
