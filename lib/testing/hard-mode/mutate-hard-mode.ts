const WORD_SWAPS: Record<string, string[]> = {
  오늘: ["지금", "오늘", "금요일"],
  점심: ["저녁", "아침", "점심"],
  뭐: ["뭐", "무엇"],
  먹지: ["먹지", "먹어", "먹을까"],
  추천: ["추천", "알려줘", "골라줘"],
  배고픈데: ["배고파", "배고픈데", "허기져"],
  괜찮아: ["괜찮아", "해도돼", "좋아"],
  맛집: ["맛집", "식당", "메뉴"],
  일정: ["일정", "스케줄", "계획"],
};

/** Structure-preserving mutation — swap 1–3 tokens; never stack noise. */
export function mutateHardModeInput(input: string, iteration: number): string {
  const tokens = input.split(/(\s+)/);
  let swapsLeft = 1 + (iteration % 3);
  const mutated = [...tokens];

  for (let index = 0; index < mutated.length && swapsLeft > 0; index++) {
    const token = mutated[index]!;
    if (!token.trim()) continue;
    for (const [key, alternatives] of Object.entries(WORD_SWAPS)) {
      if (token.includes(key)) {
        const alt = alternatives[(iteration + index) % alternatives.length]!;
        mutated[index] = token.replace(key, alt);
        swapsLeft--;
        break;
      }
    }
  }

  const joined = mutated.join("");
  if (joined !== input) {
    return joined;
  }

  const suffixes = [" 혼밥", " 급함", " 근처"];
  return `${input}${suffixes[iteration % suffixes.length]}`;
}
