import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Shimmer } from "@/components/ui/shimmer";

type ActionCardSkeletonProps = {
  count?: number;
};

export function ActionCardSkeleton() {
  return (
    <Card className="gap-0 overflow-hidden rounded-3xl border-0 bg-card shadow-sm">
      <CardContent className="p-4 pb-3">
        <div className="flex items-start gap-3.5">
          <div className="relative shrink-0">
            <Shimmer className="size-[72px] rounded-2xl" />
            <Shimmer className="absolute -right-1 -top-1 h-5 w-14 rounded-full" />
          </div>

          <div className="min-w-0 flex-1 space-y-2.5 pt-0.5">
            <Shimmer className="h-[21px] w-[88%] rounded-lg" />
            <Shimmer className="h-[21px] w-[62%] rounded-lg" />
            <Shimmer className="h-4 w-[38%] rounded-md" />
          </div>
        </div>
      </CardContent>

      <CardFooter className="border-0 px-4 pb-4 pt-0">
        <div className="flex w-full gap-2">
          <Shimmer className="h-11 min-w-[108px] flex-1 rounded-full" />
          <Shimmer className="h-11 min-w-[96px] flex-1 rounded-full" />
        </div>
      </CardFooter>
    </Card>
  );
}

export function ActionCardSkeletonList({ count = 3 }: ActionCardSkeletonProps) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, index) => (
        <ActionCardSkeleton key={index} />
      ))}
    </div>
  );
}
