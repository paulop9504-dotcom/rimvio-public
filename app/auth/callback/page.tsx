import { Suspense } from "react";
import { AuthCallbackClient } from "@/components/auth-callback-client";

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center px-6">
          <p className="text-sm text-muted-foreground">Google 로그인 처리 중…</p>
        </div>
      }
    >
      <AuthCallbackClient />
    </Suspense>
  );
}
