/** Korean career role lexicon — used for fallback recovery routing + replies. */

export const CAREER_ROLE_LEXICON = [
  "의사",
  "간호사",
  "약사",
  "한의사",
  "치과의사",
  "수의사",
  "영양사",
  "물리치료사",
  "방사선사",
  "임상병리사",
  "변호사",
  "판사",
  "검사",
  "경찰",
  "소방관",
  "군인",
  "공무원",
  "교사",
  "유치원교사",
  "교수",
  "연구원",
  "개발자",
  "프로그래머",
  "엔지니어",
  "데이터분석가",
  "디자이너",
  "UI디자이너",
  "UX디자이너",
  "기획자",
  "PM",
  "마케터",
  "회계사",
  "세무사",
  "경영인",
  "CEO",
  "창업가",
  "사업가",
  "자영업",
  "미용사",
  "네일아티스트",
  "메이크업아티스트",
  "피부관리사",
  "바리스타",
  "셰프",
  "요리사",
  "제빵사",
  "파티시에",
  "운동선수",
  "트레이너",
  "코치",
  "헬스트레이너",
  "요가강사",
  "피트니스강사",
  "가수",
  "배우",
  "연예인",
  "유튜버",
  "크리에이터",
  "작가",
  "기자",
  "PD",
  "아나운서",
  "모델",
  "사진작가",
  "영상편집자",
  "건축가",
  "인테리어디자이너",
  "조경사",
  "기계공",
  "전기기사",
  "목수",
  "용접공",
  "기능공",
  "승무원",
  "조종사",
  "선장",
  "운전기사",
  "택배기사",
  "물류",
  "번역가",
  "통역사",
  "상담사",
  "심리상담사",
  "사회복지사",
  "보육교사",
  "치위생사",
] as const;

const SORTED_ROLES = [...CAREER_ROLE_LEXICON].sort((a, b) => b.length - a.length);

export const CAREER_ASPIRATION_PATTERN =
  /(?:되고\s*싶|되고\s*싶어|되고\s*싶다|될\s*(?:꺼|거)(?:야|예요|다)?|할\s*(?:꺼|거)(?:야|예요|다)?|(?:가|이)\s*되(?:고\s*싶|(?:려|고)|(?:었|을)\s*(?:꿈|거)|(?:는\s*)?꿈)|진로|취업|이직|커리어|직업|무슨\s*일|장래\s*희망|꿈(?:이|은|을)?)/iu;

export function buildCareerRolePattern(): RegExp {
  const escaped = SORTED_ROLES.map((role) =>
    role.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  );
  return new RegExp(`(?:${escaped.join("|")})`, "iu");
}

export const CAREER_ROLE_PATTERN = buildCareerRolePattern();

/** Extract the longest matching career role from user text. */
export function extractCareerRoleHint(message: string): string | undefined {
  const match = message.trim().match(CAREER_ROLE_PATTERN);
  return match?.[0];
}

export function isCareerAspirationMessage(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) {
    return false;
  }
  return CAREER_ROLE_PATTERN.test(trimmed) || CAREER_ASPIRATION_PATTERN.test(trimmed);
}
