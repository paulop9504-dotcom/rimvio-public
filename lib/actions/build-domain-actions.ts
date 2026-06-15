import type { DomainKey } from "@/lib/actions/domain-context";
import {
  buildUniversalActions,
  type BuildUniversalActionsInput,
} from "@/lib/actions/build-universal-actions";
import type { LinkActionItem } from "@/types/database";

export type BuildDomainActionsInput = BuildUniversalActionsInput;

export function buildDomainActions(input: BuildDomainActionsInput): LinkActionItem[] {
  return buildUniversalActions(input);
}

export function readDomainPriority(action: LinkActionItem) {
  return Number(action.payload?.domainPriority ?? 0);
}

export function isDomainPrimaryAction(action: LinkActionItem) {
  return Boolean(action.payload?.domainPrimary ?? action.payload?.universalPrimary);
}
