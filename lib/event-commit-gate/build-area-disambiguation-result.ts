import { buildConfirmationOrchestratorResult } from "@/lib/action-chat/confirmation-logic";
import type { LocationConfirmUxWire } from "@/lib/action-chat/confirmation-types";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import { resolveAreaGeocodeCandidates } from "@/lib/event-commit-gate/resolve-area-geocode-candidates";

export async function buildAreaDisambiguationOrchestratorResult(input: {
  areaToken: string;
  seedMessage: string;
}): Promise<OrchestratorResult> {
  const areaToken = input.areaToken.trim();
  const suggestions = await resolveAreaGeocodeCandidates({
    areaToken,
    maxResults: 6,
  });

  const persona_message =
    `**${areaToken}**은 전국에 같은 이름이 여러 곳 있을 수 있어요. ` +
    `아래에서 맞는 **구·동**을 골라 주세요.`;

  const location_ux: LocationConfirmUxWire = {
    mode: "area_disambiguation",
    prompt: `${areaToken} — 어느 쪽이 맞을까요?`,
    suggestions,
  };

  return buildConfirmationOrchestratorResult({
    persona_message,
    data_prompt: location_ux.prompt,
    extracted_data: {
      address: null,
      phone: null,
      datetime: null,
      place_name: areaToken,
      url: null,
    },
    confidence: 0.86,
    thought: `Area disambiguation for ${areaToken} (meal slot location).`,
    confirm_data: {
      subject: areaToken,
      category: "PLACE",
    },
    location_suggestions: suggestions,
    location_ux,
    area_disambiguation: {
      area_token: areaToken,
      prompt: location_ux.prompt,
    },
  });
}
