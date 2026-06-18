import type { PeerContact } from "@/lib/context/peer-contact-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";
import { buildMeaningGraph } from "@/lib/meaning/build-meaning-graph";
import type { MeaningGraph } from "@/lib/meaning/meaning-types";
import { normalizeMeaningPlace } from "@/lib/meaning/meaning-node-id";
import { resolveExperienceIntent } from "@/lib/experience-intent/resolve-experience-intent";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import { personLabelsMatch } from "@/lib/people-graph/match-person-label";
import { collectEventPeople } from "@/lib/people-graph/collect-event-people";
import {
  collectPersonMeanings,
  scorePersonMeaning,
} from "@/lib/people-graph/collect-person-meanings";
import { personNodeId } from "@/lib/people-graph/person-node-id";
import { scoreRelationship } from "@/lib/people-graph/score-relationship";
import type {
  PeopleGraph,
  PersonExperienceRef,
  PersonNode,
  PersonPlaceRef,
  PersonSharedGlobeRef,
} from "@/lib/people-graph/person-types";
import type { SharedGlobe } from "@/lib/shared-globe/shared-globe-types";

type PersonSeed = {
  id: string;
  displayName: string;
  peerThreadId?: string;
  rimvioId?: string | null;
  source: PersonNode["source"];
};

function buildSeeds(contacts: readonly PeerContact[], events: readonly EventCandidate[]): PersonSeed[] {
  const byId = new Map<string, PersonSeed>();

  const findByName = (displayName: string): PersonSeed | null => {
    for (const seed of byId.values()) {
      if (personLabelsMatch(seed.displayName, displayName)) {
        return seed;
      }
    }
    return null;
  };

  const register = (seed: PersonSeed) => {
    const nameHit = findByName(seed.displayName);
    if (nameHit) {
      byId.set(nameHit.id, {
        ...nameHit,
        displayName: nameHit.displayName,
        peerThreadId: nameHit.peerThreadId ?? seed.peerThreadId,
        rimvioId: nameHit.rimvioId ?? seed.rimvioId,
        source: nameHit.source === "peer_contact" ? "peer_contact" : seed.source,
      });
      return;
    }

    const existing = byId.get(seed.id);
    if (!existing) {
      byId.set(seed.id, seed);
      return;
    }
    byId.set(seed.id, {
      ...existing,
      peerThreadId: existing.peerThreadId ?? seed.peerThreadId,
      rimvioId: existing.rimvioId ?? seed.rimvioId,
      source: existing.source === "peer_contact" ? "peer_contact" : seed.source,
    });
  };

  for (const contact of contacts) {
    const displayName = contact.displayName.trim();
    if (!displayName) {
      continue;
    }
    register({
      id: personNodeId({
        peerThreadId: contact.peerThreadId,
        displayName,
      }),
      displayName,
      peerThreadId: contact.peerThreadId,
      rimvioId: contact.rimvioId ?? null,
      source: "peer_contact",
    });
  }

  for (const event of events) {
    if (event.lifecycle === "archived") {
      continue;
    }
    for (const name of collectEventPeople(event)) {
      register({
        id: personNodeId({ displayName: name }),
        displayName: name,
        source: "discovered",
      });
    }
  }

  return [...byId.values()];
}

function collectExperiences(
  displayName: string,
  events: readonly EventCandidate[],
): PersonExperienceRef[] {
  const rows: PersonExperienceRef[] = [];

  for (const event of events) {
    if (event.lifecycle === "archived") {
      continue;
    }
    const people = collectEventPeople(event);
    if (!people.some((name) => personLabelsMatch(name, displayName))) {
      continue;
    }

    rows.push({
      eventId: event.id,
      title: event.title,
      intent: resolveExperienceIntent(event).intent,
      atIso: event.datetime ?? event.updatedAt ?? event.createdAt,
    });
  }

  return rows.sort((a, b) => Date.parse(b.atIso ?? "") - Date.parse(a.atIso ?? ""));
}

function collectPlaces(
  displayName: string,
  events: readonly EventCandidate[],
): PersonPlaceRef[] {
  const buckets = new Map<string, { count: number; lastAtMs: number }>();

  for (const event of events) {
    if (event.lifecycle === "archived") {
      continue;
    }
    const people = collectEventPeople(event);
    if (!people.some((name) => personLabelsMatch(name, displayName))) {
      continue;
    }

    const plan = readPlanContextFromEvent(event);
    const labels = new Set<string>();
    for (const value of [plan?.place, event.place]) {
      const place = typeof value === "string" ? normalizeMeaningPlace(value) : "";
      if (place) {
        labels.add(place);
      }
    }
    for (const capture of readFeedCaptureFragments(event)) {
      const place = capture.placeLabel
        ? normalizeMeaningPlace(capture.placeLabel)
        : "";
      if (place) {
        labels.add(place);
      }
    }

    const atMs = Date.parse(event.datetime ?? event.updatedAt ?? event.createdAt) || 0;
    for (const label of labels) {
      const prev = buckets.get(label) ?? { count: 0, lastAtMs: 0 };
      buckets.set(label, {
        count: prev.count + 1,
        lastAtMs: Math.max(prev.lastAtMs, atMs),
      });
    }
  }

  return [...buckets.entries()]
    .map(([label, stats]) => ({
      label,
      eventCount: stats.count,
      lastAtIso: stats.lastAtMs > 0 ? new Date(stats.lastAtMs).toISOString() : null,
    }))
    .sort((a, b) => b.eventCount - a.eventCount);
}

