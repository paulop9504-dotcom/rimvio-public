"use client";

import { Camera, MapPin } from "lucide-react";
import { MainActionButton } from "@/components/action-chat/main-action-button";
import {
  UNIFIED_ACTION_BORDER,
  UNIFIED_ACTION_FILL,
  UNIFIED_ACTION_HOVER_BG,
} from "@/lib/brand/action-brand-style";
import {
  rimvioInlineChipBodyClass,
  rimvioInlineChipClass,
  rimvioInlineChipHeaderClass,
  rimvioInlineChipMetaClass,
  rimvioInlineChipTitleClass,
} from "@/lib/brand/rimvio-neon-theme";
import type { InlineChatParkingWire } from "@/lib/action-chat/mention-parking/inline-chat-parking";
import { cn } from "@/lib/utils";

type InlineChatParkingChipProps = {
  parking: InlineChatParkingWire;
  onOpenCapture?: () => void;
  className?: string;
};

export function InlineChatParkingChip({
  parking,
  onOpenCapture,
  className,
}: InlineChatParkingChipProps) {
  const isPhotoRequest = parking.mode === "photo_request";

  return (
    <div
      className={cn(rimvioInlineChipClass("sm"), className)}
      aria-label="주차"
    >
      <div className={rimvioInlineChipHeaderClass}>
        <MapPin className="size-4 shrink-0 text-rimvio-neon-cyan" aria-hidden />
        <span className={rimvioInlineChipTitleClass}>주차</span>
        <span className={rimvioInlineChipMetaClass}>{parking.retentionLabel}</span>
      </div>

      <div className={cn(rimvioInlineChipBodyClass, "space-y-2")}>
        <p className="rimvio-inline-chip__lead">{parking.summaryLine}</p>

        {parking.location ? (
          <p className="rimvio-inline-chip__panel">{parking.location}</p>
        ) : null}

        {parking.photoPreviewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={parking.photoPreviewUrl}
            alt="주차 사진"
            className="max-h-40 w-full rounded-xl object-cover"
          />
        ) : null}

        {isPhotoRequest ? (
          <MainActionButton
            label="사진"
            brand={{
              textColor: "var(--rimvio-neon-cyan)",
              borderColor: UNIFIED_ACTION_BORDER,
              fillColor: UNIFIED_ACTION_FILL,
              hoverBg: UNIFIED_ACTION_HOVER_BG,
            }}
            icon={<Camera className="size-4" aria-hidden />}
            compact
            onClick={onOpenCapture}
          />
        ) : (
          <p className="rimvio-inline-chip__text-muted">
            중요 정보는 30일간 저장됩니다.
          </p>
        )}
      </div>
    </div>
  );
}
