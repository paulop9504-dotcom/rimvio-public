import assert from "node:assert/strict";
import {
  resolveClientLinkTitle,
  shouldTrustClientTitle,
} from "../lib/share/trusted-link-title";
import { dropMismatchedOpenActions } from "../lib/feed/action-title-guard";

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ok ${name}`);
  } catch (error) {
    console.error(`  fail ${name}`);
    throw error;
  }
}

console.log("share title trust");

test("joongna share title is not trusted", () => {
  const url = "https://web.joongna.com/product/229008840";
  const stale = "(1주 사용) 아이패드 에어 11 M4 128g + 애플펜슬프로";
  assert.equal(shouldTrustClientTitle(url, stale), false);
  assert.equal(
    resolveClientLinkTitle(url, stale, "web.joongna.com"),
    "web.joongna.com"
  );
});

test("blog share title stays trusted", () => {
  const url = "https://example.com/post/1";
  const title = "My blog post";
  assert.equal(shouldTrustClientTitle(url, title), true);
  assert.equal(resolveClientLinkTitle(url, title, "example.com"), title);
});

test("mismatched open chip is dropped", () => {
  const actions = dropMismatchedOpenActions(
    [
      {
        id: "bad",
        label: "🔗 (1주 사용) 아이패드 에어 11… 열기",
        kind: "open",
        href: "https://web.joongna.com/product/229008840",
        payload: {
          copyText: "(1주 사용) 아이패드 에어 11 M4 128g + 애플펜슬프로",
        },
      },
      {
        id: "good",
        label: "🛒 중고나라에서 보기",
        kind: "open",
        href: "https://web.joongna.com/product/229008840",
      },
    ],
    "아이패드프로 11인치 매직키보드 한글판 240,000원"
  );

  assert.equal(actions.length, 1);
  assert.equal(actions[0]?.id, "good");
});

console.log("share title trust 3/3");
