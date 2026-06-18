import assert from "node:assert/strict";
import {
  buildPeerMessageInsertRow,
  isMissingPeerMessageImageColumnError,
} from "@/lib/peer-chat/peer-message-columns";

const textRow = buildPeerMessageInsertRow({
  threadId: "peer-dm-a__b",
  senderUserId: "user-1",
  body: "hello",
});
assert.equal("image_url" in textRow, false);
assert.equal(textRow.body, "hello");

const imageRow = buildPeerMessageInsertRow({
  threadId: "peer-dm-a__b",
  senderUserId: "user-1",
  body: "",
  imageUrl: "https://example.com/a.jpg",
});
assert.equal(imageRow.image_url, "https://example.com/a.jpg");

assert.equal(
  isMissingPeerMessageImageColumnError(
    "Could not find the 'image_url' column of 'peer_messages' in the schema cache",
  ),
  true,
);

console.log("test-peer-message-columns: ok");
