import type { CommandEventCandidate } from "@/lib/command-os/command-os-types";

const candidatesById = new Map<string, CommandEventCandidate>();
let idSeq = 0;

export function resetCommandEventCandidatesForTests(): void {
  candidatesById.clear();
  idSeq = 0;
}

export function enableDeterministicCommandIdsForTests(): void {
  idSeq = 0;
}

function nextCandidateId(): string {
  idSeq += 1;
  return `cmd-cand-${idSeq}`;
}

export function registerCommandEventCandidate(
  candidate: Omit<CommandEventCandidate, "id" | "createdAt"> & {
    id?: string;
    createdAt?: string;
  }
): CommandEventCandidate {
  const record: CommandEventCandidate = {
    id: candidate.id ?? nextCandidateId(),
    intent: candidate.intent,
    rawInput: candidate.rawInput,
    normalizedQuery: candidate.normalizedQuery,
    command: candidate.command,
    extractedContext: candidate.extractedContext,
    createdAt: candidate.createdAt ?? new Date().toISOString(),
    intentResolvedVia: candidate.intentResolvedVia,
  };
  candidatesById.set(record.id, record);
  return record;
}

export function getCommandEventCandidate(
  id: string
): CommandEventCandidate | undefined {
  return candidatesById.get(id);
}

export function listCommandEventCandidates(): CommandEventCandidate[] {
  return [...candidatesById.values()];
}
