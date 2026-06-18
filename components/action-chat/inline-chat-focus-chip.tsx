"use client";

import { useEffect, useState } from "react";
import { BellOff, ShieldCheck } from "lucide-react";
import { InlineChatTimerChip } from "@/components/action-chat/inline-chat-timer-chip";
import { FocusHeldInAppCard } from "@/components/action-chat/focus-held-in-app-card";
import { MainActionButton } from "@/components/action-chat/main-action-button";
import type { FocusHeldActionWire } from "@/lib/action-chat/mention-focus/inline-chat-focus";
import type { InlineChatFocusWire } from "@/lib/action-chat/mention-focus/inline-chat-focus";
import {
  UNIFIED_ACTION_BORDER,
  UNIFIED_ACTION_FILL,
  UNIFIED_ACTION_HOVER_BG,
} from "@/lib/brand/action-brand-style";
import {
  rimvioInlineChipBodyClass,
  rimvioInlineChipClass,
  rimvioInlineChipHeaderClass,
  rimvioInlineChipTitleClass,
} from "@/lib/brand/rimvio-neon-theme";
import {
  openNotificationAccessSettings,
  readNotificationAccessEnabled,
} from "@/lib/native-bridge/native-notification-bridge";
import { isAndroidShell } from "@/lib/native-bridge/rimvio-native-bridge";
import { cn } from "@/lib/utils";

type InlineChatFocusChipProps = {
  focus: InlineChatFocusWire;
  onConfirm?: () => void;
  onCancel?: () => void;
  onComplete?: () => void;
  onHeldInAppAction?: (shadowId: string, action: FocusHeldActionWire) => void;
  className?: string;
};

export function InlineChatFocusChip({
  focus,
  onConfirm,
  onCancel,
  onComplete,
  onHeldInAppAction,
  className,
}: InlineChatFocusChipProps) {
  const [needsNotificationAccess, setNeedsNotificationAccess] = useState(false);

  useEffect(() => {
    if (focus.phase !== "awaiting_confirm" || !isAndroidShell()) {
      setNeedsNotificationAccess(false);
      return;
    }
    let cancelled = false;
    void readNotificationAccessEnabled().then((enabled) => {
      if (!cancelled) {
        setNeedsNotificationAccess(!enabled);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [focus.phase]);

  if (focus.phase === "awaiting_confirm") {
    return (
      <div
        className={cn(rimvioInlineChipClass("md"), className)}
        aria-label="집중 모드 확인"
      >
        <div className={rimvioInlineChipHeaderClass}>
          <ShieldCheck className="size-4 shrink-0 text-rimvio-neon-purple" aria-hidden />
          <span className={rimvioInlineChipTitleClass}>집중 {focus.label}</span>
        </div>
        <div className={cn(rimvioInlineChipBodyClass, "space-y-2")}>
          <p className="rimvio-inline-chip__text">
            집중 시간 동안 <strong className="font-semibold text-white">카카오톡·이메일</strong> 알림을
            모아둘까요?
          </p>
          <p className="rimvio-inline-chip__text-muted">
            끝나면 여기서 바로 확인·답장할 수 있어요.
          </p>
          {needsNotificationAccess ? (
            <button
              type="button"
              onClick={() => void openNotificationAccessSettings()}
              className="rimvio-inline-chip__notice"
            >
              알림 맡기기 권한 켜기 → 설정으로 이동
            </button>
          ) : null}
          <div className="flex gap-2 pt-1">
            <MainActionButton
              label="확인 · 시작"
              brand={{
                textColor: "var(--rimvio-neon-purple)",
                borderColor: UNIFIED_ACTION_BORDER,
                fillColor: UNIFIED_ACTION_FILL,
                hoverBg: UNIFIED_ACTION_HOVER_BG,
              }}
              compact
              className="flex-1"
              onClick={onConfirm}
            />
            <button type="button" onClick={onCancel} className="rimvio-inline-chip__ghost-btn">
              취소
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (focus.phase === "cancelled") {
    return (
      <div className={cn("rimvio-inline-chip__status", className)}>
        집중 모드를 취소했어요.
      </div>
    );
  }

  if (focus.phase === "running" && focus.timer) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="rimvio-inline-chip__pill">
          <BellOff className="size-3.5" aria-hidden />
          카톡·이메일 알림 흡수 중
        </div>
        <InlineChatTimerChip timer={focus.timer} onComplete={onComplete} />
      </div>
    );
  }

  if (focus.phase === "done") {
    const heldItems = focus.heldItems ?? [];
    const pendingItems = heldItems.filter((item) => !item.resolved);

    return (
      <div
        className={cn(
          rimvioInlineChipClass("md"),
          "rimvio-inline-chip__status--done",
          className,
        )}
      >
        <div className={rimvioInlineChipHeaderClass}>
          <ShieldCheck className="size-4 shrink-0 text-rimvio-neon-green" aria-hidden />
          <div className="min-w-0">
            <span className={rimvioInlineChipTitleClass}>집중 {focus.label} 완료</span>
            {heldItems.length > 0 ? (
              <p className="rimvio-inline-chip__text-muted">
                {pendingItems.length > 0
                  ? `${pendingItems.length}건 남음 · 앱 안에서 처리`
                  : "모두 확인했어요"}
              </p>
            ) : null}
          </div>
        </div>

        <div className={cn(rimvioInlineChipBodyClass, "space-y-2")}>
          {heldItems.length === 0 ? (
            <p className="rimvio-inline-chip__text">
              집중 시간 동안 모아둔 알림은 없었어요.
            </p>
          ) : (
            heldItems.map((item) => (
              <FocusHeldInAppCard
                key={item.shadowId}
                item={item}
                onAction={onHeldInAppAction}
              />
            ))
          )}
        </div>
      </div>
    );
  }

  return null;
}
