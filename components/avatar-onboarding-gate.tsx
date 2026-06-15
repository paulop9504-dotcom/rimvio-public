"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  markAvatarDrawRedirected,
  shouldRedirectToAvatarDraw,
} from "@/lib/onboarding/avatar-onboarding";
import { useRoomGuest } from "@/hooks/use-room-guest";

/** Once per session, send new users to the draw screen before feed use. */
export function AvatarOnboardingGate() {
  const router = useRouter();
  const guest = useRoomGuest();

  useEffect(() => {
    if (!shouldRedirectToAvatarDraw(guest.avatarDrawn)) {
      return;
    }

    markAvatarDrawRedirected();
    router.replace("/welcome?draw=1");
  }, [guest.avatarDrawn, router]);

  return null;
}
