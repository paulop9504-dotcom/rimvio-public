/**
 * Rimvio Command Router — NL / @ → single `@command argument` line.
 */
export {
  RIMVIO_COMMAND_REGISTRY,
  FALLBACK_COMMAND,
  isRimvioCommandToken,
  type RimvioCommandToken,
} from "@/lib/command-router/command-registry";

export {
  routeRimvioCommand,
  routeRimvioCommandDetailed,
  type RoutedCommand,
} from "@/lib/command-router/route-rimvio-command";
