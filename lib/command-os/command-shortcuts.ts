/** v1.1 — inline @ shortcuts (Add syntax only; no command palette). */

export type CommandShortcut = {
  id: string;
  /** Visible chip label */
  label: string;
  /** Fills composer; user completes query then submits */
  template: string;
  command: string;
  icon: string;
};

export const COMMAND_SHORTCUTS_V1: CommandShortcut[] = [
  {
    id: "calendar",
    label: "일정",
    template: "@캘린더 ",
    command: "캘린더",
    icon: "📅",
  },
  {
    id: "search",
    label: "검색",
    template: "@검색 ",
    command: "검색",
    icon: "🔍",
  },
  {
    id: "action",
    label: "액션",
    template: "@액션 ",
    command: "액션",
    icon: "⚡",
  },
];

const MAX_VISIBLE = 3;

/**
 * Pure — when to show shortcut chips above the composer.
 * Hides once the user is typing a full `@command query`.
 */
export function suggestCommandShortcuts(input: string): CommandShortcut[] {
  const trimmed = input.trim();
  if (!trimmed.startsWith("@")) {
    return [];
  }
  if (/^@\S+\s+\S/u.test(trimmed)) {
    return [];
  }

  const partial = trimmed === "@" ? "" : trimmed.slice(1).trim();
  const matches = COMMAND_SHORTCUTS_V1.filter((shortcut) => {
    if (!partial) {
      return true;
    }
    return (
      shortcut.command.startsWith(partial) ||
      partial.startsWith(shortcut.command)
    );
  });

  return matches.slice(0, MAX_VISIBLE);
}

export function shouldShowCommandShortcuts(input: string): boolean {
  return suggestCommandShortcuts(input).length > 0;
}
