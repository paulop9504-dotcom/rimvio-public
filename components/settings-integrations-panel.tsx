"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { SettingsSection } from "@/components/settings/settings-section";
import { useCopy } from "@/hooks/use-copy";
import { useIntegrations } from "@/hooks/use-integrations";
import {
  INTEGRATION_CATALOG,
  catalogEntryFor,
  type IntegrationProviderId,
} from "@/lib/integrations";
import type { IntegrationSecretPayload } from "@/lib/integrations/types";
import { IOS } from "@/lib/ui/ios-surface";
import { cn } from "@/lib/utils";
import { GoogleCalendarOAuthSetupHint } from "@/components/settings/google-calendar-oauth-setup-hint";
import { useCalendarGoogleActions } from "@/hooks/use-calendar-google-actions";
import { Check, KeyRound, Link2, RefreshCw, Unplug } from "lucide-react";

function IntegrationRowShell({
  title,
  hint,
  connected,
  children,
}: {
  title: string;
  hint: string;
  connected: boolean;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl bg-rimvio-surface-muted/50 px-3 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-foreground">{title}</p>
          <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">{hint}</p>
        </div>
        {connected ? (
          <Check className="size-4 shrink-0 text-[#34C759]" aria-hidden />
        ) : (
          <KeyRound className="size-4 shrink-0 text-muted-foreground/50" aria-hidden />
        )}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function OAuthRow({
  provider,
  connected,
  oauthReady,
  onConnect,
  onDisconnect,
  onSync,
  syncing,
  copy,
}: {
  provider: IntegrationProviderId;
  connected: boolean;
  oauthReady: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onSync?: () => Promise<void>;
  syncing?: boolean;
  copy: ReturnType<typeof useCopy>;
}) {
  const entry = catalogEntryFor(provider);
  if (!entry) {
    return null;
  }

  return (
    <IntegrationRowShell
      title={`${entry.emoji} ${entry.label}`}
      hint={
        oauthReady
          ? entry.hint
          : `${entry.hint} · ${copy.calendar.oauthSetupPending}`
      }
      connected={connected}
    >
      {!oauthReady ? (
        <p className="w-full text-[12px] leading-relaxed text-muted-foreground">
          {copy.calendar.oauthSetupPending}
        </p>
      ) : connected ? (
        <>
          {onSync ? (
            <button
              type="button"
              disabled={syncing}
              onClick={() => void onSync()}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium",
                IOS.primaryBtn,
                "h-auto min-h-0 w-auto py-2",
              )}
            >
              <RefreshCw className={cn("size-3.5", syncing && "animate-spin")} />
              {syncing ? copy.calendar.syncing : copy.calendar.syncGoogle}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onDisconnect}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium",
              IOS.secondaryBtn,
            )}
          >
            <Unplug className="size-3.5" />
            {copy.settings.integrationsDisconnect}
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={onConnect}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium",
            IOS.primaryBtn,
            "h-auto min-h-0 w-auto py-2",
          )}
        >
          <Link2 className="size-3.5" />
          {copy.settings.integrationsOAuthConnect}
        </button>
      )}
    </IntegrationRowShell>
  );
}

function ApiKeyRow({
  provider,
  connected,
  maskedSecret,
  onSave,
  onDisconnect,
  copy,
}: {
  provider: IntegrationProviderId;
  connected: boolean;
  maskedSecret: string | null;
  onSave: (secret: IntegrationSecretPayload) => Promise<void>;
  onDisconnect: () => Promise<void>;
  copy: ReturnType<typeof useCopy>;
}) {
  const entry = catalogEntryFor(provider);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  if (!entry) {
    return null;
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const secret: IntegrationSecretPayload = {};
      if (entry.apiKeyFields?.length) {
        for (const field of entry.apiKeyFields) {
          const value = values[field.key]?.trim();
          if (!value) {
            toast.error(copy.settings.integrationsKeyMissing);
            return;
          }
          secret[field.key] = value;
        }
      } else {
        const apiKey = values.api_key?.trim();
        if (!apiKey) {
          toast.error(copy.settings.integrationsKeyMissing);
          return;
        }
        secret.api_key = apiKey;
      }

      await onSave(secret);
      setOpen(false);
      setValues({});
      toast.success(copy.settings.integrationsSaved);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.settings.integrationsSaveFail);
    } finally {
      setSaving(false);
    }
  };

  return (
    <IntegrationRowShell
      title={`${entry.emoji} ${entry.label}`}
      hint={
        connected && maskedSecret
          ? `${entry.hint} · ${maskedSecret}`
          : entry.hint
      }
      connected={connected}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium",
          IOS.secondaryBtn,
        )}
      >
        <KeyRound className="size-3.5" />
        {connected
          ? copy.settings.integrationsKeyReplace
          : copy.settings.integrationsKeyConnect}
      </button>
      {connected ? (
        <button
          type="button"
          onClick={() => void onDisconnect()}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-muted-foreground",
            "bg-white/[0.04]",
          )}
        >
          <Unplug className="size-3.5" />
          {copy.settings.integrationsDisconnect}
        </button>
      ) : null}
      {open ? (
        <div className="mt-2 w-full space-y-2 border-t border-white/[0.06] pt-2">
          {entry.apiKeyFields?.length ? (
            entry.apiKeyFields.map((field) => (
              <label key={field.key} className="block">
                <span className="text-[11px] font-medium text-muted-foreground">
                  {field.label}
                </span>
                <input
                  type={field.secret ? "password" : "text"}
                  autoComplete="off"
                  placeholder={field.placeholder}
                  value={values[field.key] ?? ""}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, [field.key]: event.target.value }))
                  }
                  className="mt-1 w-full rounded-lg bg-rimvio-base px-3 py-2 text-[13px] text-foreground outline-none ring-1 ring-white/[0.08] focus:ring-white/15"
                />
              </label>
            ))
          ) : (
            <label className="block">
              <span className="text-[11px] font-medium text-muted-foreground">API Key</span>
              <input
                type="password"
                autoComplete="off"
                placeholder={entry.apiKeyPlaceholder}
                value={values.api_key ?? ""}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, api_key: event.target.value }))
                }
                className="mt-1 w-full rounded-lg bg-rimvio-base px-3 py-2 text-[13px] text-foreground outline-none ring-1 ring-white/[0.08] focus:ring-white/15"
              />
            </label>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className={cn("w-full py-2 text-[13px] font-semibold", IOS.primaryBtn)}
          >
            {saving ? copy.settings.integrationsSaving : copy.settings.integrationsKeySave}
          </button>
        </div>
      ) : null}
    </IntegrationRowShell>
  );
}

