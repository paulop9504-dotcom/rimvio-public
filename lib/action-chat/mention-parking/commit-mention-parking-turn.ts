import type { ChatAxis } from "@/lib/action-chat/chat-three-axis";
import {
  mentionOrchestratorMetadata,
  type ActionChatMessage,
} from "@/lib/action-chat/orchestrator-types";
import {
  buildInlineChatParkingWire,
} from "@/lib/action-chat/mention-parking/inline-chat-parking";
import {
  formatParkingRetentionLabel,
  saveParkingRecord,
  PARKING_RETENTION_MS,
  type ParkingRecord,
} from "@/lib/local-parking/parking-records";
import { armParkingPhotoCapture } from "@/lib/local-parking/parking-photo-session";
import { readImageFileAsDataUrl } from "@/lib/local-parking/read-image-data-url";
import { saveKnowledgeEntity } from "@/lib/knowledge/knowledge-entity-db";
import { FIXED_DATA_CONTAINER_ID } from "@/lib/knowledge/knowledge-entity-types";
import { normalizeAtMentionInput } from "@/lib/command-os/parse-command-input";
import type { ComposerAttachment } from "@/lib/action-chat/composer-attachments";

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

export type ParsedMentionParkingInput =
  | { kind: "photo" }
  | { kind: "record"; location: string };

export function parseMentionParkingInput(raw: string): ParsedMentionParkingInput | null {
  const trimmed = normalizeAtMentionInput(raw);
  if (/^@주차_\s*$/u.test(trimmed)) {
    return { kind: "photo" };
  }

  const recordMatch = trimmed.match(/^@주차\s+(.+)$/u);
  if (recordMatch?.[1]?.trim()) {
    return { kind: "record", location: recordMatch[1].trim() };
  }

  if (/^@주차\s*$/u.test(trimmed)) {
    return { kind: "photo" };
  }

  return null;
}

export function isMentionParkingInput(text: string): boolean {
  return parseMentionParkingInput(text) !== null;
}

function parkingWireFromRecord(
  record: ParkingRecord,
  mode: "photo_request" | "saved",
  summaryLine: string,
) {
  return buildInlineChatParkingWire({
    mode,
    recordId: record.id,
    location: record.location,
    photoPreviewUrl: record.photoDataUrl,
    expiresAt: record.expiresAt,
    retentionLabel: formatParkingRetentionLabel(record.expiresAt),
    summaryLine,
  });
}

async function mirrorParkingToKnowledge(record: ParkingRecord) {
  const label = record.location?.trim() || "주차 사진";
  try {
    await saveKnowledgeEntity({
      containerId: FIXED_DATA_CONTAINER_ID,
      type: "place",
      label: `주차 · ${label}`,
      value: record.location ?? label,
      sourceMessage: record.id,
    });
  } catch {
    // knowledge mirror is best-effort
  }
}

/** Local @주차 turn — photo prompt or location record, no orchestrator. */
export function tryBuildMentionParkingTurn(input: {
  text: string;
  chatAxis?: ChatAxis;
}): ActionChatMessage[] | null {
  const parsed = parseMentionParkingInput(input.text);
  if (!parsed) {
    return null;
  }

  const normalized = normalizeAtMentionInput(input.text);
  const userMessage = createChatMessage("user", normalized, {
    chatAxis: input.chatAxis,
  });

  if (parsed.kind === "photo") {
    armParkingPhotoCapture();
    const expiresAt = new Date(Date.now() + PARKING_RETENTION_MS).toISOString();
    return [
      userMessage,
      createChatMessage("assistant", "", {
        inlineChatParking: buildInlineChatParkingWire({
          mode: "photo_request",
          recordId: "",
          location: null,
          photoPreviewUrl: null,
          expiresAt,
          retentionLabel: formatParkingRetentionLabel(expiresAt),
          summaryLine: "사진을 찍어주세요",
        }),
        metadata: mentionOrchestratorMetadata({
          mention_feature: "parking",
          sourceRef: "mention:parking",
        }),
      }),
    ];
  }

  const record = saveParkingRecord({ location: parsed.location });
  void mirrorParkingToKnowledge(record);

  return [
    userMessage,
    createChatMessage("assistant", "", {
      inlineChatParking: parkingWireFromRecord(
        record,
        "saved",
        "기록되었습니다",
      ),
      metadata: mentionOrchestratorMetadata({
        mention_feature: "parking",
        sourceRef: "mention:parking",
      }),
    }),
  ];
}

/** Complete armed @주차_ flow when user sends a photo attachment. */
export async function tryCommitParkingPhotoTurn(input: {
  attachments: ComposerAttachment[];
  chatAxis?: ChatAxis;
}): Promise<ActionChatMessage[] | null> {
  const image = input.attachments.find(
    (attachment) => attachment.kind === "image" && attachment.file,
  );
  if (!image?.file) {
    return null;
  }

  const photoDataUrl = await readImageFileAsDataUrl(image.file);
  const record = saveParkingRecord({ photoDataUrl });
  void mirrorParkingToKnowledge(record);

  const userMessage = createChatMessage("user", "주차 사진", {
    composerAttachments: [
      {
        id: image.id,
        kind: image.kind,
        label: image.label,
        previewUrl: photoDataUrl ?? image.previewUrl,
      },
    ],
    chatAxis: input.chatAxis,
  });

  return [
    userMessage,
    createChatMessage("assistant", "", {
      inlineChatParking: parkingWireFromRecord(
        record,
        "saved",
        "사진과 함께 기록되었습니다",
      ),
      metadata: mentionOrchestratorMetadata({
        mention_feature: "parking",
        sourceRef: "mention:parking",
      }),
    }),
  ];
}
