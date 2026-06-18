#!/usr/bin/env npx tsx
/**
 * Action Contract adversarial harness.
 * Verifies slot extraction, validation, gating, and kernel authority isolation.
 */

import assert from "node:assert/strict";
import {
  decideKernelIntent,
  evaluateContractGate,
  extractSlots,
  inferContractAction,
  orchestrateEventKernel,
  collectMemoryHints,
  resetKernelMemoryStoreForTests,
  runEventKernelOS,
  validateActionContract,
} from "../lib/event-kernel";
import { buildMissingSlotQuestion } from "../lib/event-kernel/slot-filling/build-missing-slot-question";

type ExpectedOutcome = "VALID" | "MISSING_SLOT";

type ContractCase = {
  id: string;
  input: string;
  expected: ExpectedOutcome;
  action?: string;
  missingSlot?: string;
  question?: string;
};

const CASES: ContractCase[] = [
  {
    id: "CASE 1",
    input: "길찾기",
    expected: "MISSING_SLOT",
    action: "NAVIGATE",
    missingSlot: "destination",
    question: "어디로 가시나요?",
  },
  {
    id: "CASE 2",
    input: "인천공항 길찾기",
    expected: "VALID",
    action: "NAVIGATE",
  },
  {
    id: "CASE 3",
    input: "가격 알려줘",
    expected: "MISSING_SLOT",
    action: "PRICE_LOOKUP",
    missingSlot: "entity",
    question: "무엇의 가격을 찾으시나요?",
  },
  {
    id: "CASE 4",
    input: "삼성전자 가격",
    expected: "VALID",
    action: "PRICE_LOOKUP",
  },
  {
    id: "CASE 5",
    input: "오늘 점심 추천",
    expected: "VALID",
    action: "MEAL_RECOMMENDATION",
  },
  {
    id: "CASE 6",
    input: "일정 정리",
    expected: "VALID",
    action: "SCHEDULE_ORGANIZE",
  },
];

const violations: string[] = [];

function fail(caseId: string, reason: string) {
  violations.push(`${caseId}: ${reason}`);
}

function kernelSnapshot(message: string) {
  const kernel = orchestrateEventKernel({ message, history: [] });
  const hints = collectMemoryHints({ message, history: [], memory: null, frameEntities: kernel.frame.entities });
  const decision = decideKernelIntent({
    message,
    history: [],
    base: kernel,
    memoryHints: hints,
  });
  return {
    committedDecision: kernel.committedDecision,
    dominantIntent: kernel.dominantIntent,
    entropy: kernel.entropy,
    state: decision.state,
    route: decision.route,
  };
}

function runCase(testCase: ContractCase) {
  const { id, input, expected, action, missingSlot, question } = testCase;

  const inferred = inferContractAction(input);
  if (action && inferred !== action) {
    fail(id, `inferContractAction expected ${action}, got ${inferred ?? "null"}`);
  }

  const { slots } = extractSlots(input);
  const validation = validateActionContract({
    action: action ?? inferred ?? "",
    extractedSlots: slots,
  });

  const gate = evaluateContractGate(input);

  if (expected === "VALID") {
    if (gate.state !== "PROCEED") {
      fail(id, `gate expected PROCEED, got ${gate.state}`);
    }
    if (!validation.valid) {
      fail(
        id,
        `validation expected valid, missing=${validation.missingSlots.join(",")}`
      );
    }
  } else {
    if (gate.state !== "MISSING_SLOT") {
      fail(id, `gate expected MISSING_SLOT, got ${gate.state}`);
    }
    if (missingSlot && gate.state === "MISSING_SLOT") {
      if (!gate.missingSlots.includes(missingSlot)) {
        fail(
          id,
          `missingSlots expected [${missingSlot}], got [${gate.missingSlots.join(", ")}]`
        );
      }
      const autofilled = gate.slots[missingSlot]?.trim();
      if (autofilled) {
        fail(id, `slot ${missingSlot} must not be auto-filled (got "${autofilled}")`);
      }
    }
    if (question && gate.state === "MISSING_SLOT" && gate.question !== question) {
      fail(id, `question expected "${question}", got "${gate.question}"`);
    }
    const built = buildMissingSlotQuestion({
      action: action ?? inferred ?? "",
      missingSlots: validation.missingSlots,
    });
    if (question && built !== question) {
      fail(id, `buildMissingSlotQuestion mismatch: "${built}"`);
    }
  }

  const beforeKernel = kernelSnapshot(input);
  const os = runEventKernelOS({ message: input, history: [] });
  const afterKernel = kernelSnapshot(input);

  if (JSON.stringify(beforeKernel) !== JSON.stringify(afterKernel)) {
    fail(id, "kernel snapshot changed between isolated runs (authority drift)");
  }

  if (os.kernel.committedDecision !== beforeKernel.committedDecision) {
    fail(
      id,
      `OS kernel.committedDecision ${os.kernel.committedDecision} !== baseline ${beforeKernel.committedDecision}`
    );
  }
  if (os.kernelDecision.state !== beforeKernel.state) {
    fail(
      id,
      `OS kernelDecision.state ${os.kernelDecision.state} !== baseline ${beforeKernel.state}`
    );
  }

  if (expected === "MISSING_SLOT") {
    if (os.contractGate.state !== "MISSING_SLOT") {
      fail(id, `OS contractGate expected MISSING_SLOT, got ${os.contractGate.state}`);
    }
    if (os.execution.hint === "search" || os.execution.hint === "pipeline") {
      fail(id, `execution must be blocked (hint=${os.execution.hint})`);
    }
    if (os.execution.disposition === "delegate") {
      fail(id, "execution disposition must not delegate when slots missing");
    }
    if (os.execution.hint !== "missing_slot") {
      fail(id, `execution hint expected missing_slot, got ${os.execution.hint}`);
    }
    if (question && os.output.summary !== question) {
      fail(id, `OS summary expected "${question}", got "${os.output.summary}"`);
    }
    const slotValue =
      missingSlot && os.contractGate.state === "MISSING_SLOT"
        ? os.contractGate.slots[missingSlot]?.trim()
        : "";
    if (slotValue) {
      fail(id, `OS must not auto-fill ${missingSlot}`);
    }
  } else {
    if (os.contractGate.state !== "PROCEED") {
      fail(id, `OS contractGate expected PROCEED, got ${os.contractGate.state}`);
    }
    if (os.execution.hint === "missing_slot") {
      fail(id, "valid contract must not return missing_slot execution");
    }
  }
}

resetKernelMemoryStoreForTests();

for (const testCase of CASES) {
  runCase(testCase);
}

const status = violations.length === 0 ? "PASS" : "FAIL";

console.log(
  JSON.stringify(
    {
      status,
      cases: CASES.length,
      violations,
      checks: [
        "kernel_unchanged",
        "execution_blocked_when_slots_missing",
        "no_auto_filled_slots",
        "clarification_question_correct",
      ],
    },
    null,
    2
  )
);

if (status === "FAIL") {
  process.exit(1);
}
