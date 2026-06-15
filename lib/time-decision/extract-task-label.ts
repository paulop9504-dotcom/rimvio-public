const TIME_NOISE =
  /(?:오전|오후|아침|점심|저녁|\d{1,2}\s*시(?:\s*\d{1,2}\s*분)?|\d{1,2}:\d{2}|\d{1,3}\s*분\s*(?:뒤|후)|\d{1,2}\s*시간\s*(?:뒤|후)|(?:\d+|한|일|두|세)\s*(?:일|주|달|개월|년)\s*(?:뒤|후)|(?:한|일)\s*달\s*(?:뒤|후)|(?:다음\s*(?:주|달|해|년)|내년)|내일|모레|오늘|저장하고|타이머(?:도)?|맞춰\s*줘|둘\s*다)/gu;

export function extractTaskLabelFromMessage(message: string): string {
  const cleaned = message
    .replace(TIME_NOISE, " ")
    .replace(/(?:일정|약속|미팅|회의|예약|잡|등록|추가|해\s*줘|해주세요|할게|할\s*거)/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length >= 2) {
    return cleaned.slice(0, 32);
  }

  return "일정";
}
