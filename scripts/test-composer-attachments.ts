import assert from "node:assert/strict";
import {
  buildComposerOrchestrateMessage,
  createLinkAttachment,
  extractUrlsFromText,
} from "../lib/action-chat/composer-attachments";

assert.deepEqual(extractUrlsFromText("https://example.com/a 와 https://b.co"), [
  "https://example.com/a",
  "https://b.co",
]);

const link = createLinkAttachment({ url: "https://example.com/menu" });
assert.equal(link.kind, "link");
assert.equal(link.url, "https://example.com/menu");

assert.equal(
  buildComposerOrchestrateMessage({
    text: "이거랑 같이 봐줘",
    contextBlock: "[첨부1·링크] example.com · https://example.com",
  }),
  "이거랑 같이 봐줘\n\n[첨부 컨텍스트]\n[첨부1·링크] example.com · https://example.com"
);

assert.equal(
  buildComposerOrchestrateMessage({
    text: "",
    contextBlock: "[첨부1·사진] receipt.jpg · OCR: 12,000원",
  }),
  "첨부한 자료를 한 번에 분석해줘.\n\n[첨부1·사진] receipt.jpg · OCR: 12,000원"
);

console.log("composer-attachments: ok");
