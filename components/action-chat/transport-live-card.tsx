"use client";

import { Calendar, MapPin, RefreshCw } from "lucide-react";
import { RimvioActionButton } from "@/components/ui/rimvio-action-button";
import { cn } from "@/lib/utils";
import type { LinkActionItem } from "@/types/database";
import type { TransportLiveCard } from "@/lib/transport/transport-live-types";

type TransportLiveCardProps = {
  card: TransportLiveCard;
  actions?: LinkActionItem[];
  onAction?: (action: LinkActionItem) => void;
  embedded?: boolean;
  className?: string;
};

function actionIcon(label: string) {
  if (/갱신|refresh/i.test(label)) {
    return RefreshCw;
  }
  if (/지도|map|네비/i.test(label)) {
    return MapPin;
  }
  if (/일정|calendar/i.test(label)) {
    return Calendar;
  }
  return RefreshCw;
}

export function TransportLiveCardView({
  card,
  actions = [],
  onAction,
  embedded = false,
  className,
}: TransportLiveCardProps) {
  const { data } = card;

  const content = (
    <>
      <div className={cn("px-1", embedded ? "pb-2" : "border-b border-[#4A90E2]/10 px-3.5 py-3")}>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#4A90E2] px-2.5 py-0.5 text-[12px] font-bold text-white">
            {data.route}
          </span>
          <span className="text-[13px] font-semibold text-[#111827]">
            {data.minutes_until}분 후 도착
          </span>
        </div>
        <p className="mt-1.5 text-[12px] font-medium text-[#4A90E2]">{data.status}</p>
        <p className="mt-1 text-[12px] text-[#6B7280]">{data.location} 근처</p>
        <p className="mt-0.5 text-[11px] text-[#9CA3AF]">도착 예정 {data.arrival_time}</p>
      </div>

      <div className={cn("rimvio-container-card__action-row", embedded ? "px-0" : "grid grid-cols-3 gap-1.5 p-2")}>
        {actions.map((action) => {
          const Icon = actionIcon(action.label);
          return (
            <RimvioActionButton
              key={action.id}
              type="button"
              variant={embedded ? "secondary" : "secondary"}
              layout={embedded ? "pill" : "compact"}
              icon={Icon}
              onClick={() => onAction?.(action)}
              className="shrink-0"
            >
              {action.label.replace(/\s+/g, "\u00a0")}
            </RimvioActionButton>
          );
        })}
      </div>
    </>
  );

  if (embedded) {
    return <div className={cn("space-y-1", className)}>{content}</div>;
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[20px] bg-gradient-to-br from-[#EEF4FC] to-white ring-1 ring-[#4A90E2]/15",
        className
      )}
    >
      {content}
    </div>
  );
}
