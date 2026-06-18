import assert from "node:assert/strict";
import {
  commitRegisterAction,
  listCustomTriggers,
  resetCustomTriggerStoreForTests,
} from "../lib/action-os/custom-trigger-store";
import { dockUpdateToMasterWire } from "../lib/action-os/dock-update-to-master-wire";
import {
  interceptActionOsFromMessage,
  interceptActionOsParsed,
  interceptRegisterAction,
  stripThoughtForUser,
} from "../lib/action-os/intercept-action-os";
import {
  parseDockUpdateWire,
  parseNaturalLanguageTrigger,
  parseRegisterActionWire,
} from "../lib/action-os/parse-action-os-wire";
import { parseMasterOrchestratorJson } from "../lib/action-chat/wire-to-actions";
import {
  REGISTER_ACTION_CONFIRM_MESSAGE,
  type RegisterActionWire,
} from "../lib/action-os/types";

resetCustomTriggerStoreForTests();

// REGISTER_ACTION JSON → confirm only, no raw JSON to user
const registerJson = JSON.stringify({
  action: "REGISTER_ACTION",
  trigger_pattern: "회의실 입장",
  action_schema: {
    type: "DEEP_LINK",
    uri: "rimvio://meeting/join",
    label: "회의 참여",
  },
} satisfies RegisterActionWire);

const parsedRegister = parseRegisterActionWire(JSON.parse(registerJson));
assert.ok(parsedRegister);
const registerResult = interceptRegisterAction(parsedRegister!);
assert.equal(registerResult.summary, REGISTER_ACTION_CONFIRM_MESSAGE);
assert.equal(registerResult.actions.length, 0);
assert.equal(registerResult.actionsRevealed, false);

commitRegisterAction(parsedRegister!);
assert.equal(listCustomTriggers().length, 1);
assert.equal(listCustomTriggers()[0]!.trigger_pattern, "회의실 입장");

// parseMasterOrchestratorJson interceptor path
resetCustomTriggerStoreForTests();
const masterRegister = parseMasterOrchestratorJson(registerJson);
assert.ok(masterRegister);
assert.equal(masterRegister!.summary, REGISTER_ACTION_CONFIRM_MESSAGE);
assert.equal(listCustomTriggers().length, 1);

// Natural language trigger fallback
const nl = parseNaturalLanguageTrigger("앞으로 지하철 타면 음악 틀어줘");
assert.ok(nl);
assert.equal(nl!.action, "REGISTER_ACTION");
const nlResult = interceptActionOsFromMessage("앞으로 지하철 타면 음악 틀어줘");
assert.ok(nlResult);
assert.equal(nlResult!.summary, REGISTER_ACTION_CONFIRM_MESSAGE);

// DOCK_UPDATE → main + shadow only (thought internal)
const dockJson = JSON.stringify({
  thought: "사용자에게 보이면 안 되는 내부 추론",
  strategy: "MANUAL_CORE",
  main_action: {
    label: "공항 길찾기",
    execution: { type: "NAVIGATE", uri: "https://maps.example/airport" },
  },
  shadow_actions: [
    {
      label: "항공권 확인",
      execution: { type: "DEEP_LINK", uri: "rimvio://flight/check" },
      lifecycle: "ACTIVE",
    },
  ],
});

const dock = parseDockUpdateWire(JSON.parse(dockJson));
assert.ok(dock);
assert.equal(dock!.thought, "사용자에게 보이면 안 되는 내부 추론");

const dockWire = dockUpdateToMasterWire(dock!);
assert.ok(dockWire.actionOsDock);
assert.equal(dockWire.actionOsDock!.main_action.label, "공항 길찾기");
assert.equal(dockWire.actionOsDock!.shadow_actions.length, 1);
assert.ok(!("thought" in dockWire) || dockWire.thought === undefined);

const dockIntercept = interceptActionOsParsed(JSON.parse(dockJson));
assert.ok(dockIntercept && "actionOsDock" in dockIntercept);

// stripThoughtForUser — UI layer only
const stripped = stripThoughtForUser({
  summary: "hello",
  thought: "hidden",
  confirmation: { thought: "also hidden", meta: { intent: "ACTION" } },
});
assert.equal(stripped.thought, undefined);
assert.equal(stripped.confirmation?.thought, undefined);
assert.equal(stripped.summary, "hello");

console.log("test-action-os-interceptor: ok");
