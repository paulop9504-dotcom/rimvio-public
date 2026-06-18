import type { PluginDomain, PluginRegistryEntry } from "@/lib/plugin-registry/types";

export const PLUGIN_REGISTRY: PluginRegistryEntry[] = [
  { id: "kakao.taxi", label: "Kakao T taxi", domains: ["travel", "work"], executable: true },
  { id: "navigation", label: "Navigation", domains: ["travel", "work"], executable: true },
  { id: "ticket.view", label: "Boarding pass / ticket", domains: ["travel"], executable: true },
  { id: "roaming.esim", label: "Travel eSIM", domains: ["travel"], executable: true },
  { id: "finance.fx", label: "FX / exchange", domains: ["travel"], executable: true },
  { id: "passport.check", label: "Passport / visa", domains: ["travel"], executable: true },
  { id: "transit.ic_card", label: "Transit IC card", domains: ["travel"], executable: true },
  { id: "file.open", label: "Open document", domains: ["work"], executable: true },
  { id: "card.qr", label: "Digital business card QR", domains: ["work"], executable: true },
  { id: "zoom.join", label: "Join video call", domains: ["work"], executable: true },
  { id: "calendar.view", label: "Open calendar", domains: ["work", "generic"], executable: true },
  { id: "tel", label: "Phone call", domains: ["work", "generic"], executable: true },
  { id: "search.web", label: "Web search fallback", domains: ["generic"], executable: true },
  { id: "chat.followup", label: "Ask Rimvio follow-up", domains: ["generic"], executable: true },
];

export const FALLBACK_PLUGIN_ID = "search.web";
export const CHAT_FALLBACK_PLUGIN_ID = "chat.followup";

export function pluginIdsForDomains(domains: PluginDomain[]): string[] {
  const set = new Set<string>();
  for (const entry of PLUGIN_REGISTRY) {
    if (entry.domains.some((domain) => domains.includes(domain))) {
      set.add(entry.id);
    }
  }
  return [...set];
}
