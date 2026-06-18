import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { RIMVIO } from "@/lib/brand/rimvio";

export default function GoogleAuthDocPage() {
  return (
    <AppShell title="Google 로그인" compact iosSurface>
      <article className="mx-auto max-w-lg space-y-4 px-4 pb-10 pt-2 text-[14px] leading-relaxed text-muted-foreground">
        <p className="text-foreground">
          {RIMVIO.name}는 Supabase Auth로 Google 계정 로그인을 지원합니다.
        </p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            <a
              href="https://supabase.com/dashboard"
              className="font-medium text-foreground underline-offset-2 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Supabase
            </a>
            에서 프로젝트를 만들고 SQL Editor에{" "}
            <code className="text-[12px]">supabase/migrations</code> 001~012를 실행합니다.
          </li>
          <li>
            Authentication → Providers → <strong className="text-foreground">Google</strong>{" "}
            활성화 후 Client ID/Secret을 붙여넣습니다.
          </li>
          <li>
            Google Cloud OAuth redirect URI는{" "}
            <code className="text-[12px]">https://&lt;project-ref&gt;.supabase.co/auth/v1/callback</code>
            입니다.
          </li>
          <li>
            <code className="text-[12px]">.env.local</code>에{" "}
            <code className="text-[12px]">NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
            <code className="text-[12px]">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>,{" "}
            <code className="text-[12px]">NEXT_PUBLIC_APP_URL</code>을 넣고 dev 서버를 재시작합니다.
          </li>
          <li>
            Supabase URL Configuration에{" "}
            <code className="text-[12px]">/auth/callback</code> redirect를 등록합니다.
          </li>
        </ol>
        <p>
          터미널 점검: <code className="text-[12px]">npm run auth:check</code>
        </p>
        <Link href="/welcome" className="inline-block font-medium text-foreground">
          ← 설정으로
        </Link>
      </article>
    </AppShell>
  );
}
