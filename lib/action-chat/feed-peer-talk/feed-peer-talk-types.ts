import type { PeerMessage } from "@/lib/context/peer-message-types";

export const FEED_PEER_TALK_HISTORY_LINES = 20;

/** 피드 인라인 톡 스레드 — ROOM 과 동일 메시지 로그, 별도 composer 없음 */
export type FeedPeerTalkThreadWire = {
  peerThreadId: string;
  displayName: string;
  messages: PeerMessage[];
  /** 이전 대화 구간 끝 인덱스(포함) — 그 아래에 prompt 구분선 */
  historyEndIndex: number;
  promptLine: string;
  hydrating?: boolean;
  /** 상대가 마지막으로 읽은 시각 — 발신 체크 표시용 */
  peerLastReadAt?: string | null;
  /** @대화끝 후 — 히스토리만 남기고 composer 는 AI 피드 */
  closed?: boolean;
};

export type FeedPeerTalkSession = {
  peerThreadId: string;
  displayName: string;
};
