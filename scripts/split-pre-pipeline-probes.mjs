import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const srcPath = path.join(root, "lib/action-chat/orchestrator/resolve-orchestrator-decision.ts");
const src = fs.readFileSync(srcPath, "utf8");
const importEnd = src.indexOf("const MEAL_OR_VITALITY");
const imports = src.slice(0, importEnd).trim();
const fnStart = src.indexOf("export async function resolveOrchestratorEarlyDecision");
const bodyStart = src.indexOf("{", fnStart) + 1;
const bodyEnd = src.lastIndexOf("return null;");
const body = src.slice(bodyStart, bodyEnd).trim();
const lines = body.split("\n");

const cuts = [
  0,
  lines.findIndex((l) => /const eventReviewDateResolution/.test(l)),
  lines.findIndex((l) => /const recoveryPrimaryEarly/.test(l)),
  lines.findIndex((l) => /if \(!shouldSkipVitalityForRecovery/.test(l)),
  lines.length,
];

const segments = [
  { file: "security-probes.ts", label: "security" },
  { file: "event-probes.ts", label: "event / review / commit" },
  { file: "ux-routing-probes.ts", label: "UX + adaptive routing" },
  { file: "discovery-probes.ts", label: "discovery + kernel OS" },
];

const dir = path.join(root, "lib/action-chat/orchestrator/routing/probes");
fs.mkdirSync(dir, { recursive: true });

const shared = `import type { FallbackRecoveryCandidate } from "@/lib/action-chat/fallback-recovery/infer-fallback-recovery";
import { inferFallbackRecovery } from "@/lib/action-chat/fallback-recovery/infer-fallback-recovery";

export const MEAL_OR_VITALITY = /(?:먹|맛집|배고|카페|피곤|힘들|지쳤|쉬고)/iu;

export const RECOVERY_PRIMARY_SKIP_VITALITY = new Set<FallbackRecoveryCandidate>([
  "career_planning",
  "education_planning",
]);

export function shouldSkipVitalityForRecovery(message: string): boolean {
  return RECOVERY_PRIMARY_SKIP_VITALITY.has(inferFallbackRecovery(message).primary);
}
`;

fs.writeFileSync(path.join(dir, "shared.ts"), shared);

const probeExports = [];

for (let i = 0; i < segments.length; i += 1) {
  const chunk = lines.slice(cuts[i], cuts[i + 1]).join("\n").trim();
  const exportName = segments[i].file.replace(".ts", "").toUpperCase().replace(/-/g, "_");
  probeExports.push(exportName);
  const content = `${imports}

import type { PrePipelineProbe } from "@/lib/action-chat/orchestrator/routing/pre-pipeline-probe-types";
import { MEAL_OR_VITALITY, shouldSkipVitalityForRecovery } from "@/lib/action-chat/orchestrator/routing/probes/shared";

/** Pre-pipeline routing — ${segments[i].label}. */
export const ${exportName}: PrePipelineProbe = async (base) => {
${chunk
  .split("\n")
  .map((line) => `  ${line}`)
  .join("\n")}
  return null;
};
`;
  fs.writeFileSync(path.join(dir, segments[i].file), content);
}

const index = `import type { PrePipelineProbe } from "@/lib/action-chat/orchestrator/routing/pre-pipeline-probe-types";
${probeExports.map((name, i) => `import { ${name} } from "@/lib/action-chat/orchestrator/routing/probes/${segments[i].file.replace(".ts", "")}";`).join("\n")}

/** Fixed probe order — first match wins. */
export const PRE_PIPELINE_PROBE_ORDER: readonly PrePipelineProbe[] = [
${probeExports.map((name) => `  ${name},`).join("\n")}
];
`;

fs.writeFileSync(path.join(dir, "index.ts"), index);
console.log("split-pre-pipeline-probes: ok", probeExports);
