/**
 * ROOM / @톡 수동 테스트용 문구 모음.
 * 렌즈 버블은 친구(peer) 말풍선 아래에만 붙습니다 — 아래 peer 문구를 친구가 보낸 것처럼 테스트하세요.
 */

export type LensRoomPhraseTurn = {
  author: "peer" | "me";
  body: string;
};

export type LensRoomTestPhrase = {
  id: string;
  category: string;
  /** ROOM에서 누가 입력할지 */
  who: "친구가 보냄" | "내가 보냄" | "2턴 대화";
  /** 한 줄로 복사 */
  copyLine: string;
  /** 다턴이면 순서대로 */
  turns?: LensRoomPhraseTurn[];
  /** 기대 버블 (없으면 렌즈 안 뜸) */
  expect: Array<
    "일정 등록" | "영화 일정" | "길찾기" | "송금" | "열기" | "리소스 저장" | "없음"
  >;
  memo?: string;
};

/** 수동 테스트 — 카테고리별 복사용 한 줄 (친구가 보낼 때 버블 뜸) */
export const PEER_LENS_QUICK_COPY: Record<string, string[]> = {
  "📅 일정 — 날짜+시간": [
    "이번주 금요일 7시에 보자",
    "내일 오후 3시에 만나",
    "모레 점심 12시에 밥 먹자",
    "토요일 저녁 8시에 약속 잡자",
    "6월 10일 2시에 회의 있어",
    "다음주 월요일 아침 9시에 보자",
    "일요일 브런치 11시 어때?",
    "금요일 퇴근하고 7시에 만나자",
  ],
  "📅 일정 — 장소+시간": [
    "7시에 치킨집에서 보자",
    "오늘 저녁 7시 둔산동 멕시카나 가자",
    "내일 1시 스타벅스에서 만나",
    "토요일 6시 갤러리아 식당 예약했어",
    "일요일 11시 병원 가기로 했어",
    "금요일 7시에 치킨 시켜서 집에서 보자",
  ],
  "📅 일정 — 날짜만 (시간 없음)": [
    "이번주 금요일에 보자",
    "내일 만나",
    "다음주 수요일 약속 잡자",
    "6월 15일에 모이자",
  ],
  "🎟 영화": [
    "이번주 금요일 7시에 CGV 보자",
    "토요일 메가박스에서 영화 볼래?",
    "내일 롯데시네마 8시 상영 어때",
    "금요일 저녁 CGV에서 영화 약속",
  ],
  "🧭 길찾기": [
    "둔산동 멕시카나 갈래?",
    "갤러리아역 스타벅스로 와",
    "역삼동 맛집 알아?",
    "홍대 카페 거기로 가자",
    "이마트 앞에서 만나",
  ],
  "📅+🧭 일정+길찾기 동시": [
    "이번주 금요일 7시 둔산동 멕시카나에서 보자",
    "내일 3시 강남역 CGV 앞에서 만나",
    "토요일 점심 12시 병원 근처 카페",
  ],
  "💸 송금": [
    "3만원 송금해줘",
    "내 계좌로 보내줘",
    "이체 좀 해줘",
    "입금 부탁해",
  ],
  "📎 링크": [
    "이거 봐 https://example.com/menu",
    "문서 확인해줘 https://notion.so/test",
    "여기 예약 링크 https://booking.naver.com/test",
  ],
  "🗓 계획형 (확인 시트 피드 체크)": [
    "수능 공부 루틴 이번 달부터 짜보자",
    "3개월 안에 다이어트 목표 세우자",
    "여행 준비 체크리스트 같이 만들자",
    "이직 준비 타임라인 짜볼래?",
  ],
  "❌ 버블 안 뜸 (참고)": [
    "ㅋㅋㅋ",
    "아무거나 막 써바",
    "기모띠",
    "ㅎㅇ",
    "뭐해",
  ],
  "✅ 내 말풍선에도 버블 (렌즈 ON)": [
    "이번주 금요일 7시에 보자",
    "내일 1시 스타벅스에서 만나",
    "둔산동 멕시카나 갈래?",
  ],
};

