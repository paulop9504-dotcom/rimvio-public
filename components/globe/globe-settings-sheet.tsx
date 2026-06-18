"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  BookOpen,
  Calendar,
  Check,
  ClipboardCopy,
  CloudDownload,
  Settings,
  Smartphone,
  Wifi,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { HomeCountryPicker } from "@/components/home-country-picker";
import { SettingsIntegrationsPanel } from "@/components/settings-integrations-panel";
import { SettingsRow, SettingsSection } from "@/components/settings/settings-section";
import { SettingsToggle } from "@/components/settings/settings-toggle";
import { useAlbumSync } from "@/hooks/use-album-sync";
import { useAlbumSyncProgress } from "@/hooks/use-album-sync-progress";
import { useCopy } from "@/hooks/use-copy";
import { useAuth } from "@/hooks/use-auth";
import { useGlobeExperienceSettings } from "@/hooks/use-globe-experience-settings";
import { useGpsTrackingEnabled } from "@/hooks/use-gps-tracking-enabled";
import { useLiveLocationSnapshot } from "@/hooks/use-live-location-snapshot";
import { readAlbumSyncNetworkType } from "@/lib/ingest/album-sync-network";
import { isNativeShell } from "@/lib/native-bridge/rimvio-native-bridge";
import {
  ACTION_TRUST_UPDATED,
  labelForTrustLevelMode,
  readActionTrustState,
  TRUST_LEVEL_OPTIONS,
  writeActionTrustMode,
  type TrustLevelMode,
} from "@/lib/preferences/action-trust";
import {
  ALBUM_SYNC_UPDATED,
  readAlbumSyncPrefs,
  writeAlbumSyncPrefs,
  type AlbumSyncNetworkPolicy,
  type AlbumSyncPrefs,
} from "@/lib/preferences/album-sync";
import {
  getHomeCountry,
  HOME_COUNTRY_UPDATED,
  setHomeCountry,
  suggestHomeCountryFromBrowser,
} from "@/lib/preferences/home-country";
import {
  labelForMapApp,
  MAP_APP_OPTIONS,
  MAP_APP_UPDATED,
  readMapApp,
  writeMapApp,
  type MapApp,
} from "@/lib/preferences/map-app";
import {
  labelForScheduleMedium,
  readScheduleMedium,
  SCHEDULE_MEDIUM_OPTIONS,
  SCHEDULE_MEDIUM_UPDATED,
  writeScheduleMedium,
  type ScheduleMedium,
} from "@/lib/preferences/schedule-medium";
import type { CountryCode } from "@/lib/links/spark-locale";
import { formatGpsAccuracyLabel } from "@/lib/globe/format-gps-accuracy-label";
import { cn } from "@/lib/utils";
import { copy } from "@/lib/copy/human-ko";
import { AuthLogoutButton } from "@/components/auth-logout-button";
import { GlobeBackerLink } from "@/components/globe/globe-backer-link";

export type GlobeSettingsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShowGlobeGuide?: () => void;
};

const NETWORK_OPTIONS: {
  id: AlbumSyncNetworkPolicy;
  title: string;
  icon: typeof Wifi;
}[] = [
  { id: "wifi_only", title: "Wi-Fi만", icon: Wifi },
  { id: "wifi_and_mobile", title: "Wi-Fi + LTE", icon: Smartphone },
];

const SCHEDULE_ICONS = {
  rimvio: Bell,
  google_calendar: Calendar,
  copy: ClipboardCopy,
} as const;

