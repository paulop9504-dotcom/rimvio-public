#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resetKnowledgeEntityMemoryForTests } from "../lib/knowledge/knowledge-entity-db";
import { resetStreamStoreForTests } from "../lib/data-architect/persist-stream-record";
import { resetArchitectContainerMemoryForTests } from "../lib/data-architect/list-existing-containers";
import { autoFileLink, classifyLink } from "../lib/data-architect/auto-classify-link";
import type { LinkRow } from "../types/database";

resetKnowledgeEntityMemoryForTests();
resetStreamStoreForTests();
resetArchitectContainerMemoryForTests();

function link(partial: Partial<LinkRow> & Pick<LinkRow, "id" | "title">): LinkRow {
  return {
    user_id: null,
    original_url: "https://example.com",
    thumbnail_url: null,
    domain: "example.com",
    category: null,
    actions: [],
    ...partial,
  } as LinkRow;
}

async function main() {
  const typhoon = classifyLink(
    link({
      id: "l-typhoon",
      title: "제6호 태풍 장미 북상…",
      original_url: "https://news.example.com/typhoon",
      domain: "news.example.com",
    })
  );
  assert.equal(typhoon.action, "APPEND");
  assert.equal(typhoon.container_id, "news_briefing");

  const pokemon = classifyLink(
    link({
      id: "l-pokemon",
      title: "포켓몬카드 일본 구매 후기",
      original_url: "https://shop.example.com/pokemon",
    })
  );
  assert.equal(pokemon.action, "CREATE_NEW");

  const filed = await autoFileLink(
    link({
      id: "l-typhoon-file",
      title: "제6호 태풍 속보",
      original_url: "https://news.example.com/typhoon-6",
      domain: "news.example.com",
    })
  );
  assert.equal(filed.filed, true);
  assert.equal(filed.entity.topicContainerId, "news_briefing");

  console.log("test-auto-classify-link: ok");
}

void main();
