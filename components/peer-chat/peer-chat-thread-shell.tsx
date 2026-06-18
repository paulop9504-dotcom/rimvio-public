"use client";

import { PeerThreadLensBar } from "@/components/peer-chat/peer-thread-lens-bar";
import { usePeerThreadSettings } from "@/hooks/use-peer-thread-settings";

type PeerChatThreadShellProps = {
  peerThreadId: string;
  displayName: string;
  children?: React.ReactNode;
  className?: string;
  /** 1:1 DM — 렌즈·고정 바 숨김 */
  hideLensBar?: boolean;
};

/** 친구 ROOM — 연결(고정)된 경우에만 렌즈·고정핀. AI 실행 창에는 사용하지 않음. */
export function PeerChatThreadShell({
  peerThreadId,
  displayName,
  children,
  className,
  hideLensBar = false,
}: PeerChatThreadShellProps) {
  const {
    settings,
    policy,
    roster,
    pinError,
    setAiLens,
    setPinned,
  } = usePeerThreadSettings({ peerThreadId, displayName });

  const connected = policy.storageMode === "pinned_full";

  return (
    <div className={className ?? "flex min-h-0 flex-1 flex-col"}>
      {connected && !hideLensBar ? (
        <PeerThreadLensBar
          displayName={displayName}
          aiLensEnabled={settings.aiLensEnabled}
          isPinned={settings.isPinned}
          roster={roster}
          onAiLensChange={setAiLens}
          onPinnedChange={setPinned}
        />
      ) : null}
      {pinError === "roster_full" ? (
        <p className="bg-amber-50 px-3 py-1.5 text-[11px] text-amber-800">
          연결 가능한 ROOM이 가득 찼어요. 다른 ROOM 고정을 해제한 뒤 시도해 주세요.
        </p>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
