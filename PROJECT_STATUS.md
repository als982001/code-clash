# Project Status — Code Clash

> 프로젝트 전체 현황 SoT(Single Source of Truth). 화면 단위 추적은 `SCREEN_STATUS.md` 참고.
> 작업 시작 전 이 문서로 큰 그림 파악 → SCREEN_STATUS로 화면 단위 검증 → 코드 진입.

---

## 한 줄 진단

**[2026-06-07] MVP 핵심 루프(매칭 → 대전 → 결과 → AI 리뷰 → MMR → 리더보드) 전부 완성 + main 머지 완료. Post-MVP 전 소소 이슈 정리(PR #29) 완료.** 친구 초대 매칭 + 자동 매칭 큐(MVP A-2, PR #24) 두 진입로 → 실시간 1:1 대전(Monaco + Judge0 채점, 15분 타이머, HUD/사운드/토스트) → 결과 화면(Shiki SSR 코드 비교) + Gemini AI 코드 리뷰(캐싱) → Elo(K=32) MMR/티어 갱신 → 리더보드(MVP A-1, PR #23) 순위 + 누적 전적(승/패/무 + 승률, `get_leaderboard` RPC, 2026-06-13). 인증은 Supabase OAuth(Google/GitHub) + middleware SSR 가드 + 전 API `requireUser` 401. 글로벌 네비 메뉴바(홈/대전하기/리더보드, PR #26)가 홈·(main) 헤더에 마운트. 문제 패널은 구조화 컬럼(`description`/`input_format`/`output_format`/`examples`) 기반 섹션 카드(PR #25). matches status는 `MATCH_STATUS` 상수 + `TMatchStatus` 타입으로 중앙화(PR #29).

**보안 (write primitive 3종 차단 완료)**: score/winner/mmr 컬럼 모두 — 인가 사용자 UPDATE default deny + service-role 단독 갱신 + BEFORE UPDATE 보호 컬럼 트리거(안전망)로 PostgREST PATCH 위조 차단. invite/matchmaking RPC는 SECURITY DEFINER + 적절한 EXECUTE 권한 분리(matchmaking은 service_role 단독, anon/authenticated REVOKE). 상세는 아래 "구현 완료 영역" + "DB 상태".

**다음**: 리더보드 전적 표시(`get_leaderboard` 집계 RPC) **완료(2026-06-13, PR #30)**. **다음 최우선 = 대전 히스토리(A-5)** — BLUEPRINT §3.6 풀이 히스토리, `/profile/[userId]`에 개별 매치 리스트(vs 상대/승패/문제/날짜). 데이터 기존재(matches/match_participants)·한계비용 낮음·표본 작아도 즉시 가치라 A-3 앞에 배치. `get_match_history` SECURITY DEFINER RPC(`get_leaderboard`와 동형) + 화면. 이후 A-3 역량 분석(데이터 축적 후)·A-4 AI 봇·기술 부채 B-1~8 — `docs/NEXT_SESSION.md`를 SoT로 관리. (A-2 실매치 런타임 수동 검증 1회 권장 — 코드/DB는 머지 완료, 런타임 미검증.)

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
- **Google Gemini** (`@google/genai ^2.7.0`) — AI 코드 리뷰 (PR Step 4-B, `/api/match/[matchId]/review` + `generateReview` JSON 구조화 출력)

---

## 앱 구조

```
app/
├── (main)/
│   ├── layout.tsx                ✅  글로벌 sticky 헤더 (h-14, z-40, backdrop-blur) + <main flex-1> wrapper, <UserMenu /> 일괄 마운트 (B PR)
│   ├── result/[matchId]/page.tsx                              ✅  server component — status pre-check + Promise.all 풀 fetch + Shiki SSR 하이라이팅 + 분기 (notFound / redirect /play / render) (PR Step 4-A)
│   ├── result/[matchId]/_components/ResultView.tsx            ✅  client — 레이아웃 + 모바일 반응형(grid → stack) + 홈 Link (PR Step 4-A)
│   ├── result/[matchId]/_components/ResultHeader.tsx          ✅  server — 승/패/무 배너 + 양쪽 점수 (PR Step 4-A)
│   ├── result/[matchId]/_components/ParticipantCodeCard.tsx   ✅  server — 아바타/닉네임/점수 + Shiki HTML (PR Step 4-A)
│   ├── result/[matchId]/_components/AiReviewSection.tsx       ✅  client — ai_reviews SSR 분기 + 없으면 lazy 생성(POST review) + 로딩/에러/재시도 (PR Step 4-B)
│   ├── result/[matchId]/_utils/getResultData.ts               ✅  server-only — 4 fetch + RLS 0건 detect (PR Step 4-A)
│   └── result/[matchId]/_utils/highlightCode.ts               ✅  server-only — Shiki + escape 폴백 (PR Step 4-A)
│   ├── dashboard/page.tsx        ✅  친구 초대 카드 (PR #7-D, B PR에서 임시 헤더 + 외곽 wrapper 제거)
│   ├── dashboard/_components/InviteCard.tsx ✅  POST /api/match/invite → Dialog (PR #7-D)
│   ├── leaderboard/page.tsx     ✅  MVP A-1 — server component, getLeaderboard(MMR DESC) + LeaderboardView (순위 리스트, 프로필 Link, 본인 하이라이트, 전적 제외)
│   ├── profile/[userId]/page.tsx ✅  server component — Promise.all로 profile + get_profile_stats RPC 병렬 fetch + isMe 분기 (PR #18)
│   ├── profile/[userId]/_components/ProfileView.tsx ✅  Avatar/닉네임/가입일/bio/누적 전적 + 본인이면 편집 버튼 + 자동 닉네임이면 fallback 자동 발화 (PR #18)
│   ├── profile/[userId]/_components/ProfileEditDialog.tsx ✅  nickname/bio 편집, isMountedRef + Strict Mode reset, queryClient.invalidateQueries(AUTH_QUERY_KEY) + router.refresh() (PR #18)
│   ├── profile/[userId]/_components/NicknameFallbackDialog.tsx ✅  자동 생성 닉네임(/^(Player|Anon)_[0-9a-f]{8}$/) 1회 권유, useState lazy initializer 패턴 (PR #18, lint fix)
│   └── profile/me/page.tsx       ✅  server component — auth.getUser() → redirect(/profile/${user.id}). middleware 가드 + 라우트 자체 방어 (PR #18)
├── play/[matchId]/page.tsx       ✅  매치 진행 + 5단계 분기. **B PR에서 (main) 그룹 밖으로 이전 — Monaco 풀스크린 보존을 위해 글로벌 헤더 미적용. URL은 라우트 그룹과 무관으로 동일** (PR #7-D + B PR)
├── play/[matchId]/_components/HostWaitingView.tsx       ✅  호스트 대기 화면 (URL 복사 + 만료 분기 + Realtime 안내, PR #7-D + B PR 이전)
├── play/[matchId]/_components/WaitingForGameStart.tsx   ✅  비호스트 race window 스피너 (PR #7-D + B PR 이전)
├── (auth)/
│   ├── layout.tsx                ✅  풀스크린 레이아웃 (PR #7-B)
│   └── login/
│       ├── page.tsx              ✅  OAuth 2종 + sanitizeNext 적용 (PR #7-B + #7-C)
│       ├── _components/OAuthButton.tsx ✅  signInWithOAuth 단일 경로 (PR #7-B)
│       └── _utils/
│           ├── buildOAuthRedirect.ts  ✅  sanitizeNext 적용 (PR #7-B + #7-C)
│           └── sanitizeNext.ts        ✅  same-origin 화이트리스트 헬퍼 (PR #7-C)
├── auth/callback/route.ts        ✅  exchangeCodeForSession + sanitizeNext + 닉네임 동기화 (PR #7-B + #7-C)
├── invite/[token]/page.tsx       ✅  비인증 허용 서버 컴포넌트 + 5분기 검증 (PR #7-D)
├── invite/[token]/_components/JoinInvite.tsx ✅  호스트 redirect / 비로그인 CTA / 게스트 입장 (PR #7-D)
├── api/
│   ├── judge/route.ts            ✅  Judge0 호출 + requireUser 401 가드 (PR #7-C)
│   ├── match/invite/route.ts     ✅  친구 초대 매치 + 토큰 발급 (PR #7-D, runtime=nodejs)
│   ├── match/[matchId]/join/     ✅  참가자 추가 + requireUser (PR #7-C)
│   ├── match/[matchId]/submit/   ✅  최종 채점 + requireUser (PR #7-C)
│   ├── match/[matchId]/review/   ✅  AI 코드 리뷰 생성/조회 + 소유검증 + 캐싱 + Gemini + service-role upsert (PR Step 4-B, runtime=nodejs)
│   ├── problems/route.ts         ✅  문제 목록 + requireUser (PR #7-C)
│   ├── problems/[problemId]/     ✅  문제 단건 + requireUser (PR #7-C)
│   └── profile/me/route.ts       ✅  PATCH 본인 프로필 갱신 + requireUser + UNIQUE 23505 → 409 정밀 매핑 + RLS silent fail 가드 (PR #18)
├── _components/
│   └── HomeClient.tsx            ✅  홈 페이지 client view — UserMenu 헤더(B PR에서 글로벌 헤더와 동일 className으로 통일) + 분기 + 매치 placeholder + 대시보드 카드 활성화 (PR #7-C/#7-D + B PR)
├── features/
│   ├── editor/                   ✅  CodeEditor + EditorPanel + ResultPanel + types
│   ├── match/                    ✅  MatchStatusBar + SoundToggle + 4 hooks (Realtime/Sounds/Timer/Status) + utils (createInviteToken/isInviteExpired/calculateMmr/getTierByMmr) + types/invite (calculateMmr/getTierByMmr Step 4.5)
│   ├── problem/                  ✅  ProblemPanel + types
│   ├── profile/                  ✅  types/index.ts + utils 4종(getProfileStats / isAutoGeneratedNickname / formatJoinDate / validateNickname, PR #18)
│   ├── result/                   ✅  types/index.ts (IResultData, IResultParticipant, IHighlightedCode) — PR Step 4-A
│   └── review/                   ✅  types/index.ts(IAiReviewContent/IAiReview) + utils(generateReview / getAiReview) (PR Step 4-B)
├── shared/
│   ├── components/
│   │   ├── QueryProvider.tsx     ✅  staleTime 60s + retry 1 글로벌 + AuthListener 마운트 (PR #7-C)
│   │   ├── AuthListener.tsx      ✅  onAuthStateChange 전역 단일 구독 (PR #7-C)
│   │   ├── GlobalNav.tsx         ✅  글로벌 네비 메뉴바 (홈/대전하기/리더보드, usePathname active + aria-current, buttonVariants 패턴, 모바일 overflow-x-auto). (main)/layout.tsx + HomeClient 양쪽 헤더 재사용 (2026-06-06)
│   │   └── UserMenu.tsx          ✅  로그인/비로그인 분기 + Avatar 드롭다운 + 로그아웃. **마운트 지점 2곳**: HomeClient (홈) + (main)/layout.tsx (글로벌 헤더) (PR #7-C + B PR)
│   ├── hooks/useAuth             ✅  단일 진입점 + AUTH_QUERY_KEY export (PR #7-C)
│   ├── lib/
│   │   ├── auth/
│   │   │   ├── requireUser.ts    ✅  API 라우트 401 가드 헬퍼 (PR #7-C)
│   │   │   └── protectedPaths.ts ✅  middleware + client 공유 (PROTECTED_PREFIXES + isProtectedPath) (PR #7-C)
│   │   └── supabase/{client,server,service}.ts ✅  브라우저/서버(anon) + service-role(server-only, PR #16에서 admin.ts 제거하고 createServiceClient로 통일)
│   └── stores/useSoundStore.ts   ✅  Zustand 사운드 토글
├── layout.tsx                    ✅  QueryProvider + Sonner Toaster
└── page.tsx                      ✅  서버 wrapper (HomeClient 마운트, PR #7-C)

components/ui/                    ✅  shadcn 8개 (avatar/button/card/dialog/dropdown-menu/input/label/sonner) + button-variants.ts (server-safe cva, PR #7-D)
lib/utils.ts                      ✅  shadcn cn() 헬퍼
middleware.ts                     ✅  세션 쿠키 갱신 + 보호 prefix(/play, /result, /dashboard, /profile/me) SSR 가드 + /api/* 분기 (PR #7-C)
```

---

## 구현 완료 영역 ✅

### 핵심 매치 루프 (Step 1~2)

- 매치 생성 → 참가자 등록 → 시작 → 코드 작성 → 실시간 진행 → 최종 채점 → 승자 판정 → 결과
- Race 방어(`submit/route.ts` `eq("status","ongoing")`) + 중복 제출 멱등 + 서버 단독 점수 산출(anti-cheat): `(passed/total × 1000) + ((Tmax-Tused)/Tmax × 500)`

### 인증 인프라 (Step 3)

- OAuth(Google/GitHub) `/login` + `/auth/callback` `exchangeCodeForSession` + 닉네임/아바타 동기화
- `auth.users` AFTER INSERT 트리거 → `profiles` 자동 생성, `useAuth` 단일 진입점 + fallback upsert
- middleware 보호 prefix SSR 가드 + AuthListener 전역 단일 구독(SIGNED_IN/OUT/USER_UPDATED만 invalidate) + UserMenu 드롭다운. 익명 게스트 플로우 제거(PR #11)
- 보안 헬퍼 3종: `sanitizeNext`(open redirect 차단) / `requireUser`(API 401 통일) / `protectedPaths`(prefix 매칭)

### 실시간 (Supabase Realtime)

- broadcast 채널 `match:{matchId}` — `PLAYER_READY`/`PROGRESS_UPDATE`/`OPPONENT_SUBMITTED`/`MATCH_FINISHED` (`useMatchRealtime` + submit 라우트)
- postgres_changes 채널: `match-status:{matchId}`(matches) / `matchmaking-queue:{userId}`(큐)

### UX 보강 (Step 2)

- 사운드 토글(Zustand persist) + 15분 매치 타이머(`useMatchTimer`) + 효과음(`useMatchSounds`)

### Step 3 매칭 (PR #7-D)

- 친구 초대 흐름: 호스트 `/dashboard` invite URL 발급 → 게스트 `/invite/[token]` 입장 → `/play` 자동 전환
- `POST /api/match/invite`(nodejs, 22자 토큰, 충돌 재시도, inviteUrl 3-tier origin fallback) + `/invite/[token]` 5분기 검증(not_found/already_started/already_finished/expired/full) + `JoinInvite`
- `useMatchStatus`(초기 fetch + Realtime + 30초 폴링) + `HostWaitingView`/`WaitingForGameStart` + `/play` 5단계 분기
- `buttonVariants` server-safe 모듈 분리(`"use client"` export 함수의 RSC 룰 우회)

### Step 3 보안 강화 (PR #14)

- RLS 좁힘(`20260510_*`): matches/match_participants/profiles 전부 `TO authenticated`로 anon SELECT 차단
- `get_invite_match_by_token` SECURITY DEFINER RPC — `/invite/[token]` 비인증 검증용, 반환 컬럼에서 `invite_token` 제외
- `/api/match/[matchId]/join`에 invite token 명시 검증(RLS + mutation 이중 게이트)

### 보안 — write primitive 3종 차단 (PR #16 + Step 4.5)

- **패턴**: 인가 사용자가 PostgREST PATCH로 게임 로직 컬럼을 위조하던 경로 3개를 모두 차단. 공통 처방 = 인가 UPDATE 정책 DROP(default deny) + 서버 라우트는 service-role 단독 갱신 + BEFORE UPDATE 보호 컬럼 트리거(service_role `auth.role()` 우회, 안전망)
  - **score** (`match_participants`): UPDATE 정책 부재로 submit의 score 갱신이 silently 차단돼 26건 NULL이던 회귀까지 동반 해소. `submit`에 `.select("id")` + row 0 가드 추가
  - **winner** (`matches`): 참가자가 자기를 winner로 직접 선언 가능하던 결함(score와 대칭) 차단
  - **mmr/tier** (`profiles`): `self_update`는 유지(nickname/bio 편집)하되 트리거가 평점 컬럼만 OLD 고정
- `admin.ts` 제거 → `createServiceClient()` 단일화(§D-2-a), `/api/match/route.ts` dead code 제거(§D-2-c)
- **운영 적용 순서**: 마이그레이션(BEGIN/COMMIT) → `schema_migrations` 수동 INSERT → 코드 배포. 코드 선배포 시 가드로 인해 submit 500

---

## 미구현 / 스텁 영역 ⏳

| 영역           | 마커 | 비고                                                                      |
| -------------- | ---- | ------------------------------------------------------------------------- |
| Edge Functions | ⏳   | 0개 (`list_edge_functions` 비어있음) — 서버 로직은 Next API 라우트로 충분 |

> `app/api/ai/` 빈 디렉토리는 PR #29에서 제거됨(AI 리뷰는 `match/[matchId]/review`로 구현).

> 그 외 화면/API/인증 인프라는 전부 ✅ 완료 — 위 "앱 구조" 트리 + `SCREEN_STATUS.md` 라우트 표 참고.

---

## 알려진 결함 / 잠재 이슈 🚨

### ✅ 해결됨 (이력 — 상세는 git / 마이그레이션 / 위 "보안" 섹션)

- `problems`/`test_cases`/`ai_reviews` RLS 정책 3종(`20260426_*`) + 시드 9문제·43케이스 멱등화
- 홈 화면(PR #7-C) / `useAuth` retry + `service.ts` 싱글턴 + `test_cases` UNIQUE 제약(PR #9)
- `admin.ts`↔`service.ts` 중복 제거(§D-2-a) / `matches.participant_update` WITH CHECK(§D-2-b)
- **score / winner / mmr write primitive 3종** + score silent fail 26건 NULL 회귀 (PR #16 + 후속 + Step 4.5) → "구현 완료 영역 > 보안" 참고

### ⚠️ 5. Env — 일관성 깨진 키 이름

- `GITHUB_CLIENT_SECRETS`(복수형 — 표준 `_SECRET`), 한국어 키(`클라이언트_ID`/`클라이언트_보안_비밀번호`, Google Console 한국어 export), `LEGACY_NEXT_PUBLIC_SUPABASE_*` 잔재 — 정리 후보

### ℹ️ 6. MCP — `list_migrations` 빈 배열

- SQL Editor 수동 실행으로 `supabase_migrations` 시스템 테이블 미등록. 운영엔 무해, CLI 자동화 도입 시 reconcile 필요(B-4)

### ℹ️ 7. 코드 리뷰 nit 후속

- ✅ LoginPage `text-zinc-400` → `text-muted-foreground` design token 통일 (PR #29). placeholder Card·jargon 카피는 PR #26에서 제거되며 stale. 남음: `app/_components/` 폴더 컨벤션 가이드(문서성)

### ℹ️ 11. 후속 정리 후보

- `match_participants.self_insert`/`self_delete` `TO public` → `TO authenticated` 일관화 / `submissions` UPDATE 정책 명시화 (B-1)

---

## DB 상태

### 테이블 (8개, 모두 RLS enabled)

| 테이블               | rows | 정책 수 | 주요 FK                                                                                                                                                               |
| -------------------- | ---- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profiles`           | 5    | 3       | `id → auth.users.id`. self_update 유지 + Step 4.5 `prevent_protected_profiles_update` 트리거로 평점 컬럼 보호                                                         |
| `problems`           | 9    | 1       | — (2026-06-06 컬럼 구조화: `description`=문제설명 본문만 / `input_format`·`output_format` TEXT NOT NULL / `examples` JSONB NOT NULL `[{input,output,explanation?}]`)  |
| `test_cases`         | 43   | 1       | `problem_id → problems.id` (`is_hidden` NOT NULL + (problem_id, input, is_hidden) UNIQUE, PR #9)                                                                      |
| `matches`            | 18   | 3       | `winner_id`, `host_id → profiles.id`, `problem_id → problems.id` (status: waiting 6 / ongoing 9 / finished 3)                                                         |
| `match_participants` | 30   | 3       | `match_id → matches.id`, `user_id → profiles.id` (PR #16 후속 커밋에서 self_update DROP — score write primitive fix)                                                  |
| `submissions`        | 6    | 2       | `match_id → matches.id`, `user_id → profiles.id`                                                                                                                      |
| `ai_reviews`         | 2    | 1       | `submission_id → submissions.id` UNIQUE (self_read SELECT만 — write 정책 부재, INSERT는 service-role 단독, PR #20)                                                    |
| `matchmaking_queue`  | 0    | 2       | `user_id → profiles.id` UNIQUE, `match_id → matches.id`. self_read/self_delete만 — **INSERT/UPDATE default deny**, status/match_id 는 service-role RPC 단독 (MVP A-2) |

### RLS 정책 (14개)

```
match_participants  → match_participants_co_participant_read (TO authenticated, 자기 row OR 같은 매치 참가자, PR #14) / self_insert (user_id=uid) / self_delete (user_id=uid)
matches             → matches_self_or_participant_read (TO authenticated, host_id=uid OR participant, PR #14) / anon_insert (true) / participant_delete_waiting
profiles            → profiles_authenticated_read (TO authenticated, USING true — anon 차단, PR #14) / self_insert (id=uid) / self_update (id=uid)
submissions         → match_participant_read / self_insert (user_id=uid)
problems            → public_read (SELECT, true)
test_cases          → visible_read (SELECT, is_hidden = false)
ai_reviews          → self_read (SELECT, TO authenticated, submission_id IN (SELECT id FROM submissions WHERE user_id = (SELECT auth.uid())))
```

### 트리거

- `auth.users` AFTER INSERT → `public.handle_new_user()` (SECURITY DEFINER) — 활성화됨
- `public.matches` BEFORE UPDATE → `public.prevent_protected_matches_update()` (SECURITY INVOKER, PR #16) — service_role 우회 분기 + 보호 컬럼 7종(id/host_id/invite_token/invite_expires_at/problem_id/start_time/created_at) OLD 고정. **winner write primitive fix 후 인가 사용자 UPDATE 정책 자체가 부재하므로 인가 사용자 흐름은 트리거에 도달하지 않음** — 트리거는 service-role 호출 검증 안전망 역할로 유지
- `public.match_participants` BEFORE UPDATE → `public.prevent_protected_match_participants_update()` (SECURITY INVOKER, PR #16) — service_role 우회 분기 + 보호 컬럼 6종(id/match_id/user_id/created_at/mmr_change/is_disconnected) OLD 고정. **score write primitive fix 후 인가 사용자 UPDATE 정책 자체가 부재하므로 인가 사용자 흐름은 트리거에 도달하지 않음** — 트리거는 service-role 호출이 정상 우회되는지 검증하는 안전망 역할로 유지
- `public.profiles` BEFORE UPDATE → `public.prevent_protected_profiles_update()` (SECURITY INVOKER, Step 4.5) — service_role 우회 분기 + 보호 컬럼 7종(mmr/tier/wins/losses/streak/id/created_at) OLD 고정. **matches/match_participants 와 달리 `self_update` 정책은 유지**(nickname/bio/avatar_url 편집 보존). 인가 사용자가 자기 mmr/tier 를 PostgREST PATCH 로 위조하던 write primitive 를 차단하고, submit 라우트의 MMR 갱신은 `auth.role()='service_role'` 로 우회. **DB 적용 완료 확인**

### 함수

- `public.handle_new_user()` — profiles 자동 생성
- `public.rls_auto_enable()` — 용도 미상 (`20260412_minimal_rls.sql` 외 어디서도 참조 없음 — 잔재 가능성)
- `public.get_invite_match_by_token(p_token text)` — SECURITY DEFINER STABLE, anon+authenticated EXECUTE. `/invite/[token]` 비인증 검증용. 반환 컬럼에서 `invite_token` 제외 (`id`, `status`, `host_id`, `invite_expires_at`, `participant_count`만) (PR #14)
- `public.prevent_protected_matches_update()` — `matches` BEFORE UPDATE 트리거 함수 (SECURITY INVOKER, PR #16). `auth.role() = 'service_role'` 분기로 service_role 호출은 검사 패스, 그 외에는 보호 컬럼 7종이 OLD와 다르면 RAISE EXCEPTION
- `public.prevent_protected_match_participants_update()` — `match_participants` BEFORE UPDATE 트리거 함수 (SECURITY INVOKER, PR #16). 동일 패턴으로 보호 컬럼 6종 잠금
- `public.get_profile_stats(p_user_id uuid)` — SECURITY DEFINER STABLE, anon+authenticated EXECUTE. matches/match_participants RLS가 본인 외 데이터 SELECT 차단하므로 타인 프로필 진입 시 전적 0/0/0 회귀 방지 목적. 반환: `{wins, losses, draws, total_finished}`. winner_id NULL이면서 status='finished'면 draw로 카운트 (PR #18)
- `public.find_or_enqueue_match(p_user_id uuid, p_mmr integer)` — SECURITY DEFINER, **service_role EXECUTE 단독** (`REVOKE ALL FROM PUBLIC`). 자동 매칭 큐 원자 처리: 본인 stale row upsert 정리 → 대기 상대 1명 `FOR UPDATE SKIP LOCKED` 탐색(`status='waiting'`, MMR 가장 가까운 순, 10분 좀비 제외) → 있으면 매치(`ongoing`, host_id NULL) + 참가자 2명 INSERT + 상대 큐 row `matched`+match_id 갱신, 없으면 본인 큐 `waiting` 등록(ON CONFLICT 멱등). 반환 `(matched bool, out_match_id uuid)`. 동시 진입 race 차단 (MVP A-2)
- `public.prevent_protected_profiles_update()` — `profiles` BEFORE UPDATE 트리거 함수 (SECURITY INVOKER, Step 4.5). `auth.role() = 'service_role'` 분기로 service_role 호출은 검사 패스, 그 외에는 보호 컬럼 7종(mmr/tier/wins/losses/streak/id/created_at)이 OLD와 다르면 RAISE EXCEPTION
- `public.get_leaderboard(p_limit integer)` — SECURITY DEFINER STABLE, **authenticated EXECUTE 단독** (anon 명시 REVOKE, `aclexplode` 검증: postgres/service*role/authenticated만). `get_profile_stats`의 전체 유저 확장판 — LEFT JOIN으로 0전 유저 포함, finished 매치 기준 mmr+wins/losses/draws/total_finished 집계(draws 필터에 `status='finished'` 조건으로 LEFT JOIN NULL row 오집계 방지), 익명(Anon*) 제외 + mmr DESC NULLS LAST → created_at ASC 정렬. 리더보드 전적 표시용 (2026-06-13, Post-MVP A-1 후속). `profiles.wins/losses/streak` 컬럼은 동기화 미보장이라 미사용·매치 재집계

### `matches` 추가 컬럼 (PR #6 추가 — 친구 초대 매칭에 사용 중)

- `invite_token TEXT UNIQUE`
- `invite_expires_at TIMESTAMPTZ`
- `host_id UUID REFERENCES profiles(id)`

---

## 마이그레이션 이력 (`supabase/migrations/`)

| 파일                                                        | 내용                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20260412_minimal_rls.sql`                                  | 최소 RLS (matches/match_participants/submissions)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `20260425_handle_new_user_trigger.sql`                      | profiles 자동 생성 트리거 + 함수                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `20260425_backfill_missing_profiles.sql`                    | 누락 익명 유저 백필                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `20260425_profiles_rls_policies.sql`                        | profiles `public_read` + `self_update`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `20260425_match_invite_columns.sql`                         | matches invite 컬럼 3종 + 부분 인덱스                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `20260425_pr5_review_index_cleanup.sql`                     | UNIQUE 제약과 중복된 인덱스 제거 (Code Reviewer 피드백)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `20260425_pr7a_profiles_insert_policy.sql`                  | profiles `self_insert` 정책 (Code Reviewer Critical fix)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `20260426_rls_problems_test_cases.sql`                      | problems/test_cases/ai_reviews RLS 3종 (히든은 service role 전용)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `20260426_seed_problems.sql`                                | 9 problems + 43 test_cases 멱등 시드 (SoT 확보)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `20260427_test_cases_unique_constraint.sql`                 | `test_cases (problem_id, input, is_hidden)` UNIQUE 제약 + `is_hidden NOT NULL` (DO 블록 멱등, I-5 follow-up)                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `20260510_tighten_rls_for_invite_security.sql`              | matches/match_participants/profiles RLS 좁힘(TO authenticated, anon 차단) + `get_invite_match_by_token` SECURITY DEFINER RPC 신설 (PR #14)                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `20260516_tighten_matches_participant_update.sql`           | `matches.participant_update` 정책에 WITH CHECK 추가(status·winner_id 잠금) + `prevent_protected_matches_update` BEFORE UPDATE 트리거(7개 보호 컬럼 OLD 고정, service_role 우회) (PR #16)                                                                                                                                                                                                                                                                                                                                                                                                  |
| `20260516_match_participants_self_update.sql`               | `match_participants.self_update` 정책 신설(user_id=auth.uid()) + `prevent_protected_match_participants_update` BEFORE UPDATE 트리거(6개 보호 컬럼 OLD 고정, score만 인가 갱신 허용, service_role 우회) (PR #16 회귀 fix)                                                                                                                                                                                                                                                                                                                                                                  |
| `20260516_fix_match_participants_score_write_primitive.sql` | `match_participants.self_update` 정책 DROP — score write primitive(인가 사용자가 PostgREST PATCH 로 자기 score 를 위조하는 경로) 차단. submit 라우트의 score 갱신은 service-role 로 전환 (PR #16 후속 커밋, 외부 리뷰 발견)                                                                                                                                                                                                                                                                                                                                                               |
| `20260516_fix_matches_winner_write_primitive.sql`           | `matches.participant_update` 정책 DROP — winner write primitive(인가 사용자가 PostgREST PATCH 로 자기 row 의 status/winner_id/end_time 을 위조하는 경로) 차단. submit 라우트의 matches finalize UPDATE 는 service-role 로 전환 (PR #16 후속 커밋, 외부 리뷰 2차 발견)                                                                                                                                                                                                                                                                                                                     |
| `20260517_profile_stats_rpc.sql`                            | `get_profile_stats(uuid)` SECURITY DEFINER STABLE RPC 신설. matches/match_participants RLS가 본인 외 데이터 차단하므로 타인 프로필 전적 집계가 0/0/0으로 잘못 표시되는 회귀를 막기 위해 RLS 우회. 반환은 카운트만 (개별 match row / opponent / PII 누출 없음). 사용자가 Supabase Studio에서 직접 적용 + 검증 SQL `(0,0,0,0)` 정상 반환 확인 (PR #18)                                                                                                                                                                                                                                      |
| `20260531_protect_profiles_rating_columns.sql`              | `prevent_protected_profiles_update` BEFORE UPDATE 트리거 신설. `profiles.self_update` 가 컬럼 제한 없이 mmr/tier 등을 위조 가능하던 write primitive 차단(보호 컬럼 7종 mmr/tier/wins/losses/streak/id/created_at OLD 고정, service_role 우회). self_update 정책은 유지(nickname/bio 편집). 사용자가 DB 직접 적용 + 트리거 존재 검증 완료 (Step 4.5)                                                                                                                                                                                                                                       |
| `20260603_matchmaking_queue.sql`                            | **MVP A-2** — `matchmaking_queue` 테이블 신설(user_id UNIQUE FK, mmr, status, match_id, created_at) + RLS self_read/self_delete만(**INSERT/UPDATE default deny** — status/match_id write primitive 방지, self_insert 의도적 미생성) + realtime publication ADD(멱등 DO 블록) + `find_or_enqueue_match` SECURITY DEFINER RPC(service_role 단독, `FOR UPDATE SKIP LOCKED` 원자 매칭, ON CONFLICT 멱등 등록). **DB 적용 완료** (PR #24 리뷰: RPC EXECUTE 를 `anon`/`authenticated` 에서 REVOKE — Supabase default privileges 로 자동 부여되던 노출 차단. DB 검증 완료)                       |
| `20260603_match_participants_unique.sql`                    | **PR #24 리뷰 #3** — `match_participants(match_id, user_id)` UNIQUE 제약 추가(기존 PK id 단독이라 중복 참가자 DB 방어선 부재). 멱등 DO 블록, 적용 전 중복 0건 확인. **DB 적용 완료** (`match_participants_match_user_unique` MCP 검증)                                                                                                                                                                                                                                                                                                                                                    |
| `20260606_problems_structured_columns.sql`                  | **problems 구조화** — `input_format`/`output_format` TEXT, `examples` JSONB NOT NULL DEFAULT `[]` 추가 + 기존 9건 id 기준 UPDATE 백필(description=문제설명만, #8/#9 `### 설명`→examples explanation) + 백필 자동 검증 DO 블록(미분리/누락 시 RAISE→롤백) + input/output_format NOT NULL. 원본 백업 테이블(`problems_description_backup_20260606`, RLS enable+anon/authenticated REVOKE) 보존. BEGIN/COMMIT 트랜잭션. **DB 적용 완료·MCP 검증**(9건 분리 정상). Code Review W-1/W-2 fix 반영                                                                                               |
| `20260606_seed_problems_structured.sql`                     | **신규 환경 부트스트랩 시드** — 9건을 새 구조(description/input_format/output_format/examples)로 INSERT, `ON CONFLICT (id) DO NOTHING`. 운영 DB엔 이미 존재라 미실행(돌려도 skip). 기존 `20260426_seed_problems.sql`은 과거 이력 보존용으로 미변경                                                                                                                                                                                                                                                                                                                                        |
| `20260613_get_leaderboard_rpc.sql`                          | **Post-MVP A-1 후속(리더보드 전적)** — `get_leaderboard(p_limit)` SECURITY DEFINER STABLE RPC 신설. `get_profile_stats` 전체 유저 확장판(LEFT JOIN으로 0전 유저 포함, finished 매치 기준 mmr+wins/losses/draws/total*finished 집계, draws 필터 `status='finished'`로 LEFT JOIN NULL row 오집계 방지, Anon* 제외 + mmr DESC NULLS LAST→created_at ASC). `REVOKE FROM PUBLIC` + `REVOKE FROM anon, authenticated` + `GRANT TO authenticated`(PR #24 함정 회피). **DB 적용 완료(사용자 직접) + `aclexplode` 검증(postgres/service_role/authenticated만, anon 없음)**. 멱등 CREATE OR REPLACE |

---

## 외부 의존성 / 환경 변수

| 변수                                         | 용도                        | 코드 사용처                                                             |
| -------------------------------------------- | --------------------------- | ----------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                   | Supabase 프로젝트 URL       | client.ts, server.ts, middleware.ts                                     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`              | anon 키                     | 동상                                                                    |
| `SUPABASE_SERVICE_ROLE_KEY`                  | service role 키 (서버 전용) | `service.ts` (히든 케이스 조회 + score/winner 갱신 + ai_reviews INSERT) |
| `LEGACY_NEXT_PUBLIC_SUPABASE_*`              | 구 키 잔재 (정리 후보)      | 미사용                                                                  |
| `CALLBACK_URL`                               | OAuth callback URL          | (OAuth Provider 설정값 — Supabase 대시보드)                             |
| `JUDGE0_API_URL` / `_KEY` / `_HOST`          | Judge0 (RapidAPI)           | judge/route.ts, submit/route.ts                                         |
| `GEMINI_API_KEY`                             | Gemini AI 리뷰              | `generateReview.ts` (PR Step 4-B)                                       |
| `GEMINI_MODEL` (선택)                        | Gemini 모델명 override      | `generateReview.ts` 기본값 `gemini-2.5-flash`                           |
| `GITHUB_CLIENT_ID` / `_SECRETS`              | GitHub OAuth Provider       | (OAuth Provider 설정값 — Supabase 대시보드)                             |
| `클라이언트_ID` / `클라이언트_보안_비밀번호` | Google OAuth Provider       | (OAuth Provider 설정값 — Supabase 대시보드)                             |

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

- **2026-06-13** — **리더보드 전적 표시(Post-MVP A-1 후속)**. `get_leaderboard(p_limit)` SECURITY DEFINER RPC 신설(전체 유저 mmr+전적 집계, authenticated 단독·anon REVOKE `aclexplode` 검증 완료) + `getLeaderboard` 직접 select→RPC 전환 + `ILeaderboardEntry` 전적 4필드 확장 + `getWinRate` 유틸 + `LeaderboardView` 전적 서브텍스트(`7승 4패 · 64%`). 승률 = wins/total_finished(무승부 포함 분모), 0전이면 "전적 없음". agent-team-workflow(opus, Critical 0). 함수 목록·마이그레이션 이력 갱신. **DB 적용 완료(사용자 직접)·미커밋**.
- **2026-06-07** — PR #29(Post-MVP 전 소소 이슈 묶음) dev 머지 반영: A2 status 상수화(`MATCH_STATUS`/`TMatchStatus`) / B-6 §C Realtime 개선 완료 / 로그인 디자인 토큰 통일 / `app/api/ai` 빈 디렉토리 제거. 미구현 표·코드 리뷰 nit #7·기술 부채 목록(B-6 완료 제거, B-3 부분완료) 갱신. 코드 품질 전용·DB/화면 기능 변경 0.
- **2026-06-06** — 문서 최적화: 누적 세션 히스토리 3문서(PROJECT_STATUS / SCREEN_STATUS / NEXT_SESSION) 압축. 현재 상태·DB SoT·보안 fix 이력·Post-MVP 로드맵은 보존, 과거 세션별 상세는 git 히스토리로 위임.
- **직전 코드 변경**: PR #29(소소 이슈 정리) / PR #25(problems 구조화) / PR #26(글로벌 네비) — 상세는 위 "한 줄 진단" + `docs/NEXT_SESSION.md`.
- 세션별 작업 이력 SoT는 `docs/NEXT_SESSION.md`(현재 상태 + Post-MVP 로드맵 + 기술 부채 B-1~8).
