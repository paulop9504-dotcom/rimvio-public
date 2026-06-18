import fs from "node:fs";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const srcPath = path.join(root, "lib/action-chat/orchestrator/run-orchestrator-pipeline.ts");
const src = fs.readFileSync(srcPath, "utf8");

const startMarker = "  const eventReviewDateResolution = orchestrateViaReviewExecutionQueue({";
const endMarker =
  '  const scoped = applyContextIsolation(pipelineInput, route);\n  const trace = new OrchestratorTrace();\n  trace.pass(0, 0, "EventKernel");';

const start = src.indexOf(startMarker);
const end = src.indexOf(endMarker);
if (start < 0 || end < 0) {
  console.error("markers not found", { start, end });
  process.exit(1);
}

let body = src.slice(start, end);

// Replace local vars with base.*
const replacements = [
  [/\bpipelineInput\b/g, "base.pipelineInput"],
  [/\binput\b/g, "base.input"],
  [/\bmessage\b/g, "base.message"],
  [/\beffectiveMessage\b/g, "base.effectiveMessage"],
  [/\broutingMessage\b/g, "base.routingMessage"],
  [/\bcontext\b/g, "base.context"],
  [/\badaptive\b/g, "base.adaptive"],
  [/\broute\b/g, "base.route"],
  [/\bkernel\b/g, "base.kernel"],
  [/\blocationMemory\b/g, "base.locationMemory"],
  [/\buserDefinedActions\b/g, "base.userDefinedActions"],
  [/\bmemoryOutput\b/g, "base.memoryOutput"],
  [/\bsearchPlan\b/g, "base.searchPlan"],
  [/\beventState\.os\b/g, "base.eventState.os"],
  [/\bos\b/g, "base.eventState.os"],
  [/\bskipAiIntentStub\b/g, "base.flags.skipAiIntentStub"],
];

for (const [from, to] of replacements) {
  body = body.replace(from, to);
}

// Transform early return blocks: replace shell pattern with return decision
body = body.replace(
  /if \(([\s\S]*?)\) \{\n    const trace = new OrchestratorTrace\(\);\n    trace\.hit\(([\s\S]*?)\);\n    trace\.terminal\(([\s\S]*?)\);[\s\S]*?emitOrchestratorTrace\(result\.orchestratorTrace \?\? trace\.snapshot\(\)\);\n    return withKernelOSMeta\(result, base\.memoryOutput, base\.searchPlan\);\n  \}/g,
  (match) => {
    // too fragile - skip automated transform
    return match;
  },
);

const header = `import { orchestrateViaReviewExecutionQueue } from "@/lib/event-os/resolve-review-execution-orchestrator";
// ... imports trimmed for extraction debug
import type { EarlyOrchestratorDecision, OrchestratorPipelineBase } from "@/lib/action-chat/orchestrator/orchestrator-pipeline-base";
import { withPresentationLayers } from "@/lib/action-chat/orchestrator/orchestrator-pipeline-base";

const MEAL_OR_VITALITY = /(?:먹|맛집|배고|카페|피곤|힘들|지쳤|쉬고)/iu;

export async function resolveOrchestratorEarlyDecision(
  base: OrchestratorPipelineBase,
): Promise<EarlyOrchestratorDecision | null> {
`;

const outPath = path.join(root, "lib/action-chat/orchestrator/_early-body-extract.ts");
fs.writeFileSync(outPath, header + body + "\n  return null;\n}\n");
console.log("wrote", outPath, "lines", body.split("\n").length);
