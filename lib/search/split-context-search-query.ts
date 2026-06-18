const EXPERIENCE_TOKEN =
  /^(?:제주|오사카|부산|서울|강남|홍대|여행|추억|경험|카페|등산|맛집|방문|여름|겨울|봄|가을)$/iu;

const PEOPLE_SUFFIX = /(?:이랑|랑|와|과|님)$/u;

function tokenizeQuery(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/[\s,·]+/u)
    .map((token) => token.replace(/[?!.…]/gu, "").trim())
    .filter((token) => token.length >= 2);
}

function normalizePeopleToken(token: string): string {
  return token.replace(PEOPLE_SUFFIX, "").trim();
}

/** Split free-text search into people vs experience terms. */
export function splitContextSearchQuery(query: string): {
  peopleTerms: string[];
  experienceTerms: string[];
} {
  const rawTokens = tokenizeQuery(query);
  const peopleTerms: string[] = [];
  const experienceTerms: string[] = [];

  for (const token of rawTokens) {
    if (EXPERIENCE_TOKEN.test(token)) {
      experienceTerms.push(token);
      continue;
    }

    const person = normalizePeopleToken(token);
    if (/^[가-힣]{2,5}$/u.test(person) && !EXPERIENCE_TOKEN.test(person)) {
      peopleTerms.push(person);
      continue;
    }

    if (/^[a-z]{2,12}$/iu.test(person)) {
      peopleTerms.push(person);
      continue;
    }

    experienceTerms.push(token);
  }

  if (peopleTerms.length === 0 && experienceTerms.length === 0 && rawTokens.length > 0) {
    experienceTerms.push(...rawTokens);
  }

  return {
    peopleTerms: [...new Set(peopleTerms)],
    experienceTerms: [...new Set(experienceTerms)],
  };
}
