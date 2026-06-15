"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MainActionButton } from "@/components/action-chat/main-action-button";
import { AuxActionButton } from "@/components/action-chat/aux-action-button";
import { openSpawnAction } from "@/lib/action-spawn/open-spawn-action";
import { resolveMainActionBrandStyle } from "@/lib/brand/action-brand-style";
import {
  rimvioInlineChipBodyClass,
  rimvioInlineChipClass,
  rimvioInlineChipHeaderClass,
  rimvioInlineChipMetaClass,
  rimvioInlineChipTitleClass,
} from "@/lib/brand/rimvio-neon-theme";
import type { InlineChatActionWire } from "@/lib/action-chat/mention-actions/inline-chat-action";
import type { PeerContact } from "@/lib/context/peer-contact-types";
import { InlineChatFriendAdd } from "@/components/action-chat/inline-chat-friend-add";
import { InlineChatGroupTalk } from "@/components/action-chat/inline-chat-group-talk";
import { InlineChatPeerTalk } from "@/components/action-chat/inline-chat-peer-talk";
import { commitLinksheetUrl } from "@/lib/action-chat/mention-linksheet/linksheet-url-actions";
import { dispatchCapability } from "@/lib/capability-registry";
import { runExecutionJob } from "@/lib/execution";
import { cn } from "@/lib/utils";

import { addResourcePoolItem } from "@/lib/resource-pool/resource-pool-store";
const URL_PATTERN = /^https?:\/\//iu;
const PHONE_PATTERN = /(?:\+?\d[\d\s-]{7,}\d)/u;

type InlineChatActionChipProps = {
  action: InlineChatActionWire;
  onSpawnPrompt?: (uri: string) => void;
  onOpenCapture?: () => void;
  onFeedPeerTalkStart?: (contact: PeerContact) => void;
  className?: string;
};

function routeClipboardText(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  if (URL_PATTERN.test(trimmed)) {
    return trimmed;
  }
  const phone = trimmed.match(PHONE_PATTERN)?.[0]?.replace(/\s+/g, "").replace(/-/g, "");
  if (phone) {
    return `tel:${phone}`;
  }
  const routed = dispatchCapability({
    capabilityId: "NAVIGATE",
    inputs: { destination: trimmed },
  });
  if (!routed.ok) {
    return null;
  }
  const finished = runExecutionJob(routed.executionId);
  return finished?.result?.uri ?? finished?.payload.uri ?? null;
}

function saveMemo(text: string): void {
  if (!text.trim()) {
    return;
  }
  addResourcePoolItem({
    repoId: "memos",
    kind: "memo",
    title: text.trim().slice(0, 48),
    body: text.trim(),
  });
}

