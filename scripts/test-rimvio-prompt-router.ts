import assert from "node:assert/strict";
import {
  isRimvioPromptUri,
  routeRimvioPromptUri,
} from "@/lib/action-chat/rimvio-prompt-router";

const sent: string[] = [];

function handlers() {
  return {
    sendMessage: (text: string) => {
      sent.push(text);
    },
  };
}

assert.equal(isRimvioPromptUri("rimvio://calendar?title=회의"), true);
assert.equal(isRimvioPromptUri("회의 일정 등록해줘"), false);

sent.length = 0;
assert.equal(
  routeRimvioPromptUri("rimvio://calendar?title=회의", handlers()),
  true,
);
assert.deepEqual(sent, ["회의 일정 등록해줘"]);

sent.length = 0;
assert.equal(routeRimvioPromptUri("rimvio://alarm?title=약속", handlers()), true);
assert.deepEqual(sent, ["약속 알려줘"]);

sent.length = 0;
assert.equal(
  routeRimvioPromptUri("rimvio://navigate?dest=강남역", handlers()),
  true,
);
assert.deepEqual(sent, ["강남역 길찾기"]);

console.log("test-rimvio-prompt-router: ok");
