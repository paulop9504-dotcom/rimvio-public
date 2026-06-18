import type { PinScope } from "@/lib/globe/pin-entity";
import type { TrustStaircaseStage } from "@/lib/preferences/action-trust";
import {
  assemblePersonalReadPacket,
  serializePacketForLlm,
  type PersonalReadScope,
} from "@/lib/personal-read-model";
import type { LinkRow } from "@/types/database";

export function buildPersonalReadContextBlock(input: {
  scope?: PersonalReadScope;
  userId?: string | null;
  activeContextId?: string | null;
  activeLink?: LinkRow | null;
  trustLevel?: TrustStaircaseStage;
  pinScope?: PinScope;
  now?: Date;
}): string | null {
  try {
    const packet = assemblePersonalReadPacket({
      scope: input.scope ?? "server",
      bypassCache: true,
      userId: input.userId ?? null,
      activeContextId: input.activeContextId ?? null,
      activeLink: input.activeLink ?? null,
      trustLevel: input.trustLevel,
      pinScope: input.pinScope ?? "internal",
      now: input.now,
    });
    return serializePacketForLlm(packet, {
      redactPrivateFacts: input.pinScope === "external",
    });
  } catch {
    return null;
  }
}
