"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useCopy } from "@/hooks/use-copy";
import { IOS } from "@/lib/ui/ios-surface";
import { cn } from "@/lib/utils";

export type AuthLogoutButtonProps = {
  className?: string;
  /** `destructive` — account/settings sign-out */
  variant?: "secondary" | "destructive";
  redirectTo?: string;
  onLoggedOut?: () => void;
};

/** Sign out of Supabase — redirects after session clears. */
export function AuthLogoutButton({
  className,
  variant = "secondary",
  redirectTo = "/",
  onLoggedOut,
}: AuthLogoutButtonProps) {
  const copy = useCopy();
  const { user, loading, configured, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!configured || loading || !user) {
    return null;
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void signOut()
          .then(() => {
            toast.success(copy.auth.logoutOk);
            onLoggedOut?.();
            window.location.href = redirectTo;
          })
          .catch(() => {
            toast.error(copy.auth.logoutFail);
          })
          .finally(() => setBusy(false));
      }}
      className={cn(
        "flex w-full items-center justify-center gap-2 py-2.5 text-[13px] font-semibold disabled:opacity-50 active:scale-[0.99]",
        variant === "destructive"
          ? "rounded-xl bg-red-500/10 text-red-600 ring-1 ring-red-500/20"
          : cn(IOS.secondaryBtn, "rounded-xl"),
        className,
      )}
    >
      <LogOut className="size-4" aria-hidden />
      {busy ? copy.auth.checking : copy.auth.logout}
    </button>
  );
}
