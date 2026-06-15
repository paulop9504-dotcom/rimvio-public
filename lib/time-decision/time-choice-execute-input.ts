import type { TimeChoiceOption } from "@/lib/time-decision/types";

export type TimeChoiceExecuteInput = {
  mode: TimeChoiceOption["mode"];
  datetime: string;
  task: string;
  prompt: string;
};

export function timeChoicePayloadToExecuteInput(payload: {
  timeChoiceMode?: unknown;
  datetime?: unknown;
  task?: unknown;
  timeChoicePrompt?: unknown;
}): TimeChoiceExecuteInput | null {
  const mode = payload.timeChoiceMode;
  const datetime = payload.datetime;
  const task = payload.task;
  const prompt = payload.timeChoicePrompt;

  if (
    typeof mode !== "string" ||
    typeof datetime !== "string" ||
    typeof task !== "string" ||
    typeof prompt !== "string"
  ) {
    return null;
  }

  if (
    mode !== "calendar" &&
    mode !== "countdown" &&
    mode !== "both" &&
    mode !== "today" &&
    mode !== "tomorrow"
  ) {
    return null;
  }

  return { mode, datetime, task, prompt };
}
