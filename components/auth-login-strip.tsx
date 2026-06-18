"use client";

import { useState } from "react";
import { toast } from "sonner";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { useAuth } from "@/hooks/use-auth";
import { useCopy } from "@/hooks/use-copy";

export function AuthLoginStrip() {
  const copy = useCopy();
  const { configured, user, loading, signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!configured || loading || user) {
    return null;
  }

  return (
    <div className="border-b border-white/[0.06] bg-white/[0.03] px-4 py-2">
      <p className="mb-2 text-[11px] leading-snug text-white/55">{copy.auth.loginStrip}</p>
      <GoogleSignInButton
        size="sm"
        label={copy.auth.googleContinue}
        busy={busy}
        onClick={() => {
          setBusy(true);
          void signInWithGoogle("/onboarding")
            .catch(() => {
              toast.error(copy.auth.loginFail, {
                description: copy.auth.loginFailHint,
              });
              setBusy(false);
            });
        }}
      />
    </div>
  );
}
