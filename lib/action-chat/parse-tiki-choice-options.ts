export type TikiChoiceOption = {
  letter: string;
  text: string;
};

export type ParsedTikiChoiceBlock = {
  intro: string;
  choices: TikiChoiceOption[];
  closing: string | null;
  hasChoices: boolean;
};

const FIRST_CHOICE_MARKER = /(?:^|[\n\s.])([A-D])\)\s*/u;
const CHOICE_ITEM = /(?:^|[\n\s.])([A-D])\)\s*([\s\S]*?)(?=(?:[\n\s.][A-D]\)|$))/gu;

/** Parse A/B/C lines from Tiki-Taka assistant summaries. */
export function parseTikiChoiceOptions(summary: string): TikiChoiceOption[] {
  return parseTikiChoiceBlock(summary).choices;
}

export function formatTikiChoiceReply(choice: TikiChoiceOption): string {
  return `${choice.letter.toUpperCase()}) ${choice.text}`;
}

export function parseTikiChoiceBlock(summary: string): ParsedTikiChoiceBlock {
  const normalized = summary.replace(/\r\n/g, "\n");
  const firstMatch = normalized.match(FIRST_CHOICE_MARKER);
  if (!firstMatch || firstMatch.index === undefined) {
    return {
      intro: normalized.trim(),
      choices: [],
      closing: null,
      hasChoices: false,
    };
  }

  const intro = normalized.slice(0, firstMatch.index).trimEnd();
  let block = normalized.slice(firstMatch.index);

  let closing: string | null = null;
  const closingInBlock = block.match(/👉\s*([\s\S]+)$/u);
  if (closingInBlock?.index != null) {
    closing = `👉 ${closingInBlock[1].trim()}`;
    block = block.slice(0, closingInBlock.index).trimEnd();
  }

  const choices: TikiChoiceOption[] = [];
  for (const match of block.matchAll(CHOICE_ITEM)) {
    const letter = match[1];
    const text = match[2]?.trim();
    if (!letter || !text) {
      continue;
    }
    choices.push({
      letter: letter.toUpperCase(),
      text,
    });
  }

  return {
    intro,
    choices,
    closing,
    hasChoices: choices.length >= 2,
  };
}
