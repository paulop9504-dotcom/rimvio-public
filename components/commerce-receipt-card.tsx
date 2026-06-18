"use client";



import { useEffect, useState } from "react";

import {

  buildUnifiedCommerceReceipt,

  type UnifiedCommerceLine,

} from "@/lib/commerce/unified-commerce-receipt";

import type { MarketPriceSnapshot } from "@/lib/commerce/market-price";

import type { TrueCostReceipt } from "@/lib/commerce/true-cost-receipt";

import { CommerceVerdictHeader } from "@/components/commerce-verdict-header";

import { useVisibleDwell } from "@/hooks/use-visible-dwell";

import {

  clearReceiptExposure,

  registerReceiptExposure,

} from "@/lib/personalization/receipt-exposure";

import { cn } from "@/lib/utils";



function lineValueClass(line: UnifiedCommerceLine) {

  if (line.tone === "accent") {

    return "font-semibold text-rimvio-neon-cyan";

  }



  if (line.tone === "minus") {

    return "text-rose-700";

  }



  return "text-foreground";

}



type CommerceReceiptCardProps = {

  market?: MarketPriceSnapshot | null;

  trueCost?: TrueCostReceipt | null;

  marketLoading?: boolean;

  linkId?: string;

  active?: boolean;

  compact?: boolean;

  onDefer?: (timing: {

    dwell_time_ms: number;

    time_to_action_ms: number;

  }) => void;

};



/** ?�세 + 진짜 ?�수�?감�?) ?????�의 중고 ?�수�? */

export function CommerceReceiptCard({

  market = null,

  trueCost = null,

  marketLoading = false,

  linkId = "commerce-receipt",

  active = true,

  compact = false,

  onDefer,

}: CommerceReceiptCardProps) {

  const [dismissed, setDismissed] = useState(false);

  const receipt = buildUnifiedCommerceReceipt({ market, trueCost });

  const trackable = Boolean(trueCost?.available);



  const { ref, getDwellMs, getTimeToActionMs } = useVisibleDwell(

    active && trackable && !dismissed

  );



  useEffect(() => {

    if (!trackable || dismissed || !active) {

      clearReceiptExposure(linkId);

      return;

    }



    registerReceiptExposure(linkId, {

      shownAt: Date.now(),

      getDwellMs,

    });



    return () => {

      clearReceiptExposure(linkId);

    };

  }, [active, dismissed, getDwellMs, linkId, trackable]);



  if (marketLoading && !market && !trueCost?.available) {

    return (

      <div className="rounded-2xl bg-[#fffdf8] px-3 py-2.5 text-center text-[11px] text-muted-foreground ring-1 ring-amber-500/10">

        중고 ?�수�?계산 중�?

      </div>

    );

  }



  if (!receipt.available || dismissed) {

    return null;

  }



  return (

    <div

      id="true-cost-receipt"

      ref={ref}

      className={cn(

        "rounded-2xl bg-[#fffdf8] ring-1 ring-amber-500/15",

        compact ? "px-3 py-2.5" : "px-3 py-3"

      )}

    >

      <div className="mb-2 flex items-start justify-between gap-2">

        {receipt.verdict ? (

          <CommerceVerdictHeader

            presentation={receipt.verdict}

            revealKey={linkId}

            active={active}

            compact={compact}

          />

        ) : (

          <div className="min-w-0">

            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800/80">

              중고 ?�수�?

            </p>

            <p className="mt-0.5 text-[12px] font-semibold leading-snug text-foreground">

              {receipt.headline}

            </p>

          </div>

        )}



        <div className="flex shrink-0 flex-col items-end gap-1">

          {receipt.badge ? (

            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-800">

              {receipt.badge}

            </span>

          ) : null}

          {receipt.verdictLabel ? (

            <span className="rounded-full bg-[#eef0f4] px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">

              {receipt.verdictLabel}

            </span>

          ) : null}

        </div>

      </div>



      {receipt.lines.length > 0 ? (

        <div className="space-y-1.5 rounded-xl bg-rimvio-surface/80 px-2.5 py-2 ring-1 ring-rimvio-neon-purple/12">

          {receipt.lines.map((line, index) => (

            <div

              key={`${line.label}-${index}`}

              className={cn(

                "flex items-center justify-between gap-3 text-[11px]",

                line.dividerBefore && "border-t border-dashed border-border pt-1.5"

              )}

            >

              <span className="min-w-0 truncate text-muted-foreground">

                {line.icon} {line.label}

              </span>

              <span className={cn("shrink-0 text-right tabular-nums", lineValueClass(line))}>

                {line.value}

              </span>

            </div>

          ))}

        </div>

      ) : null}



      <p className="mt-2 text-[10px] leading-snug text-muted-foreground/80">{receipt.footer}</p>



      {onDefer && !compact ? (

        <button

          type="button"

          onClick={() => {

            const timing = {

              dwell_time_ms: getDwellMs(),

              time_to_action_ms: getTimeToActionMs() ?? getDwellMs(),

            };

            onDefer(timing);

            setDismissed(true);

          }}

          className="mt-2.5 flex h-9 w-full items-center justify-center rounded-xl bg-rimvio-surface-muted text-[12px] font-semibold text-muted-foreground transition active:scale-[0.98]"

        >

          ?�중??볼게

        </button>

      ) : null}

    </div>

  );

}


