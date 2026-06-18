import { ACTION_INTENT_REGISTRY } from "@/lib/action-dispatcher/registry";
import {
  KAKAOPAY_APP_OPEN,
  KAKAOPAY_WEB,
  TOSS_APP_OPEN,
  TOSS_WEB,
} from "@/lib/remote/payment-links";
import type { DutchPaySummary } from "@/lib/action-chat/mention-transfer/parse-mention-transfer-query";
import type { TransferProvider } from "@/lib/action-chat/mention-transfer/parse-mention-transfer-query";

export type InlineTransferAuxWire = {
  id: string;
  label: string;
  icon: string;
};

export type InlineDutchPaySummaryWire = {
  totalLabel: string;
  headcountLabel: string;
  perPersonLabel: string;
  memo: string | null;
  lines: string[];
};

export type InlineChatTransferWire = {
  query?: string;
  amountWon: number | null;
  provider: TransferProvider;
  mainLabel: string;
  mainDeeplink: string;
  fallbackDeeplink: string;
  auxActions: InlineTransferAuxWire[];
  dutchSummary: InlineDutchPaySummaryWire | null;
};

export function buildTransferDeeplink(
  provider: TransferProvider,
  amountWon: number | null,
): { main: string; fallback: string } {
  if (provider === "kakaopay") {
    if (amountWon != null) {
      const href = ACTION_INTENT_REGISTRY.KAKAOPAY_TRANSFER.buildUrl({
        amount: String(amountWon),
      });
      return {
        main: href ?? KAKAOPAY_APP_OPEN,
        fallback: "https://pay.kakao.com",
      };
    }
    return { main: KAKAOPAY_APP_OPEN, fallback: KAKAOPAY_WEB };
  }

  if (amountWon != null) {
    const href = ACTION_INTENT_REGISTRY.TOSS_TRANSFER.buildUrl({
      amount: String(amountWon),
    });
    return {
      main: href ?? TOSS_APP_OPEN,
      fallback: TOSS_WEB,
    };
  }

  return { main: TOSS_APP_OPEN, fallback: TOSS_WEB };
}

export function toDutchPaySummaryWire(
  summary: DutchPaySummary,
): InlineDutchPaySummaryWire {
  return {
    totalLabel: summary.lines[0] ?? "",
    headcountLabel: summary.lines[1] ?? "",
    perPersonLabel: summary.lines[2] ?? "",
    memo: summary.memo,
    lines: summary.lines,
  };
}

export function buildInlineChatTransferWire(input: {
  query?: string;
  amountWon: number | null;
  provider: TransferProvider;
  mainLabel: string;
  dutchSummary: InlineDutchPaySummaryWire | null;
}): InlineChatTransferWire {
  const links = buildTransferDeeplink(input.provider, input.amountWon);

  return {
    ...(input.query?.trim() ? { query: input.query.trim() } : {}),
    amountWon: input.amountWon,
    provider: input.provider,
    mainLabel: input.mainLabel,
    mainDeeplink: links.main,
    fallbackDeeplink: links.fallback,
    auxActions: [
      {
        id: "dutch",
        label: "더치",
        icon: "🧮",
      },
      {
        id: input.provider === "toss" ? "kakaopay" : "toss",
        label: input.provider === "toss" ? "카카오페이" : "토스",
        icon: input.provider === "toss" ? "K" : "T",
      },
    ],
    dutchSummary: input.dutchSummary,
  };
}

export function resolveTransferAuxDeeplink(
  wire: InlineChatTransferWire,
  auxId: string,
): string | null {
  if (auxId === "dutch") {
    return null;
  }
  const provider = auxId === "kakaopay" ? "kakaopay" : "toss";
  return buildTransferDeeplink(provider, wire.amountWon).main;
}
