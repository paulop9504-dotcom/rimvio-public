"use client";

import { AuthSetupPanel } from "@/components/auth-setup-panel";
import { DemoPeerRoomPreview } from "@/components/peer-chat/demo-peer-room-preview";
import { RimvioGoogleSignInCard } from "@/components/rimvio-google-sign-in-card";
import { useCopy } from "@/hooks/use-copy";
import { cn } from "@/lib/utils";

type GuestPeersLandingProps = {
  configured: boolean;
  className?: string;
};

/** 비로그인 — Google만 노출, 허브 반쯤 동작 숨김 */
export function GuestPeersLanding({
  configured,
  className,
}: GuestPeersLandingProps) {
  const copy = useCopy();

  return (
    <div className={cn("flex flex-col gap-4 pb-6", className)}>
      {configured ? (
        <>
          <RimvioGoogleSignInCard className="mx-1" nextPath="/onboarding" />
          <p className="px-3 text-center text-[12px] leading-relaxed text-[#6b7684]">
            {copy.peers.guestSignInHint}
          </p>
          <DemoPeerRoomPreview />
        </>
      ) : (
        <div className="mx-1">
          <AuthSetupPanel variant="embedded" />
        </div>
      )}
    </div>
  );
}
