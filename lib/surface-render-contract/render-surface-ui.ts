import type { ContextOpportunity } from "@/lib/cognitive-opportunity/types";
import type { CognitiveEvent } from "@/lib/context-builder/types";
import type { VisibilityDecision, VisibilitySurface } from "@/lib/visibility-bridge/types";
import {
  SURFACE_RENDER_DENSITY_LIMITS,
  type CalendarUiItem,
  type DockUiItem,
  type NarrationUiItem,
  type RenderSurfaceUiInput,
  type SurfaceRenderResult,
  type SurfaceUiState,
  type TimelineUiItem,
} from "@/lib/surface-render-contract/types";

const SURFACES: VisibilitySurface[] = ["CALENDAR", "DOCK", "TIMELINE", "NARRATION"];

const GENERIC_TAGS = new Set([
  "schedule",
  "suggestion",
  "signal",
  "event",
  "opportunity",
  "urgent",
  "imminent",
  "deadline",
  "scheduled",
  "reminder",
  "active",
  "now",
  "food",
]);

const NARRATION_SIGNAL_COPY: Record<string, string> = {
  intent_match: "Aligns with your current focus",
  time_sensitive: "Time-sensitive context",
  engaged: "You engaged with this recently",
  recent_signal: "Recently active in your stream",
  suppressed: "Previously quieted — worth another look",
};

function emptyUiState(): SurfaceUiState {
  return {
    CALENDAR: [],
    DOCK: [],
    TIMELINE: [],
    NARRATION: [],
  };
}

function parseSurface(value: string | null | undefined): VisibilitySurface | null {
  if (!value || value === "none") {
    return null;
  }
  const upper = value.toUpperCase();
  return SURFACES.includes(upper as VisibilitySurface) ? (upper as VisibilitySurface) : null;
}

function resolveDecisionSurface(decision: VisibilityDecision): VisibilitySurface | null {
  return decision.surface ?? parseSurface(decision.finalSurface);
}

