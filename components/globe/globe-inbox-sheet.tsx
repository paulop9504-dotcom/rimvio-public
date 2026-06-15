"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Inbox, Loader2, MapPin, Users, X } from "lucide-react";
import { toast } from "sonner";
import { copy } from "@/lib/copy/human-ko";
import { ensureBridgeParticipantPin } from "@/lib/experience-bridge/build-participant-pin";
import {
  acceptExperienceBridgeRemote,
  declineExperienceBridgeRemote,
} from "@/lib/experience-bridge/experience-bridge-client";
import { writeLocalBridgeState } from "@/lib/experience-bridge/local-bridge-store";
import { syncBridgeSharedMediaFromRemote } from "@/lib/experience-bridge/sync-bridge-participant-media";
import { verifyFeedCaptureEvent } from "@/lib/feed/verify-feed-capture";
import { formatDwellMinutesLabel } from "@/lib/feed/project-dwell-from-gps-pings";
import { markGlobeLocationConfirmed } from "@/lib/globe/globe-location-confirm-store";
import type { PendingGlobeLocationConfirm } from "@/lib/globe/list-pending-globe-location-confirms";
import type { PendingBridgeInvite } from "@/hooks/use-pending-bridge-invites";
import { cn } from "@/lib/utils";

export type GlobeInboxTriggerProps = {
  count: number;
  onOpen: () => void;
  className?: string;
};

/** Always-visible globe inbox entry — badge when pending items exist. */
export function GlobeInboxTrigger({ count, onOpen, className }: GlobeInboxTriggerProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "relative flex size-10 items-center justify-center rounded-full bg-card/95 text-foreground shadow-sm ring-1 ring-border backdrop-blur-md active:scale-[0.98]",
        className,
      )}
      aria-label={
        count > 0
          ? `${copy.globe.inboxTriggerAria} · ${count}건`
          : copy.globe.inboxTriggerAria
      }
      data-globe-inbox-trigger
    >
      <Inbox className="size-4 text-primary" aria-hidden />
      {count > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex min-w-[1.125rem] items-center justify-center rounded-full bg-primary px-1 py-px text-[10px] font-bold leading-none text-primary-foreground">
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </button>
  );
}

export type GlobeInboxSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bridgeInvites: readonly PendingBridgeInvite[];
  locationConfirms: readonly PendingGlobeLocationConfirm[];
  needsLogin?: boolean;
  loadError?: string | null;
  onBridgeAccepted?: (eventId: string) => void;
  onBridgeDeclined?: (eventId: string) => void;
  onLocationConfirmed?: (eventId: string) => void;
  onLocationDismissed?: (eventId: string) => void;
};