type SettingsIntegrationsPanelProps = {
  className?: string;
  variant?: "card" | "embedded";
};

export function SettingsIntegrationsPanel({
  className,
  variant = "card",
}: SettingsIntegrationsPanelProps) {
  const copy = useCopy();
  const searchParams = useSearchParams();
  const {
    integrations,
    oauthConfigured,
    loading,
    saveApiKey,
    disconnect,
    startOAuth,
    isConnected,
    sync,
  } = useIntegrations();
  const {
    runSync: runGoogleCalendarSync,
    syncing: googleCalendarSyncing,
  } = useCalendarGoogleActions();

  const oauthProviders = useMemo(
    () =>
      INTEGRATION_CATALOG.filter((item) => {
        if (!item.authKinds.includes("oauth")) {
          return false;
        }
        if (item.id === "google_calendar") {
          return true;
        }
        return (
          isConnected(item.id) ||
          Boolean(oauthConfigured[item.id as keyof typeof oauthConfigured])
        );
      }),
    [integrations, oauthConfigured],
  );

  const googleCalendarOauthReady = oauthConfigured.google_calendar;

  const apiKeyProviders = useMemo(
    () =>
      INTEGRATION_CATALOG.filter(
        (item) =>
          item.authKinds.includes("api_key") &&
          !INTEGRATION_CATALOG.some(
            (oauth) => oauth.id === item.id && oauth.authKinds.includes("oauth"),
          ),
      ),
    [],
  );

  const integrationByProvider = useMemo(() => {
    const map = new Map(integrations.map((item) => [item.provider, item]));
    return map;
  }, [integrations]);

  useEffect(() => {
    const status = searchParams.get("integration");
    const provider = searchParams.get("provider");
    if (status === "connected" && provider) {
      toast.success(copy.settings.integrationsOAuthSuccess(provider));
      void sync();
      if (provider === "google_calendar") {
        void runGoogleCalendarSync().catch(() => {});
      }
    } else if (status === "login_required") {
      toast.message(copy.settings.integrationsLoginRequired);
    } else if (status === "error") {
      toast.error(copy.settings.integrationsOAuthFail);
    }
  }, [searchParams, copy, sync]);

  const rows = loading ? (
    <p className="text-[13px] text-muted-foreground">{copy.settings.integrationsLoading}</p>
  ) : (
    <div className="space-y-2">
      {!googleCalendarOauthReady ? (
        <GoogleCalendarOAuthSetupHint />
      ) : null}
      {oauthProviders.map((entry) => (
        <OAuthRow
          key={entry.id}
          provider={entry.id}
          connected={isConnected(entry.id)}
          oauthReady={
            entry.id === "google_calendar"
              ? googleCalendarOauthReady
              : Boolean(oauthConfigured[entry.id as keyof typeof oauthConfigured])
          }
          onConnect={() => startOAuth(entry.id)}
          onDisconnect={() => void disconnect(entry.id)}
          onSync={
            entry.id === "google_calendar" && isConnected(entry.id)
              ? runGoogleCalendarSync
              : undefined
          }
          syncing={entry.id === "google_calendar" ? googleCalendarSyncing : false}
          copy={copy}
        />
      ))}
      {apiKeyProviders.map((entry) => (
        <ApiKeyRow
          key={entry.id}
          provider={entry.id}
          connected={isConnected(entry.id)}
          maskedSecret={integrationByProvider.get(entry.id)?.maskedSecret ?? null}
          onSave={async (secret) => {
            await saveApiKey({ provider: entry.id, secret });
          }}
          onDisconnect={() => disconnect(entry.id)}
          copy={copy}
        />
      ))}
      {oauthProviders.length === 0 && apiKeyProviders.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">연동 가능한 서비스가 없습니다.</p>
      ) : null}
    </div>
  );

  if (variant === "embedded") {
    return (
      <SettingsSection
        title={copy.settings.integrationsTitle}
        description={copy.settings.integrationsHintShort}
        className={className}
      >
        {rows}
      </SettingsSection>
    );
  }

  return (
    <section className={cn("overflow-hidden p-4", IOS.cardSm, className)}>
      <h2 className="text-sm font-semibold">{copy.settings.integrationsTitle}</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {copy.settings.integrationsHint}
      </p>
      <div className="mt-4">{rows}</div>
    </section>
  );
}
