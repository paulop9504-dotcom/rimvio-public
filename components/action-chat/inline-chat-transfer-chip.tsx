"use client";

import { useState } from "react";
import { Banknote, X } from "lucide-react";
import { MainActionButton } from "@/components/action-chat/main-action-button";
import { AuxActionButton } from "@/components/action-chat/aux-action-button";
import { openSpawnAction } from "@/lib/action-spawn/open-spawn-action";
import { resolveMainActionBrandStyle } from "@/lib/brand/action-brand-style";
import {
  rimvioInlineChipBodyClass,
  rimvioInlineChipClass,
  rimvioInlineChipHeaderClass,
  rimvioInlineChipMetaClass,
  rimvioInlineChipTitleClass,
} from "@/lib/brand/rimvio-neon-theme";
import {
  resolveTransferAuxDeeplink,
  type InlineChatTransferWire,
} from "@/lib/action-chat/mention-transfer/inline-chat-transfer";
import { cn } from "@/lib/utils";

type InlineChatTransferChipProps = {
  transfer: InlineChatTransferWire;
  onSpawnPrompt?: (uri: string) => void;
  className?: string;
};

export function InlineChatTransferChip({
  transfer,
  onSpawnPrompt,
  className,
}: InlineChatTransferChipProps) {
  const [dutchOpen, setDutchOpen] = useState(false);

  const openDeeplink = (deeplink: string) => {
    openSpawnAction({ deeplink, onPrompt: onSpawnPrompt });
  };

  const handleAux = (auxId: string) => {
    if (auxId === "dutch") {
      setDutchOpen(true);
      return;
    }
    const deeplink = resolveTransferAuxDeeplink(transfer, auxId);
    if (deeplink) {
      openDeeplink(deeplink);
    }
  };

  const mainBrand = resolveMainActionBrandStyle({
    label: transfer.mainLabel,
    deeplink: transfer.mainDeeplink,
    provider: transfer.provider,
  });

  return (
    <>
      <div
        className={cn(rimvioInlineChipClass("sm"), className)}
        aria-label="송금"
      >
        <div className={rimvioInlineChipHeaderClass}>
          <Banknote className="size-4 shrink-0 text-rimvio-neon-green" aria-hidden />
          <span className={rimvioInlineChipTitleClass}>송금</span>
          {transfer.query ? (
            <span className={rimvioInlineChipMetaClass}>{transfer.query}</span>
          ) : null}
        </div>
        <div className={cn(rimvioInlineChipBodyClass, "space-y-2")}>
          <MainActionButton
            label={transfer.mainLabel}
            brand={mainBrand}
            compact
            onClick={() => openDeeplink(transfer.mainDeeplink)}
          />
          {transfer.auxActions.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {transfer.auxActions.map((action) => (
                <AuxActionButton
                  key={action.id}
                  id={action.id}
                  label={action.label}
                  icon={action.icon}
                  onClick={() => handleAux(action.id)}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {dutchOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="더치페이 정산"
          onClick={() => setDutchOpen(false)}
        >
          <div
            className={cn(rimvioInlineChipClass("sm"), "max-w-sm p-4 shadow-xl")}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className={rimvioInlineChipTitleClass}>더치페이 정산</h3>
              <button
                type="button"
                onClick={() => setDutchOpen(false)}
                className="rounded-full p-1 text-white/55 transition hover:bg-white/[0.06] hover:text-white"
                aria-label="닫기"
              >
                <X className="size-4" />
              </button>
            </div>
            {transfer.dutchSummary ? (
              <ul className="space-y-2 text-[13px] text-white/78">
                <li>{transfer.dutchSummary.totalLabel}</li>
                <li>{transfer.dutchSummary.headcountLabel}</li>
                <li className="font-semibold text-rimvio-neon-green">
                  {transfer.dutchSummary.perPersonLabel}
                </li>
                {transfer.dutchSummary.memo ? (
                  <li className="text-white/55">메모 {transfer.dutchSummary.memo}</li>
                ) : null}
              </ul>
            ) : (
              <p className="rimvio-inline-chip__text">
                금액을 함께 적어 주세요.
                <br />
                예: @송금 45000원 4명 저녁
              </p>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
