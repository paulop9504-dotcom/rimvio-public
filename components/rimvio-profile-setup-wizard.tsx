"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { RimvioLogo } from "@/components/rimvio-logo";
import { RimvioProfilePhoto } from "@/components/rimvio-profile-photo";
import { useAuth } from "@/hooks/use-auth";
import { useCopy } from "@/hooks/use-copy";
import {
  applyProfileSetupDefaults,
  markProfileSetupCompleteLocal,
} from "@/lib/onboarding/profile-setup-state";
import { pickSuggestedRimvioId } from "@/lib/onboarding/suggest-rimvio-id";
import {
  fetchMyAccountProfile,
  saveMyAccountProfile,
  syncMyProfileFromAuth,
} from "@/lib/peer-chat/peer-chat-client";
import { validateRimvioId } from "@/lib/peer-chat/rimvio-id";
import { cn } from "@/lib/utils";

type Step = "intro" | "welcome" | "name" | "rimvioId" | "phone" | "done";

const STEPS: Step[] = ["intro", "welcome", "name", "rimvioId", "phone", "done"];
const PROGRESS_STEPS: Step[] = ["intro", "welcome", "name", "rimvioId", "phone"];

const inputClass =
  "h-12 w-full rounded-xl border-0 bg-rimvio-surface-muted px-4 text-[15px] text-foreground outline-none focus:ring-2 focus:ring-rimvio-neon-cyan/35";

