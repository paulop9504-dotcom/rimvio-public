# Rimvio 출시 체크리스트

> **경로:** `c:\Users\userguest\Desktop\new-project`  
> **한 줄:** PWA Share Target → `/now` → 액션 버튼 → Feed

---

## 1. 로컬 백업 (지금)

```powershell
cd c:\Users\userguest\Desktop\new-project
npm run backup
```

→ Desktop에 `blink-backup-YYYYMMDD-HHmm.zip` 생성 (node_modules·.next 제외)

```powershell
npm run verify:release
```

→ TypeScript + production build + analytics 실험 통과 확인

---

## 2. Git 백업

```powershell
cd c:\Users\userguest\Desktop\new-project
git init
git add .
git commit -m "Rimvio v0.1 — launch snapshot"
```

GitHub 새 repo 생성 후:

```powershell
git remote add origin https://github.com/YOU/blink.git
git branch -M main
git push -u origin main
```

---

## 3. Supabase (선택 · analytics + 링크 persist)

1. [supabase.com](https://supabase.com) 새 프로젝트
2. SQL Editor에서 **001→033 순서대로** 실행 (또는 `npm run db:apply` + `SUPABASE_ACCESS_TOKEN`)
   - 최소: `001`–`004` (링크·analytics)
   - 피어/친구/Feed: `013`–`033` (`npm run db:apply:peer` 등 — `package.json` 참고)
3. Settings → API → URL + anon key 복사
4. `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

5. (선택) Database → Replication → `links` Realtime ON

**Supabase 없이도 출시 가능** — sessionStorage + analytics local flush only.

---

## 4. Vercel 배포

1. GitHub 연결 Import (또는 `npm run deploy:prod`)
2. Framework: Next.js (자동)
3. **필수 env (Production):**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL` → `https://new-project-pi-one-52.vercel.app` (OAuth)
4. 검수: `npm run verify:deploy -- --remote` · `GET /api/health`
5. Supabase → Auth → URL Configuration:
   - Site URL: 프로덕션 URL
   - Redirect: `https://<도메인>/auth/callback`
6. 배포 URL에서 확인:
   - `/` Feed
   - `/demo` Tier 1 analytics 패널
   - `/now?url=https://map.naver.com/p/search/강릉`

### PWA Share Target (Android)

- HTTPS 배포 필수
- 홈 화면에 추가 → 다른 앱에서 **공유 → Rimvio**
- `manifest.ts` share_target → `/share` → `/now`

---

## 5. 출시 후 모니터링

| Tier 1 | 어디서 |
|--------|--------|
| enrich / action / funnel | `/demo` Analytics 패널 |
| Supabase | `select event_type, count(*) from analytics_events group by 1` |
| 실험 회귀 | `npm run experiment` (dev 서버 켠 상태) |

---

## 6. 롤백

- **코드:** git tag `v0.1-launch` → Vercel 이전 deployment Promote
- **데이터:** Supabase daily backup (Pro) 또는 `analytics_events` export
- **로컬 zip:** Desktop `blink-backup-*.zip`

---

## 환경 변수 요약

| 변수 | 필수 | 설명 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | 아니오 | 없으면 local-only |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 아니오 | 없으면 local-only |

비밀키(service_role)는 **클라이언트에 넣지 말 것**.

---

## 7. 네이티브 스토어 (Capacitor)

PWA(홈 화면 추가)와 별도로 **Play Store / App Store** 출시:

| 플랫폼 | 문서 | 준비 |
|--------|------|------|
| **iOS** | [STORE_LAUNCH_IOS.md](./STORE_LAUNCH_IOS.md) | `npm run store:prepare:ios` |
| **Android** | [STORE_LAUNCH_ANDROID.md](./STORE_LAUNCH_ANDROID.md) | `npm run store:prepare:android` |

SSOT: `lib/mobile/store-launch-config.ts` · `CAPACITOR_SERVER_URL` → prod WebView.
