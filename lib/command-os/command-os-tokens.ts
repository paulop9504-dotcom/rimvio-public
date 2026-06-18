import {
  ACTION_COMMANDS,
  CREATE_COMMANDS,
  SEARCH_COMMANDS,
  WINDOW_COMMANDS,
} from "@/lib/command-os/resolve-command-intent";

export { ACTION_COMMANDS, CREATE_COMMANDS, SEARCH_COMMANDS, WINDOW_COMMANDS };

const ALL_COMMAND_TOKENS = new Set<string>([
  ...CREATE_COMMANDS,
  ...WINDOW_COMMANDS,
  ...ACTION_COMMANDS,
  ...SEARCH_COMMANDS,
]);

export function isKnownCommandOsToken(command: string): boolean {
  return ALL_COMMAND_TOKENS.has(command.trim().toLowerCase());
}