function humanizeToken(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function buildEventLookup(eventPool?: readonly CognitiveEvent[]): Map<string, CognitiveEvent> {
  const lookup = new Map<string, CognitiveEvent>();
  if (!eventPool) {
    return lookup;
  }
  for (const event of eventPool) {
    lookup.set(event.id, event);
  }
  return lookup;
}

function buildOpportunityLookup(
  opportunities: readonly ContextOpportunity[]
): Map<string, ContextOpportunity> {
  const lookup = new Map<string, ContextOpportunity>();
  for (const opportunity of opportunities) {
    lookup.set(opportunity.id, opportunity);
  }
  return lookup;
}

function resolveSourceEvents(
  opportunity: ContextOpportunity,
  eventLookup: Map<string, CognitiveEvent>
): CognitiveEvent[] {
  const events: CognitiveEvent[] = [];
  for (const eventId of opportunity.sourceEventIds) {
    const event = eventLookup.get(eventId);
    if (event) {
      events.push(event);
    }
  }
  return events;
}

function primaryLabel(opportunity: ContextOpportunity, sourceEvents: CognitiveEvent[]): string {
  for (const event of sourceEvents) {
    for (const tag of event.tags) {
      const normalized = tag.trim().toLowerCase();
      if (!GENERIC_TAGS.has(normalized)) {
        return humanizeToken(normalized);
      }
    }
  }

  for (const event of sourceEvents) {
    if (event.tags[0]) {
      return humanizeToken(event.tags[0]);
    }
  }

  return humanizeToken(opportunity.type);
}

function calendarTitle(opportunity: ContextOpportunity, sourceEvents: CognitiveEvent[]): string {
  const label = primaryLabel(opportunity, sourceEvents);
  if (opportunity.type === "REMINDER") {
    return `${label} reminder`;
  }
  if (opportunity.type === "ACTION") {
    return `${label} action`;
  }
  return label;
}

function dockTitle(opportunity: ContextOpportunity, sourceEvents: CognitiveEvent[]): string {
  return primaryLabel(opportunity, sourceEvents);
}

function deriveTimestamp(sourceEvents: CognitiveEvent[]): number {
  if (sourceEvents.length === 0) {
    return 0;
  }
  return Math.min(...sourceEvents.map((event) => event.timestamp));
}

function deriveTimeRange(sourceEvents: CognitiveEvent[]): { start: number; end: number } {
  if (sourceEvents.length === 0) {
    return { start: 0, end: 0 };
  }
  const timestamps = sourceEvents.map((event) => event.timestamp);
  return {
    start: Math.min(...timestamps),
    end: Math.max(...timestamps),
  };
}

function narrationText(reasonSignals: readonly string[]): string {
  const parts: string[] = [];

  for (const signal of reasonSignals) {
    if (signal.startsWith("attention:")) {
      const state = signal.slice("attention:".length);
      parts.push(`Suited for ${state} attention`);
      continue;
    }

    const copy = NARRATION_SIGNAL_COPY[signal];
    if (copy) {
      parts.push(copy);
    }
  }

  if (parts.length === 0) {
    return "Contextual insight available.";
  }

  return `${parts.join(". ")}.`;
}

function toCalendarItem(
  opportunity: ContextOpportunity,
  sourceEvents: CognitiveEvent[]
): CalendarUiItem {
  return {
    id: opportunity.id,
    type: opportunity.type,
    title: calendarTitle(opportunity, sourceEvents),
    timestamp: deriveTimestamp(sourceEvents),
    urgency: opportunity.urgencyScore,
  };
}

function toDockItem(opportunity: ContextOpportunity, sourceEvents: CognitiveEvent[]): DockUiItem {
  return {
    id: opportunity.id,
    type: opportunity.type,
    title: dockTitle(opportunity, sourceEvents),
    relevance: opportunity.finalScore,
  };
}

function toTimelineItem(
  opportunity: ContextOpportunity,
  sourceEvents: CognitiveEvent[]
): TimelineUiItem {
  const { start, end } = deriveTimeRange(sourceEvents);
  return {
    id: opportunity.id,
    type: opportunity.type,
    title: calendarTitle(opportunity, sourceEvents),
    start,
    end,
  };
}

function toNarrationItem(opportunity: ContextOpportunity): NarrationUiItem {
  return {
    id: opportunity.id,
    type: opportunity.type,
    text: narrationText(opportunity.reasonSignals),
  };
}

function sortDecisionsForRender(decisions: readonly VisibilityDecision[]): VisibilityDecision[] {
  return [...decisions].sort((left, right) => left.opportunityId.localeCompare(right.opportunityId));
}

/** SurfaceRenderContract v1 — Visibility decisions → UI-ready surface payloads. */
export function renderSurfaceUi(input: RenderSurfaceUiInput): SurfaceRenderResult {
  const { decisions, opportunities, eventPool } = input;
  const uiState = emptyUiState();
  const opportunityLookup = buildOpportunityLookup(opportunities);
  const eventLookup = buildEventLookup(eventPool);
  const counts: Record<VisibilitySurface, number> = {
    CALENDAR: 0,
    DOCK: 0,
    TIMELINE: 0,
    NARRATION: 0,
  };
  const rendered = new Set<string>();

  for (const decision of sortDecisionsForRender(decisions)) {
    if (!decision.visible) {
      continue;
    }

    if (rendered.has(decision.opportunityId)) {
      continue;
    }

    const surface = resolveDecisionSurface(decision);
    if (!surface) {
      continue;
    }

    const limit = SURFACE_RENDER_DENSITY_LIMITS[surface];
    if (counts[surface] >= limit) {
      continue;
    }

    const opportunity = opportunityLookup.get(decision.opportunityId);
    if (!opportunity) {
      continue;
    }

    const sourceEvents = resolveSourceEvents(opportunity, eventLookup);

    switch (surface) {
      case "CALENDAR":
        uiState.CALENDAR.push(toCalendarItem(opportunity, sourceEvents));
        break;
      case "DOCK":
        uiState.DOCK.push(toDockItem(opportunity, sourceEvents));
        break;
      case "TIMELINE":
        uiState.TIMELINE.push(toTimelineItem(opportunity, sourceEvents));
        break;
      case "NARRATION":
        uiState.NARRATION.push(toNarrationItem(opportunity));
        break;
      default:
        continue;
    }

    counts[surface] += 1;
    rendered.add(decision.opportunityId);
  }

  for (const surface of SURFACES) {
    uiState[surface].sort((left, right) => left.id.localeCompare(right.id));
  }

  return { uiState };
}
