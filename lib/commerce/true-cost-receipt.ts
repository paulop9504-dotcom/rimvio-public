import { buildCompareQuery } from "@/lib/commerce/compare-query";
import {
  detectTechDeviceKind,
  isLatestGenTech,
  isTechListingTitle,
  techDeviceLabel,
  type TechDeviceKind,
} from "@/lib/commerce/tech-category";
import { parsePriceToWon } from "@/lib/links/extract-price-hint";

export const DEFAULT_HOLD_MONTHS = 6;
export const LATEST_GEN_MONTHLY_RATE = 0.03;
export const LEGACY_GEN_MONTHLY_RATE = 0.015;
export const GENERIC_TECH_MONTHLY_RATE = 0.02;

export type TrueCostLineKind = "surface" | "depreciation" | "net_hold";

export type TrueCostLine = {
  kind: TrueCostLineKind;
  icon: string;
  label: string;
  amount: number;
  signed: "plus" | "minus" | "neutral";
};

export type TrueCostReceipt = {
  available: boolean;
  deviceKind: TechDeviceKind | null;
  deviceLabel: string;
  cleanTitle: string;
  holdMonths: number;
  monthlyRate: number;
  surfacePrice: number;
  depreciationAmount: number;
  expectedResalePrice: number;
  netHoldCost: number;
  monthlyHoldCost: number;
  headline: string;
  detail: string;
  disclaimer: string;
  lines: TrueCostLine[];
};

function formatWon(value: number) {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function resolveMonthlyRate(title: string, domain?: string | null) {
  if (isLatestGenTech(title, domain)) {
    return LATEST_GEN_MONTHLY_RATE;
  }

  if (detectTechDeviceKind(title, domain)) {
    return LEGACY_GEN_MONTHLY_RATE;
  }

  return GENERIC_TECH_MONTHLY_RATE;
}

function buildHeadline(input: {
  surfacePrice: number;
  expectedResalePrice: number;
  holdMonths: number;
  monthlyHoldCost: number;
}) {
  return `${formatWon(input.surfacePrice)}에 사서 ${input.holdMonths}개월 뒤 되팔면 약 ${formatWon(input.expectedResalePrice)} (월 사용료 약 ${formatWon(input.monthlyHoldCost)})`;
}

export function buildTrueCostReceipt(input: {
  title: string;
  domain?: string | null;
  holdMonths?: number;
  surfacePrice?: number | null;
  listingPriceText?: string | null;
}): TrueCostReceipt {
  const cleanTitle = buildCompareQuery(input.title, input.domain) ?? input.title.trim();
  const holdMonths = input.holdMonths ?? DEFAULT_HOLD_MONTHS;
  const unavailableBase: TrueCostReceipt = {
    available: false,
    deviceKind: null,
    deviceLabel: "IT · 전자기기",
    cleanTitle,
    holdMonths,
    monthlyRate: 0,
    surfacePrice: 0,
    depreciationAmount: 0,
    expectedResalePrice: 0,
    netHoldCost: 0,
    monthlyHoldCost: 0,
    headline: "진짜 비용 영수증 준비 중",
    detail: "Tech 매물 + 가격이 보이면 자동 계산됩니다.",
    disclaimer: "참고용 추정치 · 모델·상태에 따라 달라질 수 있어요.",
    lines: [],
  };

  if (!isTechListingTitle(input.title, input.domain)) {
    return unavailableBase;
  }

  const surfacePrice =
    (typeof input.surfacePrice === "number" && input.surfacePrice > 0
      ? input.surfacePrice
      : null) ??
    parsePriceToWon(input.listingPriceText) ??
    parsePriceToWon(input.title);
  if (!surfacePrice || surfacePrice <= 0) {
    return {
      ...unavailableBase,
      detail: "제목에서 가격을 찾지 못했어요. 가격이 있는 Tech 매물에서 계산됩니다.",
    };
  }

  const deviceKind = detectTechDeviceKind(input.title, input.domain);
  const monthlyRate = resolveMonthlyRate(input.title, input.domain);
  const depreciationAmount = Math.round(surfacePrice * monthlyRate * holdMonths);
  const expectedResalePrice = Math.max(surfacePrice - depreciationAmount, 0);
  const netHoldCost = surfacePrice - expectedResalePrice;
  const monthlyHoldCost = Math.round(netHoldCost / holdMonths);

  const lines: TrueCostLine[] = [
    {
      kind: "surface",
      icon: "🏷️",
      label: "표면적 중고가",
      amount: surfacePrice,
      signed: "neutral",
    },
    {
      kind: "depreciation",
      icon: "📉",
      label: `${holdMonths}개월 뒤 예상 감가`,
      amount: depreciationAmount,
      signed: "minus",
    },
    {
      kind: "net_hold",
      icon: "💡",
      label: `Rimvio ${holdMonths}개월 순보유비용`,
      amount: netHoldCost,
      signed: "neutral",
    },
  ];

  const rateLabel = `${Math.round(monthlyRate * 1000) / 10}%/월`;

  return {
    available: true,
    deviceKind,
    deviceLabel: deviceKind ? techDeviceLabel(deviceKind) : "IT · 전자기기",
    cleanTitle,
    holdMonths,
    monthlyRate,
    surfacePrice,
    depreciationAmount,
    expectedResalePrice,
    netHoldCost,
    monthlyHoldCost,
    headline: buildHeadline({
      surfacePrice,
      expectedResalePrice,
      holdMonths,
      monthlyHoldCost,
    }),
    detail: `${deviceKind ? techDeviceLabel(deviceKind) : "Tech"} · 감가율 ${rateLabel} 가정 · 되팔기 예상 ${formatWon(expectedResalePrice)}`,
    disclaimer:
      "참고용 추정치입니다. 배터리·외관·출시 시점·시세에 따라 실제 되팔기 가격은 달라질 수 있어요.",
    lines,
  };
}
