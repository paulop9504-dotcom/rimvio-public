import { parseKoreanMoneyToNumber } from "@/lib/actions/match-user-defined-action";
import { resolveSearchQuery } from "@/lib/search-intent/resolve-search-intent";
import type { DeepLinkToolDefinition } from "@/lib/deep-link-dispatch/types";

function extractPhone(message: string): string | null {
  const match = message.match(/(\d{2,3}[-\s]?\d{3,4}[-\s]?\d{4})/);
  return match?.[1]?.replace(/\s/g, "") ?? null;
}

function extractBank(message: string): string | null {
  const banks = ["국민", "신한", "우리", "하나", "농협", "카카오", "토스", "kb", "shinhan"];
  const lower = message.toLowerCase();
  for (const bank of banks) {
    if (lower.includes(bank.toLowerCase())) {
      return bank;
    }
  }
  return null;
}

function extractDestination(message: string): string | null {
  const navMatch = message.match(
    /(?:까지|으로|로\s*가(?:줘|야)?|길\s*찾|내비)\s*(.+?)(?:\s*$|[.!,?])/iu
  );
  const trailingMatch = message.match(/(.+?)(?:\s*까지\s*가)/iu);
  const raw =
    navMatch?.[1]?.trim() ||
    trailingMatch?.[1]?.trim() ||
    null;

  if (!raw) {
    return null;
  }

  return resolveSearchQuery({ text: raw.slice(0, 120) });
}

function extractPageId(message: string): string | null {
  const uuid = message.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
  );
  return uuid?.[0] ?? null;
}

export function extractDeepLinkParams(
  message: string,
  tool: DeepLinkToolDefinition
): Record<string, string> {
  const params: Record<string, string> = {};

  for (const spec of tool.params) {
    if (spec.key === "amount") {
      const amount = parseKoreanMoneyToNumber(message);
      if (amount != null) {
        params.amount = String(amount);
      }
      continue;
    }
    if (spec.key === "number") {
      const phone = extractPhone(message);
      if (phone) {
        params.number = phone;
      }
      continue;
    }
    if (spec.key === "bank") {
      const bank = extractBank(message);
      if (bank) {
        params.bank = bank;
      }
      continue;
    }
    if (spec.key === "pageId") {
      const pageId = extractPageId(message);
      if (pageId) {
        params.pageId = pageId;
      }
      continue;
    }
    if (spec.key === "body") {
      const body = message.match(/["「『](.+?)["」』]/)?.[1]?.trim();
      if (body) {
        params.body = body;
      }
      continue;
    }

    const inline = message.match(
      new RegExp(`${spec.label}\\s*[:：]?\\s*([^\\s,]+)`, "i")
    );
    if (inline?.[1]) {
      params[spec.key] = inline[1].trim();
    }
  }

  const destination = extractDestination(message);
  if (destination) {
    params.destination = destination;
  }

  return params;
}

export function findMissingParams(
  tool: DeepLinkToolDefinition,
  params: Record<string, string>,
  deepLink: string | null
): string[] {
  if (deepLink) {
    return [];
  }

  const missing: string[] = [];
  for (const spec of tool.params) {
    if (!params[spec.key]?.trim()) {
      missing.push(spec.key);
    }
  }
  return missing;
}
