"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  fetchMyPhoneProfile,
  saveMyPhoneProfile,
  syncMyProfileFromAuth,
} from "@/lib/peer-chat/peer-chat-client";
import { formatPhoneDisplay } from "@/lib/peer-chat/phone";
import { cn } from "@/lib/utils";

type PeerMyPhoneBannerProps = {
  className?: string;
  onRegistered?: () => void;
};

export function PeerMyPhoneBanner({
  className,
  onRegistered,
}: PeerMyPhoneBannerProps) {
  const [phone, setPhone] = useState("");
  const [savedPhone, setSavedPhone] = useState<string | null>(null);
  const [savedEmail, setSavedEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void syncMyProfileFromAuth()
      .then((synced) => {
        if (synced.email) {
          setSavedEmail(synced.email);
        }
        if (synced.phone) {
          setSavedPhone(synced.phone);
        }
      })
      .catch(() => {})
      .then(() => fetchMyPhoneProfile())
      .then((profile) => {
        if (profile.phone) {
          setSavedPhone(profile.phone);
        }
        const email = (profile as { email?: string | null }).email;
        if (email) {
          setSavedEmail(email);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return null;
  }

  if (savedEmail && !savedPhone) {
    return (
      <p className={cn("px-1 text-[11px] text-white/55", className)}>
        Google 이메일 {savedEmail} · 친구는 번호·이메일로 추가
      </p>
    );
  }

  if (savedPhone && !loading) {
    return (
      <p className={cn("px-1 text-[11px] text-white/55", className)}>
        {savedEmail ? `${savedEmail} · ` : ""}
        {savedPhone ? `번호 ${formatPhoneDisplay(savedPhone)}` : ""} · 친구는 번호·이메일로
        추가
      </p>
    );
  }

  if (savedEmail) {
    return null;
  }

  const submit = async () => {
    setBusy(true);
    try {
      const result = await saveMyPhoneProfile({ phone });
      setSavedPhone(result.phone);
      toast.success("내 번호를 등록했어요");
      onRegistered?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "번호 등록에 실패했어요",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cn(
        "space-y-2 rounded-2xl border border-rimvio-neon-cyan/25 bg-rimvio-neon-cyan/5 p-3",
        className,
      )}
    >
      <p className="text-[12px] font-medium text-white">
        내 휴대폰 번호 등록 (1회)
      </p>
      <p className="text-[10px] text-white/60">
        등록하면 친구가 전화번호로 나를 찾을 수 있어요
      </p>
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="010-0000-0000"
        inputMode="tel"
        className="h-10 w-full rounded-xl bg-rimvio-surface-muted px-3 text-sm text-white outline-none placeholder:text-white/40"
      />
      <button
        type="button"
        disabled={busy || !phone.trim()}
        onClick={() => void submit()}
        className="w-full rounded-xl bg-rimvio-neon-cyan py-2 text-sm font-semibold text-rimvio-base disabled:opacity-40"
      >
        저장
      </button>
    </div>
  );
}
