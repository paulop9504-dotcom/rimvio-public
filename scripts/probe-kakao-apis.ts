#!/usr/bin/env npx tsx

const key =
  process.env.KAKAO_REST_API_KEY?.trim() ??
  process.env.KAKAO_MOBILITY_REST_API_KEY?.trim() ??
  "";

async function probe(name: string, url: string) {
  const response = await fetch(url, {
    headers: { Authorization: `KakaoAK ${key}` },
  });
  const text = await response.text();
  console.log(`${name}: ${response.status}`);
  console.log(text.slice(0, 280));
  console.log("---");
}

async function main() {
  if (!key) {
    console.error("KAKAO_REST_API_KEY missing");
    process.exit(1);
  }

  await probe(
    "mobility-directions",
    "https://apis-navi.kakaomobility.com/v1/directions?origin=126.9707,37.5547&destination=127.0276,37.4979&priority=RECOMMEND",
  );
  await probe(
    "local-keyword",
    "https://dapi.kakao.com/v2/local/search/keyword.json?query=%EA%B0%95%EB%82%A8%EC%97%AD",
  );
  await probe(
    "coord2region",
    "https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x=127.0276&y=37.4979",
  );
}

void main();
