#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { lookupKnownEntity } from "../lib/event-kernel/entity/known-entity-catalog";
import {
  buildEntityActionSurface,
  guessEntityType,
} from "../lib/event-kernel/entity/entity-action-surface";

const apple = lookupKnownEntity("애플");
assert.equal(apple?.entityType, "COMPANY");

const cola = lookupKnownEntity("코카콜라");
assert.equal(cola?.entityType, "COMPANY");

const appleSurface = buildEntityActionSurface("애플");
assert.ok(appleSurface);
assert.equal(appleSurface!.entityType, "COMPANY");
assert.ok(
  appleSurface!.suggestions.some((item) => /뉴스|제품|채용/.test(item.label)),
  "company facets for 애플"
);
assert.match(appleSurface!.lead, /뉴스|제품|채용/);

const colaSurface = buildEntityActionSurface("코카콜라");
assert.equal(guessEntityType("Apple").entityType, "COMPANY");
assert.equal(colaSurface!.entityType, "COMPANY");

console.log("test-known-entity-catalog: ok");
