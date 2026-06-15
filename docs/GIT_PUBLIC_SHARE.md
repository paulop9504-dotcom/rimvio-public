# Git 공개 저장소 — 비공개 자료 분리 가이드

> **목적:** Rimvio 코드·UI는 GitHub에 공유하고, **제품 핵심·투자·배포·시크릿**은 로컬 `private/`에만 둡니다.

---

## 한 줄 요약

| 공개 (Git) | 비공개 (`private/` — gitignore) |
|------------|----------------------------------|
| 앱 소스 · UI · 테스트 · 마이그레이션 SQL | `.env` · 키스토어 · 투자자료 · 내부 PRD |
| `.env.example` · `supabase/migrations/` | `docs/investor/` · DNS/배포 실값 · KPI |
| 공개용 README · 일반 LAUNCH 체크리스트 | Constitution · Scope AI 내부 · 핸드오프 전체 |

---

## 1. `private/` 폴더 (로컬 전용)

저장소 루트에 **`private/`** 를 만들고 아래 구조로 옮깁니다.  
이 폴더 전체는 **`.gitignore`에 등록**되어 GitHub에 올라가지 않습니다.

```
private/
├── README.md              ← private/README.template.md 복사본
├── env/                   ← .env.local 백업 (절대 public push 금지)
├── investor/              ← docs/investor/*, PDF, 덱
├── product/               ← Constitution, Experience Layers, Scope AI, Story Layer SSOT
├── deploy/                ← DEPLOY_RIMVIO_APP_DNS.md, Vercel/Supabase 실제 URL·토큰 메모
├── ops/                   ← KPI, 감사 리포트, 내부 RFC 초안
└── keys/                  ← Android keystore, Apple 인증서 export (있을 경우)
```

**최초 설정:**

```powershell
cd c:\Users\userguest\Desktop\new-project
mkdir private\investor, private\product, private\deploy, private\env, private\ops, private\keys -Force
copy private\README.template.md private\README.md
```

---

## 2. Git에 올리면 안 되는 것 (시크릿)

이미 `.gitignore` 처리됨 — **커밋 전에 한 번 더 확인:**

- `.env` / `.env.local` / `.env.production*`
- `android/keystore.properties`, `*.jks`, `*.keystore`
- `private/` 전체
- `tmp-*`, `tsc-errors.txt`
- Vercel `.vercel/` 로컬 캐시

**push 전 체크:**

```powershell
git status
git diff --cached --name-only
```

목록에 `.env`나 `private/`가 보이면 **즉시 중단**.

---

## 3. 공개 repo에서 빼고 싶은 docs (핵심 자료)

아래는 **이미 Git에 올라간 적이 있을 수 있음**. 공개 전에 `private/`로 **이동**하고 Git 추적에서 제거:

| 옮길 파일/폴더 | 이유 |
|----------------|------|
| `docs/investor/` | 투자 덱 · PDF |
| `docs/INVESTOR_*.md` | 투자 초안 |
| `docs/RIMVIO_CONSTITUTION.md` | 제품 헌법 · moat |
| `docs/RIMVIO_EXPERIENCE_LAYERS.md` | Experience OS 층 설계 |
| `docs/RIMVIO_SCOPE_AI.md` | Scope AI 내부 |
| `docs/RIMVIO_STORY_LAYER.md` | L0–L3 스토리 SSOT |
| `docs/DEPLOY_RIMVIO_APP_DNS.md` | 실제 DNS/도메인 |
| `docs/RIMVIO_KPI.md` | 내부 KPI |
| `docs/RIMVIO_HANDOFF.md` | 전체 AI 핸드오프 (요약만 public 가능) |
| `docs/*_V1_REPORT.md` | 내부 감사/리포트 |
| `supabase/sql-editor/` (선택) | 운영 SQL 스냅샷 — migrations만 public 권장 |

**Git 추적 제거 (파일은 `private/`로 이동 후):**

```powershell
git mv docs/investor private/investor
git rm --cached docs/RIMVIO_CONSTITUTION.md   # 이미 private로 옮긴 뒤
# … 필요한 파일 반복
```

공개용 **짧은 대체 문서**만 `docs/`에 남기면 됩니다 (예: `docs/RIMVIO_PRODUCT_PUBLIC.md` — 1페이지 요약).

---

## 4. 공개해도 되는 것 (기본)

- `app/`, `components/`, `lib/`, `hooks/` — 앱 코드
- `supabase/migrations/` — 스키마 (RLS 포함, 시크릿 없음)
- `scripts/test-*.ts` — 테스트
- `.env.example` — 키 **이름만**, 값 없음
- `README.md`, `docs/LAUNCH.md` (일반 체크리스트), `docs/PHONE_QA.md`
- `docs/RFC_EXPERIENCE_BRIDGE.md` — 공개 RFC 수준 (민감하면 private로)

---

## 5. GitHub 저장소 URL (2026-06)

| 용도 | URL | 비고 |
|------|-----|------|
| **개발 (private)** | https://github.com/paulop9504-dotcom/rimvio | 전체 소스 · 내부 docs · `origin` |
| **공개 (public)** | https://github.com/paulop9504-dotcom/rimvio-public | 민감 경로 제외 미러 · `public` remote |

로컬 remote:

```powershell
git remote -v
# origin  …/rimvio.git       (private, push/pull 일상)
# public …/rimvio-public.git (공개 미러만 npm run push:public)
```

### 공개 미러 push

민감 경로는 `scripts/public-exclude-paths.txt` 에 정의됩니다.

```powershell
npm run push:public          # rimvio-public 에 동기화
npm run push:public -- -DryRun   # 제외 목록만 확인 (PowerShell 직접 호출 시)
```

또는:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/push-public-github.ps1
powershell -ExecutionPolicy Bypass -File scripts/push-public-github.ps1 -DryRun
```

push 전: `npm test` / `npm run build` 권장. GitHub **Settings → Secrets** 에 Vercel/Supabase 토큰 (코드에 넣지 않음).

---

## 6. 협업자에게 비공개 자료 전달

- Git **말고** 1:1 — 암호화 zip, Proton Drive, Notion private 등
- `private/README.template.md` 구조만 공유하고, 실파일은 별도 채널
- `.env.example` + Supabase **anon key**만 공개 repo — **service role key는 절대 공개 금지**

---

## 7. 이미 시크릿을 커밋한 경우

```powershell
# 히스토리에서 제거 (force push 필요 — 혼자 쓰는 repo일 때만)
# git filter-repo 또는 BFG — 키는 반드시 로테이션(재발급)
```

키가 한 번이라도 public에 올라갔으면 **Supabase/Vercel/OpenAI 키 재발급** 필수.

---

## 관련 파일

- `.gitignore` — `private/` 및 시크릿 패턴
- `private/README.template.md` — 로컬 `private/` 폴더 설명 템플릿
- `.env.example` — 공개 가능한 환경 변수 목록
