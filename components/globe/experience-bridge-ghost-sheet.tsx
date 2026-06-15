"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { MapPin, X } from "lucide-react";
import { toast } from "sonner";
import { copy } from "@/lib/copy/human-ko";
import { projectBridgePreviewMedia } from "@/lib/globe/project-bridge-preview-media";
import { ExperienceBridgePreviewCollage } from "@/components/globe/experience-bridge-preview-collage";
import { ensureBridgeParticipantPin } from "@/lib/experience-bridge/build-participant-pin";
import {
  acceptExperienceBridgeRemote,
  declineExperienceBridgeRemote,
} from "@/lib/experience-bridge/experience-bridge-client";
import { writeLocalBridgeState } from "@/lib/experience-bridge/local-bridge-store";
import type { PendingBridgeInvite } from "@/hooks/use-pending-bridge-invites";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";
import { cn } from "@/lib/utils";

export type ExperienceBridgeGhostSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invite: PendingBridgeInvite | null;
  cluster: PinCluster | null;
  onAccepted?: (eventId: string) => void;
  onDismissed?: (eventId: string) => void;
};

/** Ghost pin tap — accept shared experience onto personal globe. */
export function ExperienceBridgeGhostSheet({
  open,
  onOpenChange,
  invite,
  cluster,
  onAccepted,
  onDismissed,
}: ExperienceBridgeGhostSheetProps) {
  const [busy, setBusy] = useState(false);

  if (!invite || !cluster) {
    return null;
  }

  const { bridge } = invite.state;
  const host = invite.state.participants.find((row) => row.role === "host");
  const hostName = host?.displayName?.trim() || copy.globe.bridgeInviteHostFallback;
  const previewMedia = projectBridgePreviewMedia(
    invite.state.bridge.eventSnapshot,
    3,
  );

  const handleAccept = async () => {
    setBusy(true);
    try {
      const data = await acceptExperienceBridgeRemote(bridge.eventId);
      ensureBridgeParticipantPin({
        bridge: data.state.bridge,
        peerThreadId: data.pinSpec.peerThreadId,
      });
      writeLocalBridgeState(data.state);
      toast.success(copy.globe.bridgeInviteAccepted);
      onAccepted?.(bridge.eventId);
      onDismissed?.(bridge.eventId);
      onOpenChange(false);
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : copy.globe.bridgeInviteAcceptFail,
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDecline = async () => {
    setBusy(true);
    try {
      const data = await declineExperienceBridgeRemote(bridge.eventId);
      writeLocalBridgeState(data.state);
      toast.message(copy.globe.bridgeInviteDeclined);
      onDismissed?.(bridge.eventId);
      onOpenChange(false);
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : copy.globe.bridgeInviteDeclineFail,
      );
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            role="presentation"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10060] bg-black/40"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed inset-x-0 bottom-0 z-[10061] mx-auto w-full max-w-lg overflow-hidden rounded-t-[1.35rem] border border-border bg-card shadow-2xl"
            data-experience-bridge-ghost-sheet
          >
            <ExperienceBridgePreviewCollage
              media={previewMedia}
              className="w-full rounded-none ring-0"
            />
            <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                  {copy.globe.bridgeInviteEyebrow}
                </p>
                <p className="mt-0.5 text-[16px] font-semibold text-foreground">
                  {copy.globe.bridgeInviteTitle(hostName, bridge.title)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex size-9 items-center justify-center rounded-full active:bg-muted"
                aria-label="닫기"
              >
                <X className="size-5 text-muted-foreground" />
              </button>
            </div>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              {copy.globe.bridgeGhostSheetBody}
            </p>
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[12px] font-medium text-foreground">
              <MapPin className="size-3.5 text-primary" aria-hidden />
              {cluster.placeLabel}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleAccept()}
                className={cn(
                  "flex-1 rounded-2xl bg-foreground px-4 py-3.5 text-[15px] font-semibold text-background shadow-sm",
                  "disabled:opacity-60",
                )}
              >
                {copy.globe.bridgeGhostAcceptCta}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleDecline()}
                className="rounded-2xl px-4 py-3.5 text-[14px] font-medium text-muted-foreground disabled:opacity-60"
              >
                {copy.globe.bridgeInviteDeclineCta}
              </button>
            </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
