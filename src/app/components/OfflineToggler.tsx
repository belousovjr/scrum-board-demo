"use client";
import { useOffline } from "../lib/helpers/useOffline";

export default function OfflineToggler() {
  const { value, setValue, nativeOffline } = useOffline();
  return (
    <label>
      OFFLINE:
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => {
          setValue(e.target.checked);
        }}
        disabled={nativeOffline}
      />
    </label>
  );
}
