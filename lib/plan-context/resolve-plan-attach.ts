import type { EventCandidate } from "@/lib/events/event-candidate";

import type { ScheduleIntentKind } from "@/lib/peer-chat/ai-lens/classify-schedule-intent";

import { peerDisplayNamesMatch } from "@/lib/peer-chat/match-peer-display-name";

import {

  isOpenPlanEvent,

  readPlanContextFromEvent,

} from "@/lib/plan-context/plan-context-metadata";

import type {

  PlanAttachResolution,

  PlanAttachScoreSignals,

} from "@/lib/plan-context/plan-context-types";



const TRAVEL_SIGNAL = /(?:여행|출국|제주|오사카|해외|trip|flight|호텔|숙소)/iu;



const ATTACH_MIN_SCORE_PLAN = 7;

const ATTACH_MIN_SCORE_APPOINTMENT = 8;



function normalizeTitle(value: string): string {

  return value.trim().toLowerCase().replace(/\s+/g, "");

}



function titlesSimilar(left: string, right: string): boolean {

  const a = normalizeTitle(left);

  const b = normalizeTitle(right);

  if (!a || !b) {

    return false;

  }

  if (a === b || a.includes(b) || b.includes(a)) {

    return true;

  }

  if (TRAVEL_SIGNAL.test(left) && TRAVEL_SIGNAL.test(right)) {

    return true;

  }

  return false;

}



function placesSimilar(left?: string | null, right?: string | null): boolean {

  const a = left?.trim().toLowerCase();

  const b = right?.trim().toLowerCase();

  if (!a || !b) {

    return false;

  }

  return a === b || a.includes(b) || b.includes(a);

}



function parseMs(iso?: string | null): number | null {

  if (!iso?.trim()) {

    return null;

  }

  const ms = Date.parse(iso);

  return Number.isNaN(ms) ? null : ms;

}



function fallsWithinWindow(

  pointMs: number | null,

  startMs: number | null,

  endMs: number | null,

): boolean {

  if (pointMs === null || startMs === null) {

    return false;

  }

  if (endMs === null) {

    const dayMs = 24 * 60 * 60 * 1000;

    return pointMs >= startMs - dayMs && pointMs <= startMs + 14 * dayMs;

  }

  return pointMs >= startMs && pointMs <= endMs;

}



function isPlanCapableEvent(event: EventCandidate): boolean {

  const meta = event.metadata ?? {};

  return (

    meta.feedPlanEnabled === true ||

    meta.planKind === "plan" ||

    Boolean(meta.planWindowEndIso)

  );

}



function travelContextInInput(input: {

  title: string;

  place?: string;

}): boolean {

  const blob = [input.title, input.place].filter(Boolean).join(" ");

  return TRAVEL_SIGNAL.test(blob);

}



function minScoreForIntent(

  intentKind: ScheduleIntentKind | undefined,

  input: { title: string; place?: string },

): number {

  if (intentKind === "plan") {

    return ATTACH_MIN_SCORE_PLAN;

  }

  if (travelContextInInput(input)) {

    return ATTACH_MIN_SCORE_PLAN;

  }

  return ATTACH_MIN_SCORE_APPOINTMENT;

}



function meetsMentionGuard(

  intentKind: ScheduleIntentKind | undefined,

  signals: PlanAttachScoreSignals,

  input: { title: string; place?: string },

): boolean {

  if (intentKind === "plan" || travelContextInInput(input)) {

    return true;

  }

  return signals.title || signals.place;

}



type AttachScoreResult = {

  total: number;

  signals: PlanAttachScoreSignals;

};



function scoreAttachCandidate(

  event: EventCandidate,

  input: {

    title: string;

    windowStartIso?: string;

    place?: string;

    peerDisplayName?: string;

  },

): AttachScoreResult {

  const signals: PlanAttachScoreSignals = {

    title: false,

    place: false,

    peer: false,

    window: false,

  };



  if (!isOpenPlanEvent(event) || !isPlanCapableEvent(event)) {

    return { total: 0, signals };

  }



  let score = 0;

  const plan = readPlanContextFromEvent(event);



  if (titlesSimilar(input.title, event.title)) {

    score += 3;

    signals.title = true;

  }

  if (placesSimilar(input.place, event.place ?? plan?.place)) {

    score += 2;

    signals.place = true;

  }

  if (

    input.peerDisplayName?.trim() &&

    plan?.peerDisplayName &&

    peerDisplayNamesMatch(plan.peerDisplayName, input.peerDisplayName)

  ) {

    score += 3;

    signals.peer = true;

  }



  const startMs = parseMs(input.windowStartIso ?? event.datetime);

  const endMs = parseMs(plan?.windowEndIso ?? null);

  const eventStartMs = parseMs(event.datetime);

  if (fallsWithinWindow(startMs, eventStartMs, endMs)) {

    score += 4;

    signals.window = true;

  }



  return { total: score, signals };

}



/** Should this conversation attach to an existing plan? */

export function resolvePlanAttach(input: {

  title: string;

  windowStartIso?: string;

  windowEndIso?: string | null;

  place?: string;

  peerDisplayName?: string;

  intentKind?: ScheduleIntentKind;

  events: readonly EventCandidate[];

}): PlanAttachResolution {

  const minScore = minScoreForIntent(input.intentKind, input);

  let best: { event: EventCandidate; score: AttachScoreResult } | null = null;



  for (const event of input.events) {

    const scored = scoreAttachCandidate(event, input);

    if (

      scored.total >= minScore &&

      meetsMentionGuard(input.intentKind, scored.signals, input) &&

      (!best || scored.total > best.score.total)

    ) {

      best = { event, score: scored };

    }

  }



  if (!best) {

    return {

      mode: "new",

      headline: "",

      canContinue: false,

    };

  }



  const plan = readPlanContextFromEvent(best.event);

  return {

    mode: "continue",

    candidatePlanId: best.event.id,

    candidateTitle: best.event.title,

    candidateWindowEndIso: plan?.windowEndIso ?? null,

    headline: `「${best.event.title}」 계획에 이어갈까요?`,

    detail: "같은 여행·약속 맥락으로 묶을 수 있어요",

    canContinue: true,

    attachScore: best.score.total,

    signals: best.score.signals,

  };

}


