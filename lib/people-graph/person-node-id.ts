import { normalizeMeaningPerson } from "@/lib/meaning/meaning-node-id";

export function personNodeId(input: {
  peerThreadId?: string | null;
  displayName: string;
}): string {
  const threadId = input.peerThreadId?.trim();
  if (threadId) {
    return `person:thread:${threadId}`;
  }
  const name = normalizeMeaningPerson(input.displayName);
  return `person:name:${name.toLowerCase()}`;
}

export function personLabelFromNodeId(id: string): string | null {
  if (id.startsWith("person:name:")) {
    return id.slice("person:name:".length);
  }
  return null;
}
