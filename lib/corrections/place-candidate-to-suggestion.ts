import type { LocationSuggestion } from "@/lib/action-chat/confirmation-types";
import type { PlaceCandidate } from "@/lib/context-resolver/places/types";

function parseBranchFromLabel(label: string, brandHint?: string | null): string | undefined {
  const trimmed = label.trim();
  if (!trimmed) {
    return undefined;
  }

  if (brandHint && trimmed.startsWith(brandHint)) {
    const branch = trimmed.slice(brandHint.length).trim().replace(/^[-·]\s*/, "");
    return branch.length > 0 && branch.length <= 24 ? branch : undefined;
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    const branch = parts.slice(1).join(" ");
    return branch.length <= 24 ? branch : undefined;
  }

  return undefined;
}

export function placeCandidateToLocationSuggestion(
  candidate: PlaceCandidate,
  brandHint?: string | null
): LocationSuggestion {
  const address = candidate.address?.trim() || "";
  const branch = parseBranchFromLabel(candidate.name, brandHint);

  return {
    id: candidate.place_id,
    label: candidate.name,
    place_name: brandHint?.trim() || candidate.name.split(/\s+/)[0] || candidate.name,
    address,
    branch,
    lat: candidate.lat,
    lng: candidate.lng,
    maps_url: candidate.maps_url?.trim() || undefined,
  };
}
