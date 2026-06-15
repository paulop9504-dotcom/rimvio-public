import fs from "node:fs";
import path from "node:path";

const file = path.join(
  import.meta.dirname,
  "..",
  "lib/action-chat/orchestrator/run-orchestrator-pipeline.ts",
);
const src = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
const lines = src.split("\n");

function findMatchingClose(startIdx, openChar, closeChar) {
  let depth = 0;
  for (let i = startIdx; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === openChar) depth += 1;
      if (ch === closeChar) depth -= 1;
    }
    if (depth === 0 && i > startIdx) return i;
  }
  return -1;
}

const out = [];
let i = 0;
let replaced = 0;

while (i < lines.length) {
  const line = lines[i];
  if (
    line.trim() === "const trace = new OrchestratorTrace();" &&
    lines[i + 1]?.includes("trace.hit(0,")
  ) {
    const hitLine = lines[i + 1];
    const termLine = lines[i + 2] ?? "";
    const hitMatch = /trace\.hit\(0, (\d+), "([^"]+)", ?(.*)\);/.exec(hitLine);
    if (!hitMatch) {
      out.push(line);
      i += 1;
      continue;
    }
    const tier = hitMatch[1];
    const label = hitMatch[2];
    const detailRaw = hitMatch[3]?.trim();
    const detailField =
      detailRaw && detailRaw !== "undefined"
        ? `detail: ${detailRaw},\n      `
        : "";
    const terminal = termLine.includes("KERNEL_OS") ? "KERNEL_OS" : "EARLY_RETURN";

    const finalizeIdx = lines.findIndex(
      (l, idx) => idx > i && l.includes("const result = await shell.finalize("),
    );
    if (finalizeIdx < 0) {
      out.push(line);
      i += 1;
      continue;
    }
    const finalizeClose = findMatchingClose(finalizeIdx, "(", ")");
    const finalizeBody = lines
      .slice(finalizeIdx + 1, finalizeClose)
      .join("\n")
      .replace(/^\s*\.\.\./, "")
      .replace(/,\s*$/, "")
      .replace(/\s*orchestratorTrace: trace\.snapshot\(\),?\s*/g, "")
      .trim();

    let partial = finalizeBody;
    let applyPresentation = false;
    if (partial.startsWith("withPresentationLayers(")) {
      applyPresentation = true;
      partial = partial
        .replace(/^withPresentationLayers\(/, "")
        .replace(/, adaptive, message\)$/, "")
        .trim();
    }

    const returnIdx = lines.findIndex(
      (l, idx) => idx > finalizeClose && l.includes("return withKernelOSMeta"),
    );
    if (returnIdx < 0) {
      out.push(line);
      i += 1;
      continue;
    }

    const applyField = applyPresentation ? "\n      applyPresentation: true," : "";
    out.push("    return {");
    out.push(`      tier: ${tier} as const,`);
    out.push(`      label: "${label}",`);
    if (detailField) {
      out.push(`      ${detailField.trimEnd()}`);
    }
    out.push(`      terminal: "${terminal}",`);
    out.push(`      partial: ${partial},${applyField}`);
    out.push("    };");

    replaced += 1;
    i = returnIdx + 1;
    continue;
  }

  out.push(line);
  i += 1;
}

fs.writeFileSync(file, out.join("\n"));
console.log("replaced blocks:", replaced);