export function RimvioProfileSetupWizard() {
  const copy = useCopy();
  const ps = copy.profileSetup;
  const router = useRouter();
  const { user } = useAuth();
  const googleAvatar =
    (user?.user_metadata?.avatar_url as string | undefined) ||
    (user?.user_metadata?.picture as string | undefined) ||
    null;
  const googleName =
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "";

  const [step, setStep] = useState<Step>("intro");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [rimvioId, setRimvioId] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [savedRimvioId, setSavedRimvioId] = useState<string | null>(null);

  const suggestedId = useMemo(
    () =>
      pickSuggestedRimvioId({
        email: user?.email ?? email,
        displayName: displayName || googleName,
      }),
    [user?.email, email, displayName, googleName],
  );

  const stepIndex = PROGRESS_STEPS.indexOf(
    step === "done" ? "phone" : (step as (typeof PROGRESS_STEPS)[number]),
  );

  const load = useCallback(async () => {
    await syncMyProfileFromAuth().catch(() => {});
    const profile = await fetchMyAccountProfile();
    setDisplayName(profile.displayName?.trim() || googleName.trim());
    setSavedRimvioId(profile.rimvioId);
    setRimvioId(profile.rimvioId ?? pickSuggestedRimvioId({
      email: profile.email ?? user?.email,
      displayName: profile.displayName ?? googleName,
    }) ?? "");
    setPhone(profile.phone ?? "");
    setEmail(profile.email);
    setAvatarUrl(profile.avatarUrl ?? null);

    if (profile.rimvioId?.trim() && profile.displayName?.trim()) {
      setStep("done");
    } else if (profile.displayName?.trim()) {
      setStep("rimvioId");
    } else {
      setStep("intro");
    }
  }, [googleName, user?.email]);

  useEffect(() => {
    void load()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [load]);

  const persistPartial = async (patch: Parameters<typeof saveMyAccountProfile>[0]) => {
    const result = await saveMyAccountProfile(patch);
    if (result.rimvioId) {
      setSavedRimvioId(result.rimvioId);
      setRimvioId(result.rimvioId);
    }
    if (result.displayName) {
      setDisplayName(result.displayName);
    }
    if (result.phone !== undefined) {
      setPhone(result.phone ?? "");
    }
    return result;
  };

  const finishSetup = async (skipPhone: boolean) => {
    setBusy(true);
    try {
      const trimmedName = displayName.trim();
      const idParsed = validateRimvioId(rimvioId.trim());
      if (!trimmedName) {
        toast.error(ps.nameRequired);
        setStep("name");
        return;
      }
      if (!idParsed.ok) {
        toast.error(idParsed.reason);
        setStep("rimvioId");
        return;
      }

      const patch: Parameters<typeof saveMyAccountProfile>[0] = {
        displayName: trimmedName,
        rimvioId: idParsed.id,
      };
      const trimmedPhone = phone.trim();
      if (!skipPhone && trimmedPhone) {
        patch.phone = trimmedPhone;
      }

      await persistPartial(patch);
      applyProfileSetupDefaults({
        displayName: trimmedName,
        rimvioId: idParsed.id,
      });
      markProfileSetupCompleteLocal();
      setStep("done");
      toast.success(ps.completeToast);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : ps.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  const goPeers = () => {
    router.replace("/peers");
  };

  if (loading) {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">{ps.loading}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-4 py-6">
      <RimvioLogo size="sm" appearance="white" className="mx-auto" />

      <div className="mt-6 flex items-center justify-center gap-1.5" aria-hidden>
        {PROGRESS_STEPS.map((s, i) => (
          <span
            key={s}
            className={cn(
              "h-1 rounded-full transition-all",
              i <= stepIndex ? "w-8 bg-rimvio-neon-cyan" : "w-4 bg-white/15",
            )}
          />
        ))}
      </div>

      {step === "intro" ? (
        <div className="mt-8 text-center">
          <h1 className="text-[20px] font-semibold text-white">{ps.introTitle}</h1>
          <p className="mt-3 text-[14px] leading-relaxed text-white/65">
            {ps.introBody}
          </p>
          <div
            className="mx-auto mt-6 flex max-w-[16rem] flex-wrap justify-center gap-2"
            aria-hidden
          >
            {["📅 일정", "🗺 길찾기", "💸 송금"].map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-rimvio-neon-cyan/35 bg-rimvio-neon-cyan/10 px-3 py-1.5 text-[12px] font-medium text-rimvio-neon-cyan"
              >
                {chip}
              </span>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-white/45">{ps.introTapHint}</p>
          <p className="mt-2 text-[12px] font-medium text-white/55">
            {copy.product.oneLiner}
          </p>
          <button
            type="button"
            className="rimvio-accent-submit-btn mt-8 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-semibold text-white"
            onClick={() => setStep("welcome")}
          >
            {ps.introCta}
            <ChevronRight className="size-5" aria-hidden />
          </button>
        </div>
      ) : null}

      {step === "welcome" ? (
        <div className="mt-8 text-center">
          <RimvioProfilePhoto
            avatarUrl={avatarUrl}
            displayName={displayName || googleName}
            fallbackImageUrl={googleAvatar}
            editable={false}
            size="lg"
            showHint={false}
            className="mx-auto"
          />
          <h1 className="mt-6 text-[20px] font-semibold text-white">{ps.welcomeTitle}</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-white/60">{ps.welcomeBody}</p>
          {user?.email ? (
            <p className="mt-3 truncate text-[12px] text-white/45">{user.email}</p>
          ) : null}
          <button
            type="button"
            className="rimvio-accent-submit-btn mt-8 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-semibold text-white"
            onClick={() => setStep(savedRimvioId ? "phone" : "name")}
          >
            {ps.welcomeCta}
            <ChevronRight className="size-5" aria-hidden />
          </button>
        </div>
      ) : null}

      {step === "name" ? (
        <div className="mt-8">
          <h2 className="text-[18px] font-semibold text-white">{ps.nameTitle}</h2>
          <p className="mt-1.5 text-[13px] text-white/55">{ps.nameHint}</p>
          <label className="mt-5 block">
            <span className="text-[12px] font-medium text-white/50">
              {copy.settings.accountProfile.displayNameLabel}
            </span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={40}
              autoFocus
              placeholder={copy.settings.accountProfile.displayNamePlaceholder}
              className={cn(inputClass, "mt-2")}
            />
          </label>
          <WizardNav
            busy={busy}
            primaryLabel={ps.next}
            onPrimary={async () => {
              if (!displayName.trim()) {
                toast.error(ps.nameRequired);
                return;
              }
              setBusy(true);
              try {
                await persistPartial({ displayName: displayName.trim() });
                setStep("rimvioId");
              } catch (error) {
                toast.error(
                  error instanceof Error ? error.message : ps.saveFailed,
                );
              } finally {
                setBusy(false);
              }
            }}
            onBack={() => setStep("welcome")}
          />
        </div>
      ) : null}

      {step === "rimvioId" ? (
        <div className="mt-8">
          <h2 className="text-[18px] font-semibold text-white">{ps.idTitle}</h2>
          <p className="mt-1.5 text-[13px] text-white/55">{ps.idHint}</p>
          <label className="mt-5 block">
            <span className="text-[12px] font-medium text-white/50">
              {copy.settings.accountProfile.rimvioIdLabel}
            </span>
            <div className="mt-2 flex items-center gap-1">
              <span className="text-[15px] text-white/40">@</span>
              <input
                value={rimvioId}
                onChange={(e) => setRimvioId(e.target.value.toLowerCase())}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                autoFocus
                placeholder={copy.settings.accountProfile.rimvioIdPlaceholder}
                className={cn(inputClass, "min-w-0 flex-1 font-mono")}
              />
            </div>
          </label>
          {suggestedId ? (
            <button
              type="button"
              className="mt-3 w-full rounded-xl border border-rimvio-neon-cyan/30 bg-rimvio-neon-cyan/10 py-2.5 text-[13px] font-medium text-rimvio-neon-cyan"
              onClick={() => setRimvioId(suggestedId)}
            >
              {ps.useSuggestedId(suggestedId)}
            </button>
          ) : null}
          <p className="mt-2 text-[11px] text-white/45">
            {copy.settings.accountProfile.rimvioIdHint}
          </p>
          <WizardNav
            busy={busy}
            primaryLabel={ps.next}
            onPrimary={() => {
              const parsed = validateRimvioId(rimvioId.trim());
              if (!parsed.ok) {
                toast.error(parsed.reason);
                return;
              }
              setStep("phone");
            }}
            onBack={() => setStep("name")}
          />
        </div>
      ) : null}

      {step === "phone" ? (
        <div className="mt-8">
          <h2 className="text-[18px] font-semibold text-white">{ps.phoneTitle}</h2>
          <p className="mt-1.5 text-[13px] text-white/55">{ps.phoneHint}</p>
          <label className="mt-5 block">
            <span className="text-[12px] font-medium text-white/50">
              {copy.settings.accountProfile.phoneLabel}
            </span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              placeholder={copy.settings.accountProfile.phonePlaceholder}
              className={cn(inputClass, "mt-2")}
            />
          </label>
          <WizardNav
            busy={busy}
            primaryLabel={ps.finish}
            onPrimary={() => void finishSetup(false)}
            secondaryLabel={ps.skipPhone}
            onSecondary={() => void finishSetup(true)}
            onBack={() => setStep("rimvioId")}
          />
        </div>
      ) : null}

      {step === "done" ? (
        <div className="mt-10 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
            <Check className="size-8" strokeWidth={2.5} aria-hidden />
          </span>
          <h2 className="mt-5 text-[20px] font-semibold text-white">{ps.doneTitle}</h2>
          <p className="mt-2 font-mono text-lg text-rimvio-neon-cyan">
            @{savedRimvioId ?? rimvioId}
          </p>
          <p className="mt-2 text-[13px] text-white/55">{ps.doneBody}</p>
          <button
            type="button"
            className="rimvio-accent-submit-btn mt-8 w-full rounded-2xl py-3.5 text-[15px] font-semibold text-white"
            onClick={goPeers}
          >
            {ps.doneCta}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function WizardNav(input: {
  busy: boolean;
  primaryLabel: string;
  onPrimary: () => void | Promise<void>;
  secondaryLabel?: string;
  onSecondary?: () => void;
  onBack: () => void;
}) {
  const ps = useCopy().profileSetup;

  return (
    <div className="mt-8 flex flex-col gap-2">
      <button
        type="button"
        disabled={input.busy}
        className="rimvio-accent-submit-btn w-full rounded-2xl py-3.5 text-[15px] font-semibold text-white disabled:opacity-50"
        onClick={() => void input.onPrimary()}
      >
        {input.busy ? ps.saving : input.primaryLabel}
      </button>
      {input.secondaryLabel && input.onSecondary ? (
        <button
          type="button"
          disabled={input.busy}
          className="w-full py-2.5 text-[13px] font-medium text-white/55"
          onClick={input.onSecondary}
        >
          {input.secondaryLabel}
        </button>
      ) : null}
      <button
        type="button"
        className="w-full py-2 text-[12px] text-white/40"
        onClick={input.onBack}
      >
        {ps.back}
      </button>
    </div>
  );
}
