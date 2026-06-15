"use client";

import { RimvioAccountProfilePanel } from "@/components/rimvio-account-profile-panel";

type PeerProfileSetupProps = {
  className?: string;
  onRegistered?: () => void;
};

/** 친구 허브 상단 — Rimvio 계정 프로필 요약·수정 */
export function PeerProfileSetup({
  className,
  onRegistered,
}: PeerProfileSetupProps) {
  return (
    <RimvioAccountProfilePanel
      className={className}
      variant="compact"
      onSaved={onRegistered}
    />
  );
}
