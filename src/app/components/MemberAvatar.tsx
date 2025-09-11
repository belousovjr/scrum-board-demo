import { generateFromString } from "generate-avatar";
import Image from "next/image";

export function MemberAvatar({
  id,
  className,
  title,
}: {
  id: string;
  className?: string;
  title?: string;
}) {
  return (
    <Image
      src={`data:image/svg+xml;utf8,${generateFromString(id)}`}
      width={20}
      height={20}
      alt="Avatar"
      className={`rounded-full shrink-0 w-5 ${className ?? ""}`}
      title={title}
    />
  );
}
