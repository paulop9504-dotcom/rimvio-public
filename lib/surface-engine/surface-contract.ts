/**
 * Canonical Surface schema (v1) — UI-agnostic, provider-agnostic.
 * Components render this contract; they must not compose or rank surfaces.
 */

export const SURFACE_CONTRACT_VERSION = 1 as const;

/** Situation shape — not a screen name. */
export type SurfaceType =
  | "travel"
  | "schedule"
  | "reminder"
  | "food"
  | "work"
  | "goal"
  | "finance"
  | "social"
  | "generic";

export type SurfaceChannel = "FEED" | "CHAT" | "CALENDAR";

export type SurfaceLifecycle =
  | "draft"
  | "active"
  | "preparing"
  | "in_progress"
  | "completed"
  | "archived";

export type SurfaceVisibility = "prominent" | "normal" | "muted" | "hidden";

export type SurfacePriorityBand = "critical" | "high" | "medium" | "low";

import type { CapabilityId } from "@/lib/capability-registry/capability-types";

export type { CapabilityId };

export type SurfaceAction = {
  id: string;
  kind: "primary" | "secondary";
  label: string;
  /** Canonical capability reference — providers resolved only in Capability Registry. */
  capabilityId: CapabilityId;
  /** Optional link to life event — never a provider URL. */
  eventId?: string;
};

export type SurfacePerson = {
  id: string;
  displayName: string;
  role?: "host" | "guest" | "contact";
};

export type SurfaceResource = {
  id: string;
  kind: SurfaceResourceKind;
  label: string;
  href?: string;
};

export type SurfaceResourceKind =
  | "location"
  | "document"
  | "link"
  | "checklist";

export type SurfaceEventRef = {
  eventId: string;
  title: string;
  startAt?: string;
  lifecycle: string;
  /** Event SSOT metadata — calendar UI uses for origin badge. */
  sourceRef?: string;
};

export type SurfaceNarration = {
  summary: string;
  reason?: string;
};

export type SurfacePriority = {
  band: SurfacePriorityBand;
  /** Deterministic score — higher surfaces first. Set by ranker. */
  surfacePriorityScore: number;
  urgencyHours?: number;
};

/** @alias Surface — canonical situation object. */
export type Surface = {
  id: string;
  type: SurfaceType;
  title: string;
  description: string;
  primaryAction: SurfaceAction;
  secondaryActions: SurfaceAction[];
  people: SurfacePerson[];
  resources: SurfaceResource[];
  events: SurfaceEventRef[];
  narration: SurfaceNarration | null;
  priority: SurfacePriority;
  visibility: SurfaceVisibility;
  lifecycle: SurfaceLifecycle;
};

export type RankedSurface = Surface & {
  priority: SurfacePriority & { surfacePriorityScore: number };
};

export type SurfaceBuildContext = {
  now?: Date;
  dateKey?: string;
  /** Active UI channel — learning bias only; not SSOT. */
  activeChannel?: SurfaceChannel;
  /** Completed primary/secondary action ids (`surfaceId:intent`). */
  completedActionIds?: readonly string[];
  dismissedSurfaceIds?: readonly string[];
  focusedSurfaceId?: string;
  recentEventIds?: readonly string[];
};

export type SurfaceRouteMap = Record<SurfaceChannel, readonly RankedSurface[]>;

export type SurfaceUxState =
  | "active"
  | "idle"
  | "low_signal"
  | "overloaded"
  | "empty";

export type SurfaceEngineResult = {
  contractVersion: typeof SURFACE_CONTRACT_VERSION;
  computedAt: string;
  surfaces: readonly RankedSurface[];
  routes: SurfaceRouteMap;
  /** UX stability layer state — deterministic, not SSOT. */
  uxState: SurfaceUxState;
};
