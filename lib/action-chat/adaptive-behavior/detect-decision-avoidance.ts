const DECISION_AVOIDANCE =
  /(?:알아서(?:\s*해)?|추천(?:\s*해)(?:\s*줘)?|대충|무난|골라(?:\s*줘)?|너(?:가|는)\s*골라|제일\s*무난|그냥\s*(?:해|알아서)|편한\s*걸로|아무\s*거나)/iu;

export function isDecisionAvoidanceInput(message: string): boolean {
  const trimmed = message.trim();
  if (/^(?:추천|뭐\s*하지)$/iu.test(trimmed)) {
    return false;
  }
  return DECISION_AVOIDANCE.test(trimmed);
}
