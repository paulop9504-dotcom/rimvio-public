import type { PeerMessage } from "@/lib/context/peer-message-types";
import type { ExperienceRoomParticipant } from "@/lib/experience-room/experience-room-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import type {
  ExperienceConversationPreview,
  ExperienceConversationProjection,
} from "@/lib/globe/experience-conversation-types";
import { resolveExperiencePeerThreadId } from "@/lib/globe/resolve-experience-peer-thread-id";

const SNIPPETS_META_KEY = "experienceConversationSnippets";
const PREVIEW_LIMIT = 3;

type SnippetRow = {
  speakerName?: string;
  body?: string;
  sentAtIso?: string;
};

function trimExcerpt(body: string, max = 48): string {
  const text = body.trim().replace(/\s+/g, " ");
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 1)}…`;
}

function readMetadataSnippets(
  event: EventCandidate,
): ExperienceConversationPreview[] {
  const raw = event.metadata?.[SNIPPETS_META_KEY];
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .filter((row): row is SnippetRow => Boolean(row && typeof row === "object"))
    .map((row, index) => ({
      id: `snippet:${index}`,
      speakerName: row.speakerName?.trim() || "참석자",
      excerpt: trimExcerpt(row.body?.trim() || ""),
      sentAtIso: row.sentAtIso?.trim() || null,
    }))
    .filter((row) => row.excerpt.length > 0);
}

function speakerNameForMessage(
  message: PeerMessage,
  participants: readonly ExperienceRoomParticipant[],
  selfLabel: string,
): string {
  if (message.author === "me") {
    return selfLabel;
  }
  if (message.author === "ai") {
    return "Rimvio";
  }
  const peer = participants.find((row) => row.role !== "host")?.displayName;
  return peer?.trim() || participants[0]?.displayName?.trim() || "친구";
}

function previewsFromMessages(input: {
  messages: readonly PeerMessage[];
  participants: readonly ExperienceRoomParticipant[];
  selfLabel: string;
}): ExperienceConversationPreview[] {
  return [...input.messages]
    .filter((row) => row.author !== "ai" && row.body.trim().length > 0)
    .sort((left, right) => Date.parse(right.sentAt) - Date.parse(left.sentAt))
    .map((row) => ({
      id: row.id,
      speakerName: speakerNameForMessage(row, input.participants, input.selfLabel),
      excerpt: trimExcerpt(row.body),
      sentAtIso: row.sentAt,
    }));
}

/** Recent experience conversation — preview rows, not a chat list. */
export function projectExperienceConversation(input: {
  event: EventCandidate | null | undefined;
  messages?: readonly PeerMessage[];
  participants?: readonly ExperienceRoomParticipant[];
  previewLimit?: number;
}): ExperienceConversationProjection | null {
  const event = input.event;
  if (!event) {
    return null;
  }

  const peerThreadId = resolveExperiencePeerThreadId(event);
  const participants = input.participants ?? [];
  const previewLimit = input.previewLimit ?? PREVIEW_LIMIT;

  const metadataRows = readMetadataSnippets(event);
  const messageRows =
    input.messages && input.messages.length > 0
      ? previewsFromMessages({
          messages: input.messages,
          participants,
          selfLabel: "나",
        })
      : [];

  const merged = (messageRows.length > 0 ? messageRows : metadataRows).filter(
    (row) => row.excerpt.length > 0,
  );

  const seen = new Set<string>();
  const unique: ExperienceConversationPreview[] = [];
  for (const row of merged) {
    const key = `${row.speakerName}:${row.excerpt}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(row);
  }

  const totalCount = Math.max(
    unique.length,
    messageRows.length,
    metadataRows.length,
    typeof event.metadata?.peerMessageCount === "number"
      ? event.metadata.peerMessageCount
      : unique.length,
  );

  const previews = unique.slice(0, previewLimit);
  const overflowCount = Math.max(0, totalCount - previews.length);

  if (!peerThreadId && previews.length === 0) {
    return null;
  }

  return {
    peerThreadId,
    previews,
    totalCount,
    overflowCount,
  };
}

export function buildExperienceRoomHref(input: {
  peerThreadId: string;
  eventId: string;
  title: string;
  date?: string | null;
  place?: string | null;
}): string {
  const params = new URLSearchParams();
  params.set("experience", input.eventId.trim());
  params.set("experienceTitle", input.title.trim());
  if (input.date?.trim()) {
    params.set("experienceDate", input.date.trim());
  }
  if (input.place?.trim()) {
    params.set("experiencePlace", input.place.trim());
  }
  const threadId = encodeURIComponent(input.peerThreadId.trim());
  return `/peers/${threadId}?${params.toString()}`;
}
