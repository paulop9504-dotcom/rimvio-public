import fs from "node:fs";
const src = fs.readFileSync("scripts/_old-pipeline.ts", "utf8").replace(/\r\n/g, "\n");
const fnStart = src.indexOf("export async function runOrchestratorPipeline");
const fnBodyStart =
  src.indexOf("): Promise<OrchestratorResult> {", fnStart) +
  "): Promise<OrchestratorResult> {".length;
const earlyStart = src.indexOf(
  "  const eventReviewDateResolution = orchestrateViaReviewExecutionQueue",
  fnBodyStart,
);
const standardMarker =
  '  const scoped = applyContextIsolation(input, route);\n  const trace = new OrchestratorTrace();\n  trace.pass(0, 0, "EventKernel");';
const standardStart = src.lastIndexOf(standardMarker);
console.log({ fnBodyStart, earlyStart, standardStart, span: standardStart - earlyStart });
