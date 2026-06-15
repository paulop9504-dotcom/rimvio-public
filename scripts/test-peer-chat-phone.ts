import assert from "node:assert/strict";
import { normalizeEmail } from "../lib/peer-chat/email";
import { normalizeRimvioId, tryParseRimvioIdContact } from "../lib/peer-chat/rimvio-id";
import { normalizePhoneE164 } from "../lib/peer-chat/phone";
import { buildDmThreadId, isDmThreadId } from "../lib/peer-chat/server-peer-chat";

assert.equal(normalizeEmail("PaulOP9504@gmail.com"), "paulop9504@gmail.com");
assert.equal(normalizeEmail("bad"), null);
assert.equal(normalizeRimvioId("Rimvio_Jihun"), "rimvio_jihun");
assert.equal(normalizeRimvioId("@hello"), "hello");
assert.equal(tryParseRimvioIdContact("rimvio_kim"), "rimvio_kim");
assert.equal(tryParseRimvioIdContact("010-1234-5678"), null);

assert.equal(normalizePhoneE164("010-1234-5678"), "+821012345678");
assert.equal(normalizePhoneE164("+82 10 1234 5678"), "+821012345678");
assert.equal(normalizePhoneE164(""), null);

const a = "11111111-1111-1111-1111-111111111111";
const b = "22222222-2222-2222-2222-222222222222";
const threadId = buildDmThreadId(a, b);
assert.ok(isDmThreadId(threadId));
assert.equal(buildDmThreadId(b, a), threadId);

console.log("test-peer-chat-phone: ok");
