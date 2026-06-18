"use client";

import {
  Camera,
  FileUp,
  ImageIcon,
  Link2,
  Loader2,
  Mic,
  Plus,
  SendHorizontal,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useChatAmbientFocusOptional } from "@/components/action-chat/chat-ambient-focus";
import { GroupTalkBubbles } from "@/components/action-chat/group-talk-bubbles";
import { PeerTalkContactBubbles } from "@/components/action-chat/peer-talk-contact-bubbles";
import type { PeerContact } from "@/lib/context/peer-contact-types";
import { useGroupTalkCandidates } from "@/hooks/use-group-talk-candidates";
import { usePeerTalkCandidates } from "@/hooks/use-peer-talk-candidates";
import { groupTargetAsPeerContact } from "@/lib/peer-chat/group-target-as-contact";
import {
  rimvioComposerFieldClass,
  rimvioIconBtnClass,
  rimvioMenuGridClass,
  rimvioMenuTileBtnClass,
  rimvioNavBarClass,
} from "@/lib/brand/rimvio-neon-theme";
import { ComposerMentionField } from "@/components/action-chat/composer-mention-field";
import type { ChatAxis } from "@/lib/action-chat/chat-three-axis";
import type { ComposerAttachment } from "@/lib/action-chat/composer-attachments";
import { cn } from "@/lib/utils";

type ComposerPayload = {
  text: string;
  attachments?: ComposerAttachment[];
  chatAxis?: ChatAxis;
};

type ActionChatInputBarProps = {
  placeholder?: string;
  disabled?: boolean;
  sending?: boolean;
  onOpenCapture?: () => void;
  onOpenGallery?: () => void;
  onOpenLinkPaste?: () => void;
  onQuickCapture?: (file: File) => void;
  onSendMessage?: (text: string) => void;
  onSendComposer?: (
    payload: ComposerPayload,
  ) => void | boolean | Promise<void | boolean>;
  /** @톡 버블 탭 — 친구 선택 후 톡 시작 */
  onPeerTalkPick?: (contact: PeerContact) => void;
  initialComposerText?: string;
  className?: string;
};

