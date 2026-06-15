"use client";

import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PlaceFoodPhotoGalleryProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placeName: string;
  photos: string[];
  startIndex?: number;
};

/** Full-screen food gallery ??Apple-style light sheet. */
export function PlaceFoodPhotoGallery({
  open,
  onOpenChange,
  placeName,
  photos,
  startIndex = 0,
}: PlaceFoodPhotoGalleryProps) {
  if (photos.length === 0) {
    return null;
  }

  const safeStart = Math.min(Math.max(0, startIndex), photos.length - 1);

  useEffect(() => {
    if (!open) {
      return;
    }
    const target = document.getElementById("place-gallery-start");
    target?.scrollIntoView({ block: "start", behavior: "auto" });
  }, [open, safeStart]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[100] max-h-[92vh] max-w-md gap-0 overflow-hidden rounded-[28px] border border-border bg-[#F5F5F7] p-0 shadow-2xl">
        <DialogHeader className="border-b border-border bg-rimvio-surface px-5 py-4 text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            맛집
          </p>
          <DialogTitle className="mt-1 text-[18px] font-bold tracking-tight text-[#1D1D1F]">
            {placeName}
          </DialogTitle>
          <p className="text-[13px] font-normal text-muted-foreground">
            ?�식 ?�진 {photos.length}??          </p>
        </DialogHeader>

        <div
          id={`place-gallery-${safeStart}`}
          className="max-h-[calc(92vh-88px)] space-y-3 overflow-y-auto p-4 scroll-smooth"
        >
          {photos.map((url, index) => (
            <figure
              key={`${placeName}-${index}-${url}`}
              id={index === safeStart ? `place-gallery-start` : undefined}
              className="overflow-hidden rounded-[20px] border border-border bg-rimvio-surface shadow-sm"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`${placeName} ?�식 ?�진 ${index + 1}`}
                className="block w-full object-cover"
                loading={index === 0 ? "eager" : "lazy"}
                decoding="async"
              />
            </figure>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
