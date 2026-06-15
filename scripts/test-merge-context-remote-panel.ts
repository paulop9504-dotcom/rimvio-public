import assert from "node:assert/strict";
import { mergeFeedPanelWithRemote } from "../lib/feed/merge-context-remote-panel";
import type { LinkActionItem } from "../types/database";

const focused: LinkActionItem = {
  id: "map",
  label: "지도",
  kind: "open",
  href: "https://map.naver.com",
};

const secondary: LinkActionItem[] = [
  {
    id: "summary",
    label: "3줄 요약/핵심어",
    kind: "open",
    href: "#summary",
  },
  {
    id: "audio",
    label: "오디오로 듣기",
    kind: "open",
    href: "#audio",
  },
];

const remotePrimary: LinkActionItem = {
  id: "kakao-t",
  label: "카카오T 호출",
  kind: "open",
  href: "kakaot://",
};

const merged = mergeFeedPanelWithRemote({
  remote: {
    visible: true,
    expanded: true,
    confidence: 0.9,
    packId: "mobility",
    signalLine: "📍 네이버 · 뉴스 · 메일 · 지도 · 쇼핑 — 이동·지도 액션 준비",
    primary: remotePrimary,
    secondary: [
      {
        id: "naver-map",
        label: "네이버 지도 길찾기",
        kind: "open",
        href: "https://map.naver.com",
      },
    ],
  },
  isActive: true,
  cardSignal: "네이버 지도에서 열기",
  focused,
  secondary,
});

assert.equal(
  merged.signalLine,
  "📍 네이버 · 뉴스 · 메일 · 지도 · 쇼핑 — 이동·지도 액션 준비"
);
assert.equal(merged.secondary.length, 1);
assert.equal(merged.secondary[0]?.id, "kakao-t");
assert.ok(merged.remoteActionIds.has("kakao-t"));

const inactive = mergeFeedPanelWithRemote({
  remote: {
    visible: true,
    expanded: true,
    confidence: 0.9,
    packId: "mobility",
    signalLine: "remote only",
    primary: remotePrimary,
    secondary: [],
  },
  isActive: false,
  cardSignal: "link signal",
  focused,
  secondary,
});

assert.equal(inactive.signalLine, "link signal");
assert.equal(inactive.secondary[0]?.id, "summary");

console.log("merge-context-remote-panel: ok");
