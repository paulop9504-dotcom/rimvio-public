import assert from "node:assert/strict";
import {
  buildDutchPaySummary,
  parseMentionTransferQuery,
  parseTransferProvider,
} from "../lib/action-chat/mention-transfer/parse-mention-transfer-query";
import {
  buildTransferDeeplink,
  buildInlineChatTransferWire,
} from "../lib/action-chat/mention-transfer/inline-chat-transfer";
import {
  isMentionTransferInput,
  tryBuildMentionTransferTurn,
} from "../lib/action-chat/mention-transfer/commit-mention-transfer-turn";

assert.ok(isMentionTransferInput("@송금 5만원"));
assert.equal(parseTransferProvider("카카오페이 3만원"), "kakaopay");

const parsed = parseMentionTransferQuery("45000원 4명 저녁");
assert.equal(parsed.amountWon, 45000);
assert.equal(parsed.headcount, 4);
assert.ok(parsed.dutchSummary);
assert.equal(parsed.dutchSummary!.perPersonWon, 11250);

const dutch = buildDutchPaySummary({ totalWon: 30000, headcount: 3, memo: "점심" });
assert.equal(dutch.perPersonWon, 10000);

const tossLink = buildTransferDeeplink("toss", 50000);
assert.match(tossLink.main, /supertoss:\/\//);

const kakaoLink = buildTransferDeeplink("kakaopay", 50000);
assert.match(kakaoLink.main, /kakaopay|kakaotalk/i);

const wire = buildInlineChatTransferWire({
  amountWon: 50000,
  provider: "toss",
  mainLabel: "토스 5만원",
  dutchSummary: null,
});
assert.equal(wire.auxActions[0]!.id, "dutch");

const turn = tryBuildMentionTransferTurn({ text: "@송금 5만원 4명 저녁" });
assert.ok(turn);
assert.ok(turn![1]!.inlineChatTransfer);
assert.match(turn![1]!.inlineChatTransfer!.mainDeeplink, /supertoss:\/\//);

console.log("test-mention-transfer: ok");