export function InlineChatActionChip({
  action,
  onSpawnPrompt,
  onOpenCapture,
  onFeedPeerTalkStart,
  className,
}: InlineChatActionChipProps) {
  const [clipboardHint, setClipboardHint] = useState<string | null>(null);
  const [linksheetUrl, setLinksheetUrl] = useState("");
  const [linksheetFeedback, setLinksheetFeedback] = useState<string | null>(null);
  const linksheetInputRef = useRef<HTMLInputElement>(null);

  const isLinksheetUrlPrompt = Boolean(
    action.linksheetUrlPrompt || (action.featureId === "linksheet" && !action.query.trim()),
  );

  useEffect(() => {
    if (!isLinksheetUrlPrompt) {
      return;
    }
    const timer = window.setTimeout(() => {
      linksheetInputRef.current?.focus();
    }, 120);
    return () => window.clearTimeout(timer);
  }, [isLinksheetUrlPrompt]);

  const submitLinksheetUrl = useCallback(() => {
    const result = commitLinksheetUrl(linksheetUrl);
    if (!result.ok) {
      setLinksheetFeedback(result.message);
      linksheetInputRef.current?.focus();
      return;
    }
    setLinksheetFeedback("리소스풀 links에 저장했고 시트를 열었어요.");
  }, [linksheetUrl]);

  const pasteLinksheetUrl = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      const trimmed = text.trim();
      if (!trimmed) {
        setLinksheetFeedback("클립보드가 비어 있어요.");
        return;
      }
      setLinksheetUrl(trimmed);
      setLinksheetFeedback(null);
      linksheetInputRef.current?.focus();
    } catch {
      setLinksheetFeedback("클립보드 접근이 필요해요.");
    }
  }, []);

  const openDeeplink = useCallback(
    (deeplink: string) => {
      openSpawnAction({ deeplink, onPrompt: onSpawnPrompt });
    },
    [onSpawnPrompt],
  );

  const handleMain = useCallback(async () => {
    if (action.mainActionKind === "capture") {
      onOpenCapture?.();
      return;
    }
    if (action.mainActionKind === "internal") {
      if (action.featureId === "linksheet") {
        if (isLinksheetUrlPrompt) {
          submitLinksheetUrl();
          return;
        }
        if (action.query) {
          const result = commitLinksheetUrl(action.query);
          setClipboardHint(result.ok ? "시트를 열었어요." : result.message);
        }
        return;
      }
      if (action.featureId === "memo" && action.query) {
        saveMemo(action.query);
        setClipboardHint("리소스풀에 저장했어요.");
      }
      return;
    }
    if (action.mainActionKind === "clipboard") {
      try {
        const text = await navigator.clipboard.readText();
        const routed = routeClipboardText(text);
        if (routed) {
          setClipboardHint(text.slice(0, 60));
          openDeeplink(routed);
          return;
        }
        setClipboardHint("클립보드 내용을 연결할 수 없어요.");
      } catch {
        setClipboardHint("클립보드 접근이 필요해요.");
      }
      return;
    }
    if (action.mainDeeplink) {
      openDeeplink(action.mainDeeplink);
    }
  }, [action, isLinksheetUrlPrompt, onOpenCapture, openDeeplink, submitLinksheetUrl]);

  const handleAux = useCallback(
    (auxId: string) => {
      const aux = action.auxActions.find((item) => item.id === auxId);
      if (!aux) {
        return;
      }
      if (aux.deeplink) {
        openDeeplink(aux.deeplink);
      }
    },
    [action.auxActions, openDeeplink],
  );

  const mainBrand = resolveMainActionBrandStyle({
    label: action.mainLabel,
    deeplink: action.mainDeeplink ?? "",
  });

  const isManualCatalog = Boolean(action.manualCatalog?.length);
  const isFriendAdd = Boolean(action.friendAddContact?.trim());
  const isPeerTalk = action.featureId === "peer_talk";
  const isGroupTalk = action.featureId === "group_talk";

  const insertMention = useCallback(
    (example: string) => {
      onSpawnPrompt?.(example.endsWith(" ") ? example : `${example} `);
    },
    [onSpawnPrompt],
  );

  return (
    <div
      className={cn(rimvioInlineChipClass("sm"), className)}
      aria-label={action.displayName}
    >
      <div className={rimvioInlineChipHeaderClass}>
        <span className="text-base" aria-hidden>
          {action.icon}
        </span>
        <span className={rimvioInlineChipTitleClass}>{action.displayName}</span>
        {action.query ? (
          <span className={rimvioInlineChipMetaClass}>{action.query}</span>
        ) : null}
      </div>
      <div className={cn(rimvioInlineChipBodyClass, "space-y-2")}>
        {action.summaryLines.length > 0 ? (
          <ul className="space-y-0.5 text-[12px] text-white/68">
            {action.summaryLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}

        {isFriendAdd ? (
          <InlineChatFriendAdd contact={action.friendAddContact!.trim()} />
        ) : null}

        {isPeerTalk ? (
          <InlineChatPeerTalk
            query={action.peerTalkQuery ?? action.query}
            onStartConversation={onFeedPeerTalkStart}
          />
        ) : null}

        {isGroupTalk ? (
          <InlineChatGroupTalk
            query={action.groupTalkQuery ?? action.query}
            onStartConversation={onFeedPeerTalkStart}
          />
        ) : null}

        {isManualCatalog ? (
          <div className="max-h-64 space-y-3 overflow-y-auto overscroll-contain pr-0.5">
            {action.manualCatalog!.map((group) => (
              <div key={group.categoryLabel}>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-rimvio-neon-cyan/80">
                  {group.categoryLabel}
                </p>
                <ul className="space-y-1">
                  {group.rows.map((row) => (
                    <li key={`${group.categoryLabel}-${row.token}`}>
                      <button
                        type="button"
                        onClick={() => insertMention(row.example)}
                        className="flex w-full items-start gap-2 rounded-xl bg-white/[0.04] px-2.5 py-2 text-left transition-colors hover:bg-white/[0.08] active:scale-[0.99]"
                      >
                        <span className="mt-0.5 text-sm" aria-hidden>
                          {row.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-baseline gap-1.5">
                            <span className="text-[13px] font-semibold text-rimvio-neon-cyan">
                              @{row.token}
                            </span>
                            <span className="text-[12px] text-white/75">{row.displayName}</span>
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] text-white/45">
                            {row.example}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : null}

        {isLinksheetUrlPrompt ? (
          <div className="space-y-2">
            <input
              ref={linksheetInputRef}
              type="url"
              inputMode="url"
              enterKeyHint="go"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              value={linksheetUrl}
              onChange={(event) => {
                setLinksheetUrl(event.target.value);
                setLinksheetFeedback(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitLinksheetUrl();
                }
              }}
              placeholder="https://docs.google.com/spreadsheets/d/…"
              className="w-full rounded-xl border border-white/12 bg-black/25 px-3 py-2.5 text-[13px] text-white placeholder:text-white/35 focus:border-rimvio-neon-cyan/50 focus:outline-none"
            />
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => void pasteLinksheetUrl()}
                className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-medium text-white/70 hover:bg-white/5"
              >
                붙여넣기
              </button>
              <MainActionButton
                label={action.mainLabel || "열기"}
                brand={mainBrand}
                compact
                onClick={() => submitLinksheetUrl()}
              />
            </div>
            {linksheetFeedback ? (
              <p className="text-[11px] text-white/50">{linksheetFeedback}</p>
            ) : null}
          </div>
        ) : null}

        {!isManualCatalog && !isLinksheetUrlPrompt && !isFriendAdd && !isPeerTalk && action.mainLabel ? (
          <MainActionButton
            label={action.mainLabel}
            brand={mainBrand}
            compact
            onClick={() => void handleMain()}
          />
        ) : null}
        {!isManualCatalog && !isLinksheetUrlPrompt && !isFriendAdd && !isPeerTalk && action.auxActions.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {action.auxActions.map((aux) => (
              <AuxActionButton
                key={aux.id}
                id={aux.id}
                label={aux.label}
                icon={aux.icon}
                onClick={() => handleAux(aux.id)}
              />
            ))}
          </div>
        ) : null}
        {clipboardHint ? (
          <p className="text-[11px] text-white/50">{clipboardHint}</p>
        ) : null}
      </div>
    </div>
  );
}
