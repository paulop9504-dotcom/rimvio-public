# Google 로그인 (Supabase Auth)

Rimvio는 **Supabase Auth + Google OAuth**로 로그인합니다. 로그인 없이도 앱은 그대로 동작하고, 로그인하면 Feed가 `user_id`에 묶입니다.

**빠른 점검:** 프로젝트 루트에서 `npm run auth:check`  
**앱 내 가이드:** `/docs/google-auth` · 설정 탭(`/welcome`)

## 인증 필수 모드 (`AUTH_REQUIRED=true`)

`.env.local`에 아래를 넣으면 **로그인한 사용자만** 페이지·API를 쓸 수 있습니다.

```env
AUTH_REQUIRED=true
NEXT_PUBLIC_AUTH_REQUIRED=true
```

예외(로그인 없이 접근 가능):

- 페이지: `/welcome`, `/auth/callback`, `/docs/google-auth`, `/privacy`
- API: `/api/health`, `/api/auth/*`

그 외 경로는 미로그인 시 `/welcome?login=1`로 보내고, API는 `401`을 반환합니다.

## 1. Supabase에서 Google 켜기

1. [Supabase Dashboard](https://supabase.com/dashboard) → 프로젝트 → **Authentication** → **Providers**
2. **Google** 활성화
3. Google Cloud Console에서 OAuth 클라이언트 ID / Secret 입력

## 2. Google Cloud OAuth 클라이언트

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → **Credentials**
2. **OAuth 2.0 Client ID** (Web application) 생성
3. **Authorized redirect URIs**에 Supabase 콜백 추가:

   ```
   https://<YOUR-PROJECT-REF>.supabase.co/auth/v1/callback
   ```

   (`Authentication` → `Providers` → `Google` 화면에 표시된 URL과 동일)

4. Client ID / Secret을 Supabase Google provider에 붙여넣기

## 3. Rimvio 앱 URL

`.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

배포 시 `NEXT_PUBLIC_APP_URL`을 실제 도메인으로 바꿉니다 (예: `https://rimvio.app`).

Supabase **Authentication** → **URL Configuration**:

| 항목 | 값 |
|------|-----|
| Site URL | `NEXT_PUBLIC_APP_URL`과 동일 |
| Redirect URLs | `http://localhost:3000/auth/callback`, `https://your-domain/auth/callback` (또는 `https://your-domain/**`) |

> `redirectTo`에 `?next=` 쿼리를 붙이지 않습니다. 로그인 후 경로는 쿠키로 전달됩니다. Redirect URLs는 **경로만** 등록하면 됩니다.

## 4. 앱에서 사용

- **시작** 탭 (`/welcome`) → **Google로 계속**
- 콜백: `/auth/callback` → 세션 쿠키 저장 → Feed로 이동
- 로그인 후 저장되는 링크는 `links.user_id = auth.uid()`
- 로그아웃하면 다시 익명 Feed(데모/로컬) 모드

## 5. DB / RLS

마이그레이션 `001`–`003`에 `user_id`와 RLS가 이미 있습니다. 로그인 사용자는 **자신의** `user_id`로 insert/update/delete 가능합니다.

> **참고:** Room/Beam은 아직 파일 기반(`.data/`)이라 계정과 연결되지 않습니다. 글로벌 배포 전 Supabase 테이블로 옮기면 Room도 멤버십과 연동할 수 있습니다.

## 트러블슈팅

| 증상 | 확인 |
|------|------|
| 로그인 후 바로 에러 | Supabase Redirect URLs에 `/auth/callback` 등록 |
| Google 화면에서 redirect_uri_mismatch | Google Cloud redirect URI가 Supabase `.../auth/v1/callback`인지 |
| 로그인했는데 Feed 비어 있음 | 정상 — 이전 익명 링크는 `user_id`가 null. 새 링크부터 계정에 저장 |
| 버튼이 안 보임 | `.env.local`에 Supabase URL/anon key 설정 |
