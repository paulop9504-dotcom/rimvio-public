#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  addResourcePoolItem,
  createResourcePoolRepo,
  listResourcePoolItems,
  listResourcePoolRepos,
  resetResourcePoolForTests,
} from "../lib/resource-pool/resource-pool-store";

resetResourcePoolForTests();

assert.ok(listResourcePoolRepos().some((repo) => repo.id === "memos"));
assert.ok(listResourcePoolRepos().some((repo) => repo.id === "links"));

addResourcePoolItem({
  repoId: "memos",
  kind: "memo",
  title: "테스트 메모",
  body: "리소스풀 본문",
});

const custom = createResourcePoolRepo({ name: "travel" });
addResourcePoolItem({
  repoId: custom.id,
  kind: "link",
  title: "GitHub",
  body: "https://github.com",
  url: "https://github.com",
});

assert.equal(listResourcePoolItems("memos").length, 1);
assert.equal(listResourcePoolItems(custom.id).length, 1);

console.log("test-resource-pool: ok");
