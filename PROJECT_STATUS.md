# Project Status — Code Clash

> 프로젝트 전체 현황 SoT(Single Source of Truth). 화면 단위 추적은 `SCREEN_STATUS.md` 참고.
> 작업 시작 전 이 문서로 큰 그림 파악 → SCREEN_STATUS로 화면 단위 검증 → 코드 진입.

---

## 한 줄 진단

대전 루프(코드 입력 → 채점 → 결과)는 코드 레벨에서 완성. **실데이터 시드(9 problems / 43 test_cases) 및 `problems`/`test_cases`/`ai_reviews` RLS 정책 3종 정비 완료** (PR #8 dev 머지 완료). `submit/route.ts`의 히든 케이스 조회는 service-role 클라이언트로 분리되어 anti-cheat 보장. 인증은 PR #6/#7-A로 부트스트랩 + PR #7-B(#10)에서 `/login`/`/auth/callback` 구현 완료 + **PR #11(`feature/remove-guest-flow`) 머지 완료** — 랭킹/경쟁 게임 특성에 맞춰 익명 게스트 플로우 전면 제거(`GuestStartButton`/`useAutoAnonymousAuth`/`isAnonymousUser` 삭제, `linkIdentity` 분기 제거, Supabase 익명 토글 OFF + 익명 유저 2명 삭제 완료). `/play/[matchId]`는 비로그인 시 `/login` redirect 임시 적용 — middleware 가드 / AuthListener / UserMenu / 메인 화면은 PR #7-C 예정.

---

## 기술 스택

### 런타임 / 프레임워크

- **Next.js 16.2.2** (App Router)
- **React 19.2.4** + **React DOM 19.2.4**
- **TypeScript 5**
- **Tailwind CSS v4** (PostCSS 플러그인)

### 데이터 / 인증

- **Supabase** — `@supabase/ssr ^0.10.0` + `@supabase/supabase-js ^2.101.1`
- **TanStack React Query 5.96.2**
- **Zustand 5.0.12** — 클라이언트 상태(현재 사운드 토글 1개만)

### UI / 에디터

- **shadcn 4.1.2** + **@base-ui/react 1.3.0**
- **Monaco Editor** (`@monaco-editor/react ^4.7.0`)
- **lucide-react 1.7.0** (아이콘)
- **sonner 2.0.7** (toast)
- **react-markdown 10** + **remark-gfm 4** (문제 설명 렌더링)
- **next-themes 0.4.6** (테마 스위처 — 현재 미사용)
- **tw-animate-css 1.4.0**

### 외부 API (서버사이드)

- **Judge0** (RapidAPI) — 코드 채점
- **Google Gemini** — AI 코드 리뷰 (env에는 키 등록, 코드 호출처는 미구현)

---

## 앱 구조

```
app/
├── (main)/
│   ├── play/[matchId]/page.tsx   ✅  매치 진행 (인증/문제/에디터/채점/결과 전부 인라인)
│   ├── result/[matchId]/         ⏳  빈 디렉토리 (결과는 /play 안에서 처리 중)
│   ├── dashboard/                ⏳  빈 디렉토리 (PR #8 예정)
│   ├── leaderboard/              ⏳  빈 디렉토리 (장기)
│   └── profile/[userId]/         ⏳  빈 디렉토리 (PR #9 예정)
├── (auth)/
│   ├── layout.tsx                ✅  풀스크린 레이아웃 (PR #7-B)
│   └── login/
│       ├── page.tsx              ✅  OAuth 2종 (PR #7-B, 게스트 플로우 제거)
│       ├── _components/OAuthButton.tsx ✅  signInWithOAuth 단일 경로 (PR #7-B)
│       └── _utils/buildOAuthRedirect.ts ✅  PR #7-B
├── auth/callback/route.ts        ✅  exchangeCodeForSession + 닉네임 동기화, runtime=nodejs (PR #7-B)
├── api/
│   ├── judge/route.ts            ✅  Judge0 호출 (테스트 케이스별 결과 반환)
│   ├── match/route.ts            ✅  매치 생성 + 호스트 등록
│   ├── match/[matchId]/join/     ✅  참가자 추가
│   ├── match/[matchId]/submit/   ✅  최종 채점 + 점수/승패 + 브로드캐스트
│   ├── problems/route.ts         ✅  문제 목록 조회
│   ├── problems/[problemId]/     ✅  문제 단건 조회
│   └── ai/                       ⏳  빈 디렉토리 (Gemini 리뷰 API 미구현)
├── features/
│   ├── editor/                   ✅  CodeEditor + EditorPanel + ResultPanel + types
│   ├── match/                    ✅  MatchStatusBar + SoundToggle + 3 hooks (Realtime/Sounds/Timer) + utils
│   ├── problem/                  ✅  ProblemPanel + types
│   └── review/                   ⏳  빈 디렉토리 (AI 리뷰 UI 미구현)
├── shared/
│   ├── components/QueryProvider  ✅  staleTime 60s + retry 1 글로벌
│   ├── hooks/useAuth             ✅  단일 진입점 (React Query + fallback upsert)
│   ├── lib/supabase/{client,server,service}.ts ✅  브라우저/서버(anon) + service-role(server-only)
│   └── stores/useSoundStore.ts   ✅  Zustand 사운드 토글
├── layout.tsx                    ✅  QueryProvider + Sonner Toaster
└── page.tsx                      🚨  Next.js create-next-app 기본 템플릿 그대로

components/ui/                    ✅  shadcn 8개 (avatar/button/card/dialog/dropdown-menu/input/label/sonner)
lib/utils.ts                      ✅  shadcn cn() 헬퍼
middleware.ts                     ✅  Supabase 세션 쿠키 자동 갱신만 (라우트 가드 없음 — PR #7-C 예정)
```

---

## 구현 완료 영역 ✅

### 핵심 매치 루프 (Step 1~2)

- 매치 생성 → 참가자 등록 → 매치 시작 → 코드 작성 → 실시간 진행 상태 → 최종 채점 → 승자 판정 → 결과 표시
- Race condition 방어: `submit/route.ts`에서 `eq("status", "ongoing")` 가드로 동시 finish 방지
- 멱등성: 동일 유저의 중복 제출 시 기존 submission 반환
- 점수 산출: `(passed/total × 1000) + ((Tmax-Tused)/Tmax × 500)` (서버 단독, anti-cheat)

### 인증 인프라 (Step 3 — PR #6 + #7-A + #7-B)

- OAuth(Google/GitHub) 로그인 (`/login`) + `/auth/callback`에서 `exchangeCodeForSession` + 닉네임/아바타 동기화
- `auth.users` AFTER INSERT 트리거 → `public.profiles` 자동 생성 (best-effort)
- `useAuth` 단일 진입점 + 트리거 실패 대비 fallback upsert
- `profiles` RLS 3종 (`public_read` + `self_update` + `self_insert`)
- 게스트(익명) 로그인 플로우는 랭킹/경쟁 게임 부적합으로 `feature/remove-guest-flow`에서 제거. `/play/[matchId]`는 비로그인 시 임시 클라이언트 redirect (PR #7-C에서 미들웨어로 대체)

### 실시간 (Supabase Realtime broadcast)

- 채널: `match:{matchId}`
- 이벤트: `PLAYER_READY`, `PROGRESS_UPDATE`, `OPPONENT_SUBMITTED`, `MATCH_FINISHED`
- 호출처: `useMatchRealtime` hook + `submit/route.ts`

### UX 보강 (Step 2)

- 사운드 토글 (Zustand persist) — `useSoundStore` + `SoundToggle`
- 매치 타이머 (`useMatchTimer`) — 15분 카운트다운
- 매치 사운드 (`useMatchSounds`) — 효과음 재생

---

## 부분 구현 / 스텁 영역 🔄 ⏳

| 영역                       | 마커 | 비고                                                                                           |
| -------------------------- | ---- | ---------------------------------------------------------------------------------------------- |
| `app/page.tsx` 메인 화면   | 🚨   | Next.js 기본 템플릿. PR #7-C 또는 별도 PR로 재작성 필요                                        |
| `app/(auth)/login/`        | ✅   | PR #7-B 완료 (`signInWithOAuth` 단일 경로, 게스트 시작은 `feature/remove-guest-flow`에서 제거) |
| `app/auth/callback/`       | ✅   | PR #7-B 완료 (`exchangeCodeForSession` + 닉네임/아바타 동기화 1·2단 fallback)                  |
| `app/(main)/dashboard/`    | ⏳   | Step 3 매칭 PR 예정 (친구 초대 매치 리스트)                                                    |
| `app/(main)/profile/[id]/` | ⏳   | Step 3 프로필 PR 예정 (프로필 보기 + 닉네임 편집)                                              |
| `app/(main)/leaderboard/`  | ⏳   | 명세 미정 (장기)                                                                               |
| `app/(main)/result/[id]/`  | ⏳   | 빈 디렉토리. 결과는 `/play` 페이지 인라인 (분리 여부 미정)                                     |
| `app/api/ai/`              | ⏳   | 빈 디렉토리. Gemini 코드 리뷰 API 미구현                                                       |
| `app/features/review/`     | ⏳   | 빈 디렉토리. AI 리뷰 UI 미구현                                                                 |
| 라우트 가드 (middleware)   | ⏳   | 현재 middleware는 세션 쿠키 갱신만 함 — 인증 분기 없음 (PR #7-C 예정)                          |
| AuthListener (전역)        | ⏳   | `onAuthStateChange` 단일 구독 미구현 (PR #7-C 예정)                                            |
| UserMenu                   | ⏳   | 로그인된 유저 드롭다운 메뉴 미구현 (PR #7-C 예정)                                              |
| Edge Functions             | ⏳   | 0개 (`mcp__supabase__list_edge_functions` 결과 비어있음)                                       |

---

## 알려진 결함 / 잠재 이슈 🚨

### 1. ✅ Resolved — `problems` / `test_cases` / `ai_reviews` RLS 정책

- `20260426_rls_problems_test_cases.sql`로 정책 3종 추가:
  - `problems.public_read` — `USING (true)`
  - `test_cases.visible_read` — `USING (is_hidden = false)` (히든은 service role만)
  - `ai_reviews.self_read` — submission JOIN으로 본인 리뷰만
- `submit/route.ts`는 `createServiceClient()`로 분기되어 히든 케이스 RLS bypass — anti-cheat 보장
- `app/api/problems/[problemId]/`는 이미 `.eq("is_hidden", false)` 가드 존재

### 2. ✅ Resolved — `problems` / `test_cases` 시드

- `20260426_seed_problems.sql`로 멱등 INSERT 적용 (problems 9건 / test_cases 43건)
- 운영 DB에는 이미 동일 데이터 존재 → 마이그레이션은 신규 환경 부트스트랩 + 회귀 방어용
- problems: `ON CONFLICT (id) DO NOTHING`, test_cases: `WHERE NOT EXISTS` 패턴

### 3. 🚨 UI — `app/page.tsx` 메인 화면 미구현

- Next.js create-next-app 기본 템플릿 그대로 (Vercel/Templates 안내 텍스트)
- PR #7-B에서 `/login`을 만들어도 진입할 메인 화면이 없는 어색한 동선
- PR 우선순위 재검토 권장

### 4. ✅ Resolved — 후속 보강 (PR #9 머지 완료)

- `useAuth`에 `retry` 함수 명시 (4xx 즉시 fail / 그 외 1회 재시도) + queryFn에 explicit `throw` 추가 → retry 정책이 실효적으로 동작
- `app/shared/lib/supabase/service.ts` 모듈 레벨 lazy 싱글턴 + `SupabaseClient` 명시 타입 + `submit/route.ts` ENV fail-fast try/catch + 에러 메시지 차별화 (`E_JUDGE0` / `E_SERVICE`)
- `20260427_test_cases_unique_constraint.sql`로 `(problem_id, input, is_hidden)` UNIQUE 제약 + `is_hidden NOT NULL` 보강 (DO 블록 + `IF (NOT) EXISTS` 가드로 멱등)
- (`useAutoAnonymousAuth`는 `feature/remove-guest-flow`에서 파일째 삭제되어 isMounted 가드 항목 자체가 N/A)

### 5. ⚠️ Env — 일관성 깨진 키 이름

- `GITHUB_CLIENT_SECRETS` (복수형 — 표준은 `_SECRET`)
- 한국어 키: `클라이언트_ID`, `클라이언트_보안_비밀번호` (Google Console 한국어 export 그대로 보임)
- `LEGACY_NEXT_PUBLIC_SUPABASE_URL` / `LEGACY_..._ANON_KEY` 도 잔재 — 정리 필요 여부 확인

### 6. ℹ️ MCP — `list_migrations` 빈 배열

- 마이그레이션을 SQL Editor 수동 실행으로 적용해서 Supabase의 `supabase_migrations` 시스템 테이블에는 등록 안 됨
- 운영 환경 보존엔 문제 없으나, 향후 CLI 기반 자동화 도입 시 한 번 reconcile 필요

---

## DB 상태

### 테이블 (7개, 모두 RLS enabled)

| 테이블               | rows | 정책 수 | 주요 FK                                                                                          |
| -------------------- | ---- | ------- | ------------------------------------------------------------------------------------------------ |
| `profiles`           | 3    | 3       | `id → auth.users.id` (PR #11 익명 정리 후: 시드 2 + 본인 1)                                      |
| `problems`           | 9    | 1       | —                                                                                                |
| `test_cases`         | 43   | 1       | `problem_id → problems.id` (`is_hidden` NOT NULL + (problem_id, input, is_hidden) UNIQUE, PR #9) |
| `matches`            | 0    | 4       | `winner_id`, `host_id → profiles.id`, `problem_id → problems.id`                                 |
| `match_participants` | 0    | 3       | `match_id → matches.id`, `user_id → profiles.id`                                                 |
| `submissions`        | 0    | 2       | `match_id → matches.id`, `user_id → profiles.id`                                                 |
| `ai_reviews`         | 0    | 1       | `submission_id → submissions.id`                                                                 |

### RLS 정책 (15개)

```
match_participants  → match_read (SELECT, true) / self_insert (user_id=uid) / self_delete (user_id=uid)
matches             → public_read (true) / anon_insert (true) / participant_update / participant_delete_waiting
profiles            → public_read (true) / self_insert (id=uid) / self_update (id=uid)
submissions         → match_participant_read / self_insert (user_id=uid)
problems            → public_read (SELECT, true)
test_cases          → visible_read (SELECT, is_hidden = false)
ai_reviews          → self_read (SELECT, TO authenticated, submission_id IN (SELECT id FROM submissions WHERE user_id = (SELECT auth.uid())))
```

### 트리거

- `auth.users` AFTER INSERT → `public.handle_new_user()` (SECURITY DEFINER) — 활성화됨

### 함수

- `public.handle_new_user()` — profiles 자동 생성
- `public.rls_auto_enable()` — 용도 미상 (`20260412_minimal_rls.sql` 외 어디서도 참조 없음 — 잔재 가능성)

### `matches` 추가 컬럼 (PR #6 선반영, PR #8에서 사용 예정)

- `invite_token TEXT UNIQUE`
- `invite_expires_at TIMESTAMPTZ`
- `host_id UUID REFERENCES profiles(id)`

---

## 마이그레이션 이력 (`supabase/migrations/`)

| 파일                                        | 내용                                                                                                         |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `20260412_minimal_rls.sql`                  | 최소 RLS (matches/match_participants/submissions)                                                            |
| `20260425_handle_new_user_trigger.sql`      | profiles 자동 생성 트리거 + 함수                                                                             |
| `20260425_backfill_missing_profiles.sql`    | 누락 익명 유저 백필                                                                                          |
| `20260425_profiles_rls_policies.sql`        | profiles `public_read` + `self_update`                                                                       |
| `20260425_match_invite_columns.sql`         | matches invite 컬럼 3종 + 부분 인덱스                                                                        |
| `20260425_pr5_review_index_cleanup.sql`     | UNIQUE 제약과 중복된 인덱스 제거 (Code Reviewer 피드백)                                                      |
| `20260425_pr7a_profiles_insert_policy.sql`  | profiles `self_insert` 정책 (Code Reviewer Critical fix)                                                     |
| `20260426_rls_problems_test_cases.sql`      | problems/test_cases/ai_reviews RLS 3종 (히든은 service role 전용)                                            |
| `20260426_seed_problems.sql`                | 9 problems + 43 test_cases 멱등 시드 (SoT 확보)                                                              |
| `20260427_test_cases_unique_constraint.sql` | `test_cases (problem_id, input, is_hidden)` UNIQUE 제약 + `is_hidden NOT NULL` (DO 블록 멱등, I-5 follow-up) |

---

## 외부 의존성 / 환경 변수

| 변수                                         | 용도                        | 코드 사용처                                             |
| -------------------------------------------- | --------------------------- | ------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                   | Supabase 프로젝트 URL       | client.ts, server.ts, middleware.ts                     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`              | anon 키                     | 동상                                                    |
| `SUPABASE_SERVICE_ROLE_KEY`                  | service role 키 (서버 전용) | `app/shared/lib/supabase/service.ts` (히든 케이스 조회) |
| `LEGACY_NEXT_PUBLIC_SUPABASE_*`              | 구 키 잔재 (정리 후보)      | 미사용                                                  |
| `CALLBACK_URL`                               | OAuth callback URL          | (PR #7-B에서 사용 예정)                                 |
| `JUDGE0_API_URL` / `_KEY` / `_HOST`          | Judge0 (RapidAPI)           | judge/route.ts, submit/route.ts                         |
| `GEMINI_API_KEY`                             | Gemini AI 리뷰              | (미구현 — `app/api/ai/` 빈 디렉토리)                    |
| `GITHUB_CLIENT_ID` / `_SECRETS`              | GitHub OAuth Provider       | (PR #7-B에서 사용 예정)                                 |
| `클라이언트_ID` / `클라이언트_보안_비밀번호` | Google OAuth Provider       | (PR #7-B에서 사용 예정)                                 |

---

## 관련 문서

| 문서                      | 위치                   | 용도                            |
| ------------------------- | ---------------------- | ------------------------------- |
| `CLAUDE.md`               | 레포 루트              | 작업 규칙 (DB 검증 + 화면 추적) |
| `SCREEN_STATUS.md`        | 레포 루트              | 화면 단위 추적 (이 문서와 짝)   |
| `README.md`               | 레포 루트              | 외부 공개용 프로젝트 소개       |
| `BLUE_PRINT/BLUEPRINT.md` | `BLUE_PRINT/`          | 전체 단계 명세 (Step 1~N)       |
| `docs/`                   | 레포 루트 (gitignored) | 내부 작업 명세 (커밋 안 됨)     |
| `supabase/migrations/`    | 레포 루트              | DB 스키마 변경 이력             |

---

## 마지막 갱신

- **일자**: 2026-05-03
- **시점**: PR #11 (`feature/remove-guest-flow`) dev 머지 완료 + Supabase 익명 토글 OFF + 익명 유저 2명 직접 삭제 완료. 로컬 dev 최신화 완료.
- **변경 요약**: 게스트(익명) 로그인 플로우 전면 제거. `GuestStartButton` / `useAutoAnonymousAuth` / `isAnonymousUser` 삭제, `useAuth.isAnonymous` 반환 제거, `OAuthButton`의 `linkIdentity` 분기 + 디버그 로그 제거, `/play/[matchId]`는 비로그인 시 `/login` redirect (임시, PR #7-C에서 미들웨어로 대체). DB 정합성 검증 완료(orphan profiles 0).
- **다음 액션 순서**:
  1. **PR #7-C** — middleware 라우트 가드 + AuthListener + UserMenu + **`app/page.tsx` 메인 화면 재작성**. PR #11 보안 리뷰에서 발견된 3개 항목 우선 반영:
     - `/login/page.tsx`의 `next` 파라미터에 `safeNext` 화이트리스트 적용 (open redirect 차단)
     - middleware로 `/play/*`, `/result/*`, `/dashboard` 등 인증 필수 라우트 SSR 가드 → `/play/[matchId]/page.tsx`의 임시 client redirect (`TODO(PR-7C)` 주석 위치) 제거
     - `/api/*` 라우트 핸들러에 `supabase.auth.getUser()` 체크 + 401 응답
  2. **Step 3 매칭 PR** — `/dashboard` + 친구 초대 + `POST /api/match/invite` + `/invite/[token]` + invite_token 흐름
  3. **Step 3 프로필 PR** — `/profile/[userId]` + `/profile/me` + 닉네임 편집 + 닉네임 3차 fallback 모달
  4. **시드 SQL ON CONFLICT 단순화** (별도 후속 — 우선순위 낮음): `20260426_seed_problems.sql`의 `WHERE NOT EXISTS` 패턴을 `ON CONFLICT (problem_id, input, is_hidden) DO NOTHING`로 리팩터 (PR #9의 UNIQUE 제약으로 사전 작업 완료)