/** Unified globe inbox — share invites + location confirms. */
export function GlobeInboxSheet({
  open,
  onOpenChange,
  bridgeInvites,
  locationConfirms,
  needsLogin = false,
  loadError = null,
  onBridgeAccepted,
  onBridgeDeclined,
  onLocationConfirmed,
  onLocationDismissed,
}: GlobeInboxSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [busyBridgeEventId, setBusyBridgeEventId] = useState<string | null>(null);
  const [busyLocationEventId, setBusyLocationEventId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleAcceptBridge = async (invite: PendingBridgeInvite) => {
    const eventId = invite.state.bridge.eventId;
    setBusyBridgeEventId(eventId);
    try {
      const data = await acceptExperienceBridgeRemote(eventId);
      ensureBridgeParticipantPin({
        bridge: data.state.bridge,
        peerThreadId: data.pinSpec.peerThreadId,
      });
      writeLocalBridgeState(data.state);
      await syncBridgeSharedMediaFromRemote(eventId);
      toast.success(copy.globe.bridgeInviteAccepted);
      onBridgeAccepted?.(eventId);
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : copy.globe.bridgeInviteAcceptFail,
      );
    } finally {
      setBusyBridgeEventId(null);
    }
  };

  const handleDeclineBridge = async (invite: PendingBridgeInvite) => {
    const eventId = invite.state.bridge.eventId;
    setBusyBridgeEventId(eventId);
    try {
      const data = await declineExperienceBridgeRemote(eventId);
      writeLocalBridgeState(data.state);
      toast.message(copy.globe.bridgeInviteDeclined);
      onBridgeDeclined?.(eventId);
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : copy.globe.bridgeInviteDeclineFail,
      );
    } finally {
      setBusyBridgeEventId(null);
    }
  };

  const handleConfirmLocation = (row: PendingGlobeLocationConfirm) => {
    setBusyLocationEventId(row.eventId);
    const result = verifyFeedCaptureEvent(row.eventId);
    if (result.ok) {
      markGlobeLocationConfirmed(row.place, row.datetime);
      toast.success(copy.globe.inboxLocationConfirmed);
      onLocationConfirmed?.(row.eventId);
    } else {
      toast.error(copy.globe.inboxLocationConfirmFail);
    }
    setBusyLocationEventId(null);
  };

  const handleDismissLocation = (row: PendingGlobeLocationConfirm) => {
    onLocationDismissed?.(row.eventId);
  };

  const empty =
    bridgeInvites.length === 0 && locationConfirms.length === 0;

  if (!mounted) {
    return null;
  }

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
            className="fixed inset-0 z-[10070] bg-black/40"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={copy.globe.inboxTitle}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            className="fixed inset-x-0 bottom-0 z-[10071] mx-auto flex w-full max-w-lg max-h-[min(88dvh,640px)] flex-col overflow-hidden rounded-t-[1.25rem] border border-border bg-card shadow-2xl"
            data-globe-inbox-sheet
          >
            <div className="shrink-0 border-b border-border px-4 py-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="flex items-center gap-1.5 text-[16px] font-semibold text-foreground">
                    <Inbox className="size-4 text-primary" aria-hidden />
                    {copy.globe.inboxTitle}
                  </p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {copy.globe.inboxSubtitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="flex size-9 items-center justify-center rounded-full active:bg-muted"
                  aria-label="닫기"
                >
                  <X className="size-5 text-muted-foreground" aria-hidden />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {needsLogin ? (
                <p className="rounded-2xl bg-muted/50 px-4 py-10 text-center text-[13px] leading-relaxed text-muted-foreground">
                  {copy.globe.inboxNeedsLogin}
                </p>
              ) : loadError ? (
                <p className="rounded-2xl bg-muted/50 px-4 py-10 text-center text-[13px] leading-relaxed text-muted-foreground">
                  {copy.globe.inboxLoadFail}
                  <br />
                  <span className="text-[11px] opacity-80">{loadError}</span>
                </p>
              ) : empty ? (
                <p className="rounded-2xl bg-muted/50 px-4 py-10 text-center text-[13px] text-muted-foreground">
                  {copy.globe.inboxEmpty}
                </p>
              ) : (
                <div className="space-y-5">
                  {bridgeInvites.length > 0 ? (
                    <section>
                      <p className="mb-2 px-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {copy.globe.inboxSectionShare}
                      </p>
                      <ul className="space-y-3">
                        {bridgeInvites.map((invite) => {
                          const { bridge } = invite.state;
                          const host = invite.state.participants.find(
                            (row) => row.role === "host",
                          );
                          const hostName =
                            host?.displayName?.trim() ||
                            copy.globe.bridgeInviteHostFallback;
                          const busy = busyBridgeEventId === bridge.eventId;

                          return (
                            <li
                              key={bridge.eventId}
                              className="rounded-2xl border border-border bg-muted/30 p-3.5"
                            >
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                                {copy.globe.bridgeInviteEyebrow}
                              </p>
                              <p className="mt-0.5 text-[14px] font-semibold text-foreground">
                                {copy.globe.bridgeInviteTitle(hostName, bridge.title)}
                              </p>
                              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                                {copy.globe.bridgeInviteBody}
                              </p>
                              <div className="mt-2">
                                <span className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 text-[11px] font-medium text-foreground">
                                  <Users className="size-3" aria-hidden />
                                  {bridge.placeLabel || copy.globe.bridgeInvitePlaceFallback}
                                </span>
                              </div>
                              <div className="mt-3 flex gap-2">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void handleAcceptBridge(invite)}
                                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-foreground px-3 py-2.5 text-[13px] font-semibold text-background shadow-sm disabled:opacity-60"
                                >
                                  {busy ? (
                                    <Loader2 className="size-4 animate-spin" aria-hidden />
                                  ) : null}
                                  {copy.globe.bridgeInviteAcceptCta}
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void handleDeclineBridge(invite)}
                                  className="rounded-xl px-3 py-2.5 text-[13px] font-medium text-muted-foreground disabled:opacity-60"
                                >
                                  {copy.globe.bridgeInviteDeclineCta}
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ) : null}

                  {locationConfirms.length > 0 ? (
                    <section>
                      <p className="mb-2 px-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {copy.globe.inboxSectionLocation}
                      </p>
                      <ul className="space-y-3">
                        {locationConfirms.map((row) => {
                          const busy = busyLocationEventId === row.eventId;
                          return (
                            <li
                              key={row.eventId}
                              className="rounded-2xl border border-border bg-muted/30 p-3.5"
                            >
                              <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
                                <MapPin className="size-3" aria-hidden />
                                {copy.globe.inboxSectionLocation}
                              </p>
                              <p className="mt-0.5 text-[14px] font-semibold text-foreground">
                                {row.kind === "photo_place"
                                  ? copy.globe.inboxPhotoPlaceTitle(row.place)
                                  : copy.globe.inboxLocationTitle(
                                      row.place,
                                      row.dwellMinutes != null
                                        ? formatDwellMinutesLabel(row.dwellMinutes)
                                        : undefined,
                                    )}
                              </p>
                              <p className="mt-1 text-[12px] text-muted-foreground">
                                {row.title}
                              </p>
                              <div className="mt-3 flex gap-2">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleConfirmLocation(row)}
                                  className="flex flex-1 rounded-xl bg-foreground px-3 py-2.5 text-[13px] font-semibold text-background shadow-sm disabled:opacity-60"
                                >
                                  {copy.globe.inboxLocationConfirm}
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleDismissLocation(row)}
                                  className="rounded-xl px-3 py-2.5 text-[13px] font-medium text-muted-foreground disabled:opacity-60"
                                >
                                  {copy.globe.inboxLocationDismiss}
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ) : null}
                </div>
              )}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
