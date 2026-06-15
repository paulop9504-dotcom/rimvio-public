import assert from "node:assert/strict";
import { actionIntentToMasterWire } from "../lib/action-dispatcher/action-intent-to-master-wire";
import {
  dispatchAction,
  dispatchActionById,
} from "../lib/action-dispatcher/dispatch-action";
import { parseActionIntentWire } from "../lib/action-dispatcher/parse-action-intent-wire";
import { dockUpdateToMasterWire } from "../lib/action-os/dock-update-to-master-wire";
import { parseDockUpdateWire } from "../lib/action-os/parse-action-os-wire";
import { interceptActionOsParsed } from "../lib/action-os/intercept-action-os";
import { parseMasterOrchestratorJson } from "../lib/action-chat/wire-to-actions";

// TAXI_CALL → backend builds URL (LLM never emits kakaot://)
const taxi = dispatchAction({
  action_id: "TAXI_CALL",
  params: { dest: "인천공항" },
  fallback_url: "https://map.naver.com",
  thought: "Taxi to airport",
});
assert.equal(taxi.type, "EXECUTE");
assert.match(taxi.url, /kakaot:\/\/call\?dest=/);
assert.match(taxi.url, /%EC%9D%B8%EC%B2%9C%EA%B3%B5%ED%95%AD/);

const unknown = dispatchAction({
  action_id: "UNKNOWN",
  params: {},
  fallback_url: "https://example.com/search",
});
assert.equal(unknown.type, "WEB_OPEN");
assert.equal(unknown.url, "https://example.com/search");

// Parse standalone Action Intent JSON
const intentJson = JSON.stringify({
  action_id: "NAVIGATE",
  params: { dest: "인천공항" },
  fallback_url: "https://map.naver.com",
  thought: "Navigate to airport",
});
const parsedIntent = parseActionIntentWire(JSON.parse(intentJson));
assert.ok(parsedIntent);
assert.equal(parsedIntent!.action_id, "NAVIGATE");

const masterFromIntent = actionIntentToMasterWire(parsedIntent!);
assert.ok(masterFromIntent.actions?.[0]?.url);
assert.match(masterFromIntent.actions![0]!.url!, /kakaomap:\/\/search/);

// DOCK_UPDATE with action_id (no raw URI from LLM)
const dockJson = JSON.stringify({
  thought: "Airport trip",
  strategy: "MANUAL_CORE",
  main_action: {
    label: "택시 호출",
    execution: { action_id: "TAXI_CALL", params: { dest: "인천공항" } },
  },
  shadow_actions: [
    {
      label: "길찾기",
      execution: { action_id: "NAVIGATE", params: { dest: "인천공항" } },
      lifecycle: "WARM",
    },
  ],
});
const dock = parseDockUpdateWire(JSON.parse(dockJson));
assert.ok(dock);
const dockMaster = dockUpdateToMasterWire(dock!);
assert.match(dockMaster.actions[0]?.url ?? "", /kakaot:\/\/call/);
assert.match(dockMaster.actions[1]?.url ?? "", /kakaomap:\/\/search/);

const intercept = interceptActionOsParsed(JSON.parse(intentJson));
assert.ok(intercept && "actions" in intercept);
assert.match(intercept.actions[0]?.url ?? "", /kakaomap/);

const viaMasterParser = parseMasterOrchestratorJson(intentJson);
assert.ok(viaMasterParser);
assert.match(viaMasterParser!.actions[0]?.url ?? "", /kakaomap/);

// REGISTER_ACTION with ACTION_ID schema
const registerJson = JSON.stringify({
  action: "REGISTER_ACTION",
  trigger_pattern: "회의실 입장",
  action_schema: {
    type: "ACTION_ID",
    action_id: "TAXI_CALL",
    label: "택시 호출",
  },
});
const registerIntercept = interceptActionOsParsed(JSON.parse(registerJson));
assert.ok(registerIntercept);
assert.equal((registerIntercept as { summary?: string }).summary, "설정이 완료되었습니다");

console.log("test-action-dispatcher: ok");
