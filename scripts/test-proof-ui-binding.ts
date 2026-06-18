#!/usr/bin/env npx tsx
import { setupOcrReviewFlow } from "../lib/event-os/ocr-review-flow-setup";
import { enqueueReviewExecution } from "../lib/event-os/review-execution-queue";
import { resetReviewExecutionQueueForTests } from "../lib/event-os/review-execution-queue-state";
import { resetReviewExecutionLocksForTests } from "../lib/event-os/review-execution-lock";
import { eventOSOrchestrator } from "../lib/event-os/runtime/event-os-orchestrator";
import { resetProofPersistStoreForTests } from "../lib/event-os/runtime/proof-persist-store";
import {
  applyProofRenderToClient,
  renderFromProof,
  translateUiDiff,
  validateProofUiBinding,
} from "../lib/event-os/ui-binding";
import type { ProofUIRenderHandlers } from "../lib/event-os/ui-binding";

const violations: string[] = [];

function fail(msg: string) {
  violations.push(msg);
}

resetReviewExecutionLocksForTests();
resetReviewExecutionQueueForTests();
resetProofPersistStoreForTests();
eventOSOrchestrator.resetRuntimeCountersForTests();
setupOcrReviewFlow();

const flow = enqueueReviewExecution({
  scopeId: "default",
  type: "approve",
  payload: { message: "맞아" },
});

const proof = flow.runtime?.processed[0]?.proof;
if (!proof) {
  fail("missing_proof");
} else {
  const dateInstructions = translateUiDiff("show DATE_PICKER");
  if (dateInstructions[0]?.target !== "datePicker") {
    fail(`date_picker_target:${dateInstructions[0]?.target}`);
  }

  const render = renderFromProof(proof, {
    orchestrator: flow.runtime?.processed[0]?.orchestrator ?? null,
  });
  if (render.proofHash !== proof.proofHash) {
    fail("render_hash_mismatch");
  }
  if (!render.explainability.causalChain.length) {
    fail("explainability_chain_empty");
  }

  const bindingFailures = validateProofUiBinding(proof, render);
  if (bindingFailures.length > 0) {
    fail(`binding:${bindingFailures.join(",")}`);
  }

  let gatePhase: "awaiting_date" | "awaiting_confirm" | null = null;
  let dateTrigger: unknown = "unset";

  const handlers: ProofUIRenderHandlers = {
    setDatePickerRequest: (t) => {
      dateTrigger = t;
    },
    setReviewGatePhase: (p) => {
      gatePhase = p;
    },
  };

  if (proof.uiDiff === "show DATE_PICKER") {
    applyProofRenderToClient(proof, handlers, {
      orchestrator: flow.runtime?.processed[0]?.orchestrator ?? null,
    });
    if (gatePhase !== "awaiting_date") {
      fail(`gate_phase:${gatePhase}`);
    }
  }

  const confirmRender = renderFromProof({
    ...proof,
    uiDiff: "show CONFIRM_SCREEN",
    causalChain: ["VALIDATED → PENDING_CONFIRM"],
  });
  if (confirmRender.instructions.some((i) => i.target === "confirmUI" && i.type !== "SHOW")) {
    fail("confirm_instruction_missing");
  }

  const emptyChainFailures = validateProofUiBinding(
    { ...proof, uiDiff: "show DATE_PICKER", causalChain: [] },
    renderFromProof({ ...proof, uiDiff: "show DATE_PICKER", causalChain: [] })
  );
  if (!emptyChainFailures.includes("causal_chain_missing_for_ui_diff")) {
    fail(`expected_causal_guard got ${emptyChainFailures.join(",")}`);
  }
}

console.log(
  JSON.stringify(
    {
      status: violations.length === 0 ? "PASS" : "FAIL",
      violations,
      proofUiDiff: proof?.uiDiff,
    },
    null,
    2
  )
);

if (violations.length > 0) {
  process.exit(1);
}

console.log("test-proof-ui-binding: ok");
