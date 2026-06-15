"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { SettingsRow } from "@/components/settings/settings-section";
import { useAlbumSync } from "@/hooks/use-album-sync";
import { useAlbumSyncProgress } from "@/hooks/use-album-sync-progress";
import { readAlbumSyncNetworkType } from "@/lib/ingest/album-sync-network";
import { isNativeShell } from "@/lib/native-bridge/rimvio-native-bridge";
import {
  ALBUM_SYNC_UPDATED,
  readAlbumSyncPrefs,
  writeAlbumSyncPrefs,
  type AlbumSyncNetworkPolicy,
  type AlbumSyncPrefs,
} from "@/lib/preferences/album-sync";
import { IOS } from "@/lib/ui/ios-surface";
import { cn } from "@/lib/utils";
import { CloudDownload, Smartphone, Wifi } from "lucide-react";

function formatLastSync(iso: string | null): string {
  if (!iso) {
    return "아직 없음";
  }
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    return "아직 없음";
  }
  return new Date(ms).toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const NETWORK_OPTIONS: {
  id: AlbumSyncNetworkPolicy;
  title: string;
  hint: string;
  icon: typeof Wifi;
}[] = [
  {
    id: "wifi_only",
    title: "Wi-Fi에서만",
    hint: "데이터 요금 없이 가져오기 · TeraBox 기본",
    icon: Wifi,
  },
  {
    id: "wifi_and_mobile",
    title: "Wi-Fi + 모바일 데이터",
    hint: "LTE/5G에서도 맥락 맞는 사진만 가져오기",
    icon: Smartphone,
  },
];

export function SettingsAlbumSyncPanel({ className }: { className?: string }) {
  const { syncNow } = useAlbumSync({ enabled: false });
  const { progress, active, percent } = useAlbumSyncProgress();
  const [prefs, setPrefs] = useState<AlbumSyncPrefs>(() => readAlbumSyncPrefs());
  const [networkLabel, setNetworkLabel] = useState("확인 중");
  const [syncing, setSyncing] = useState(false);
  const native = isNativeShell();

  const refresh = useCallback(async () => {
    setPrefs(readAlbumSyncPrefs());
    const network = await readAlbumSyncNetworkType();
    setNetworkLabel(
      network === "wifi"
        ? "Wi-Fi"
        : network === "cellular"
          ? "모바일 데이터"
          : network === "none"
            ? "오프라인"
            : "알 수 없음",
    );
  }, []);

  useEffect(() => {
    void refresh();
    const onUpdate = () => {
      void refresh();
    };
    window.addEventListener(ALBUM_SYNC_UPDATED, onUpdate);
    return () => window.removeEventListener(ALBUM_SYNC_UPDATED, onUpdate);
  }, [refresh]);

  const patch = (next: Partial<AlbumSyncPrefs>) => {
    const saved = writeAlbumSyncPrefs(next);
    setPrefs(saved);
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const result = await syncNow();
      if (!result) {
        toast.message("자동 가져오기를 켜 주세요");
        return;
      }
      if (result.status === "done") {
        toast.success(result.message);
      } else if (result.status === "waiting_wifi") {
        toast.message(result.message);
      } else if (result.status === "permission_denied") {
        toast.error(result.message);
      } else if (result.status === "web_unsupported") {
        toast.message(result.message);
      } else {
        toast.message(result.message);
      }
      void refresh();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <section className={cn("overflow-hidden p-4", IOS.cardSm, className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">경험 맥락에 맞는 사진 자동 찾기</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            기록한 경험의 날짜·장소 구간만 메타 스캔해요. 맞는 사진만 가져와
            붙이고, 사진첩 전체는 업로드하지 않아요.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-rimvio-neon-purple/10 px-2.5 py-1 text-[10px] font-semibold text-rimvio-neon-cyan">
          맥락 필터
        </span>
      </div>

      <div className="mt-4 space-y-2">
        <SettingsRow
          label="자동 가져오기"
          hint={
            native
              ? `현재 네트워크 · ${networkLabel}`
              : "Android · iOS 앱에서 사진첩 접근 가능"
          }
        >
          <button
            type="button"
            role="switch"
            aria-checked={prefs.enabled}
            onClick={() => patch({ enabled: !prefs.enabled })}
            className={cn(
              "relative h-7 w-12 rounded-full transition-colors",
              prefs.enabled ? "bg-[#007AFF]" : "bg-white/15",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 size-6 rounded-full bg-white shadow-sm transition-transform",
                prefs.enabled ? "translate-x-5" : "translate-x-0.5",
              )}
            />
          </button>
        </SettingsRow>

        <SettingsRow
          label="앱 열 때 동기화"
          hint="백그라운드에서 돌아오면 자동으로 다시 훑어요"
        >
          <button
            type="button"
            role="switch"
            aria-checked={prefs.resumeOnOpen}
            disabled={!prefs.enabled}
            onClick={() => patch({ resumeOnOpen: !prefs.resumeOnOpen })}
            className={cn(
              "relative h-7 w-12 rounded-full transition-colors disabled:opacity-45",
              prefs.resumeOnOpen ? "bg-[#007AFF]" : "bg-white/15",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 size-6 rounded-full bg-white shadow-sm transition-transform",
                prefs.resumeOnOpen ? "translate-x-5" : "translate-x-0.5",
              )}
            />
          </button>
        </SettingsRow>

        <p className="text-[11px] text-muted-foreground">
          마지막 동기화 · {formatLastSync(prefs.lastSyncAtIso)}
        </p>

        {active ? (
          <div className="rounded-xl bg-rimvio-surface-muted/70 px-3 py-2.5">
            <p className="text-[12px] font-medium text-foreground">
              {progress.label || "동기화 중…"}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rimvio-neon-purple to-rimvio-neon-cyan transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        ) : null}

        <div className="space-y-2 pt-1">
          {NETWORK_OPTIONS.map((option) => {
            const active = prefs.networkPolicy === option.id;
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                disabled={!prefs.enabled}
                onClick={() => patch({ networkPolicy: option.id })}
                className={cn(
                  "flex w-full items-start gap-3 rounded-2xl px-3.5 py-3 text-left transition-all active:scale-[0.99] disabled:opacity-45",
                  active
                    ? "bg-rimvio-neon-purple/8 ring-2 ring-[#007AFF]/35 shadow-sm"
                    : "bg-rimvio-surface-muted ring-1 ring-rimvio-neon-purple/12",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl",
                    active
                      ? "bg-rimvio-neon-purple text-white"
                      : "bg-rimvio-surface text-foreground",
                  )}
                >
                  <Icon className="size-5" strokeWidth={2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-sm font-semibold">{option.title}</span>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                    {option.hint}
                  </p>
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={syncing || active}
          onClick={() => void handleSyncNow()}
          className={cn(
            "mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-semibold",
            IOS.secondaryBtn,
            syncing && "opacity-60",
          )}
        >
          <CloudDownload className="size-4" aria-hidden />
          {syncing || active ? "가져오는 중…" : "지금 동기화"}
        </button>
      </div>
    </section>
  );
}
