#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  buildMentionRegistryIngressReport,
  findMentionRegistryGaps,
} from "../lib/event-kernel/action-contracts/mention-registry-ingress";
import { parseActionMention } from "../lib/event-kernel/action-contracts/parse-action-mention";
import { listMentionFeatures } from "../lib/event-kernel/action-contracts/mention-feature-registry";

const report = buildMentionRegistryIngressReport();
assert.equal(report.length, listMentionFeatures().length);

for (const feature of listMentionFeatures()) {
  const token = feature.aliases[0];
  assert.ok(token, `${feature.featureId} needs alias`);
  const parsed = parseActionMention(`@${token} 테스트`);
  assert.ok(parsed, `@${token} should parse`);
  assert.equal(parsed!.feature.featureId, feature.featureId);
  assert.equal(parsed!.contextKey, `event.${feature.category}.${feature.sourceRef}`);
}

const peerTalk = parseActionMention("@톡 monica");
assert.equal(peerTalk?.feature.featureId, "peer_talk");

const gaps = findMentionRegistryGaps();
assert.equal(gaps.length, 0, gaps.join("; "));

console.log(`test-mention-registry-spine: ok (${report.length} features)`);
