type ConstraintConflict = {
  left: RegExp;
  right: RegExp;
  question: string;
};

const CONFLICTS: ConstraintConflict[] = [
  {
    left: /(?:가성비|저렴|싸(?:게)?|budget)/iu,
    right: /(?:오마카세|파인\s*다이닝|고급|프리미엄|특별한\s*날)/iu,
    question: "예산과 분위기 중 **어느 쪽**을 더 우선할까요?",
  },
  {
    left: /(?:조용|한적|조용한)/iu,
    right: /(?:홍대|클럽|시끄|번화|웨이팅|줄\s*서|핫플)/iu,
    question: "조용함과 분위기(활기) 중 **어느 쪽**을 더 우선할까요?",
  },
  {
    left: /(?:가까운|근처|walking)/iu,
    right: /(?:유명|웨이팅|줄\s*서|핫플)/iu,
    question: "거리와 유명도 중 **어느 쪽**을 더 우선할까요?",
  },
];

export type ImpossibleConstraintResult = {
  summary: string;
  leftLabel: string;
  rightLabel: string;
};

export function detectImpossibleConstraints(message: string): ImpossibleConstraintResult | null {
  const trimmed = message.trim();
  for (const conflict of CONFLICTS) {
    if (conflict.left.test(trimmed) && conflict.right.test(trimmed)) {
      return {
        summary: `조건이 조금 상충돼요.\n\n${conflict.question}`,
        leftLabel: "왼쪽 조건 우선",
        rightLabel: "오른쪽 조건 우선",
      };
    }
  }

  return null;
}
