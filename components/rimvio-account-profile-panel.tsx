"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Pencil } from "lucide-react";
import { toast } from "sonner";
import { SettingsSection } from "@/components/settings/settings-section";
import { RimvioProfilePhoto } from "@/components/rimvio-profile-photo";
import {
  fetchMyAccountProfile,
  saveMyAccountProfile,
  syncMyProfileFromAuth,
} from "@/lib/peer-chat/peer-chat-client";
import { formatPhoneDisplay } from "@/lib/peer-chat/phone";
import { useAuth } from "@/hooks/use-auth";
import { useCopy } from "@/hooks/use-copy";
import { updateRoomGuest } from "@/lib/rooms/guest-session";
import { cn } from "@/lib/utils";
import { AuthLogoutButton } from "@/components/auth-logout-button";

type RimvioAccountProfilePanelProps = {
  className?: string;
  variant?: "embedded" | "compact";
  onSaved?: () => void;
};

const inputClass =
  "h-11 w-full rounded-xl border-0 bg-rimvio-surface-muted px-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-white/10";

export function RimvioAccountProfilePanel({
  className,
  variant = "embedded",
  onSaved,
}: RimvioAccountProfilePanelProps) {
  const copy = useCopy();
  const ap = copy.settings.accountProfile;
  const { user } = useAuth();
  const googleAvatar =
    (user?.user_metadata?.avatar_url as string | undefined) ||
    (user?.user_metadata?.picture as string | undefined) ||
    null;
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(variant === "embedded");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [rimvioId, setRimvioId] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [savedRimvioId, setSavedRimvioId] = useState<string | null>(null);
  const [savedPhone, setSavedPhone] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    await syncMyProfileFromAuth().catch(() => {});
    const profile = await fetchMyAccountProfile();
    setDisplayName(profile.displayName ?? "");
    setSavedRimvioId(profile.rimvioId);
    setRimvioId(profile.rimvioId ?? "");
    const loadedPhone = profile.phone ?? "";
    setPhone(loadedPhone);
    setSavedPhone(profile.phone);
    setEmail(profile.email);
    setAvatarUrl(profile.avatarUrl ?? null);
    if (profile.displayName?.trim()) {
      updateRoomGuest({ label: profile.displayName.trim() });
    }
  }, []);

  useEffect(() => {
    void load()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [load]);

  const save = async () => {
    setBusy(true);
    try {
      const payload: Parameters<typeof saveMyAccountProfile>[0] = {};
      const trimmedName = displayName.trim();
      if (trimmedName) {
        payload.displayName = trimmedName;
      }
      const trimmedId = rimvioId.trim();
      if (trimmedId && trimmedId !== (savedRimvioId ?? "")) {
        payload.rimvioId = trimmedId;
      }
      const trimmedPhone = phone.trim();
      if (!trimmedPhone && savedPhone) {
        payload.clearPhone = true;
      } else if (trimmedPhone && trimmedPhone !== savedPhone) {
        payload.phone = trimmedPhone;
      }

      if (
        payload.displayName === undefined &&
        payload.rimvioId === undefined &&
        payload.phone === undefined &&
        !payload.clearPhone
      ) {
        toast.message(ap.noChanges);
        setEditing(false);
        return;
      }

      const result = await saveMyAccountProfile(payload);
      setSavedRimvioId(result.rimvioId);
      setRimvioId(result.rimvioId ?? "");
      setPhone(result.phone ?? "");
      setSavedPhone(result.phone);
      setDisplayName(result.displayName ?? trimmedName);
      if (result.displayName?.trim()) {
        updateRoomGuest({ label: result.displayName.trim() });
      }
      toast.success(ap.saved);
      setEditing(false);
      onSaved?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : ap.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  const copyId = async () => {
    if (!savedRimvioId) {
      return;
    }
    try {
      await navigator.clipboard.writeText(savedRimvioId);
      setCopied(true);
      toast.success(ap.idCopied);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(ap.copyFailed);
    }
  };

  if (loading) {
    return variant === "compact" ? null : (
      <p className={cn("text-sm text-muted-foreground", className)}>{ap.loading}</p>
    );
  }

  const photoBlock = (
    <RimvioProfilePhoto
      avatarUrl={avatarUrl}
      displayName={displayName}
      fallbackImageUrl={googleAvatar}
      editable
      size="lg"
      onAvatarChange={setAvatarUrl}
    />
  );

  const form = (
    <div className="space-y-4">
      {photoBlock}
      <label className="block">
        <span className="text-[12px] font-medium text-muted-foreground">
          {ap.displayNameLabel}
        </span>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={40}
          placeholder={ap.displayNamePlaceholder}
          className={cn(inputClass, "mt-1.5")}
        />
      </label>

      <label className="block">
        <span className="text-[12px] font-medium text-muted-foreground">
          {ap.rimvioIdLabel}
        </span>
        <div className="mt-1.5 flex items-center gap-1">
          <span className="text-sm text-muted-foreground">@</span>
          <input
            value={rimvioId}
            onChange={(e) => setRimvioId(e.target.value.toLowerCase())}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder={ap.rimvioIdPlaceholder}
            className={cn(inputClass, "min-w-0 flex-1 font-mono")}
          />
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">{ap.rimvioIdHint}</p>
      </label>

      <label className="block">
        <span className="text-[12px] font-medium text-muted-foreground">
          {ap.phoneLabel}
        </span>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="tel"
          placeholder={ap.phonePlaceholder}
          className={cn(inputClass, "mt-1.5")}
        />
        <p className="mt-1 text-[11px] text-muted-foreground">{ap.phoneHint}</p>
      </label>

      {email ? (
        <div>
          <span className="text-[12px] font-medium text-muted-foreground">
            {ap.emailLabel}
          </span>
          <p className="mt-1.5 truncate rounded-xl bg-rimvio-surface-muted/80 px-4 py-2.5 text-sm text-muted-foreground">
            {email}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">{ap.emailHint}</p>
        </div>
      ) : null}

      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className="w-full rounded-xl bg-rimvio-neon-purple py-2.5 text-sm font-semibold text-white disabled:opacity-40"
      >
        {busy ? ap.saving : ap.save}
      </button>

      {user ? (
        <AuthLogoutButton variant="destructive" redirectTo="/globe" />
      ) : null}
    </div>
  );

  if (variant === "compact") {
    if (editing) {
      return (
        <div
          className={cn(
            "space-y-3 rounded-2xl border border-rimvio-neon-purple/30 bg-rimvio-neon-purple/10 p-3",
            className,
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[12px] font-medium text-foreground">{ap.editTitle}</p>
            <button
              type="button"
              className="text-[11px] text-muted-foreground"
              onClick={() => {
                setEditing(false);
                void load();
              }}
            >
              {ap.cancel}
            </button>
          </div>
          {form}
        </div>
      );
    }

    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center gap-3 rounded-2xl border border-rimvio-neon-purple/25 bg-rimvio-neon-purple/10 px-3 py-2.5">
          <RimvioProfilePhoto
            avatarUrl={avatarUrl}
            displayName={displayName}
            fallbackImageUrl={googleAvatar}
            editable={false}
            size="md"
            showHint={false}
            className="shrink-0 gap-0"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-foreground">
              {displayName.trim() || ap.noDisplayName}
            </p>
            {savedRimvioId ? (
              <p className="font-mono text-sm font-semibold text-[#1b64da]">
                @{savedRimvioId}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">{ap.noRimvioId}</p>
            )}
            {(email || phone) && (
              <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                {email ?? ""}
                {email && phone ? " · " : ""}
                {phone ? formatPhoneDisplay(phone) : ""}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
            {savedRimvioId ? (
              <button
                type="button"
                onClick={() => void copyId()}
                className="flex items-center gap-1 rounded-full border border-border bg-rimvio-surface px-2 py-1.5 text-[10px] font-medium"
              >
                {copied ? (
                  <Check className="size-3.5 text-emerald-500" aria-hidden />
                ) : (
                  <Copy className="size-3.5" aria-hidden />
                )}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex items-center gap-1 rounded-full border border-border bg-rimvio-surface px-2.5 py-1.5 text-[10px] font-medium"
            >
              <Pencil className="size-3.5" aria-hidden />
              {ap.edit}
            </button>
          </div>
        </div>
        {user ? (
          <AuthLogoutButton variant="destructive" redirectTo="/globe" />
        ) : null}
      </div>
    );
  }

  return (
    <SettingsSection
      title={ap.sectionTitle}
      description={ap.sectionHint}
      className={className}
    >
      {form}
    </SettingsSection>
  );
}
