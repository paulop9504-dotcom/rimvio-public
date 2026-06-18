/**
 * Context Resource — L3 SSOT for rankable executable units inside a Context.
 * @see docs/GLOBE_HUB_RESOURCE.md
 *
 * Created by Hub factory; ranked by engine (not by Hub).
 */

/** Normalized resource kinds emitted from Hub factory. */
export type ContextResourceKind =
  | "ticket"
  | "flight"
  | "lodging_voucher"
  | "rental_car"
  | "media_album"
  | "schedule"
  | "ai_handoff";

/** Spacetime metadata — ranking engine input (GPS · Now). */
export type ContextResourceSpacetime = {
  validFromIso?: string | null;
  validUntilIso?: string | null;
  placeLabel?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export type ContextResourceActionKind =
  | "open_url"
  | "show_qr"
  | "navigate"
  | "activate"
  | "internal_route";

/** Executable handoff when Resource is MAIN or tapped. */
export type ContextResourceAction = {
  kind: ContextResourceActionKind;
  href: string;
  labelKo: string;
};

/**
 * Resource: independent unit inside a Context after Hub factory emit.
 * Hub does not assign display priority — only creates and updates Resources.
 */
export type ContextResource = {
  resourceId: string;
  contextEventId: string;
  kind: ContextResourceKind;
  /** Hub instance that created or last synced this resource. */
  sourceHubId: string;
  label: string;
  shortLabel?: string | null;
  spacetime: ContextResourceSpacetime;
  action: ContextResourceAction | null;
  createdAtIso: string;
  updatedAtIso?: string | null;
  /** External provider sync — JIT fetch worker updates this. */
  lastSyncedAtIso?: string | null;
  metadata?: Record<string, unknown>;
};
