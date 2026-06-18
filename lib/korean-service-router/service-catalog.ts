import type { ActionType, KoreanServiceEntry, ServiceCategory } from "@/lib/korean-service-router/types";

function svc(
  id: string,
  name: string,
  category: ServiceCategory,
  homeUrl: string,
  actionUrl: string,
  actionType: ActionType,
  keywords: string[],
): KoreanServiceEntry {
  return { id, name, category, homeUrl, actionUrl, actionType, keywords };
}

/** 155 Korean services — actionUrl is the shortest friction path, not landing home. */
export const KOREAN_SERVICE_CATALOG: readonly KoreanServiceEntry[] = [
  // 1. 검색 / 정보 (10)
  svc("naver", "네이버", "search", "https://www.naver.com", "https://search.naver.com/search.naver?query=", "SEARCH", ["네이버", "naver"]),
  svc("daum", "다음", "search", "https://www.daum.net", "https://search.daum.net/search?q=", "SEARCH", ["다음", "daum"]),
  svc("google", "구글", "search", "https://www.google.com", "https://www.google.com/search?q=", "SEARCH", ["구글", "google"]),
  svc("wikipedia-ko", "위키백과", "search", "https://ko.wikipedia.org", "https://ko.wikipedia.org/w/index.php?search=", "LEARN", ["위키", "위키백과", "wikipedia"]),
  svc("brunch", "브런치", "search", "https://brunch.co.kr", "https://brunch.co.kr/search?q=", "SEARCH", ["브런치", "brunch"]),
  svc("namuwiki", "나무위키", "search", "https://namu.wiki", "https://namu.wiki/w/특수:검색?search=", "LEARN", ["나무위키", "namu"]),
  svc("naver-blog", "네이버 블로그", "search", "https://blog.naver.com", "https://search.naver.com/search.naver?where=blog&query=", "SEARCH", ["블로그", "네이버블로그"]),
  svc("google-news", "구글 뉴스", "search", "https://news.google.com", "https://news.google.com/search?q=", "SEARCH", ["구글뉴스", "google news"]),
  svc("yna", "연합뉴스", "search", "https://www.yna.co.kr", "https://www.yna.co.kr/search?query=", "SEARCH", ["연합뉴스", "yna"]),
  svc("kbs-news", "KBS 뉴스", "search", "https://news.kbs.co.kr", "https://news.kbs.co.kr/news/search?keyword=", "SEARCH", ["kbs", "kbs뉴스"]),

  // 2. 음식 / 배달 / 맛집 (20)
  svc("baemin", "배달의민족", "food", "https://www.baemin.com", "https://www.baemin.com/", "ORDER", ["배민", "배달의민족", "baemin"]),
  svc("coupang-eats", "쿠팡이츠", "food", "https://www.coupangeats.com", "https://www.coupangeats.com/", "ORDER", ["쿠팡이츠", "coupang eats"]),
  svc("yogiyo", "요기요", "food", "https://www.yogiyo.co.kr", "https://www.yogiyo.co.kr/", "ORDER", ["요기요", "yogiyo"]),
  svc("mangoplate", "망고플레이트", "food", "https://www.mangoplate.com", "https://www.mangoplate.com/search/", "SEARCH", ["망고플레이트", "mangoplate"]),
  svc("diningcode", "다이닝코드", "food", "https://www.diningcode.com", "https://www.diningcode.com/list.dc?query=", "SEARCH", ["다이닝코드", "diningcode"]),
  svc("naver-map-food", "네이버 지도 맛집", "food", "https://map.naver.com", "https://map.naver.com/v5/search/맛집", "SEARCH", ["네이버맵", "네이버지도"]),
  svc("kakao-map-food", "카카오맵", "food", "https://map.kakao.com", "https://map.kakao.com/?q=맛집", "SEARCH", ["카카오맵", "kakao map"]),
  svc("114-food", "114맛집", "food", "https://www.114.co.kr", "https://www.114.co.kr/search?query=", "SEARCH", ["114맛집"]),
  svc("baemin-store", "배민스토어", "food", "https://store.baemin.com", "https://store.baemin.com/", "ORDER", ["배민스토어"]),
  svc("kurly-food", "마켓컬리", "food", "https://www.kurly.com", "https://www.kurly.com/categories/grocery", "ORDER", ["마켓컬리", "컬리", "kurly"]),
  svc("coupang-fresh", "쿠팡 로켓프레시", "food", "https://www.coupang.com", "https://www.coupang.com/np/categories/393760", "ORDER", ["로켓프레시", "쿠팡프레시"]),
  svc("gsfresh", "GS프레시몰", "food", "https://www.gsfresh.com", "https://www.gsfresh.com/", "ORDER", ["gs프레시", "gsfresh"]),
  svc("ssg-food", "SSG푸드마켓", "food", "https://www.ssg.com", "https://www.ssg.com/food/main.ssg", "ORDER", ["ssg푸드", "ssg푸드마켓"]),
  svc("emart", "이마트몰", "food", "https://emart.ssg.com", "https://emart.ssg.com/", "ORDER", ["이마트", "이마트몰"]),
  svc("homeplus", "홈플러스", "food", "https://front.homeplus.co.kr", "https://front.homeplus.co.kr/", "ORDER", ["홈플러스", "homeplus"]),
  svc("bbq", "BBQ", "food", "https://www.bbq.co.kr", "https://www.bbq.co.kr/order/", "ORDER", ["bbq", "비비큐"]),
  svc("bhc", "BHC", "food", "https://www.bhc.co.kr", "https://www.bhc.co.kr/order/", "ORDER", ["bhc", "비에이치씨"]),
  svc("kyochon", "교촌치킨", "food", "https://www.kyochon.com", "https://www.kyochon.com/order/", "ORDER", ["교촌", "교촌치킨"]),
  svc("mcdonalds", "맥도날드", "food", "https://www.mcdonalds.co.kr", "https://www.mcdonalds.co.kr/order/", "ORDER", ["맥도날드", "맥날", "mcdonalds"]),
  svc("starbucks", "스타벅스", "food", "https://www.starbucks.co.kr", "https://www.starbucks.co.kr/app/order/menu/coffee/list.do", "ORDER", ["스타벅스", "starbucks"]),

  // 3. 일정 / 캘린더 / 생산성 (15)
  svc("google-calendar", "구글 캘린더", "productivity", "https://calendar.google.com", "https://calendar.google.com/calendar/u/0/r/eventedit", "BOOK", ["구글캘린더", "google calendar"]),
  svc("naver-calendar", "네이버 캘린더", "productivity", "https://calendar.naver.com", "https://calendar.naver.com/", "BOOK", ["네이버캘린더"]),
  svc("kakao-calendar", "카카오 캘린더", "productivity", "https://calendar.kakao.com", "https://calendar.kakao.com/", "BOOK", ["카카오캘린더"]),
  svc("notion", "Notion", "productivity", "https://www.notion.so", "https://www.notion.so/", "BOOK", ["notion", "노션"]),
  svc("todoist", "Todoist", "productivity", "https://todoist.com", "https://todoist.com/app/today", "BOOK", ["todoist", "투두이스트"]),
  svc("ticktick", "TickTick", "productivity", "https://ticktick.com", "https://ticktick.com/webapp/#p/inbox/tasks", "BOOK", ["ticktick", "틱틱"]),
  svc("trello", "Trello", "productivity", "https://trello.com", "https://trello.com/", "BOOK", ["trello", "트렐로"]),
  svc("asana", "Asana", "productivity", "https://asana.com", "https://app.asana.com/", "BOOK", ["asana", "아사나"]),
  svc("monday", "Monday", "productivity", "https://monday.com", "https://monday.com/", "BOOK", ["monday", "먼데이"]),
  svc("google-keep", "Google Keep", "productivity", "https://keep.google.com", "https://keep.google.com/", "BOOK", ["keep", "구글키프"]),
  svc("evernote", "Evernote", "productivity", "https://evernote.com", "https://www.evernote.com/client/web", "BOOK", ["evernote", "에버노트"]),
  svc("microsoft-todo", "Microsoft To Do", "productivity", "https://todo.microsoft.com", "https://to-do.microsoft.com/tasks/today", "BOOK", ["microsoft todo", "투두"]),
  svc("clickup", "ClickUp", "productivity", "https://clickup.com", "https://app.clickup.com/", "BOOK", ["clickup", "클릭업"]),
  svc("slack", "Slack", "productivity", "https://slack.com", "https://slack.com/app_redirect", "BOOK", ["slack", "슬랙"]),
  svc("zoom", "Zoom", "productivity", "https://zoom.us", "https://zoom.us/meeting/schedule", "BOOK", ["zoom", "줌"]),

  // 4. 쇼핑 (20)
  svc("coupang", "쿠팡", "shopping", "https://www.coupang.com", "https://www.coupang.com/np/search?q=", "ORDER", ["쿠팡", "coupang"]),
  svc("11st", "11번가", "shopping", "https://www.11st.co.kr", "https://search.11st.co.kr/Search.tmall?kwd=", "ORDER", ["11번가", "11st"]),
  svc("gmarket", "G마켓", "shopping", "https://www.gmarket.co.kr", "https://browse.gmarket.co.kr/search?keyword=", "ORDER", ["g마켓", "gmarket"]),
  svc("auction", "옥션", "shopping", "https://www.auction.co.kr", "https://browse.auction.co.kr/search?keyword=", "ORDER", ["옥션", "auction"]),
  svc("ssg", "SSG", "shopping", "https://www.ssg.com", "https://www.ssg.com/search.ssg?target=all&query=", "ORDER", ["ssg", "신세계"]),
  svc("naver-shopping", "네이버 쇼핑", "shopping", "https://shopping.naver.com", "https://search.shopping.naver.com/search/all?query=", "ORDER", ["네이버쇼핑"]),
  svc("musinsa", "무신사", "shopping", "https://www.musinsa.com", "https://www.musinsa.com/search/musinsa/goods?keyword=", "ORDER", ["무신사", "musinsa"]),
  svc("wconcept", "W컨셉", "shopping", "https://www.wconcept.co.kr", "https://www.wconcept.co.kr/Search?keyword=", "ORDER", ["w컨셉", "wconcept"]),
  svc("ohouse", "오늘의집", "shopping", "https://www.ohou.se", "https://ohou.se/search?keyword=", "ORDER", ["오늘의집", "ohouse"]),
  svc("zigzag", "지그재그", "shopping", "https://zigzag.kr", "https://zigzag.kr/search?keyword=", "ORDER", ["지그재그", "zigzag"]),
  svc("ably", "에이블리", "shopping", "https://a-bly.com", "https://m.a-bly.com/search?keyword=", "ORDER", ["에이블리", "ably"]),
  svc("ikea", "IKEA", "shopping", "https://www.ikea.com/kr", "https://www.ikea.com/kr/ko/search/?q=", "ORDER", ["ikea", "이케아"]),
  svc("daiso", "다이소", "shopping", "https://www.daiso.co.kr", "https://www.daiso.co.kr/product/search?keyword=", "ORDER", ["다이소", "daiso"]),
  svc("29cm", "29CM", "shopping", "https://www.29cm.co.kr", "https://www.29cm.co.kr/search?keyword=", "ORDER", ["29cm"]),
  svc("lfmall", "LF몰", "shopping", "https://www.lfmall.co.kr", "https://www.lfmall.co.kr/search?query=", "ORDER", ["lf몰"]),
  svc("thehyundai", "현대백화점", "shopping", "https://www.thehyundai.com", "https://www.thehyundai.com/front/dpo/search.thd?searchTerm=", "ORDER", ["현대백화점"]),
  svc("shinsegae-mall", "신세계몰", "shopping", "https://www.ssg.com", "https://www.ssg.com/search.ssg?target=all&query=", "ORDER", ["신세계몰"]),
  svc("lotteon", "롯데ON", "shopping", "https://www.lotteon.com", "https://www.lotteon.com/search/search/search.ecn?render=q&platform=pc&q=", "ORDER", ["롯데on", "lotteon"]),
  svc("hmall", "H몰", "shopping", "https://www.hyundaihmall.com", "https://www.hyundaihmall.com/front/search/search.do?searchTerm=", "ORDER", ["h몰", "현대hmall"]),
  svc("kurly-shop", "마켓컬리", "shopping", "https://www.kurly.com", "https://www.kurly.com/search?sword=", "ORDER", ["마켓컬리쇼핑"]),

  // 5. 건강 / 병원 / 의료 (15)
  svc("nhis", "건강보험공단", "health", "https://www.nhis.or.kr", "https://www.nhis.or.kr/nhis/index.do", "SEARCH", ["건강보험", "nhis"]),
  svc("kdca-health", "국민건강정보", "health", "https://health.kdca.go.kr", "https://health.kdca.go.kr/healthinfo/", "LEARN", ["국민건강정보"]),
  svc("kdca", "질병관리청", "health", "https://www.kdca.go.kr", "https://www.kdca.go.kr/", "LEARN", ["질병관리청", "kdca"]),
  svc("asan", "서울아산병원", "health", "https://www.amc.seoul.kr", "https://www.amc.seoul.kr/asan/reservation/main.do", "BOOK", ["아산병원", "서울아산"]),
  svc("samsung-hospital", "삼성서울병원", "health", "https://www.samsunghospital.com", "https://www.samsunghospital.com/dept/main/index.do", "BOOK", ["삼성병원", "삼성서울병원"]),
  svc("severance", "세브란스병원", "health", "https://sev.iseverance.com", "https://sev.iseverance.com/reservation/", "BOOK", ["세브란스"]),
  svc("snuh", "서울대병원", "health", "https://www.snuh.org", "https://www.snuh.org/reservation/", "BOOK", ["서울대병원", "snuh"]),
  svc("chamc", "차병원", "health", "https://www.chamc.co.kr", "https://www.chamc.co.kr/reservation/", "BOOK", ["차병원"]),
  svc("gangnam-severance", "강남세브란스", "health", "https://gs.iseverance.com", "https://gs.iseverance.com/reservation/", "BOOK", ["강남세브란스"]),
  svc("goodoc", "굿닥", "health", "https://www.goodoc.co.kr", "https://www.goodoc.co.kr/hospitals", "BOOK", ["굿닥", "goodoc"]),
  svc("ddocdoc", "똑닥", "health", "https://www.ddocdoc.com", "https://www.ddocdoc.com/hospital", "BOOK", ["똑닥", "ddocdoc"]),
  svc("barunsesang", "바른세상병원", "health", "https://www.barunsesang.co.kr", "https://www.barunsesang.co.kr/reservation/", "BOOK", ["바른세상"]),
  svc("medicaltimes", "메디컬타임즈", "health", "https://www.medicaltimes.com", "https://www.medicaltimes.com/", "LEARN", ["메디컬타임즈"]),
  svc("health-kr", "약학정보원", "health", "https://www.health.kr", "https://www.health.kr/searchDrug/search_detail.asp", "SEARCH", ["약학정보", "약 검색"]),
  svc("naver-health", "네이버 건강", "health", "https://health.naver.com", "https://health.naver.com/", "SEARCH", ["네이버건강"]),

  // 6. 교육 / 공부 / 수능 (15)
  svc("ebs", "EBS", "education", "https://www.ebs.co.kr", "https://www.ebs.co.kr/main", "LEARN", ["ebs"]),
  svc("megastudy", "메가스터디", "education", "https://www.megastudy.net", "https://www.megastudy.net/", "LEARN", ["메가스터디", "megastudy"]),
  svc("mimacstudy", "대성마이맥", "education", "https://www.mimacstudy.com", "https://www.mimacstudy.com/", "LEARN", ["대성", "마이맥"]),
  svc("etoos", "이투스", "education", "https://www.etoos.com", "https://www.etoos.com/", "LEARN", ["이투스", "etoos"]),
  svc("ingang", "강남구청 인터넷수능", "education", "https://edu.ingang.go.kr", "https://edu.ingang.go.kr/", "LEARN", ["인터넷수능", "ingang"]),
  svc("kocw", "KOCW", "education", "https://www.kocw.net", "https://www.kocw.net/home/search/search.do", "LEARN", ["kocw"]),
  svc("coursera", "Coursera", "education", "https://www.coursera.org", "https://www.coursera.org/search?query=", "LEARN", ["coursera", "코세라"]),
  svc("edx", "edX", "education", "https://www.edx.org", "https://www.edx.org/search?q=", "LEARN", ["edx"]),
  svc("khan", "Khan Academy", "education", "https://www.khanacademy.org", "https://www.khanacademy.org/search?page_search_query=", "LEARN", ["칸아카데미", "khan"]),
  svc("inflearn", "인프런", "education", "https://www.inflearn.com", "https://www.inflearn.com/courses?search=", "LEARN", ["인프런", "inflearn"]),
  svc("fastcampus", "패스트캠퍼스", "education", "https://fastcampus.co.kr", "https://fastcampus.co.kr/search?keyword=", "LEARN", ["패스트캠퍼스"]),
  svc("class101", "클래스101", "education", "https://class101.net", "https://class101.net/ko/search?query=", "LEARN", ["클래스101", "class101"]),
  svc("udemy", "유데미", "education", "https://www.udemy.com", "https://www.udemy.com/courses/search/?q=", "LEARN", ["udemy", "유데미"]),
  svc("naver-terms", "네이버 지식백과", "education", "https://terms.naver.com", "https://terms.naver.com/search.naver?query=", "LEARN", ["지식백과"]),
  svc("wikipedia-edu", "위키백과 교육", "education", "https://ko.wikipedia.org", "https://ko.wikipedia.org/w/index.php?search=", "LEARN", ["위키교육"]),

  // 7. 금융 / 돈 / 투자 (15)
  svc("kakaobank", "카카오뱅크", "finance", "https://www.kakaobank.com", "https://www.kakaobank.com/products/transfer", "ORDER", ["카카오뱅크", "kakaobank"]),
  svc("toss", "토스", "finance", "https://toss.im", "https://toss.im/", "ORDER", ["토스", "toss"]),
  svc("naver-pay", "네이버페이", "finance", "https://new-m.pay.naver.com", "https://new-m.pay.naver.com/", "ORDER", ["네이버페이"]),
  svc("kb", "KB국민은행", "finance", "https://kb.com", "https://obank.kbstar.com/quics?page=C019482", "ORDER", ["국민은행", "kb은행"]),
  svc("shinhan", "신한은행", "finance", "https://shinhan.com", "https://www.shinhan.com/index.jsp", "ORDER", ["신한은행", "shinhan"]),
  svc("hana", "하나은행", "finance", "https://hana.com", "https://www.kebhana.com/", "ORDER", ["하나은행", "hana"]),
  svc("woori", "우리은행", "finance", "https://wooribank.com", "https://www.wooribank.com/", "ORDER", ["우리은행", "woori"]),
  svc("kakaopay", "카카오페이", "finance", "https://www.kakaopay.com", "https://www.kakaopay.com/", "ORDER", ["카카오페이", "kakaopay"]),
  svc("samsung-securities", "삼성증권", "finance", "https://www.samsungpop.com", "https://www.samsungpop.com/", "ORDER", ["삼성증권"]),
  svc("miraeasset", "미래에셋", "finance", "https://securities.miraeasset.com", "https://securities.miraeasset.com/", "ORDER", ["미래에셋"]),
  svc("krx", "한국거래소", "finance", "https://krx.co.kr", "https://data.krx.co.kr/contents/MDC/MDI/mdiLoader/index.cmd?menuId=MDC0201", "COMPARE", ["한국거래소", "krx", "코스피"]),
  svc("investing", "인베스팅", "finance", "https://kr.investing.com", "https://kr.investing.com/search/?q=", "COMPARE", ["인베스팅", "investing"]),
  svc("banksalad", "뱅크샐러드", "finance", "https://www.banksalad.com", "https://www.banksalad.com/", "COMPARE", ["뱅크샐러드", "banksalad"]),
  svc("moneytoday", "머니투데이", "finance", "https://www.mt.co.kr", "https://www.mt.co.kr/search/?keyword=", "LEARN", ["머니투데이"]),
  svc("bok", "한국은행", "finance", "https://www.bok.or.kr", "https://www.bok.or.kr/portal/main/contents.do?menuNo=200398", "LEARN", ["한국은행", "bok"]),

  // 8. 생활 / 부동산 / 지역 (15)
  svc("zigbang", "직방", "life", "https://www.zigbang.com", "https://www.zigbang.com/", "SEARCH", ["직방", "zigbang"]),
  svc("dabang", "다방", "life", "https://www.dabangapp.com", "https://www.dabangapp.com/", "SEARCH", ["다방", "dabang"]),
  svc("naver-land", "네이버 부동산", "life", "https://land.naver.com", "https://land.naver.com/", "SEARCH", ["네이버부동산"]),
  svc("hogangnono", "호갱노노", "life", "https://hogangnono.com", "https://hogangnono.com/", "SEARCH", ["호갱노노"]),
  svc("kbland", "KB부동산", "life", "https://kbland.kr", "https://kbland.kr/", "SEARCH", ["kb부동산"]),
  svc("molit", "국토교통부", "life", "https://www.molit.go.kr", "https://www.molit.go.kr/", "LEARN", ["국토교통부", "molit"]),
  svc("seoul", "서울시", "life", "https://www.seoul.go.kr", "https://www.seoul.go.kr/", "LEARN", ["서울시"]),
  svc("gov24", "정부24", "life", "https://www.gov.kr", "https://www.gov.kr/portal/main", "SEARCH", ["정부24", "gov24"]),
  svc("epeople", "국민신문고", "life", "https://www.epeople.go.kr", "https://www.epeople.go.kr/", "SEARCH", ["국민신문고"]),
  svc("kakao-map-life", "카카오맵", "life", "https://map.kakao.com", "https://map.kakao.com/", "SEARCH", ["카카오맵생활"]),
  svc("naver-map-life", "네이버지도", "life", "https://map.naver.com", "https://map.naver.com/v5/", "SEARCH", ["네이버지도생활"]),
  svc("trip", "트립닷컴", "life", "https://kr.trip.com", "https://kr.trip.com/hotels/list?city=", "BOOK", ["트립닷컴", "trip.com"]),
  svc("yanolja", "야놀자", "life", "https://www.yanolja.com", "https://www.yanolja.com/", "BOOK", ["야놀자", "yanolja"]),
  svc("goodchoice", "여기어때", "life", "https://www.goodchoice.kr", "https://www.goodchoice.kr/", "BOOK", ["여기어때", "goodchoice"]),
  svc("airbnb", "Airbnb", "life", "https://www.airbnb.com", "https://www.airbnb.com/s/homes", "BOOK", ["airbnb", "에어비앤비"]),

  // 9. 엔터 / 취미 / 콘텐츠 (15)
  svc("youtube", "유튜브", "entertainment", "https://www.youtube.com", "https://www.youtube.com/results?search_query=", "SEARCH", ["youtube", "유튜브"]),
  svc("netflix", "넷플릭스", "entertainment", "https://www.netflix.com", "https://www.netflix.com/browse", "SEARCH", ["넷플릭스", "netflix"]),
  svc("wavve", "웨이브", "entertainment", "https://www.wavve.com", "https://www.wavve.com/search.html?keyword=", "SEARCH", ["wavve", "웨이브"]),
  svc("tving", "티빙", "entertainment", "https://www.tving.com", "https://www.tving.com/search?keyword=", "SEARCH", ["tving", "티빙"]),
  svc("disneyplus", "디즈니+", "entertainment", "https://www.disneyplus.com", "https://www.disneyplus.com/search", "SEARCH", ["디즈니", "disney"]),
  svc("melon", "멜론", "entertainment", "https://www.melon.com", "https://www.melon.com/search/total/index.htm?q=", "SEARCH", ["melon", "멜론"]),
  svc("bugs", "벅스", "entertainment", "https://music.bugs.co.kr", "https://music.bugs.co.kr/search/track?q=", "SEARCH", ["bugs", "벅스"]),
  svc("genie", "지니", "entertainment", "https://www.genie.co.kr", "https://www.genie.co.kr/search/searchMain?query=", "SEARCH", ["genie", "지니"]),
  svc("watcha", "왓챠", "entertainment", "https://watcha.com", "https://watcha.com/search?query=", "SEARCH", ["watcha", "왓챠"]),
  svc("instagram", "인스타그램", "entertainment", "https://www.instagram.com", "https://www.instagram.com/explore/tags/", "SEARCH", ["instagram", "인스타"]),
  svc("twitter", "트위터(X)", "entertainment", "https://twitter.com", "https://twitter.com/search?q=", "SEARCH", ["twitter", "트위터", "x"]),
  svc("tiktok", "틱톡", "entertainment", "https://www.tiktok.com", "https://www.tiktok.com/search?q=", "SEARCH", ["tiktok", "틱톡"]),
  svc("dcinside", "디시인사이드", "entertainment", "https://www.dcinside.com", "https://search.dcinside.com/", "SEARCH", ["디시", "dcinside"]),
  svc("ruliweb", "루리웹", "entertainment", "https://www.ruliweb.com", "https://bbs.ruliweb.com/search?q=", "SEARCH", ["루리웹", "ruliweb"]),
  svc("fmkorea", "FM코리아", "entertainment", "https://www.fmkorea.com", "https://www.fmkorea.com/search?keyword=", "SEARCH", ["에프엠코리아", "fmkorea", "펨코"]),

  // 10. 커리어 / 일 / 개발 (15)
  svc("saramin", "사람인", "career", "https://www.saramin.co.kr", "https://www.saramin.co.kr/zf_user/search?searchword=", "SEARCH", ["사람인", "saramin"]),
  svc("jobkorea", "잡코리아", "career", "https://www.jobkorea.co.kr", "https://www.jobkorea.co.kr/Search/?stext=", "SEARCH", ["잡코리아", "jobkorea"]),
  svc("wanted", "원티드", "career", "https://www.wanted.co.kr", "https://www.wanted.co.kr/search?query=", "SEARCH", ["wanted", "원티드"]),
  svc("rocketpunch", "로켓펀치", "career", "https://www.rocketpunch.com", "https://www.rocketpunch.com/jobs?keyword=", "SEARCH", ["로켓펀치", "rocketpunch"]),
  svc("linkedin", "링크드인", "career", "https://www.linkedin.com", "https://www.linkedin.com/jobs/search/?keywords=", "SEARCH", ["linkedin", "링크드인"]),
  svc("github", "GitHub", "career", "https://github.com", "https://github.com/search?q=", "SEARCH", ["github", "깃허브"]),
  svc("stackoverflow", "Stack Overflow", "career", "https://stackoverflow.com", "https://stackoverflow.com/search?q=", "LEARN", ["stackoverflow", "스택오버플로"]),
  svc("aws", "AWS", "career", "https://aws.amazon.com", "https://console.aws.amazon.com/", "LEARN", ["aws"]),
  svc("gcp", "Google Cloud", "career", "https://cloud.google.com", "https://console.cloud.google.com/", "LEARN", ["gcp", "google cloud"]),
  svc("azure", "Azure", "career", "https://azure.microsoft.com", "https://portal.azure.com/", "LEARN", ["azure"]),
  svc("notion-jobs", "Notion Jobs", "career", "https://www.notion.so/careers", "https://www.notion.so/careers", "SEARCH", ["notion jobs"]),
  svc("codeforces", "Codeforces", "career", "https://codeforces.com", "https://codeforces.com/problemset", "LEARN", ["codeforces", "코드포스"]),
  svc("baekjoon", "백준", "career", "https://www.acmicpc.net", "https://www.acmicpc.net/problemset", "LEARN", ["백준", "acmicpc", "baekjoon"]),
  svc("programmers", "Programmers", "career", "https://programmers.co.kr", "https://programmers.co.kr/learn/challenges", "LEARN", ["programmers", "프로그래머스"]),
  svc("inflearn-jobs", "Inflearn Jobs", "career", "https://www.inflearn.com", "https://www.inflearn.com/jobs", "SEARCH", ["inflearn jobs"]),
];

const byId = new Map(KOREAN_SERVICE_CATALOG.map((e) => [e.id, e]));

export function getServiceById(id: string): KoreanServiceEntry | undefined {
  return byId.get(id);
}

export function getServicesByCategory(category: ServiceCategory): KoreanServiceEntry[] {
  return KOREAN_SERVICE_CATALOG.filter((e) => e.category === category);
}

export function getCatalogSize(): number {
  return KOREAN_SERVICE_CATALOG.length;
}
