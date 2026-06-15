#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  PIN_DOMAIN_SHIP_PHASE,
  getPinDomain,
  resolveActivePinDomainId,
  resolveActivePinScope,
} from "../lib/globe/pin-domain-registry";
import { classifyPinDomainFromText } from "../lib/globe/classify-pin-domain";

assert.equal(PIN_DOMAIN_SHIP_PHASE, 3);

assert.equal(resolveActivePinDomainId("market"), "experience");
assert.equal(resolveActivePinDomainId("gathering"), "gathering");
assert.equal(resolveActivePinScope("external"), "external");
assert.equal(resolveActivePinScope("external", 1), "internal");

assert.equal(getPinDomain("gathering").phase, "active");
assert.equal(getPinDomain("gathering").activatesAtPhase, 3);
assert.equal(getPinDomain("market").activatesAtPhase, 4);
assert.equal(getPinDomain("job").activatesAtPhase, 5);

const gathering = classifyPinDomainFromText("번개 모임 같이 가요");
assert.equal(gathering.inferredDomainId, null);
assert.equal(gathering.domainId, "gathering");

const travel = classifyPinDomainFromText("제주 여행 일정");
assert.equal(travel.inferredDomainId, null);
assert.equal(travel.domainId, "experience");
assert.ok(travel.slots.summary);

console.log("test-pin-domain-phases: ok");
