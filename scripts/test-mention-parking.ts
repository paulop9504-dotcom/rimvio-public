import assert from "node:assert/strict";
import {
  parseMentionParkingInput,
  tryBuildMentionParkingTurn,
} from "../lib/action-chat/mention-parking/commit-mention-parking-turn";
import {
  isParkingPhotoCapturePending,
  armParkingPhotoCapture,
  consumeParkingPhotoCapture,
} from "../lib/local-parking/parking-photo-session";
import {
  readParkingRecords,
  resetParkingRecordsForTests,
  saveParkingRecord,
} from "../lib/local-parking/parking-records";

resetParkingRecordsForTests();

assert.deepEqual(parseMentionParkingInput("@주차_"), { kind: "photo" });
assert.deepEqual(parseMentionParkingInput("@주차"), { kind: "photo" });
assert.deepEqual(parseMentionParkingInput("@주차 B2 123"), {
  kind: "record",
  location: "B2 123",
});

const photoTurn = tryBuildMentionParkingTurn({ text: "@주차_" });
assert.ok(photoTurn);
assert.equal(photoTurn![1]!.inlineChatParking?.mode, "photo_request");
assert.equal(photoTurn![1]!.inlineChatParking?.summaryLine, "사진을 찍어주세요");
assert.ok(isParkingPhotoCapturePending());
consumeParkingPhotoCapture();

const recordTurn = tryBuildMentionParkingTurn({ text: "@주차 강남역 B2" });
assert.ok(recordTurn);
assert.equal(recordTurn![1]!.inlineChatParking?.mode, "saved");
assert.equal(recordTurn![1]!.inlineChatParking?.summaryLine, "기록되었습니다");
assert.equal(recordTurn![1]!.inlineChatParking?.location, "강남역 B2");

saveParkingRecord({ location: "테스트 주차" });
assert.ok(readParkingRecords().length >= 1);

console.log("test-mention-parking: ok");
