const PIVOT =
  /^(?:아\s*잠깐(?:만)?|아니다(?:\s*그냥)?|취소(?:해)?(?:\s*줘)?|방금\s*거\s*말고|잠깐(?:만)?|아냐(?:\s*그냥)?)/iu;

export function isMidThoughtPivot(message: string): boolean {
  return PIVOT.test(message.trim());
}

/** Strip pivot prefix so routing uses the new intent only. */
export function stripMidThoughtPivot(message: string): string {
  return message
    .trim()
    .replace(
      /^(?:아\s*잠깐(?:만)?|아니다(?:\s*그냥)?|취소(?:해)?(?:\s*줘)?|방금\s*거\s*말고|잠깐(?:만)?|아냐(?:\s*그냥)?)[\s,.~-]*/iu,
      ""
    )
    .trim();
}
