#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  classifyContextLink,
  groupContextLinks,
} from "../lib/feed/group-context-links";
import type { LinkRow } from "../types/database";

function link(partial: Partial<LinkRow> & Pick<LinkRow, "id" | "title">): LinkRow {
  return {
    user_id: null,
    original_url: "https://example.com",
    thumbnail_url: null,
    domain: "example.com",
    category: null,
    actions: [],
    created_at: new Date().toISOString(),
    expires_at: null,
    ...partial,
  } as LinkRow;
}

const photo = link({
  id: "p1",
  title: "결제 영수증",
  source_type: "screenshot",
  original_url: "https://rimvio.app/capture/abc",
  domain: "rimvio.app",
});
assert.equal(classifyContextLink(photo), "photo");

const mapLink = link({
  id: "m1",
  title: "카카오맵",
  source_type: "map",
  domain: "map.kakao.com",
  original_url: "https://map.kakao.com/link/123",
});
assert.equal(classifyContextLink(mapLink), "map");

const news = link({
  id: "n1",
  title: "[속보] 수서역",
  domain: "news.example.com",
  category: "news",
});
assert.equal(classifyContextLink(news), "article");

const delivery = link({
  id: "d1",
  title: "배달의민족",
  domain: "baemin.com",
  source_type: "commerce",
});
assert.equal(classifyContextLink(delivery), "commerce");

const groups = groupContextLinks([photo, mapLink, news, delivery, link({ id: "l1", title: "factcheck" })]);
assert.ok(groups.length >= 4);
assert.equal(groups[0]?.kind, "photo");
assert.equal(groups.find((group) => group.kind === "map")?.links.length, 1);
assert.ok(groups.some((group) => group.kind === "link" || group.kind === "article"));

console.log("test-group-context-links: ok");
