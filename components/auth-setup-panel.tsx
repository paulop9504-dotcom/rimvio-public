"use client";

import Link from "next/link";
import { SettingsSection } from "@/components/settings/settings-section";
import { useCopy } from "@/hooks/use-copy";
import { googleOAuthRedirectUriForSupabase } from "@/lib/auth/setup";

type AuthSetupPanelProps = {
  variant?: "card" | "embedded";
};

export function AuthSetupPanel({ variant = "embedded" }: AuthSetupPanelProps) {
  const copy = useCopy();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const googleRedirect = googleOAuthRedirectUriForSupabase(supabaseUrl);

  const body = (
    <ol className="list-decimal space-y-2 pl-4 text-[12px] leading-relaxed text-muted-foreground">
      <li>{copy.auth.setupStep1}</li>
      <li>{copy.auth.setupStep2}</li>
      <li>{copy.auth.setupStep3}</li>
    </ol>
  );

  const footer = (
    <div className="mt-3 space-y-2">
      {googleRedirect ? (
        <p className="break-all rounded-lg bg-rimvio-surface-muted/60 px-2.5 py-2 font-mono text-[10px] text-muted-foreground">
          {googleRedirect}
        </p>
      ) : null}
      <Link
        href="/docs/google-auth"
        className="inline-flex text-[12px] font-medium text-foreground/90 underline-offset-2 hover:underline"
      >
        {copy.auth.setupDocLink}
      </Link>
      <p className="text-[11px] text-muted-foreground">{copy.auth.setupEnvHint}</p>
    </div>
  );

  if (variant === "embedded") {
    return (
      <SettingsSection title={copy.auth.setupTitle} description={copy.auth.setupBody}>
        {body}
        {footer}
      </SettingsSection>
    );
  }

  return (
    <section className="rounded-2xl border border-white/[0.06] bg-rimvio-surface/90 p-4">
      <h2 className="text-[15px] font-semibold">{copy.auth.setupTitle}</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">{copy.auth.setupBody}</p>
      <div className="mt-3">
        {body}
        {footer}
      </div>
    </section>
  );
}