function collectSharedGlobes(
  displayName: string,
  globes: readonly SharedGlobe[],
): PersonSharedGlobeRef[] {
  const rows: PersonSharedGlobeRef[] = [];

  for (const globe of globes) {
    const member = globe.members.find((row) =>
      personLabelsMatch(row.displayName, displayName),
    );
    if (!member) {
      continue;
    }
    rows.push({
      globeId: globe.id,
      experienceRoomId: globe.experienceRoomId,
      title: globe.title,
      pinCount: globe.pins.length,
      role: member.role,
    });
  }

  return rows;
}

function countSharedThreads(
  displayName: string,
  events: readonly EventCandidate[],
): number {
  const threads = new Set<string>();
  for (const event of events) {
    const people = collectEventPeople(event);
    if (!people.some((name) => personLabelsMatch(name, displayName))) {
      continue;
    }
    const plan = readPlanContextFromEvent(event);
    const threadId =
      plan?.peerThreadId?.trim() ||
      (typeof event.metadata?.planPeerThreadId === "string"
        ? event.metadata.planPeerThreadId.trim()
        : "");
    if (threadId) {
      threads.add(threadId);
    }
  }
  return threads.size;
}

function projectPersonNode(input: {
  seed: PersonSeed;
  events: readonly EventCandidate[];
  meaningGraph: MeaningGraph;
  sharedGlobes: readonly SharedGlobe[];
  now: Date;
}): PersonNode {
  const experiences = collectExperiences(input.seed.displayName, input.events);
  const places = collectPlaces(input.seed.displayName, input.events);
  const meanings = collectPersonMeanings(input.meaningGraph, input.seed.displayName);
  const sharedGlobes = collectSharedGlobes(input.seed.displayName, input.sharedGlobes);

  let lastAtMs = 0;
  let verifyCount = 0;
  for (const event of input.events) {
    const people = collectEventPeople(event);
    if (!people.some((name) => personLabelsMatch(name, input.seed.displayName))) {
      continue;
    }
    const atMs = Date.parse(event.datetime ?? event.updatedAt ?? event.createdAt);
    if (!Number.isNaN(atMs)) {
      lastAtMs = Math.max(lastAtMs, atMs);
    }
    verifyCount += readFeedCaptureFragments(event).filter((row) => row.verified).length;
  }

  const relationshipScore = scoreRelationship({
    coExperienceCount: experiences.length,
    sharedThreadCount: countSharedThreads(input.seed.displayName, input.events),
    lastAtMs,
    verifyCount,
    hasDirectThread: Boolean(input.seed.peerThreadId?.trim()),
    nowMs: input.now.getTime(),
  });

  return {
    id: input.seed.id,
    displayName: input.seed.displayName,
    peerThreadId: input.seed.peerThreadId,
    rimvioId: input.seed.rimvioId,
    source: input.seed.source,
    experiences,
    places,
    meanings,
    sharedGlobes,
    relationshipScore,
    meaningScore: scorePersonMeaning(meanings),
  };
}

/** Pure read — elevate PeerContact → Person nodes with graph signals. */
export function buildPeopleGraph(input: {
  contacts: readonly PeerContact[];
  events: readonly EventCandidate[];
  meaningGraph?: MeaningGraph;
  sharedGlobes?: readonly SharedGlobe[];
  now?: Date;
}): PeopleGraph {
  const now = input.now ?? new Date();
  const events = input.events.filter((event) => event.lifecycle !== "archived");
  const meaningGraph = input.meaningGraph ?? buildMeaningGraph(events, now);
  const sharedGlobes = input.sharedGlobes ?? [];
  const seeds = buildSeeds(input.contacts, events);

  const people = seeds
    .map((seed) =>
      projectPersonNode({
        seed,
        events,
        meaningGraph,
        sharedGlobes,
        now,
      }),
    )
    .sort(
      (left, right) =>
        right.relationshipScore.total - left.relationshipScore.total ||
        right.meaningScore - left.meaningScore,
    );

  return {
    people,
    builtAt: now.toISOString(),
    contactCount: people.filter((row) => row.source === "peer_contact").length,
    discoveredCount: people.filter((row) => row.source === "discovered").length,
  };
}
