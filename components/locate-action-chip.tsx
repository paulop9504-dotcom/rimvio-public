"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2, MapPin, X } from "lucide-react";
import { MainActionButton } from "@/components/action-chat/main-action-button";
import { runLinkActionForLink } from "@/lib/actions/run-link-action-for-link";
import { resolveMainActionBrandStyle } from "@/lib/brand/action-brand-style";
import type { LocateActionResult } from "@/lib/locate/types";
import type { LinkRow } from "@/types/database";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type LocateActionChipProps = {
  result: LocateActionResult | null;
  loading?: boolean;
  onDismiss?: () => void;
  className?: string;
};

const LOCATE_LINK_STUB = {
  id: "locate-action",
  user_id: null,
  original_url: "https://rimvio.app/locate",
  title: "Locate",
  thumbnail_url: null,
  domain: "rimvio.app",
  category: "travel",
  actions: [],
  visual_mode: "brand",
  source_type: "portal",
  share_slug: null,
  link_status: "open",
  room_id: null,
  created_at: new Date().toISOString(),
  expires_at: null,
} satisfies LinkRow;

async function runLocateHref(href: string, copyText?: string) {
  if (href === "#copy-text" && copyText) {
    try {
      await navigator.clipboard.writeText(copyText);
      toast.success("복사했어요");
    } catch {
      toast.error("복사에 실패했어요");
    }
    return;
  }

  const action = {
    id: crypto.randomUUID(),
    kind: "open" as const,
    label: "길찾기",
    href,
    payload: copyText ? { copyText } : undefined,
  };

  await runLinkActionForLink(action, LOCATE_LINK_STUB);
}

export function LocateActionChip({
  result,
  loading = false,
  onDismiss,
  className,
}: LocateActionChipProps) {
  const visible = loading || Boolean(result);

  return (
    <AnimatePresence initial={false}>
      {visible ? (
        <motion.div
          key="locate-action-chip"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "pointer-events-auto fixed inset-x-0 bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.75rem))] z-[62] px-4",
            className
          )}
        >
          <div className="mx-auto w-full max-w-md overflow-hidden rounded-[22px] border border-white/60 bg-white/95 shadow-[0_16px_40px_-24px_rgba(15,23,42,0.45)] backdrop-blur-xl ring-1 ring-black/[0.04]">
            <div className="flex items-start gap-3 px-4 py-3.5">
              <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-[#007AFF]/10 text-[#007AFF]">
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <MapPin className="size-4" strokeWidth={2.2} />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium leading-snug text-[#636366]">
                  {loading
                    ? "사진에서 장소를 찾는 중…"
                    : result?.context_signal ?? "장소를 찾았어요"}
                </p>

                {result && !loading ? (
                  <>
                    <MainActionButton
                      label={result.primary_action.label}
                      brand={resolveMainActionBrandStyle({
                        label: result.primary_action.label,
                        href: result.primary_action.href,
                      })}
                      className="mt-2 py-3.5 text-[15px]"
                      onClick={() =>
                        void runLocateHref(
                          result.primary_action.href,
                          result.primary_action.copyText
                        )
                      }
                    />

                    <div className="mt-2 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {result.secondary_actions.map((action) => (
                        <button
                          key={action.label}
                          type="button"
                          onClick={() =>
                            void runLocateHref(action.href, action.copyText)
                          }
                          className="inline-flex shrink-0 items-center rounded-full bg-[#F2F2F7] px-3.5 py-2 text-[13px] font-medium text-foreground ring-1 ring-black/[0.05]"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>

              {onDismiss ? (
                <button
                  type="button"
                  onClick={onDismiss}
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#F2F2F7] text-muted-foreground"
                  aria-label="닫기"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
