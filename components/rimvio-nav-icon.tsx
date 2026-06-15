import { RimvioFeedMark } from "@/lib/brand/rimvio-feed-mark";
import { cn } from "@/lib/utils";

export function RimvioNavIcon({
  className,
  active = true,
}: {
  className?: string;
  active?: boolean;
}) {
  return (
    <RimvioFeedMark
      filled={active}
      className={cn("size-[1.65rem]", className)}
    />
  );
}
