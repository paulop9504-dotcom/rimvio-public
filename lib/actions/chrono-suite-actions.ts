import { BLINK_ACTION_IDS } from "@/lib/actions/blink-feature-actions";
import {
  buildChatGptPromptHref,
  buildPerplexitySearchHref,
} from "@/lib/actions/search-urls";
import type { ExtensionContext } from "@/lib/actions/extension-catalog";
import type { SmartSuite } from "@/lib/actions/smart-suite-types";
import { createOpenAction } from "@/lib/enrichers/action-factory";
import { DEFAULT_ROOM_SLUG } from "@/lib/rooms/types";
import type { LinkActionItem } from "@/types/database";

export type ChronoBand =
  | "morning_start"
  | "work_active"
  | "growth_rest"
  | "recovery_prep";

export const CHRONO_BANDS: Record<
  ChronoBand,
  { hours: string; need: string; psyche: string }
> = {
  morning_start: {
    hours: "07–10",
    need: "안전/질서",
    psyche: "오늘 할 일 정리 안 되면 불안해.",
  },
  work_active: {
    hours: "10–18",
    need: "사회적/존중",
    psyche: "협업하고 성과 내고 인정받고 싶어.",
  },
  growth_rest: {
    hours: "18–22",
    need: "자아실현",
    psyche: "나 좀 더 똑똑해지고 싶어. 내 기록을 남겨야지.",
  },
  recovery_prep: {
    hours: "22–07",
    need: "생리적/휴식",
    psyche: "다 잊고 내일을 준비하고 싶어.",
  },
};

export function resolveChronoBand(hour: number): ChronoBand {
  const normalized = ((hour % 24) + 24) % 24;

  if (normalized >= 7 && normalized < 10) {
    return "morning_start";
  }

  if (normalized >= 10 && normalized < 18) {
    return "work_active";
  }

  if (normalized >= 18 && normalized < 22) {
    return "growth_rest";
  }

  return "recovery_prep";
}

function readHour(ctx: ExtensionContext) {
  if (typeof ctx.hour === "number" && ctx.hour >= 0 && ctx.hour <= 23) {
    return ctx.hour;
  }

  return new Date().getHours();
}

function query(ctx: ExtensionContext) {
  return ctx.title?.trim() || null;
}

function blinkCustomAction(
  label: string,
  blinkAction: string,
  icon: string,
  extra?: Record<string, unknown>
): LinkActionItem {
  return {
    id: crypto.randomUUID(),
    kind: "custom",
    label,
    payload: { icon, blinkAction, contextBoost: "chrono", ...extra },
  };
}

function buildMorningStartActions(ctx: ExtensionContext): LinkActionItem[] {
  const q = query(ctx);

  return [
    blinkCustomAction("📋 오늘의 할 일 3개", BLINK_ACTION_IDS.todoThree, "bell", {
      title: q ?? "오늘",
      url: ctx.sourceUrl,
    }),
    createOpenAction({
      label: "📰 출근길 뉴스 브리핑",
      href: buildPerplexitySearchHref(
        `오늘 아침 한국 핵심 뉴스 5개를 1줄씩 요약해줘${q ? `. 참고: ${q}` : ""}`
      ),
      icon: "sparkles",
      copyText: q ?? ctx.sourceUrl,
      fallbackHref: "https://news.naver.com/",
    }),
  ];
}

function buildWorkActiveActions(ctx: ExtensionContext): LinkActionItem[] {
  const q = query(ctx) ?? "링크";

  return [
    createOpenAction({
      label: "👥 Room 협업",
      href: `/r/${DEFAULT_ROOM_SLUG}`,
      icon: "share",
      copyText: q,
    }),
    blinkCustomAction("✅ Done/성과 공유", BLINK_ACTION_IDS.doneShare, "share", {
      title: q,
      url: ctx.sourceUrl,
    }),
  ];
}

function buildGrowthRestActions(ctx: ExtensionContext): LinkActionItem[] {
  const q = query(ctx);
  const prompt = q
    ? `다음 링크를 학습 관점에서 3줄 요약하고, 내가 기억할 핵심 3가지만 bullet로 정리해줘.\n제목: ${q}\n${ctx.sourceUrl}`
    : `다음 링크를 학습 관점에서 3줄 요약하고 핵심 3가지만 bullet로 정리해줘: ${ctx.sourceUrl}`;

  return [
    createOpenAction({
      label: "🧠 AI 요약/학습",
      href: buildChatGptPromptHref(prompt),
      icon: "sparkles",
      copyText: prompt,
    }),
    blinkCustomAction("🏆 오늘의 성취 기록", BLINK_ACTION_IDS.achievementLog, "copy", {
      title: q ?? "오늘",
      url: ctx.sourceUrl,
    }),
  ];
}

function buildRecoveryPrepActions(ctx: ExtensionContext): LinkActionItem[] {
  const q = query(ctx);

  return [
    createOpenAction({
      label: "📦 오늘 데이터 아카이빙",
      href: "/archive",
      icon: "link",
      copyText: q ?? ctx.sourceUrl,
    }),
    blinkCustomAction(
      "🌅 내일 모닝 브리핑 세팅",
      BLINK_ACTION_IDS.morningBriefing,
      "bell",
      {
        title: q ?? "내일 아침",
        url: ctx.sourceUrl,
      }
    ),
  ];
}

function buildActionsForBand(
  band: ChronoBand,
  ctx: ExtensionContext
): LinkActionItem[] {
  switch (band) {
    case "morning_start":
      return buildMorningStartActions(ctx);
    case "work_active":
      return buildWorkActiveActions(ctx);
    case "growth_rest":
      return buildGrowthRestActions(ctx);
    case "recovery_prep":
      return buildRecoveryPrepActions(ctx);
  }
}

export function describeChronoBand(hour: number) {
  const band = resolveChronoBand(hour);
  return {
    band,
    ...CHRONO_BANDS[band],
  };
}

/** Time-of-day actions — what the user psychologically needs *right now*. */
export function buildChronoSuiteActions(
  ctx: ExtensionContext,
  maxActions = 2
): LinkActionItem[] {
  const band = resolveChronoBand(readHour(ctx));
  return buildActionsForBand(band, ctx).slice(0, maxActions);
}

/** Boost topic suites that match the current time band. */
export function chronoBoostedSuites(band: ChronoBand): SmartSuite[] {
  switch (band) {
    case "morning_start":
      return ["execution", "intellectual", "legal_admin"];
    case "work_active":
      return ["career", "social", "decision"];
    case "growth_rest":
      return ["edu", "intellectual", "health", "design"];
    case "recovery_prep":
      return ["execution", "intellectual"];
  }
}