/** 자동 검증용 — peer / multi-turn 시나리오 */
export const PEER_LENS_TEST_SCENARIOS: LensRoomTestPhrase[] = [
  {
    id: "sched-fri-7pm",
    category: "일정",
    who: "친구가 보냄",
    copyLine: "이번주 금요일 7시에 보자",
    turns: [{ author: "peer", body: "이번주 금요일 7시에 보자" }],
    expect: ["일정 등록"],
    memo: "골든 — 날짜+시간+보자",
  },
  {
    id: "sched-tomorrow-3pm",
    category: "일정",
    who: "친구가 보냄",
    copyLine: "내일 오후 3시에 만나",
    turns: [{ author: "peer", body: "내일 오후 3시에 만나" }],
    expect: ["일정 등록"],
  },
  {
    id: "sched-chicken-7pm",
    category: "일정",
    who: "친구가 보냄",
    copyLine: "7시에 치킨집에서 보자",
    turns: [{ author: "peer", body: "7시에 치킨집에서 보자" }],
    expect: ["일정 등록", "길찾기"],
  },
  {
    id: "sched-place-datetime",
    category: "일정",
    who: "친구가 보냄",
    copyLine: "이번주 금요일 7시 둔산동 멕시카나에서 보자",
    turns: [
      { author: "peer", body: "이번주 금요일 7시 둔산동 멕시카나에서 보자" },
    ],
    expect: ["일정 등록", "길찾기"],
  },
  {
    id: "sched-date-only",
    category: "일정",
    who: "친구가 보냄",
    copyLine: "이번주 금요일에 보자",
    turns: [{ author: "peer", body: "이번주 금요일에 보자" }],
    expect: ["일정 등록"],
  },
  {
    id: "movie-cgv",
    category: "영화",
    who: "친구가 보냄",
    copyLine: "이번주 금요일 7시에 CGV 보자",
    turns: [{ author: "peer", body: "이번주 금요일 7시에 CGV 보자" }],
    expect: ["영화 일정", "길찾기"],
  },
  {
    id: "nav-only",
    category: "길찾기",
    who: "친구가 보냄",
    copyLine: "둔산동 멕시카나 갈래?",
    turns: [{ author: "peer", body: "둔산동 멕시카나 갈래?" }],
    expect: ["길찾기", "일정 등록"],
    memo: "갈래+장소 → 길찾기·일정 둘 다",
  },
  {
    id: "two-turn-place",
    category: "2턴",
    who: "2턴 대화",
    copyLine: "어디? → 둔산동 멕시카나",
    turns: [
      { author: "me", body: "어디 치킨집?" },
      { author: "peer", body: "둔산동 멕시카나" },
    ],
    expect: ["길찾기"],
    memo: "장소는 친구 답장에 버블",
  },
  {
    id: "two-turn-sched",
    category: "2턴",
    who: "2턴 대화",
    copyLine: "언제? → 금요일 7시 보자",
    turns: [
      { author: "me", body: "언제 만날까?" },
      { author: "peer", body: "이번주 금요일 7시에 보자" },
    ],
    expect: ["일정 등록"],
  },
  {
    id: "transfer",
    category: "송금",
    who: "친구가 보냄",
    copyLine: "3만원 송금해줘",
    turns: [{ author: "peer", body: "3만원 송금해줘" }],
    expect: ["송금"],
  },
  {
    id: "link",
    category: "링크",
    who: "친구가 보냄",
    copyLine: "https://example.com/doc",
    turns: [
      { author: "peer", body: "이 문서 확인해줘 https://example.com/doc" },
    ],
    expect: ["리소스 저장", "열기"],
  },
  {
    id: "plan-feed",
    category: "계획",
    who: "친구가 보냄",
    copyLine: "수능 공부 루틴 이번 달부터 짜보자",
    turns: [{ author: "peer", body: "수능 공부 루틴 이번 달부터 짜보자" }],
    expect: ["일정 등록"],
    memo: "확인 시트에서 피드 체크 제안",
  },
  {
    id: "no-lens-1",
    category: "없음",
    who: "친구가 보냄",
    copyLine: "ㅋㅋㅋ",
    turns: [{ author: "peer", body: "ㅋㅋㅋ" }],
    expect: ["없음"],
  },
  {
    id: "me-only-schedule",
    category: "내 말풍선",
    who: "내가 보냄",
    copyLine: "이번주 금요일 7시에 보자",
    turns: [{ author: "me", body: "이번주 금요일 7시에 보자" }],
    expect: ["일정 등록"],
    memo: "검색 @톡·ROOM — 내 노란 말풍선 아래에도 버블",
  },
];

const ACTION_LABEL: Record<string, string> = {
  schedule: "일정 등록",
  movie_schedule: "영화 일정",
  navigate: "길찾기",
  transfer: "송금",
  open_link: "열기",
  save_resource: "리소스 저장",
};

export function lensCandidateLabels(
  actionTypes: readonly { actionType: string; label: string }[],
): string[] {
  return actionTypes.map(
    (c) => ACTION_LABEL[c.actionType] ?? c.label.replace(/^[^\p{L}\p{N}]+/u, "").trim(),
  );
}
