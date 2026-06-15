import { parseKoreanMoneyToNumber } from "@/lib/actions/match-user-defined-action";

export type TransferProvider = "toss" | "kakaopay";

export type DutchPaySummary = {
  totalWon: number;
  headcount: number;
  perPersonWon: number;
  memo: string | null;
  lines: string[];
};

const HEADCOUNT = /(\d+)\s*(?:명|인)/u;
const STRIP_NOISE =
  /(?:토스|카카오\s*페이|카페|송금|이체|더치(?:\s*페이)?|정산|n\s*\/\s*n|n빵)/giu;

function formatWon(value: number): string {
  return `${value.toLocaleString("ko-KR")}원`;
}

export function parseTransferProvider(query: string): TransferProvider {
  if (/(?:카카오\s*페이|카페|kakaopay)/iu.test(query)) {
    return "kakaopay";
  }
  return "toss";
}

export function parseTransferHeadcount(query: string): number | null {
  const match = query.match(HEADCOUNT);
  if (match) {
    const count = Number.parseInt(match[1] ?? "", 10);
    if (Number.isFinite(count) && count >= 2 && count <= 50) {
      return count;
    }
  }
  if (/(?:더치|n\s*\/\s*n|n빵|정산)/iu.test(query)) {
    return 2;
  }
  return null;
}

export function parseTransferLabel(query: string): string | null {
  let label = query
    .replace(HEADCOUNT, " ")
    .replace(STRIP_NOISE, " ")
    .replace(/\d+(?:\.\d+)?\s*(?:억|만|천)\s*(?:원)?/giu, " ")
    .replace(/\d{1,3}(?:,\d{3})+\s*원/giu, " ")
    .replace(/\d+\s*원/giu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!label || label.length < 2) {
    return null;
  }
  return label.slice(0, 40);
}

export function buildDutchPaySummary(input: {
  totalWon: number;
  headcount?: number | null;
  memo?: string | null;
}): DutchPaySummary {
  const headcount = input.headcount && input.headcount >= 2 ? input.headcount : 2;
  const perPersonWon = Math.ceil(input.totalWon / headcount);
  const memo = input.memo?.trim() || null;

  const lines = [
    `총액 ${formatWon(input.totalWon)}`,
    `인원 ${headcount}명`,
    `1인당 ${formatWon(perPersonWon)}`,
  ];
  if (memo) {
    lines.push(`메모 ${memo}`);
  }

  return {
    totalWon: input.totalWon,
    headcount,
    perPersonWon,
    memo,
    lines,
  };
}

export function parseMentionTransferQuery(query: string): {
  amountWon: number | null;
  headcount: number | null;
  label: string | null;
  provider: TransferProvider;
  dutchSummary: DutchPaySummary | null;
} {
  const trimmed = query.trim();
  const amountWon = parseKoreanMoneyToNumber(trimmed);
  const headcount = parseTransferHeadcount(trimmed);
  const label = parseTransferLabel(trimmed);
  const provider = parseTransferProvider(trimmed);

  const dutchSummary =
    amountWon != null
      ? buildDutchPaySummary({
          totalWon: amountWon,
          headcount,
          memo: label,
        })
      : null;

  return {
    amountWon,
    headcount,
    label,
    provider,
    dutchSummary,
  };
}

export function formatTransferAmountLabel(amountWon: number | null): string {
  if (amountWon == null) {
    return "송금";
  }
  if (amountWon >= 10_000 && amountWon % 10_000 === 0) {
    return `${amountWon / 10_000}만원`;
  }
  return formatWon(amountWon);
}
