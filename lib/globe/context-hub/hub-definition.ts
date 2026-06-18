/**
 * Context Hub — L3 SSOT for pipeline / transaction container inside a Context.
 * @see docs/GLOBE_HUB_RESOURCE.md
 *
 * Hub has View and runs transactions; it does NOT rank Resources.
 */

import type { ContextHubKind } from "@/lib/globe/context-hub/context-hub-metadata";
import type { ContextHubServiceId } from "@/lib/globe/context-hub/context-hub-service-catalog";

/** Hub service slot in catalog — maps to integration / factory pipeline. */
export type ContextHubPipelineId = ContextHubServiceId;

/**
 * Hub: functional container + commerce touchpoint within one Context.
 * - Transaction · integration · factory · own View
 * - Does NOT compute MAIN priority (see rankContextResources)
 */
export type ContextHubDefinition = {
  hubId: ContextHubPipelineId;
  kind: ContextHubKind | null;
  labelKo: string;
  /** Factory can emit normalized Resources when connect/transaction completes. */
  implementsFactory: boolean;
  /** Hub owns plug-in / connect / checkout View. */
  hasView: boolean;
};

export const CONTEXT_HUB_LOCKED_RULES = {
  hubDoesNotRank: true,
  resourceIsRankingTarget: true,
  mainSlotIsResourceRankOne: true,
  carouselSwipeSameContextOnly: true,
} as const;
