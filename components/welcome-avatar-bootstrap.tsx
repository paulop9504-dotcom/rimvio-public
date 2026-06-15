"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { isRimvioAvatarVariant } from "@/lib/brand/rimvio-avatar-colors";
import { useCopy } from "@/hooks/use-copy";
import {
  assignAvatarVariant,
  resetGuestForAvatarDraw,
} from "@/lib/rooms/guest-session";
import { resetAvatarOnboardingForDev } from "@/lib/onboarding/avatar-onboarding";
import { isE2eMode } from "@/lib/test/e2e-avatar";

/** Handles ?fresh=1 reset, ?avatar=purple grant + founder env purple on welcome load. */
export function WelcomeAvatarBootstrap() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const copy = useCopy();

  useEffect(() => {
    if (searchParams.get("fresh") === "1") {
      resetGuestForAvatarDraw();
      resetAvatarOnboardingForDev();
      toast.success(copy.settings.drawResetOk);
      const testVariant = searchParams.get("testVariant");
      const nextUrl =
        isE2eMode() && testVariant
          ? `/welcome?draw=1&testVariant=${encodeURIComponent(testVariant)}`
          : "/welcome?draw=1";
      router.replace(nextUrl);
      return;
    }

    if (
      process.env.NODE_ENV === "development" &&
      process.env.NEXT_PUBLIC_FOUNDER_PURPLE === "1"
    ) {
      assignAvatarVariant("purple");
    }

    const avatar = searchParams.get("avatar");
    if (!avatar || !isRimvioAvatarVariant(avatar)) {
      return;
    }

    assignAvatarVariant(avatar);

    if (avatar === "purple") {
      toast.success(copy.settings.profileRareGranted);
    }
  }, [copy.settings.drawResetOk, copy.settings.profileRareGranted, router, searchParams]);

  return null;
}
