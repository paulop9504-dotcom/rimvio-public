"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plane, Plus, X } from "lucide-react";
import { toast } from "sonner";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { connectDepartureHubToContext } from "@/lib/globe/connect-departure-hub-to-context";
import { disconnectContextHub } from "@/lib/globe/context-hub/disconnect-context-hub";
import { listContextHubLinks } from "@/lib/globe/context-hub/list-context-hub-links";
import { shouldSuggestContextHubs } from "@/lib/globe/context-hub/should-suggest-context-hubs";
import type { DepartureHubAirportId } from "@/lib/globe/departure-hub-airports";
import { suggestDepartureHubOptions } from "@/lib/globe/suggest-departure-hub-options";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeContextHubPanelProps = {
  event: EventCandidate;
  destinationLabel?: string | null;
  homeRegionHint?: string | null;
  onUpdated?: () => void;
};

export function GlobeContextHubPanel({
  event,
  destinationLabel,
  homeRegionHint,
  onUpdated,
}: GlobeContextHubPanelProps) {
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);

  const links = useMemo(() => listContextHubLinks(event), [event]);
  const canSuggest = shouldSuggestContextHubs(event);
  const place =
    event.place?.trim() ||
    destinationLabel?.trim() ||
    event.title.trim();
  const options = useMemo(
    () =>
      canSuggest
        ? suggestDepartureHubOptions({
            destinationPlace: place,
            homeRegionHint,
          })
        : [],
    [canSuggest, homeRegionHint, place],
  );
  const connectedAirportIds = useMemo(
    () =>
      new Set(
        links
          .map((row) => row.airportIata?.toLowerCase())
          .filter(Boolean) as string[],
      ),
    [links],
  );

  const handleConnect = async (airportId: DepartureHubAirportId) => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      connectDepartureHubToContext({
        destinationEventId: event.id,
        airportId,
        homeRegionHint,
      });
      toast.success(
        copy.globe.departureHubConnected(
          options.find((row) => row.id === airportId)?.shortLabelKo ?? airportId,
        ),
      );
      setAdding(false);
      onUpdated?.();
    } catch (caught) {
      toast.error(
        caught instanceof Error
          ? caught.message
          : copy.globe.departureHubConnectFail,
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async (hubEventId: string, label: string) => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      disconnectContextHub({
        contextEventId: event.id,
        hubEventId,
      });
      toast.success(copy.globe.contextHubDisconnected(label));
      onUpdated?.();
    } catch (caught) {
      toast.error(
        caught instanceof Error
          ? caught.message
          : copy.globe.contextHubDisconnectFail,
      );
    } finally {
      setBusy(false);
    }
  };

  if (!canSuggest && links.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2.5" data-globe-context-hub-panel>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[12px] font-semibold text-primary">
            {copy.globe.contextHubEyebrow}
          </p>
          <p className="mt-0.5 text-[14px] font-semibold text-foreground">
            {copy.globe.contextHubSectionTitle}
          </p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
            {copy.globe.contextHubSectionBody}
          </p>
        </div>
        {canSuggest ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => setAdding((value) => !value)}
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-card",
              "text-muted-foreground transition-colors active:bg-muted",
              adding && "border-primary/35 bg-primary/10 text-primary",
            )}
            aria-label={copy.globe.contextHubAdd}
            data-context-hub-add
          >
            <Plus className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>

      {links.length > 0 ? (
        <ul className="space-y-2">
          {links.map((link) => (
            <li
              key={link.eventId}
              className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2.5"
              data-context-hub-link={link.eventId}
            >
              <button
                type="button"
                disabled={busy || !link.actionUrl}
                onClick={() => {
                  if (!link.actionUrl) {
                    return;
                  }
                  window.open(link.actionUrl, "_blank", "noopener,noreferrer");
                }}
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-3 text-left",
                  link.actionUrl && "active:opacity-80",
                  !link.actionUrl && "cursor-default",
                )}
                data-context-hub-open={link.eventId}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Plane className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-foreground">
                    {link.shortLabel}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    {link.actionUrl
                      ? copy.globe.contextHubOpenFlight
                      : copy.globe.contextHubDepartureKind}
                  </span>
                </span>
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleDisconnect(link.eventId, link.shortLabel)}
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground active:bg-muted active:text-foreground"
                aria-label={copy.globe.contextHubRemove(link.shortLabel)}
                data-context-hub-remove={link.eventId}
              >
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-border px-3 py-3 text-[12px] text-muted-foreground">
          {copy.globe.contextHubEmpty}
        </p>
      )}

      <AnimatePresence initial={false}>
        {adding ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <ul className="space-y-2 pt-1">
              {options.map((option) => {
                const connected = connectedAirportIds.has(option.id);
                return (
                  <li key={option.id}>
                    <button
                      type="button"
                      disabled={busy || connected}
                      onClick={() => void handleConnect(option.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left",
                        connected
                          ? "border-border bg-muted/40 opacity-60"
                          : "border-border bg-card active:bg-muted/50",
                        busy && "pointer-events-none opacity-50",
                      )}
                      data-context-hub-option={option.id}
                    >
                      <span className="text-[14px] font-semibold text-foreground">
                        {option.shortLabelKo}
                      </span>
                      {option.recommended ? (
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          {copy.globe.departureHubRecommended}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