function CompactOptionButton({
  active,
  title,
  hint,
  emoji,
  onClick,
}: {
  active: boolean;
  title: string;
  hint?: string;
  emoji?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors active:scale-[0.99]",
        active
          ? "bg-[#007AFF]/10 ring-1 ring-[#007AFF]/35"
          : "bg-rimvio-surface-muted/60 ring-1 ring-white/[0.05]",
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg text-sm",
          active ? "bg-[#007AFF] text-white" : "bg-rimvio-surface text-foreground",
        )}
      >
        {active ? <Check className="size-4" strokeWidth={2.5} /> : emoji ?? "·"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold text-foreground">{title}</span>
        {hint ? (
          <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function GlobeSettingsBody({ onShowGlobeGuide }: { onShowGlobeGuide?: () => void }) {
  const copy = useCopy();
  const { user } = useAuth();
  const { enabled: gpsEnabled, setEnabled: setGpsEnabled } = useGpsTrackingEnabled();
  const { settings: globePrefs, patch: patchGlobePrefs } = useGlobeExperienceSettings();
  const liveLocation = useLiveLocationSnapshot();
  const native = isNativeShell();

  const [albumPrefs, setAlbumPrefs] = useState<AlbumSyncPrefs>(() => readAlbumSyncPrefs());
  const [networkLabel, setNetworkLabel] = useState("확인 중");
  const [albumSyncing, setAlbumSyncing] = useState(false);
  const { syncNow } = useAlbumSync({ enabled: false });
  const { progress, active: albumActive, percent } = useAlbumSyncProgress();

  const [trustMode, setTrustMode] = useState<TrustLevelMode>("auto");
  const [scheduleMedium, setScheduleMedium] = useState<ScheduleMedium>("rimvio");
  const [mapApp, setMapApp] = useState<MapApp>(() => readMapApp(true));
  const [homeCountry, setHomeCountryState] = useState<CountryCode | null>(() => getHomeCountry());

  const refreshAlbum = useCallback(async () => {
    setAlbumPrefs(readAlbumSyncPrefs());
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
    void refreshAlbum();
    const onAlbum = () => void refreshAlbum();
    window.addEventListener(ALBUM_SYNC_UPDATED, onAlbum);
    return () => window.removeEventListener(ALBUM_SYNC_UPDATED, onAlbum);
  }, [refreshAlbum]);

  useEffect(() => {
    const syncTrust = () => setTrustMode(readActionTrustState().mode);
    syncTrust();
    window.addEventListener(ACTION_TRUST_UPDATED, syncTrust);
    return () => window.removeEventListener(ACTION_TRUST_UPDATED, syncTrust);
  }, []);

  useEffect(() => {
    const syncSchedule = () => setScheduleMedium(readScheduleMedium());
    syncSchedule();
    window.addEventListener(SCHEDULE_MEDIUM_UPDATED, syncSchedule);
    return () => window.removeEventListener(SCHEDULE_MEDIUM_UPDATED, syncSchedule);
  }, []);

  useEffect(() => {
    const syncMap = () => setMapApp(readMapApp(true));
    syncMap();
    window.addEventListener(MAP_APP_UPDATED, syncMap);
    return () => window.removeEventListener(MAP_APP_UPDATED, syncMap);
  }, []);

  useEffect(() => {
    const syncHome = () => setHomeCountryState(getHomeCountry());
    syncHome();
    window.addEventListener(HOME_COUNTRY_UPDATED, syncHome);
    return () => window.removeEventListener(HOME_COUNTRY_UPDATED, syncHome);
  }, []);

  const patchAlbum = (next: Partial<AlbumSyncPrefs>) => {
    setAlbumPrefs(writeAlbumSyncPrefs(next));
  };

  const handleAlbumSyncNow = async () => {
    setAlbumSyncing(true);
    try {
      const result = await syncNow();
      if (!result) {
        toast.message("자동 가져오기를 켜 주세요");
        return;
      }
      if (result.status === "done") {
        toast.success(result.message);
      } else {
        toast.message(result.message);
      }
      void refreshAlbum();
    } finally {
      setAlbumSyncing(false);
    }
  };

  const locationHint = !gpsEnabled
    ? "Privacy Mode — 위치 기록 안 함"
    : !liveLocation
      ? "위치 확인 중…"
      : [liveLocation.contextLabel, formatGpsAccuracyLabel(liveLocation.accuracyM)]
          .filter(Boolean)
          .join(" · ");

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <SettingsSection title="도움말" description="처음이시면 여기부터">
        <button
          type="button"
          onClick={() => onShowGlobeGuide?.()}
          className="flex w-full items-center gap-3 rounded-xl bg-rimvio-surface-muted/60 px-3 py-3 text-left active:scale-[0.99]"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <BookOpen className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold text-foreground">
              {copy.globe.guide.settingsRow}
            </span>
            <span className="mt-0.5 block text-[12px] text-muted-foreground">
              {copy.globe.guide.settingsRowSub}
            </span>
          </span>
        </button>
      </SettingsSection>

      <SettingsSection title="위치" description="GPS · 체류 기록">
        <SettingsRow label="GPS 추적" hint={locationHint}>
          <SettingsToggle
            checked={gpsEnabled}
            onCheckedChange={setGpsEnabled}
            aria-label="GPS 추적"
          />
        </SettingsRow>
        <SettingsRow
          label="체류 → 경험 자동 기록"
          hint="같은 장소에 머물면 지구본에 맥락을 만들어요"
        >
          <SettingsToggle
            checked={globePrefs.gpsDwellIngest}
            disabled={!gpsEnabled}
            onCheckedChange={(checked) => patchGlobePrefs({ gpsDwellIngest: checked })}
            aria-label="체류 자동 기록"
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="수집" description="사진 · 자동 붙이기">
        <SettingsRow
          label="확신 높으면 자동 붙이기"
          hint="끄면 붙인 뒤 항상 확인 카드가 떠요"
        >
          <SettingsToggle
            checked={globePrefs.silentAutoAttach}
            onCheckedChange={(checked) => patchGlobePrefs({ silentAutoAttach: checked })}
            aria-label="자동 붙이기"
          />
        </SettingsRow>
        <SettingsRow
          label="경험 맥락에 맞는 사진 자동 찾기"
          hint={
            native
              ? `맥락 날짜·장소에 맞는 것만 · ${networkLabel}`
              : "Android · iOS 앱에서 사진첩 접근"
          }
        >
          <SettingsToggle
            checked={albumPrefs.enabled}
            onCheckedChange={(checked) => patchAlbum({ enabled: checked })}
            aria-label="경험 맥락에 맞는 사진 자동 찾기"
          />
        </SettingsRow>
        <SettingsRow label="앱 열 때 동기화" hint="백그라운드 복귀 시 다시 훑어요">
          <SettingsToggle
            checked={albumPrefs.resumeOnOpen}
            disabled={!albumPrefs.enabled}
            onCheckedChange={(checked) => patchAlbum({ resumeOnOpen: checked })}
            aria-label="앱 열 때 동기화"
          />
        </SettingsRow>

        {albumPrefs.enabled ? (
          <div className="flex gap-2 pt-1">
            {NETWORK_OPTIONS.map((option) => {
              const active = albumPrefs.networkPolicy === option.id;
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => patchAlbum({ networkPolicy: option.id })}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] font-semibold",
                    active
                      ? "bg-[#007AFF]/12 text-[#007AFF] ring-1 ring-[#007AFF]/30"
                      : "bg-rimvio-surface-muted text-muted-foreground",
                  )}
                >
                  <Icon className="size-3.5" aria-hidden />
                  {option.title}
                </button>
              );
            })}
          </div>
        ) : null}

        {albumActive ? (
          <div className="mt-2 rounded-xl bg-rimvio-surface-muted/70 px-3 py-2.5">
            <p className="text-[12px] font-medium">{progress.label || "동기화 중…"}</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#007AFF] transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        ) : null}

        <button
          type="button"
          disabled={albumSyncing || albumActive || !albumPrefs.enabled}
          onClick={() => void handleAlbumSyncNow()}
          className={cn(
            "mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold",
            "bg-rimvio-surface-muted text-foreground ring-1 ring-white/[0.06] active:scale-[0.99]",
            (albumSyncing || albumActive || !albumPrefs.enabled) && "opacity-50",
          )}
        >
          <CloudDownload className="size-4" aria-hidden />
          {albumSyncing || albumActive ? "가져오는 중…" : "지금 사진첩 동기화"}
        </button>
      </SettingsSection>

      <SettingsSection title="지구본" description="표시 옵션">
        <SettingsRow label={copy.globe.contextWarmthLabel} hint={copy.globe.contextWarmthHint}>
          <SettingsToggle
            checked={globePrefs.showContextWarmth}
            onCheckedChange={(checked) => patchGlobePrefs({ showContextWarmth: checked })}
            aria-label={copy.globe.contextWarmthLabel}
          />
        </SettingsRow>
        <SettingsRow label="여행 경로 arc" hint="멀티데이 일정 사이 곡선">
          <SettingsToggle
            checked={globePrefs.showTripArcs}
            onCheckedChange={(checked) => patchGlobePrefs({ showTripArcs: checked })}
            aria-label="여행 경로 arc"
          />
        </SettingsRow>
      </SettingsSection>

      <Suspense fallback={null}>
        <SettingsIntegrationsPanel variant="embedded" />
      </Suspense>

      <SettingsSection title={copy.settings.trustTitle} description={copy.settings.trustHint}>
        <div className="space-y-1.5">
          {TRUST_LEVEL_OPTIONS.map((option) => (
            <CompactOptionButton
              key={option.id}
              active={trustMode === option.id}
              emoji={option.emoji}
              title={option.label}
              hint={option.hint}
              onClick={() => {
                writeActionTrustMode(option.id);
                setTrustMode(option.id);
                toast.success(copy.settings.trustSaved);
              }}
            />
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {copy.settings.trustActive(labelForTrustLevelMode(trustMode))}
        </p>
      </SettingsSection>

      <SettingsSection title={copy.settings.scheduleTitle} description={copy.settings.scheduleHint}>
        <div className="space-y-1.5">
          {SCHEDULE_MEDIUM_OPTIONS.map((option) => {
            const Icon = SCHEDULE_ICONS[option.id];
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={scheduleMedium === option.id}
                onClick={() => {
                  writeScheduleMedium(option.id);
                  setScheduleMedium(option.id);
                  toast.success(copy.settings.scheduleSaved);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left",
                  scheduleMedium === option.id
                    ? "bg-[#007AFF]/10 ring-1 ring-[#007AFF]/35"
                    : "bg-rimvio-surface-muted/60 ring-1 ring-white/[0.05]",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg",
                    scheduleMedium === option.id
                      ? "bg-[#007AFF] text-white"
                      : "bg-rimvio-surface text-foreground",
                  )}
                >
                  {scheduleMedium === option.id ? (
                    <Check className="size-4" strokeWidth={2.5} />
                  ) : (
                    <Icon className="size-4" strokeWidth={2} />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold">
                    {option.emoji} {option.label}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {option.hint}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {copy.settings.scheduleActive(labelForScheduleMedium(scheduleMedium))}
        </p>
      </SettingsSection>

      <SettingsSection title="지도 앱" description="길찾기 · 장소 열기 기본값">
        <div className="grid grid-cols-2 gap-1.5">
          {MAP_APP_OPTIONS.map((option) => (
            <CompactOptionButton
              key={option.id}
              active={mapApp === option.id}
              emoji={option.emoji}
              title={option.label}
              hint={option.badge}
              onClick={() => {
                writeMapApp(option.id);
                setMapApp(option.id);
              }}
            />
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          기본: {labelForMapApp(mapApp)}
        </p>
      </SettingsSection>

      <SettingsSection title="홈 국가" description="국내/해외 맥락 · 지도 추천">
        <HomeCountryPicker
          compact
          value={homeCountry ?? suggestHomeCountryFromBrowser()}
          suggested={suggestHomeCountryFromBrowser()}
          onChange={(code) => {
            setHomeCountry(code);
            setHomeCountryState(code);
            toast.success("홈 국가를 저장했어요");
          }}
        />
      </SettingsSection>

      {user ? (
        <SettingsSection title="계정" description="로그인 · 다른 계정으로 테스트">
          <p className="text-[13px] font-medium text-foreground">
            {user.user_metadata?.full_name ??
              user.user_metadata?.name ??
              user.email ??
              copy.auth.guestName}
          </p>
          {user.email ? (
            <p className="mt-0.5 text-[12px] text-muted-foreground">{user.email}</p>
          ) : null}
          <AuthLogoutButton className="mt-3" variant="destructive" redirectTo="/globe" />
        </SettingsSection>
      ) : null}

      <div className="px-1 pb-2 pt-1">
        <GlobeBackerLink className="w-full justify-center" />
      </div>
    </div>
  );
}

/** Globe home — all toggles & prefs in one sheet. */
export function GlobeSettingsSheet({
  open,
  onOpenChange,
  onShowGlobeGuide,
}: GlobeSettingsSheetProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            role="presentation"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10050] bg-black/40"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="지구본 설정"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            className="fixed inset-x-0 bottom-0 z-[10051] mx-auto flex w-full max-w-lg max-h-[min(92dvh,720px)] flex-col overflow-hidden rounded-t-[1.25rem] border border-border bg-card shadow-2xl"
            data-globe-settings-sheet
          >
            <div className="shrink-0 border-b border-border px-4 py-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="flex items-center gap-1.5 text-[16px] font-semibold text-foreground">
                    <Settings className="size-4 text-primary" aria-hidden />
                    지구본 설정
                  </p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    위치 · 수집 · 연동 · 액션
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="flex size-9 items-center justify-center rounded-full active:bg-muted"
                  aria-label="닫기"
                >
                  <X className="size-5 text-muted-foreground" aria-hidden />
                </button>
              </div>
            </div>

            <GlobeSettingsBody onShowGlobeGuide={onShowGlobeGuide} />
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
