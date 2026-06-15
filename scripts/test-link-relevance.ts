import {
  RELEVANCE_MIN_SCORE,
  scoreLinkRelevance,
} from "../lib/links/link-relevance";

function assert(name: string, condition: boolean) {
  if (!condition) {
    throw new Error(`✗ ${name}`);
  }
  console.log(`✓ ${name}`);
}

const main = {
  url: "https://finance.naver.com/item/main.naver?code=005930",
  title: "삼성전자 주가",
  domain: "finance.naver.com",
  category: "research",
  source_type: "generic",
};

const related = scoreLinkRelevance(main, {
  url: "https://finance.naver.com/item/news.naver?code=005930",
  title: "삼성전자 실적 분석",
  domain: "finance.naver.com",
  anchorText: "삼성전자 실적",
  category: "research",
  source_type: "generic",
});

const unrelated = scoreLinkRelevance(main, {
  url: "https://www.coupang.com/np/search?q=keyboard",
  title: "기계식 키보드",
  domain: "coupang.com",
  anchorText: "키보드 추천",
  category: "shopping",
  source_type: "commerce",
});

assert("threshold is 80", RELEVANCE_MIN_SCORE === 80);
assert("same topic scores high", related >= 80);
assert("unrelated topic scores low", unrelated < 80);

console.log(`\n3 link relevance checks passed.`);
