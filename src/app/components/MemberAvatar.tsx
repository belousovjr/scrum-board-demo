import { update } from "jdenticon";
import { useEffect, useRef } from "react";

export function MemberAvatar({
  value,
  className,
  title,
}: {
  value: string;
  className?: string;
  title?: string;
}) {
  const iconRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (iconRef.current) {
      update(iconRef.current, value);
    }
  }, [value]);

  return (
    <span title={title}>
      <svg
        data-jdenticon-value={value}
        height={20}
        ref={iconRef}
        width={20}
        className={`rounded-full shrink-0 w-6 h-6 border-1 border-general-50 ${
          className ?? ""
        }`}
      />
    </span>
  );
}
