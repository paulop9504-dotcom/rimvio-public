import { cn } from "@/lib/utils";

type ShimmerProps = {
  className?: string;
};

export function Shimmer({ className }: ShimmerProps) {
  return (
    <div
      className={cn("animate-shimmer overflow-hidden", className)}
    />
  );
}
