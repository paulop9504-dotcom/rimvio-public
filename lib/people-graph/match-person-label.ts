import { peerDisplayNamesMatch } from "@/lib/peer-chat/match-peer-display-name";
import { normalizeMeaningPerson } from "@/lib/meaning/meaning-node-id";

export function personLabelsMatch(left: string, right: string): boolean {
  const a = normalizeMeaningPerson(left);
  const b = normalizeMeaningPerson(right);
  if (!a || !b) {
    return false;
  }
  return peerDisplayNamesMatch(a, b) || a === b;
}

export function eventIncludesPerson(
  peopleInEvent: readonly string[],
  personLabel: string,
): boolean {
  return peopleInEvent.some((name) => personLabelsMatch(name, personLabel));
}
