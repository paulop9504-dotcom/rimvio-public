"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { clearDemoLinks, readDemoLinks, seedDemoLinks } from "@/lib/demo/seed";
import {
  isExperimentLabMode,
  resetExperimentLab,
} from "@/lib/demo/reset-experiment-lab";

const PREVIEWS = [
  {
    label: "🎵 Rick Roll Now",
    href: "/now?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    desc: "▶️ Never Gonna Give You Up · 앱 · 제목 복사",
  },
  {
    label: "🗼 에펠탑 지도",
    href: "/now?url=https://www.google.com/maps/place/Eiffel+Tower/@48.8584,2.2945",
    desc: "🗺 카카오맵 · 🚕 카카오T · 네이버지도",
  },
  {
    label: "🏝 제주 에어비앤비",
    href: "/now?url=https://www.airbnb.com/s/Jeju-Island--South-Korea/homes",
    desc: "🏨 숙소 · 📱 앱 · 📋 복사",
  },
  {
    label: "📚 Nyan Cat 위키",
    href: "/now?url=https://en.wikipedia.org/wiki/Nyan_Cat",
    desc: "generic enricher · 제목 복사",
  },
  {
    label: "🧪 Portal — Google 홈",
    href: "/now?url=https://www.google.com/",
    desc: "🔍 검색 · 🌏 번역 · 📁 드라이브 · Inbox 비율로 순서",
  },
  {
    label: "🧪 Portal — 네이버 홈",
    href: "/now?url=https://www.naver.com/",
    desc: "📰 뉴스 · ✉️ 메일 · 🗺️ 지도 · 🛒 쇼핑",
  },
  {
    label: "🧪 Action 실험 — 지도 + 카카오T",
    href: "/now?url=https://map.naver.com/p/search/%EA%B0%95%EB%A6%89",
    desc: "🚕 카카오T · 🗺 검색 · 📋 강릉 복사",
  },
  {
    label: "🧪 Action 실험 — YouTube t=",
    href: "/now?url=https://www.youtube.com/watch?v=yfHasxI_s2A&t=90s",
    desc: "▶️ 재생 · 📱 앱 · ⏱ 1:30 복사",
  },
  {
    label: "🧪 Action 실험 — 쿠팡 + 앱",
    href: "/now?url=https://www.coupang.com/vp/products/123456",
    desc: "🛒 쿠팡 · 📱 앱 · 📋 복사",
  },
  {
    label: "🧪 Action 실험 — 야놀자 + 카카오T",
    href: "/now?url=https://www.yanolja.com/",
    desc: "🏨 숙소 · 🚕 카카오T · 📋 복사",
  },
  {
    label: "🧪 Action 실험 — 코레일",
    href: "/now?url=https://www.letskorail.com/",
    desc: "🚄 기차 예매 · 🚕 카카오T",
  },
  {
    label: "🧪 Action 실험 — T맵",
    href: "/now?url=https://www.tmap.co.kr/",
    desc: "🚗 T맵 길찾기 · 📱 앱",
  },
  {
    label: "🧪 Action 실험 — 배민",
    href: "/now?url=https://www.baemin.com/",
    desc: "🍔 배민 · 📱 앱 · 🗺 위치",
  },
  {
    label: "🧪 Action 실험 — 쿠팡이츠",
    href: "/now?url=https://www.coupang.com/eats/store/12345",
    desc: "🍽 쿠팡이츠 · 📱 앱 · 📋 복사",
  },
  {
    label: "🧪 Action 실험 — Klook",
    href: "/now?url=https://www.klook.com/ko/activity/12345-universal/",
    desc: "🎫 액티비티 · 📱 Klook 앱",
  },
  {
    label: "🧪 Action 실험 — Trip.com",
    href: "/now?url=https://kr.trip.com/flights/",
    desc: "✈️ 항공·여행 · 📱 Trip 앱",
  },
  {
    label: "🧪 Action 실험 — Netflix",
    href: "/now?url=https://www.netflix.com/browse",
    desc: "▶️ Netflix · 📱 앱 · 📋 복사",
  },
  {
    label: "🧪 Action 실험 — TVING",
    href: "/now?url=https://www.tving.com/",
    desc: "▶️ TVING · 📱 앱",
  },
  {
    label: "🧪 Action 실험 — 멜론티켓",
    href: "/now?url=https://ticket.melon.com/",
    desc: "🎫 티켓 · 📱 멜론 앱",
  },
  {
    label: "🧪 Action 실험 — 네이버 블로그",
    href: "/now?url=https://blog.naver.com/",
    desc: "📝 블로그 · 📱 네이버 앱",
  },
  {
    label: "🧪 Remote — Lab + 송금",
    href: "/?lab=fresh&remote=payment",
    desc: "46개 Lab · 클립보드=국민계좌 → 토스/카카오페이 리모컨",
  },
  {
    label: "🧪 Remote — Lab 피드만",
    href: "/?lab=fresh",
    desc: "여행·쇼핑 카드 스와이프 → mobility / compare 리모컨",
  },
  {
    label: "Feed (Shorts)",
    href: "/",
    desc: "↑↓ 스와이프 — 쇼츠처럼 넘기기",
  },
  {
    label: "Stack",
    href: "/stack",
    desc: "맨 위 1장 + ghost stack",
  },
  {
    label: "Inbox (전체)",
    href: "/inbox",
    desc: "데모 링크 6개 카드",
  },
  {
    label: "YouTube Now",
    href: "/now?url=https://www.youtube.com/watch?v=yfHasxI_s2A",
    desc: "▶️ 영상 바로 재생 pill",
  },
  {
    label: "yo-go Now",
    href: "/now?url=https://yo-go.co.kr/",
    desc: "🛒 타임딜 enricher",
  },
  {
    label: "Kakao Now",
    href: "/now?url=https://open.kakao.com/o/gsXxUJui",
    desc: "💬 오픈채팅 입장 pill",
  },
  {
    label: "Share → Feed pin",
    href: "/share?url=https://www.youtube.com/watch?v=yfHasxI_s2A",
    desc: "공유 → Now → Done → Feed 맨 위 👀",
  },
  {
    label: "Archive",
    href: "/archive",
    desc: "만료 링크 1개",
  },
];

export function DemoLauncher() {
  const router = useRouter();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const links = isExperimentLabMode() ? readDemoLinks() : seedDemoLinks();
    setCount(links.length);
  }, []);

  const reseedLab = () => {
    const links = resetExperimentLab();
    setCount(links.length);
    router.refresh();
  };

  const reseed = () => {
    const links = seedDemoLinks(true);
    setCount(links.length);
    router.refresh();
  };

  const reset = () => {
    clearDemoLinks();
    setCount(0);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="rounded-3xl bg-card p-5 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Demo
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {count}개 재미 링크가 Feed(localStorage)에 로드됨 — Portal · Rick
          Roll · 지도 · OTT · 쇼핑 · 배민 등
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button className="rounded-2xl" onClick={reseedLab}>
            실험 Lab 새로 깔기
          </Button>
          <Button variant="secondary" className="rounded-2xl" onClick={reseed}>
            Fun feed 다시 채우기
          </Button>
          <Button variant="outline" className="rounded-2xl" onClick={reset}>
            초기화
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {PREVIEWS.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="rounded-2xl bg-card px-5 py-4 shadow-sm transition-transform active:scale-[0.98]"
          >
            <p className="font-semibold tracking-tight">{item.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
