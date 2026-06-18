"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Car, Hotel, Plane, Plus, Sparkles, Ticket } from "lucide-react";
import type {
  ContextHubServiceId,
  ContextHubServiceRow,
} from "@/lib/globe/context-hub/context-hub-service-catalog";
import type { DepartureHubAirportId } from "@/lib/globe/departure-hub-airports";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

const SERVICE_ICON: Record<ContextHubServiceId, typeof Plane> = {
  ticket: Ticket,
  flight: Plane,
  lodging: Hotel,
  rental_car: Car,
  ai_search: Sparkles,
};

export function HubServiceSlot({
  row,
  connectOpen,
  busy,
  emphasized = false,
  onToggleConnect,
  onConnectFlight,
  onConnectLodging,
  onOpenAction,
  onOpenHandoff,
}: {
  row: ContextHubServiceRow;
  connectOpen: boolean;
  busy: boolean;
  emphasized?: boolean;
  onToggleConnect: () => void;
  onConnectFlight: (airportId: DepartureHubAirportId) => void;
  onConnectLodging?: () => void;
  onOpenAction: (url: string, label: string) => void;
  onOpenHandoff: (href: string, label: string, internalRoute?: boolean) => void;
}) {
  const Icon = SERVICE_ICON[row.serviceId];
  const link = row.link;

  return (
    <li className="relative">
      <div
        className={cn(
          "flex items-center gap-3 rounded-2xl border px-3 py-2.5",
          row.connected || emphasized
            ? "border-primary/20 bg-primary/[0.05]"
            : "border-border/50 bg-card/95",
          !row.implemented && "opacity-60",
        )}
        data-globe-hub-service={row.serviceId}
      >
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            row.connected || emphasized
              ? "bg-primary/12 text-primary"
              : "bg-muted/70 text-muted-foreground",
          )}
        >
          <Icon className="size-[1.125rem]" aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-foreground">{row.labelKo}</p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {!row.implemented
              ? copy.globe.contextHubServiceSoon
              : row.connected
                ? link?.shortLabel ?? copy.globe.contextHubDepartureKind
                : copy.globe.contextHubServicePlugIn}
          </p>
        </div>

        {row.implemented && row.serviceId === "ticket" ? (
          row.handoffHref ? (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                onOpenHandoff(
                  row.handoffHref!,
                  row.handoffLabelKo ?? copy.globe.contextHubOpenTicketQr,
                  false,
                )
              }
              className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground active:opacity-85"
              data-globe-hub-service-open={row.serviceId}
            >
              {row.handoffLabelKo ?? copy.globe.contextHubOpenTicketQr}
            </button>
          ) : row.connected && link?.actionUrl ? (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                onOpenAction(
                  link.actionUrl!,
                  link.actionLabelKo ?? copy.globe.contextHubOpenTicket,
                )
              }
              className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground active:opacity-85"
              data-globe-hub-service-open={row.serviceId}
            >
              {link.actionLabelKo ?? copy.globe.contextHubOpenTicket}
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={onToggleConnect}
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-card text-primary active:scale-95",
                connectOpen && "border-primary bg-primary text-primary-foreground",
              )}
              aria-label={copy.globe.contextHubServicePlugIn}
              data-globe-hub-service-add={row.serviceId}
            >
              <Plus className="size-4 stroke-[2.5]" aria-hidden />
            </button>
          )
        ) : row.implemented && row.serviceId === "ai_search" && row.handoffHref ? (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              onOpenHandoff(
                row.handoffHref!,
                row.handoffLabelKo ?? copy.globe.contextHubAiSearchOpen,
                true,
              )
            }
            className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground active:opacity-85"
            data-globe-hub-service-open={row.serviceId}
          >
            {row.handoffLabelKo ?? copy.globe.contextHubAiSearchOpen}
          </button>
        ) : row.implemented && row.serviceId === "lodging" ? (
          row.connected ? (
            <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
              {copy.globe.lodgingHubConnectedBadge}
            </span>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => onConnectLodging?.()}
              className="flex size-8 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-card text-primary active:scale-95"
              aria-label={copy.globe.contextHubServicePlugIn}
              data-globe-hub-service-add={row.serviceId}
            >
              <Plus className="size-4 stroke-[2.5]" aria-hidden />
            </button>
          )
        ) : row.implemented && row.serviceId === "flight" ? (
          row.connected && link?.actionUrl ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onOpenAction(link.actionUrl!, link.actionLabelKo ?? copy.globe.contextHubOpenFlight)}
              className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground active:opacity-85"
              data-globe-hub-service-open={row.serviceId}
            >
              {link.actionLabelKo ?? copy.globe.contextHubOpenFlight}
            </button>
          ) : row.connected ? (
            <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
              {link?.shortLabel ?? copy.globe.contextHubDepartureKind}
            </span>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={onToggleConnect}
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-card text-primary active:scale-95",
                connectOpen && "border-primary bg-primary text-primary-foreground",
              )}
              aria-label={copy.globe.contextHubAdd}
              aria-expanded={connectOpen}
              data-globe-hub-service-add={row.serviceId}
            >
              <Plus className="size-4 stroke-[2.5]" aria-hidden />
            </button>
          )
        ) : (
          <span className="shrink-0 rounded-full bg-muted/90 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
            {copy.globe.contextHubServiceSoonBadge}
          </span>
        )}
      </div>

      <AnimatePresence initial={false}>
        {connectOpen && row.flightOptions.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <ul className="mt-1.5 space-y-1 rounded-xl border border-border/50 bg-muted/20 p-1">
              {row.flightOptions.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onConnectFlight(option.id)}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left active:bg-card/90"
                    data-globe-hub-flight-option={option.id}
                  >
                    <span className="text-[12px] font-semibold text-foreground">
                      {option.shortLabelKo}
                    </span>
                    {option.recommended ? (
                      <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[9px] font-bold text-primary">
                        {copy.globe.departureHubRecommended}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
}
