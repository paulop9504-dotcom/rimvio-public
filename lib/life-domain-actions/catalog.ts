import type { LifeDomainCatalogEntry, LifeDomainKey } from "@/lib/life-domain-actions/types";

function action(
  domain: LifeDomainKey,
  index: number,
  label: string,
  plugin: string,
  tier: "MAIN" | "AUX",
  icon: string,
) {
  return {
    id: `${domain}:${index}`,
    label,
    plugin,
    tier,
    icon,
  };
}

export const LIFE_DOMAIN_CATALOG: LifeDomainCatalogEntry[] = [
  {
    key: "study",
    label: "Study",
    subtitle: "학습 및 연구",
    emoji: "📚",
    actions: [
      action("study", 0, "집중 모드 및 타이머 시작", "study.focus_timer", "MAIN", "⏱️"),
      action("study", 1, "오늘의 목표 진도율 확인", "study.progress", "MAIN", "📈"),
      action("study", 2, "관련 학습 자료 및 논문 열기", "study.materials", "AUX", "📄"),
      action("study", 3, "어제 작성한 오답 노트 복습", "study.wrongnotes", "AUX", "📝"),
      action("study", 4, "모르는 개념 AI에게 질문하기", "chat.followup", "AUX", "💬"),
      action("study", 5, "스터디 그룹 채팅방 입장", "study.group", "AUX", "👥"),
      action("study", 6, "온라인 강의 이어보기", "study.lecture", "AUX", "▶️"),
      action("study", 7, "도서관/스터디카페 좌석 예약", "study.seat", "AUX", "🪑"),
      action("study", 8, "학습 리포트 및 통계 확인", "study.report", "AUX", "📊"),
      action("study", 9, "다음 시험 일정 및 디데이 확인", "study.exam", "AUX", "📅"),
    ],
  },
  {
    key: "work",
    label: "Work",
    subtitle: "업무 및 생산성",
    emoji: "💼",
    actions: [
      action("work", 0, "오늘의 핵심 업무 브리핑 요약", "work.briefing", "MAIN", "📋"),
      action("work", 1, "예정된 화상 미팅 링크 접속", "zoom.join", "MAIN", "🎥"),
      action("work", 2, "최근 미확인 이메일 요약 보기", "work.email", "AUX", "✉️"),
      action("work", 3, "이전 미팅 회의록 불러오기", "work.minutes", "AUX", "🗂️"),
      action("work", 4, "프로젝트 칸반 보드 확인", "work.kanban", "AUX", "📌"),
      action("work", 5, "팀원에게 업무 리마인드 전송", "work.remind", "AUX", "🔔"),
      action("work", 6, "보고서 및 기획서 템플릿 열기", "file.open", "AUX", "📎"),
      action("work", 7, "업무 시간 트래킹 시작", "work.timetrack", "AUX", "⏰"),
      action("work", 8, "새로운 명함 및 연락처 등록", "card.qr", "AUX", "🪪"),
      action("work", 9, "퇴근 및 오프라인 모드 전환", "work.offline", "AUX", "🌙"),
    ],
  },
  {
    key: "travel",
    label: "Travel",
    subtitle: "여행 및 이동",
    emoji: "✈️",
    actions: [
      action("travel", 0, "항공권 및 교통편 바코드 열기", "ticket.view", "MAIN", "🎫"),
      action("travel", 1, "숙소 예약 확인 및 길안내 세팅", "navigation", "MAIN", "🏨"),
      action("travel", 2, "현재 위치 기준 길찾기 실행", "navigation", "AUX", "🧭"),
      action("travel", 3, "현지 날씨 및 추천 옷차림 확인", "weather.check", "AUX", "🌤️"),
      action("travel", 4, "실시간 음성 및 텍스트 번역기", "translate.live", "AUX", "🗣️"),
      action("travel", 5, "실시간 환율 계산 및 간편 결제", "finance.fx", "AUX", "💱"),
      action("travel", 6, "주변 맛집 및 랜드마크 추천", "dining.nearby", "AUX", "🍽️"),
      action("travel", 7, "렌터카 및 액티비티 바우처 열기", "travel.voucher", "AUX", "🚗"),
      action("travel", 8, "여행자 보험 확인 및 청구 안내", "travel.insurance", "AUX", "🛡️"),
      action("travel", 9, "오늘의 여행 동선 및 일정표 확인", "calendar.view", "AUX", "🗺️"),
    ],
  },
  {
    key: "health",
    label: "Health",
    subtitle: "건강 및 운동",
    emoji: "💪",
    actions: [
      action("health", 0, "오늘의 식단 및 칼로리 기록", "health.meal", "MAIN", "🥗"),
      action("health", 1, "개인 맞춤형 운동 루틴 시작", "gym.routine", "MAIN", "🏋️"),
      action("health", 2, "영양제 및 약 복용 체크 완료", "health.medicine", "AUX", "💊"),
      action("health", 3, "어젯밤 수면 분석 결과 확인", "health.sleep", "AUX", "😴"),
      action("health", 4, "일일 수분 섭취량 기록", "health.water", "AUX", "💧"),
      action("health", 5, "스트레칭 및 명상 가이드 재생", "health.meditation", "AUX", "🧘"),
      action("health", 6, "최근 진료 기록 및 처방전 열기", "health.records", "AUX", "🏥"),
      action("health", 7, "러닝 및 걷기 트래커 실행", "health.tracker", "AUX", "👟"),
      action("health", 8, "건강검진 결과 리포트 확인", "health.checkup", "AUX", "📋"),
      action("health", 9, "컨디션 및 신체 변화 기록", "health.journal", "AUX", "📓"),
    ],
  },
  {
    key: "finance",
    label: "Finance",
    subtitle: "금융 및 자산",
    emoji: "💰",
    actions: [
      action("finance", 0, "오늘의 지출 내역 및 잔액 확인", "finance.balance", "MAIN", "💳"),
      action("finance", 1, "이번 달 예산 대비 소진율 분석", "finance.budget", "MAIN", "📉"),
      action("finance", 2, "신용카드 결제일 및 청구서 확인", "finance.card", "AUX", "🧾"),
      action("finance", 3, "자주 쓰는 계좌로 간편 송금", "finance.transfer", "AUX", "💸"),
      action("finance", 4, "관심 주식 및 암호화폐 시세 확인", "finance.market", "AUX", "📈"),
      action("finance", 5, "정기 구독료 결제 예정 알림", "finance.subscription", "AUX", "🔔"),
      action("finance", 6, "종이 영수증 스캔 및 가계부 입력", "finance.receipt", "AUX", "🧾"),
      action("finance", 7, "실손 보험 청구 서류 자동 접수", "finance.claim", "AUX", "📑"),
      action("finance", 8, "목표 저축액 달성률 확인", "finance.savings", "AUX", "🎯"),
      action("finance", 9, "공과금 및 세금 자동 납부", "finance.bills", "AUX", "🏠"),
    ],
  },
  {
    key: "relationship",
    label: "Relationship",
    subtitle: "관계 및 소통",
    emoji: "💬",
    actions: [
      action("relationship", 0, "다가오는 기념일 및 선물 추천", "relationship.anniversary", "MAIN", "🎁"),
      action("relationship", 1, "모임 장소 투표 및 결과 공유", "relationship.poll", "MAIN", "📍"),
      action("relationship", 2, "미답장 메시지 및 메일 확인", "relationship.unread", "AUX", "📩"),
      action("relationship", 3, "경조사 축의금 및 부조금 송금", "relationship.gift", "AUX", "💐"),
      action("relationship", 4, "최근 나눈 대화 핵심 키워드 요약", "relationship.summary", "AUX", "🗒️"),
      action("relationship", 5, "약속 시간 및 위치 리마인드 전송", "relationship.remind", "AUX", "⏰"),
      action("relationship", 6, "가족 및 연인에게 안부 전화하기", "tel", "AUX", "📞"),
      action("relationship", 7, "모임 더치페이 및 정산 요청", "relationship.split", "AUX", "🧮"),
      action("relationship", 8, "공유 사진첩에 최근 사진 업로드", "relationship.photos", "AUX", "📷"),
      action("relationship", 9, "받은 청첩장 및 모임 초대장 확인", "relationship.invite", "AUX", "💌"),
    ],
  },
  {
    key: "daily_life",
    label: "Daily Life",
    subtitle: "일상생활",
    emoji: "🏠",
    actions: [
      action("daily_life", 0, "오늘의 날씨 및 미세먼지 정보", "daily.weather", "MAIN", "🌦️"),
      action("daily_life", 1, "집 앞 정류장 대중교통 도착 확인", "daily.transit", "MAIN", "🚌"),
      action("daily_life", 2, "자주 시키는 배달 음식 재주문", "daily.delivery", "AUX", "🍱"),
      action("daily_life", 3, "마트 장보기 및 생필품 구매 리스트", "daily.grocery", "AUX", "🛒"),
      action("daily_life", 4, "분리수거 및 쓰레기 배출일 알림", "daily.trash", "AUX", "♻️"),
      action("daily_life", 5, "주문한 배송 상품 위치 조회", "daily.tracking", "AUX", "📦"),
      action("daily_life", 6, "스마트홈 조명 및 가전 제어", "daily.smarthome", "AUX", "💡"),
      action("daily_life", 7, "세탁 및 주기적인 집안일 루틴 체크", "daily.chores", "AUX", "🧺"),
      action("daily_life", 8, "차량 주차 위치 및 상태 확인", "daily.parking", "AUX", "🅿️"),
      action("daily_life", 9, "구독 중인 OTT 추천 콘텐츠 보기", "daily.ott", "AUX", "📺"),
    ],
  },
];

export const LIFE_DOMAIN_BY_KEY = Object.fromEntries(
  LIFE_DOMAIN_CATALOG.map((entry) => [entry.key, entry]),
) as Record<LifeDomainKey, LifeDomainCatalogEntry>;

export function listLifeDomainKeys(): LifeDomainKey[] {
  return LIFE_DOMAIN_CATALOG.map((entry) => entry.key);
}
