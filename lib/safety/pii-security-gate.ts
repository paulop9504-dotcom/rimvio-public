import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import type { LinkActionItem } from "@/types/database";

export type SecurityLevel = "LOW" | "MEDIUM" | "HIGH";

const HIGH_PII_REQUEST =
  /(?:주민\s*(?:등록)?\s*번호|주민번호|rrn|resident\s*registration|신용카드\s*(?:번호|전체)|카드\s*번호\s*전체|비밀번호\s*(?:알려|말해)|passport\s*number)/iu;

export function classifySecurityLevel(message: string): SecurityLevel {
  return HIGH_PII_REQUEST.test(message.trim()) ? "HIGH" : "LOW";
}

function buildAuthActions(): LinkActionItem[] {
  return [
    {
      id: "security-verify-identity",
      label: "본인 확인 진행",
      kind: "custom",
      payload: {
        securityAuthRequest: true,
        securityLevel: "HIGH",
      },
    },
  ];
}

/** Block sensitive PII extraction — requires authentication, never returns raw data. */
export function orchestratePiiSecurityGate(message: string): OrchestratorResult | null {
  const level = classifySecurityLevel(message);
  if (level !== "HIGH") {
    return null;
  }

  return {
    summary:
      "주민등록번호 등 민감 정보는 채팅에서 알려드릴 수 없어요. 본인 확인 후 필요한 절차를 안내할게요.",
    actions: buildAuthActions(),
    source: "rules",
    confidence: 0.99,
    disclosure: "high",
    actionsRevealed: true,
    pendingConfirm: false,
    metadata: {
      intent: "ACTION",
      trust_level_adjustment: "NONE",
      security_level: "HIGH",
    },
    thought: "PII request detected · security_level HIGH · authentication required",
  };
}
