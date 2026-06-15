import {
  SLIM_COMMAND_TOKENS,
  isSlimCommandToken,
} from "@/lib/inside-out/slim-command-protocol";

/**
 * Rimvio Command Router registry — slim protocol only.
 * @see lib/inside-out/slim-command-protocol.ts
 */
export const RIMVIO_COMMAND_REGISTRY = SLIM_COMMAND_TOKENS;

export type RimvioCommandToken = (typeof RIMVIO_COMMAND_REGISTRY)[number];

export function isRimvioCommandToken(token: string): boolean {
  return isSlimCommandToken(token);
}

export const FALLBACK_COMMAND: RimvioCommandToken = "검색";
