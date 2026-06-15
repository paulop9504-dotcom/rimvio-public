"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

/** Soft blurred OG backdrop — fills compact card top without empty chrome. */
export function FeedAmbientPoster({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)}>
      <Image
        src={src}
        alt=""
        fill
        className="scale-110 object-cover opacity-70 saturate-[0.75] blur-[1px]"
        sizes="(max-width: 448px) 100vw, 448px"
        unoptimized
      />
      <div className="absolute inset-0 bg-gradient-to-b from-rimvio-surface/20 via-rimvio-base/55 to-rimvio-base" />
    </div>
  );
}
