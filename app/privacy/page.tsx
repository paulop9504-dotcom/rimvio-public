import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { RIMVIO } from "@/lib/brand/rimvio";

export default function PrivacyPage() {
  return (
    <AppShell title="개인정보" compact>
      <article className="space-y-5 pb-10 text-sm leading-relaxed text-muted-foreground">
        <p className="text-foreground">
          {RIMVIO.lockup}(👀)는 <strong className="font-medium">로그인 없이</strong>도
          쓸 수 있어요. 받은 링크를 &quot;지금 할 일&quot; 버튼으로 바꿔
          주는 앱이에요.
        </p>

        <section>
          <h2 className="text-base font-semibold text-foreground">
            우리가 아는 것
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong className="font-medium text-foreground">
                공유·붙여넣기한 주소
              </strong>{" "}
              — 제목, 사진, 버튼 만들 때만 써요
            </li>
            <li>
              <strong className="font-medium text-foreground">
                익명 사용 기록
              </strong>{" "}
              (선택) — 어떤 버튼이 자주 눌리는지 (누군지는 몰라요)
            </li>
            <li>
              내 링크 백업 — 직접 내보내기·가져오기할 때만
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">
            링크는 어떻게 읽나요
          </h2>
          <p className="mt-2">
            공개된 페이지 정보(제목, 대표 이미지 등)만 살짝 봐요. 카톡
            비밀번호나 로그인해야 보이는 내용은 건드리지 않아요.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">
            어디에 남나요
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>기본: 이 기기 브라우저 안</li>
            <li>선택: 클라우드 연결 시 내 계정에 동기화</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">다른 앱으로</h2>
          <p className="mt-2">
            버튼을 누르면 YouTube·카카오맵 같은{" "}
            <strong className="font-medium text-foreground">그 서비스</strong>
            로 넘어가요. 그쪽 개인정보 정책이 따로 적용돼요.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">궁금한 점</h2>
          <p className="mt-2">
            베타 중 삭제·문의는 앱 안 체험하기 메뉴나 개발자에게 편하게
            연락해 주세요.
          </p>
        </section>

        <p className="text-xs">최종 업데이트: 2026-05-25</p>

        <Link
          href="/welcome"
          className="inline-block text-sm font-medium text-foreground underline underline-offset-4"
        >
          ← 시작하기로 돌아가기
        </Link>
      </article>
    </AppShell>
  );
}
