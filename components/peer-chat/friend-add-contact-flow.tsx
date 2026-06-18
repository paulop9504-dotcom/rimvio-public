"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { PeerProfileAvatar } from "@/components/peer-chat/peer-profile-avatar";
import { friendContactErrorMessage } from "@/lib/peer-chat/friend-contact-errors";
import {
  addPeerByPhoneRemote,
  lookupFriendContactRemote,
} from "@/lib/peer-chat/peer-chat-client";
import { useAuth } from "@/hooks/use-auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { cn } from "@/lib/utils";

export type FriendAddPreview = {
  userId: string;
  displayName: string;
  rimvioId: string | null;
  avatarUrl: string | null;
  emailLower?: string | null;
  matchedBy: string;
};

export type FriendAddResult = {
  threadId: string;
  displayName: string;
  otherUserId?: string;
  rimvioId?: string | null;
  emailLower?: string | null;
  preview: FriendAddPreview;
};

const LOOKUP_DEBOUNCE_MS = 280;

type FriendAddContactFlowProps = {
  contact: string;
  className?: string;
  confirmLabel?: string;
  previewHint?: string;
  compact?: boolean;
  enableEnterSubmit?: boolean;
  onAdded?: (result: FriendAddResult) => void | Promise<void>;
  onError?: (message: string) => void;
  loginRequiredMessage?: string;
  loginCtaLabel?: string;
};

function PreviewShimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl bg-[#f2f4f6] px-3 py-3",
        className,
      )}
    >
      <div className="size-11 shrink-0 animate-pulse rounded-full bg-[#e5e8eb]" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3.5 w-24 animate-pulse rounded-md bg-[#e5e8eb]" />
        <div className="h-3 w-16 animate-pulse rounded-md bg-[#e5e8eb]/80" />
      </div>
    </div>
  );
}

export function FriendAddContactFlow({
  contact,
  className,
  confirmLabel = "친구 추가",
  previewHint = "탭해서 친구 추가",
  compact = false,
  enableEnterSubmit = true,
  onAdded,
  onError,
  loginRequiredMessage = "Google 로그인 후 친구를 추가할 수 있어요",
  loginCtaLabel = "로그인하기",
}: FriendAddContactFlowProps) {
  const { user, configured, loading: authLoading } = useAuth();
  const authReady = Boolean(
    !authLoading && configured && user && isSupabaseConfigured(),
  );
  const trimmedContact = contact.trim();
  const [debouncedContact, setDebouncedContact] = useState(trimmedContact);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<FriendAddPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onErrorRef = useRef(onError);
  const onAddedRef = useRef(onAdded);
  const lookupSeqRef = useRef(0);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    onAddedRef.current = onAdded;
  }, [onAdded]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedContact(trimmedContact),
      LOOKUP_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [trimmedContact]);

  const loadPreview = useCallback(() => {
    if (authLoading) {
      setLoading(true);
      setError(null);
      return;
    }

    if (!authReady || !debouncedContact) {
      setLoading(false);
      setError(null);
      setPreview(null);
      return;
    }

    const seq = ++lookupSeqRef.current;
    setLoading(true);
    setError(null);
    setPreview(null);

    void lookupFriendContactRemote(debouncedContact)
      .then((data) => {
        if (seq !== lookupSeqRef.current) {
          return;
        }
        setPreview(data.profile);
      })
      .catch((err) => {
        if (seq !== lookupSeqRef.current) {
          return;
        }
        const message = friendContactErrorMessage(
          err instanceof Error ? err.message : undefined,
        );
        setError(message);
        onErrorRef.current?.(message);
      })
      .finally(() => {
        if (seq !== lookupSeqRef.current) {
          return;
        }
        setLoading(false);
      });
  }, [authLoading, authReady, debouncedContact]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  const confirmAdd = useCallback(() => {
    if (!preview || !authReady || submitting) {
      return;
    }
    setSubmitting(true);
    void addPeerByPhoneRemote({ contact: debouncedContact })
      .then(async (result) => {
        await onAddedRef.current?.({
          threadId: result.threadId,
          displayName: result.displayName,
          otherUserId: result.otherUserId,
          rimvioId: preview.rimvioId ?? result.rimvioId,
          emailLower: preview.emailLower ?? result.emailLower,
          preview,
        });
      })
      .catch((err) => {
        const message = friendContactErrorMessage(
          err instanceof Error ? err.message : undefined,
        );
        onErrorRef.current?.(message);
      })
      .finally(() => setSubmitting(false));
  }, [authReady, debouncedContact, preview, submitting]);

  useEffect(() => {
    if (!enableEnterSubmit || !preview || submitting) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        confirmAdd();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmAdd, enableEnterSubmit, preview, submitting]);

  if (!trimmedContact) {
    return null;
  }

  if (authLoading) {
    return <PreviewShimmer className={className} />;
  }

  if (!authReady) {
    return (
      <div className={cn("space-y-2 rounded-2xl bg-[#fff8eb] px-3 py-3", className)}>
        <p className="text-[12px] text-amber-800">{loginRequiredMessage}</p>
        <Link
          href="/welcome"
          className="inline-flex text-sm font-semibold text-[#3182f6]"
        >
          {loginCtaLabel} →
        </Link>
      </div>
    );
  }

  if (loading) {
    return <PreviewShimmer className={className} />;
  }

  if (error) {
    return (
      <div className={cn("space-y-2 rounded-2xl bg-[#fff8eb] px-3 py-3", className)}>
        <p className="text-[12px] leading-relaxed text-amber-800">{error}</p>
        <button
          type="button"
          onClick={loadPreview}
          className="text-[12px] font-semibold text-[#3182f6]"
        >
          다시 찾기
        </button>
      </div>
    );
  }

  if (!preview) {
    return null;
  }

  return (
    <button
      type="button"
      disabled={submitting}
      onClick={() => confirmAdd()}
      className={cn(
        "group flex w-full items-center gap-3 rounded-2xl border border-[#3182f6]/25 bg-gradient-to-br from-white to-[#f0f6ff] px-3 py-3 text-left shadow-sm transition active:scale-[0.98] disabled:opacity-70",
        className,
      )}
    >
      <PeerProfileAvatar
        displayName={preview.displayName}
        avatarUrl={preview.avatarUrl}
        size={compact ? "sm" : "md"}
        className="ring-2 ring-[#3182f6]/25"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#191f28]">
          {preview.displayName}
        </p>
        {preview.rimvioId ? (
          <p className="truncate text-[12px] font-medium text-[#1b64da]">
            @{preview.rimvioId}
          </p>
        ) : null}
        <p className="mt-0.5 text-[11px] font-medium text-[#3182f6]">
          {submitting ? "추가 중…" : previewHint}
        </p>
      </div>
      <ChevronRight
        className="size-5 shrink-0 text-[#3182f6]/70 transition group-active:translate-x-0.5"
        aria-hidden
      />
    </button>
  );
}
