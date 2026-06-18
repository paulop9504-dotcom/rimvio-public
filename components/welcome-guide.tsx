"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { AuthPanel } from "@/components/auth-panel";
import { AuthSetupPanel } from "@/components/auth-setup-panel";
import { useAuth } from "@/hooks/use-auth";
import { RimvioLogo } from "@/components/rimvio-logo";
import { InboxLinkInput } from "@/components/inbox-link-input";
import { SettingsProfilePanel } from "@/components/settings-profile-panel";
import { RimvioAccountProfilePanel } from "@/components/rimvio-account-profile-panel";
import { SettingsIntegrationsPanel } from "@/components/settings-integrations-panel";
import { SettingsAlbumSyncPanel } from "@/components/settings-album-sync-panel";
import { RimvioAppManualPanel } from "@/components/rimvio-app-manual-panel";
import { RimvioProductStoryScreens } from "@/components/rimvio-product-story-screens";
import { SettingsSection } from "@/components/settings/settings-section";
import { markManualGuideOpened } from "@/lib/onboarding/app-manual-onboarding";
import { useCopy } from "@/hooks/use-copy";
import { RIMVIO } from "@/lib/brand/rimvio";
import { IOS } from "@/lib/ui/ios-surface";
import { isAndroid, isIOS, isStandalonePwa } from "@/lib/platform/device";
import { cn } from "@/lib/utils";

function InstallSteps({
  platform,
}: {
  platform: "ios" | "android";
}) {
  const copy = useCopy();

  const steps =
    platform === "android"
      ? [
          { title: copy.welcome.androidStep1Title, body: copy.welcome.androidStep1Body },
          {
            title: copy.welcome.androidStep2Title,
            body: copy.welcome.androidStep2Body(RIMVIO.name),
          },
          { title: copy.welcome.androidStep3Title, body: copy.welcome.androidStep3Body },
        ]
      : [
          { title: copy.welcome.iosStep1Title, body: copy.welcome.iosStep1Body },
          { title: copy.welcome.iosStep2Title, body: copy.welcome.iosStep2Body },
          {
            title: copy.inbox.title,
            body: `${copy.inbox.paste}${copy.welcome.iosStep3Body}`,
          },
        ];

  return (
    <ol className="space-y-2">
      {steps.map((step, index) => (
        <li
          key={step.title}
          className="flex gap-3 rounded-xl bg-rimvio-surface-muted/60 px-3 py-2.5"
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[11px] font-semibold tabular-nums text-muted-foreground">
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-foreground">{step.title}</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
              {step.body}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function WelcomeGuide() {
  const copy = useCopy();
  const { configured: authConfigured, user } = useAuth();
  const searchParams = useSearchParams();
  const showPaste = searchParams.get("paste") === "1";
  const showManual = searchParams.get("manual") === "1";
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    if (isIOS()) {
      setPlatform("ios");
    } else if (isAndroid()) {
      setPlatform("android");
    } else {
      setPlatform("other");
    }
    setStandalone(isStandalonePwa());
  }, [searchParams]);

  useEffect(() => {
    if (showManual) {
      markManualGuideOpened();
      requestAnimationFrame(() => {
        document.getElementById("rimvio-manual")?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, [showManual]);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 px-4 pb-8 pt-2">
      <header className="flex items-center gap-3 border-b border-white/[0.06] pb-4">
        <RimvioLogo size="sm" appearance="white" />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight">{copy.nav.settings}</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{copy.product.oneLiner}</p>
        </div>
        <Link
          href="/welcome?manual=1"
          className="shrink-0 rounded-full border border-rimvio-neon-cyan/35 bg-rimvio-neon-cyan/10 px-3 py-1.5 text-[12px] font-semibold text-rimvio-neon-cyan active:scale-[0.98]"
        >
          {copy.manual.settingsLink}
        </Link>
      </header>

      <SettingsSection
        title={copy.product.howToUseTitle}
        description={copy.product.oneLiner}
      >
        <RimvioProductStoryScreens className="mb-3" />
        <Link
          href="/welcome?manual=1"
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[15px] font-semibold",
            IOS.primaryBtn,
          )}
          onClick={() => markManualGuideOpened()}
        >
          {copy.product.howToUseCta}
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      </SettingsSection>

      <SettingsProfilePanel variant="embedded" />

      <div id="rimvio-manual">
        <RimvioAppManualPanel />
      </div>

      {authConfigured && user ? (
        <RimvioAccountProfilePanel variant="embedded" />
      ) : null}

      {showPaste ? (
        <SettingsSection title={copy.inbox.paste} description={copy.inbox.pasteSubhint}>
          <InboxLinkInput />
        </SettingsSection>
      ) : null}

      {platform !== "other" ? (
        <SettingsSection
          title={platform === "ios" ? copy.welcome.iosSection : copy.welcome.androidSection}
          description={standalone ? copy.welcome.pwaOk : undefined}
        >
          <InstallSteps platform={platform} />
        </SettingsSection>
      ) : (
        <SettingsSection title={copy.welcome.desktopSection}>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            <Link href="/welcome?paste=1" className="font-medium text-foreground underline-offset-2 hover:underline">
              {copy.inbox.paste}
            </Link>
            {copy.welcome.desktopEnd}
          </p>
        </SettingsSection>
      )}

      {authConfigured ? (
        <SettingsSection title={copy.auth.googleLogin}>
          <AuthPanel nextPath="/welcome" variant="embedded" />
        </SettingsSection>
      ) : (
        <AuthSetupPanel variant="embedded" />
      )}

      <SettingsAlbumSyncPanel />

      <div id="integrations" className="scroll-mt-4">
        <SettingsIntegrationsPanel variant="embedded" />
      </div>

      <SettingsSection title={copy.welcome.privacyTitle}>
        <Link
          href="/privacy"
          className="flex items-center justify-between gap-2 rounded-xl bg-rimvio-surface-muted/50 px-3 py-2.5 text-[14px] font-medium text-foreground transition-colors hover:bg-white/[0.04]"
        >
          {copy.welcome.privacyLink}
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </Link>
      </SettingsSection>

      <div className="flex flex-wrap gap-2 pt-1">
        <Link href="/peers" className={cn("min-w-[45%] flex-1 text-center", IOS.primaryBtn)}>
          {copy.nav.peers}
        </Link>
        <Link href="/feed" className={cn("min-w-[45%] flex-1 text-center", IOS.secondaryBtn)}>
          {copy.nav.feed}
        </Link>
        <Link href="/search?calendar=full" className={cn("w-full py-3 text-center text-[15px] font-semibold", IOS.secondaryBtn)}>
          {copy.nav.calendar}
        </Link>
        <Link
          href="/welcome?paste=1"
          className={cn(
            "w-full py-3 text-center text-[15px] font-semibold",
            IOS.secondaryBtn,
          )}
        >
          {copy.welcome.addLink}
        </Link>
      </div>
    </div>
  );
}
