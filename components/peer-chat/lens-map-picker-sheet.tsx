"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { MapPin, X } from "lucide-react";
import {
  mapProviderLabel,
  openMapProvider,
  preferredMapProvider,
  type MapProvider,
} from "@/lib/peer-chat/ai-lens/open-map-navigation";
import { cn } from "@/lib/utils";

type LensMapPickerSheetProps = {
  open: boolean;
  place: string | null;
  onOpenChange: (open: boolean) => void;
};

const PROVIDERS: MapProvider[] = ["kakao", "naver", "google"];

export function LensMapPickerSheet({
  open,
  place,
  onOpenChange,
}: LensMapPickerSheetProps) {
  const [mounted, setMounted] = useState(false);
  const preferred = preferredMapProvider();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const query = place?.trim() ?? "";

  return createPortal(
    <AnimatePresence>
      {open && query ? (
        <>
          <motion.button
            type="button"
            aria-label="닫기"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/45 backdrop-blur-[2px]"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="lens-map-sheet-title"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            className="fixed inset-x-0 bottom-0 z-[81] mx-auto max-w-lg rounded-t-[1.25rem] border border-white/10 bg-[#1c1c1e] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-2xl"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p
                  id="lens-map-sheet-title"
                  className="text-[15px] font-semibold text-white"
                >
                  길찾기
                </p>
                <p className="mt-0.5 truncate text-[12px] text-white/55">{query}</p>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/8 text-white/80"
                aria-label="닫기"
              >
                <X className="size-4" />
              </button>
            </div>

            <button
              type="button"
              className={cn(
                "mb-2 flex w-full items-center gap-2 rounded-2xl px-4 py-3.5 text-left",
                "bg-[#FEE500]/15 ring-1 ring-[#FEE500]/35",
              )}
              onClick={() => {
                openMapProvider(query, preferred);
                onOpenChange(false);
              }}
            >
              <MapPin className="size-5 shrink-0 text-[#FEE500]" />
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-white">
                  {mapProviderLabel(preferred)}으로 열기
                </span>
                <span className="text-[11px] text-white/50">추천</span>
              </span>
            </button>

            <div className="grid grid-cols-3 gap-2">
              {PROVIDERS.filter((p) => p !== preferred).map((provider) => (
                <button
                  key={provider}
                  type="button"
                  className="rounded-xl bg-white/6 px-2 py-2.5 text-[12px] font-medium text-white/85 ring-1 ring-white/10 active:bg-white/10"
                  onClick={() => {
                    openMapProvider(query, provider);
                    onOpenChange(false);
                  }}
                >
                  {mapProviderLabel(provider)}
                </button>
              ))}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
