# 실시간 1:1 채팅 (Peer)

## 사용법 (Rimvio ID — 카톡 ID처럼)

1. **ROOM** (`/peers`) → **내 Rimvio ID 만들기** (예: `@rimvio_jihun`)
2. **친구 추가** → 친구 ID · `010-…` · 이메일 중 하나 입력
3. 친구도 **ID 등록** 후 서로 실시간 채팅

ID 규칙: 4~20자, 영문 소문자로 시작, 숫자·`_`·`.` 가능

## 연락처 동기화 (카톡 스타일)

ROOM → **연락처에서 Rimvio 친구 찾기** → 휴대폰 연락처 선택 → 번호가 Rimvio에 등록된 사람만 자동 친구 추가.

- **Android Chrome**: 연락처 선택 지원
- **iPhone Safari**: 브라우저 제한으로 버튼 비활성 → ID로 추가
- 연락처 원본은 서버에 저장하지 않음 (번호만 매칭용으로 전송)

초대 링크는 예전 방식(로컬-only 방)에만 표시됩니다.

`/chat` 탭은 ROOM으로 이동합니다.

## Supabase 설정 (1회)

SQL Editor에서 아래 **순서대로** 실행:

1. `supabase/migrations/013_peer_chat.sql`
2. `supabase/migrations/014_user_phone_profiles.sql`
3. `supabase/migrations/015_user_profile_email.sql`
4. `supabase/migrations/016_rimvio_id.sql`
5. `supabase/migrations/017_match_contacts.sql`

Realtime에 `peer_messages` 테이블이 publication에 포함되어야 합니다 (마이그레이션에 포함).

## API

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/peers/threads/ensure` | 방 생성·멤버 등록 |
| GET | `/api/peers/threads/[threadId]` | 초대 코드 조회 |
| GET/POST | `/api/peers/threads/[threadId]/messages` | 목록·전송 |
| POST | `/api/peers/join` | 초대 코드로 참여 |
