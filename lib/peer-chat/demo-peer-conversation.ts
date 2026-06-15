import type { PeerMessage } from "@/lib/context/peer-message-types";

export const DEMO_PEER_THREAD_ID = "rimvio-demo-peer-preview";

/** 읽기 전용 예시 DM — 허브·온보딩 미리보기용 */
export const DEMO_PEER_MESSAGES: readonly PeerMessage[] = [
  {
    id: "demo-1",
    peerThreadId: DEMO_PEER_THREAD_ID,
    author: "peer",
    body: "이번주 금요일 7시에 CGV 보자",
    sentAt: "2026-06-01T10:00:00.000Z",
    messageType: "human",
  },
  {
    id: "demo-2",
    peerThreadId: DEMO_PEER_THREAD_ID,
    author: "me",
    body: "좋아!",
    sentAt: "2026-06-01T10:01:00.000Z",
    messageType: "human",
  },
  {
    id: "demo-3",
    peerThreadId: DEMO_PEER_THREAD_ID,
    author: "peer",
    body: "끝나고 둔산동 멕시카나 갈래?",
    sentAt: "2026-06-01T10:02:00.000Z",
    messageType: "human",
  },
] as const;

/** 렌즈·날짜 파싱 데모용 기준일 (수요일) */
export const DEMO_LENS_REFERENCE_DATE = new Date(2026, 5, 4);
