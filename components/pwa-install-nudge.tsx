"use client";

import { useEffect, useState } from "react";
import { isStandalonePwa } from "@/lib/platform/device";
import {
  markPwaInstallNudgeShown,
  shouldOfferPwaInstall,
} from "@/lib/platform/pwa-install-nudge";
import { cn } from "@/lib/utils";

export function PwaInstallNudge() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sync = () => {
      setVisible(shouldOfferPwaInstall(isStandalonePwa()));
    };

    sync();
    window.addEventListener("rimvio:first-action", sync);
    return () => window.removeEventListener("rimvio:first-action", sync);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div
      className={cn(
        "pointer-events-auto fixed inset-x-4 z-40 mx-auto max-w-md",
        "bottom-[calc(max(3.25rem,calc(env(safe-area-inset-bottom)+2.85rem))+0.5rem)]",
        "rounded-2xl border border-border bg-rimvio-surface/95 p-4 shadow-lg backdrop-blur-xl"
      )}
    >
      <p className="text-sm font-semibold">홈 화면에 추가해 두면 더 빨라요</p>
      <p className="mt-1 text-xs text-muted-foreground">
        다른 앱에서 공유할 때 Rimvio가 바로 떠요.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="flex-1 rounded-xl bg-rimvio-neon-purple px-3 py-2 text-sm font-semibold text-white"
          onClick={() => {
            markPwaInstallNudgeShown();
            setVisible(false);
          }}
        >
          알겠어요
        </button>
        <button
          type="button"
          className="rounded-xl px-3 py-2 text-sm text-muted-foreground"
          onClick={() => {
            markPwaInstallNudgeShown();
            setVisible(false);
          }}
        >
          나중에
        </button>
      </div>
    </div>
  );
}