export function ActionChatInputBar({
  placeholder = "오늘 무엇을 도와드릴까요? (맛집 찾기, 영수증 정리 등)",
  disabled = false,
  sending = false,
  onOpenCapture,
  onOpenGallery,
  onOpenLinkPaste,
  onQuickCapture,
  onSendMessage,
  onSendComposer,
  onPeerTalkPick,
  initialComposerText,
  className,
}: ActionChatInputBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [text, setText] = useState(initialComposerText ?? "");
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const ambient = useChatAmbientFocusOptional();

  useEffect(() => {
    if (!initialComposerText?.trim()) {
      return;
    }
    setText(initialComposerText);
    ambient?.setComposerDraft(true);
  }, [ambient, initialComposerText]);

  const { active: peerTalkComposer, candidates: peerTalkCandidates } =
    usePeerTalkCandidates(text);
  const { active: groupTalkComposer, candidates: groupTalkCandidates } =
    useGroupTalkCandidates(text);

  const syncComposerDraft = (value: string) => {
    ambient?.setComposerDraft(value.trim().length > 0);
  };

  const handleFile = (file: File | null | undefined) => {
    if (!file || !onQuickCapture) {
      return;
    }
    onQuickCapture(file);
    setMenuOpen(false);
  };

  const submit = async () => {
    const value = text.trim();
    if (!value || disabled || sending) {
      return;
    }

    let shouldClear = true;
    if (onSendComposer) {
      const result = await onSendComposer({ text: value });
      if (result === false) {
        shouldClear = false;
      }
    } else {
      onSendMessage?.(value);
    }

    if (shouldClear) {
      setText("");
      syncComposerDraft("");
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        rimvioNavBarClass,
        "rimvio-composer-bar px-4 pb-1.5 pt-2",
        className,
      )}
    >
      {groupTalkComposer ? (
        <div className="mb-1 border-b border-white/[0.06] pb-1">
          {groupTalkCandidates.length > 0 ? (
            <GroupTalkBubbles
              groups={groupTalkCandidates}
              onPick={(group) => {
                onPeerTalkPick?.(groupTargetAsPeerContact(group));
                setText("");
                syncComposerDraft("");
              }}
            />
          ) : (
            <p className="px-1 py-2 text-center text-[11px] text-muted-foreground">
              {groupTalkComposer.query.trim()
                ? `"${groupTalkComposer.query.trim()}" 맞는 단톡이 없어요`
                : "단톡이 없어요 · /peers 에서 만들기"}
            </p>
          )}
        </div>
      ) : peerTalkComposer ? (
        <div className="mb-1 border-b border-white/[0.06] pb-1">
          {peerTalkCandidates.length > 0 ? (
            <PeerTalkContactBubbles
              contacts={peerTalkCandidates}
              onPick={(contact) => {
                onPeerTalkPick?.(contact);
                setText("");
                syncComposerDraft("");
              }}
            />
          ) : (
            <p className="px-1 py-2 text-center text-[11px] text-muted-foreground">
              {peerTalkComposer.query.trim()
                ? `"${peerTalkComposer.query.trim()}" 맞는 친구가 없어요`
                : "친구가 없어요 · @친추로 추가"}
            </p>
          )}
        </div>
      ) : null}

      {menuOpen ? (
        <div className={rimvioMenuGridClass}>
          <button
            type="button"
            onClick={() => {
              cameraRef.current?.click();
              onOpenCapture?.();
            }}
            className={rimvioMenuTileBtnClass("cyan")}
          >
            <Camera className="size-5 text-rimvio-neon-cyan" />
            사진 촬영
          </button>
          <button
            type="button"
            onClick={() => {
              galleryRef.current?.click();
              onOpenGallery?.();
            }}
            className={rimvioMenuTileBtnClass("purple")}
          >
            <ImageIcon className="size-5 text-rimvio-neon-purple" />
            앨범 선택
          </button>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onOpenLinkPaste?.();
            }}
            className={rimvioMenuTileBtnClass("magenta")}
          >
            <Link2 className="size-5 text-rimvio-neon-magenta" />
            링크 붙여넣기
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className={rimvioMenuTileBtnClass("green")}
          >
            <FileUp className="size-5 text-rimvio-neon-green" />
            파일 첨부
          </button>
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <button
          type="button"
          aria-label={menuOpen ? "메뉴 닫기" : "입력 메뉴"}
          onClick={() => setMenuOpen((open) => !open)}
          className={rimvioIconBtnClass(menuOpen ? "secondary" : "primary")}
        >
          {menuOpen ? <X className="size-5" /> : <Plus className="size-5" />}
        </button>

        <div
          className={cn(
            rimvioComposerFieldClass,
            ambient?.composerLive && "rimvio-composer-field--live",
          )}
          onPointerDown={(event) => {
            if (event.target === event.currentTarget && !disabled && !sending) {
              inputRef.current?.focus({ preventScroll: true });
            }
          }}
        >
          <ComposerMentionField
            inputRef={inputRef}
            value={text}
            disabled={disabled || sending}
            placeholder={placeholder}
            onChange={(next) => {
              setText(next);
              syncComposerDraft(next);
            }}
            onFocus={() => ambient?.setComposerFocused(true)}
            onBlur={() => ambient?.setComposerFocused(false)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {text.trim() ? (
          <button
            type="submit"
            disabled={disabled || sending}
            aria-label="보내기"
            className={rimvioIconBtnClass("primary")}
          >
            {sending ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <SendHorizontal className="size-5" />
            )}
          </button>
        ) : (
          <button
            type="button"
            aria-label="음성 입력"
            className={rimvioIconBtnClass("ghost")}
          >
            <Mic className="size-5" />
          </button>
        )}
      </div>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          handleFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          handleFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </form>
  );
}
