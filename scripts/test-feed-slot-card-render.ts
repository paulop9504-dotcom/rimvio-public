/**
 * SSR smoke — FeedTodaySlotCard must render without ReferenceError.
 * Run: npx tsx scripts/test-feed-slot-card-render.ts
 */

import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { FeedTodaySlotCard } from "@/components/feed/feed-today-slot-card";
import { buildFeedPlanDemoDraft } from "@/lib/feed/seed-feed-plan-demo";
import { upsertEventCandidate } from "@/lib/events/event-store";
import { buildFeedTodaySlots } from "@/lib/feed/build-feed-today-slots";
import { composeSurfaceFrame } from "@/lib/surface-composition/compose-surface-frame";
import { resolveSurfaces } from "@/lib/surface-engine/surface-resolver";
import { buildFeedSlotPeerLookup } from "@/lib/feed/build-feed-slot-peer-lookup";

function noop() {}

function main() {
  const demo = upsertEventCandidate(buildFeedPlanDemoDraft());
  const engine = resolveSurfaces({ dateKey: demo.datetime?.slice(0, 10) });
  const frame = composeSurfaceFrame(engine, engine.surfaces);
  const { today } = buildFeedTodaySlots({
    primary: frame.layout.primary,
    latent: frame.graph.latentSurfaces,
    overlayRows: [],
  });

  const slot = today[0];
  if (!slot) {
    throw new Error("expected at least one demo feed slot");
  }

  const peerLookup = buildFeedSlotPeerLookup({ messages: [], relationshipSlots: [] });
  const html = renderToString(
    createElement(FeedTodaySlotCard, {
      slot,
      peerLookup,
      eventsById: new Map([[demo.id, demo]]),
      onPillPress: noop,
    }),
  );

  if (!html || html.length < 20) {
    throw new Error("FeedTodaySlotCard rendered empty markup");
  }

  console.log("test-feed-slot-card-render: ok");
}

main();
