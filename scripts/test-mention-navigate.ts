import assert from "node:assert/strict";
import {
  buildMentionNavigateWire,
  isMentionNavigateInput,
  parseMentionNavigateInput,
  resolveMentionNavigateDestination,
  tryBuildMentionNavigateTurn,
} from "../lib/action-chat/mention-navigate/commit-mention-navigate-turn";

assert.ok(isMentionNavigateInput("@네비 강남역"));
assert.ok(isMentionNavigateInput("@길찾기 수서역까지"));
assert.equal(parseMentionNavigateInput("@네비")?.query, "");
assert.equal(resolveMentionNavigateDestination("강남역까지"), "강남역");

const wire = buildMentionNavigateWire("강남역");
assert.match(wire.mainDeeplink, /kakaomap|map\.kakao/i);
assert.equal(wire.auxActions.length, 2);
assert.equal(wire.auxActions[0]!.icon, "N");
assert.equal(wire.auxActions[1]!.icon, "T");

const turn = tryBuildMentionNavigateTurn({ text: "@네비 서울역" });
assert.ok(turn);
assert.ok(turn![1]!.inlineChatNavigate);
assert.equal(turn![1]!.inlineChatNavigate!.destination, "서울역");

const bare = tryBuildMentionNavigateTurn({ text: "@네비" });
assert.ok(bare);
assert.equal(bare![1]!.text.includes("어디로"), true);

console.log("test-mention-navigate: ok");
