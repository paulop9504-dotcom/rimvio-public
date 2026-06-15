import type { ChatAxis } from "@/lib/action-chat/chat-three-axis";
import { buildMentionActionWire } from "@/lib/action-chat/mention-actions/build-mention-action-wire";
import type { InlineChatActionWire } from "@/lib/action-chat/mention-actions/inline-chat-action";
import { isMentionActionInlineFeature } from "@/lib/action-chat/mention-actions/mention-action-inline-features";
import {
  readLastMentionAction,
  recordLastMentionAction,
} from "@/lib/action-chat/mention-actions/last-mention-action-store";
import {
  mentionOrchestratorMetadata,
  type ActionChatMessage,
} from "@/lib/action-chat/orchestrator-types";
import { normalizeAtMentionInput } from "@/lib/command-os/parse-command-input";
import {
  getMentionFeature,
  resolveMentionFeature,
} from "@/lib/event-kernel/action-contracts/mention-feature-registry";

function createChatMessage(
  role: ActionChatMessage["role"],
  text: string,
  extra?: Partial<ActionChatMessage>,
): ActionChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    text,
    createdAt: new Date().toISOString(),
    ...extra,
  };
}

export function parseMentionActionInput(
  raw: string,
): { featureId: string; query: string } | null {
  const trimmed = normalizeAtMentionInput(raw);
  const match = trimmed.match(/^@(\S+)(?:\s+(.*))?$/u);
  if (!match) {
    return null;
  }
  const feature = resolveMentionFeature(match[1] ?? "");
  if (!feature || !isMentionActionInlineFeature(feature.featureId)) {
    return null;
  }
  return {
    featureId: feature.featureId,
    query: (match[2] ?? "").trim(),
  };
}

export function isMentionActionInput(text: string): boolean {
  return parseMentionActionInput(text) !== null;
}

function persistLastAction(wire: InlineChatActionWire): void {
  if (
    wire.featureId === "manual" ||
    wire.featureId === "friend_add" ||
    wire.featureId === "peer_talk" ||
    wire.featureId === "group_talk"
  ) {
    return;
  }
  recordLastMentionAction(wire);
}

/** Local @ action turn — generic inline chip for extended mention features. */
export function tryBuildMentionActionTurn(input: {
  text: string;
  chatAxis?: ChatAxis;
  referenceDate?: string;
}): ActionChatMessage[] | null {
  const parsed = parseMentionActionInput(input.text);
  if (!parsed) {
    return null;
  }

  const feature = getMentionFeature(parsed.featureId);
  if (!feature) {
    return null;
  }

  const normalized = normalizeAtMentionInput(input.text);
  const userMessage = createChatMessage("user", normalized, {
    chatAxis: input.chatAxis,
  });

  const lastStored = readLastMentionAction();
  const wire = buildMentionActionWire({
    feature,
    query: parsed.query,
    referenceDate: input.referenceDate,
    lastAction: lastStored,
  });

  if (!wire) {
    return null;
  }

  if (!parsed.query && feature.confirmCopy && feature.featureId !== "manual") {
    return [
      userMessage,
      createChatMessage("assistant", feature.confirmCopy),
    ];
  }

  if (feature.featureId === "manual") {
    const catalog = wire.manualCatalog ?? [];
    const total = catalog.reduce((sum, group) => sum + group.rows.length, 0);
    if (total === 0) {
      return [
        userMessage,
        createChatMessage("assistant", `"${parsed.query}"에 맞는 호출어가 없어요. @설명서 만 입력하면 전체 목록이 나와요.`),
      ];
    }
  }

  persistLastAction(wire);

  return [
    userMessage,
    createChatMessage("assistant", "", {
      inlineChatAction: wire,
      metadata: mentionOrchestratorMetadata({
        mention_feature: feature.featureId,
        sourceRef: feature.sourceRef,
      }),
    }),
  ];
}
