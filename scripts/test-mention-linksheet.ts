import assert from "node:assert/strict";
import {
  isMentionLinksheetInput,
  parseMentionLinksheetInput,
  tryBuildMentionLinksheetTurn,
} from "../lib/action-chat/mention-linksheet/commit-mention-linksheet-turn";
import { resolveMentionFeature } from "../lib/event-kernel/action-contracts/mention-feature-registry";

const sampleUrl =
  "https://docs.google.com/spreadsheets/d/1abcDEF123/edit#gid=0";

assert.equal(resolveMentionFeature("링크시트")?.featureId, "linksheet");
assert.equal(isMentionLinksheetInput(`@링크시트 ${sampleUrl}`), true);

const parsed = parseMentionLinksheetInput(`@링크시트 ${sampleUrl}`);
assert.ok(parsed);
assert.equal(parsed!.query, sampleUrl);

const missing = tryBuildMentionLinksheetTurn({ text: "@링크시트" });
assert.ok(missing);
assert.equal(missing!.length, 2);
assert.equal(missing![1]!.inlineChatAction?.featureId, "linksheet");
assert.equal(missing![1]!.inlineChatAction?.linksheetUrlPrompt, true);

const turn = tryBuildMentionLinksheetTurn({ text: `@링크시트 ${sampleUrl}` });
assert.ok(turn);
assert.equal(turn!.length, 2);
assert.match(turn![1]!.text, /저장/u);

const bad = tryBuildMentionLinksheetTurn({ text: "@링크시트 https://example.com" });
assert.ok(bad);
assert.match(bad![1]!.text, /Google Sheets/u);

console.log("test-mention-linksheet: ok");
