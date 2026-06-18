#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  assessRisk,
  exceedsGuardrailThreshold,
  RiskLevel,
} from "../lib/safety/risk-assessor";
import { inferGuardrailIntent } from "../lib/safety/infer-guardrail-intent";
import { buildRuleBasedGuardrailWire } from "../lib/safety/parse-guardrail-response";
import { orchestrateGuardrail } from "../lib/safety/orchestrate-guardrail";
import type { PersistentEvent } from "../lib/context-resolver/types";

function event(overrides: Partial<PersistentEvent> = {}): PersistentEvent {
  return {
    id: "evt-1",
    title: "CEO 면접",
    start_time: "2026-05-29T14:00:00.000Z",
    location: "강남",
    criticality: "HIGH",
    ...overrides,
  };
}

async function main() {
  const lowOnly = assessRisk("EXECUTE", event({ criticality: "LOW" }));
  assert.equal(lowOnly.score, RiskLevel.LOW);
  assert.equal(lowOnly.level, RiskLevel.LOW);
  assert.equal(exceedsGuardrailThreshold(lowOnly.score), false);

  const highDestructive = assessRisk("DELETE", event({ criticality: "HIGH" }));
  assert.equal(highDestructive.score, 100);
  assert.equal(highDestructive.level, RiskLevel.HIGH);
  assert.equal(exceedsGuardrailThreshold(highDestructive.score), true);

  const mediumCancel = assessRisk("CANCEL", event({ criticality: "MEDIUM" }));
  assert.equal(mediumCancel.score, 50);
  assert.equal(exceedsGuardrailThreshold(mediumCancel.score), false);

  const intent = inferGuardrailIntent({
    message: "CEO 면접 일정 취소해줘",
    referenceDate: "2026-05-29",
    existingSchedule: {
      tasks: [{ time: "14:00", task: "CEO 면접" }],
    },
  });
  assert.ok(intent);
  assert.equal(intent!.action, "CANCEL");
  assert.equal(intent!.event.criticality, "HIGH");

  const blocked = await orchestrateGuardrail({
    message: "CEO 면접 일정 취소해줘",
    referenceDate: "2026-05-29",
    existingSchedule: {
      tasks: [{ time: "14:00", task: "CEO 면접" }],
    },
  });
  assert.ok(blocked);
  assert.equal(blocked!.guardrail?.decision, "NEGOTIATE_WITH_EMPATHY");
  assert.ok(blocked!.guardrail!.risk_score >= 80);
  assert.ok(blocked!.guardrail!.options.length >= 2);
  assert.match(blocked!.guardrail!.message_to_user, /당황|마음|어떠세요/u);
  assert.ok(blocked!.actions.length >= 2);
  assert.equal(blocked!.actionsRevealed, true);
  assert.equal(blocked!.pendingConfirm, true);

  const passThrough = await orchestrateGuardrail({
    message: "조용한 카페 추천해줘",
  });
  assert.equal(passThrough, null);

  const wire = buildRuleBasedGuardrailWire({
    action: "TRANSFER_FUNDS",
    actionDescription: "50만원 송금",
    riskScore: 90,
    eventCriticality: "HIGH",
    eventTitle: "50만원 송금",
  });
  assert.equal(wire.decision, "NEGOTIATE_WITH_EMPATHY");
  assert.ok(wire.options.length >= 2);
  assert.match(wire.message_to_user, /어떠세요/u);

  console.log("test-guardrail-pipeline: ok");
}

void main();
