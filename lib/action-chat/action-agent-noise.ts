const INSTRUCTION_NOISE =
  /(?:테스트|추출해\s*줘|알려\s*줘|정리해\s*줘|해\s*줘|부탁|확인해\s*줘|좀\s*해\s*줘)[.!?\s]*$/gim;

const CHATTER_PREFIX =
  /^(?:안녕|ㅎㅇ|야|저기|이거|아래|다음|참고)[,.!\s]*/gim;

export function stripActionAgentNoise(text: string) {
  return text
    .replace(INSTRUCTION_NOISE, "")
    .replace(CHATTER_PREFIX, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
