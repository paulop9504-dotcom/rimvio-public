#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { isCommandOsInput, parseCommandInput } from "../lib/command-os/parse-command-input";
import {
  getMentionFeature,
  resolveMentionFeature,
  resolveMentionFeatureContract,
  listMentionFeatures,
} from "../lib/event-kernel/action-contracts/mention-feature-registry";
import {
  isActionFeatureMentionInput,
  parseActionMention,
} from "../lib/event-kernel/action-contracts/parse-action-mention";
import { evaluateContractGate } from "../lib/event-kernel/slot-filling/contract-gated-execution";
import { resolveContractActionFromMessage } from "../lib/event-kernel/slot-filling/resolve-contract-action-from-message";
import { SLIM_MENTION_FEATURE_IDS } from "../lib/inside-out/slim-command-protocol";

assert.equal(isCommandOsInput("@캘린더 14시 병원"), true);
assert.equal(isCommandOsInput("@길찾기 강남역까지"), false);
assert.equal(isActionFeatureMentionInput("@길찾기 강남역까지"), true);

const navigate = parseActionMention("@길찾기 강남역까지");
assert.ok(navigate);
assert.equal(navigate!.feature.featureId, "navigate");

assert.equal(resolveMentionFeature("날씨"), null);

const reminder = parseActionMention("@알림 30분 뒤");
assert.ok(reminder);
assert.equal(reminder!.feature.featureId, "reminder");

const contract = resolveMentionFeatureContract("길찾기");
assert.ok(contract);
assert.equal(contract!.requiredSlots.length, 1);

assert.equal(resolveMentionFeature("navigate")?.featureId, "navigate");
assert.equal(getMentionFeature("meal")?.displayName, "맛집");

const missingDestination = evaluateContractGate("@길찾기 여기");
assert.equal(missingDestination.state, "MISSING_SLOT");

assert.equal(parseCommandInput("@캘린더 14시")?.command, "캘린더");

assert.equal(listMentionFeatures().length, SLIM_MENTION_FEATURE_IDS.length);

console.log("test-mention-registry: ok");
