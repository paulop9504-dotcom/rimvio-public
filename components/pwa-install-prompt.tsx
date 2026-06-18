"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { RIMVIO } from "@/lib/brand/rimvio";
import { isStandalonePwa } from "@/lib/platform/device";
import { cn } from "@/lib/utils";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (isStandalonePwa()) {
      return;
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  if (!deferred || hidden) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-[max(4.5rem,calc(env(safe-area-inset-bottom)+3.5rem))] z-40 mx-auto max-w-md px-4">
      <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/95 px-4 py-3 shadow-lg backdrop-blur-xl">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-lg">
          👀
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{RIMVIO.name} 설치</p>
          <p className="text-xs text-muted-foreground">공유 메뉴에서 바로 열기</p>
        </div>
        <button
          type="button"
          onClick={() => {
            void deferred.prompt();
            setHidden(true);
          }}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-2",
            "text-xs font-semibold text-background active:scale-[0.97]"
          )}
        >
          <Download className="size-3.5" />
          설치
        </button>
      </div>
    </div>
  );
}
