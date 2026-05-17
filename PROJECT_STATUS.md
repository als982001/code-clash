# Project Status — Code Clash

> 프로젝트 전체 현황 SoT(Single Source of Truth). 화면 단위 추적은 `SCREEN_STATUS.md` 참고.
> 작업 시작 전 이 문서로 큰 그림 파악 → SCREEN_STATUS로 화면 단위 검증 → 코드 진입.

---

## 한 줄 진단

**Step 3 100% 종료 (A PR #18 `feature/step3-profile`, 4커밋 push 완료, dev 머지 대기)**. 프로필 페이지(`/profile/[userId]` + `/profile/me` + ProfileEditDialog + NicknameFallbackDialog) + PATCH `/api/profile/me` + `get_profile_stats(uuid)` SECURITY DEFINER STABLE RPC(matches/match_participants RLS 우회로 타인 전적 집계) + middleware `/profile` prefix 일반화(비로그인 전체 차단). Code Review fix 2건 + lint fix 1건(`react-hooks/set-state-in-effect` → `useState` lazy initializer) + 다른 세션 PR 리뷰의 P3 review fix 2건(SQL redundant filter 제거 + 성공 분기 isMountedRef 가드) 동일 PR에 반영. 다음은 §C Realtime 채널 구조 분석 또는 Step 4(결과 + AI 리뷰) 진입.

대전 루프(코드 입력 → 채점 → 결과)는 코드 레벨에서 완성. **실데이터 시드(9 problems / 43 test_cases) 및 `problems`/`test_cases`/`ai_reviews` RLS 정책 3종 정비 완료** (PR #8 dev 머지 완료). `submit/route.ts`의 히든 케이스 조회는 service-role 클라이언트로 분리되어 anti-cheat 보장. 인증은 PR #6/#7-A로 부트스트랩 + PR #7-B(#10)에서 `/login`/`/auth/callback` 구현 + PR #11에서 익명 게스트 플로우 제거 + **PR #7-C(#12) dev 머지 완료** — middleware 라우트 가드 + AuthListener 전역 구독 + UserMenu 드롭다운 + 홈 화면 재작성 + PR #11 보안 후속 3건. **PR #7-D(#13) Step 3 매칭 dev 머지 완료**: 친구 초대 매칭 흐름(POST /api/match/invite + /dashboard + InviteCard) + /invite/[token] 비인증 진입 + useMatchStatus 훅(matches 실시간 동기화) + HostWaitingView/WaitingForGameStart + /play 5단계 분기 통합. **PR #14 dev 머지 완료(`8f7d600`)**: matches/match_participants/profiles RLS 좁힘(TO authenticated, anon 차단) + `get_invite_match_by_token` SECURITY DEFINER RPC 신설(invite_token 컬럼 미노출) + `/api/match/[matchId]/join`에 invite token 검증 + `admin.ts` service-role 클라이언트 신설(`service.ts`와 중복 — §D-2-a 후속) + useMatchRealtime cascading render fix + UserMenu base-ui Group wrapping fix + console.log 3줄 정리 + 화면 단위 코드 복기 주석 5곳. **PR #16 (브랜치 `feature/d2-followup-cleanup`, dev 머지 대기)**: §D-2 후속 정리 묶음 — `admin.ts` 제거 후 `createServiceClient()` 재사용(§D-2-a) + `matches.participant_update` WITH CHECK 추가(status/winner_id 잠금) + `prevent_protected_matches_update` BEFORE UPDATE 트리거(host_id/invite_token/invite_expires_at/problem_id/start_time/created_at/id 잠금, service_role은 `auth.role()='service_role'`로 우회)(§D-2-b) + `/api/match/route.ts` dead code 제거(§D-2-c) + **`match_participants.self_update` 정책 신설 + 보호 컬럼 트리거**(§D-2-d — 회귀 fix: UPDATE 정책 부재로 `submit/route.ts:354`의 score 갱신이 silently 차단되어 score 26건 전부 NULL이던 상태 해소) + `submit/route.ts:354`에 `.select("id")` 가드 추가(silent fail 향후 감지). 외부 리뷰에서 발견된 match_participants score write primitive(인가 사용자가 자기 score 를 PostgREST PATCH 로 임의 값 위조 가능)를 같은 PR 후속 커밋으로 fix — `self_update` 정책 DROP + submit 라우트의 score 갱신을 service-role 로 전환 (`20260516_fix_match_participants_score_write_primitive.sql`). **외부 리뷰 2차** 에서 score primitive 와 완벽 대칭인 matches winner write primitive(인가 사용자가 PostgREST PATCH 로 자기를 winner 로 즉시 선언 가능)를 같은 PR 후속 커밋으로 fix — `participant_update` 정책 DROP + submit 라우트의 matches finalize UPDATE 를 service-role 로 전환 (`20260516_fix_matches_winner_write_primitive.sql`). 다음은 Step 3 프로필 PR 또는 §C Realtime 채널 구조 분석.

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
│   ├── layout.tsx                ✅  글로벌 sticky 헤더 (h-14, z-40, backdrop-blur) + <main flex-1> wrapper, <UserMenu /> 일괄 마운트 (B PR)
│   ├── result/[matchId]/         ⏳  빈 디렉토리 (결과는 /play 안에서 처리 중)
│   ├── dashboard/page.tsx        ✅  친구 초대 카드 (PR #7-D, B PR에서 임시 헤더 + 외곽 wrapper 제거)
│   ├── dashboard/_components/InviteCard.tsx ✅  POST /api/match/invite → Dialog (PR #7-D)
│   ├── leaderboard/              ⏳  빈 디렉토리 (장기)
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
│   ├── problems/route.ts         ✅  문제 목록 + requireUser (PR #7-C)
│   ├── problems/[problemId]/     ✅  문제 단건 + requireUser (PR #7-C)
│   ├── profile/me/route.ts       ✅  PATCH 본인 프로필 갱신 + requireUser + UNIQUE 23505 → 409 정밀 매핑 + RLS silent fail 가드 (PR #18)
│   └── ai/                       ⏳  빈 디렉토리 (Gemini 리뷰 API 미구현)
├── _components/
│   └── HomeClient.tsx            ✅  홈 페이지 client view — UserMenu 헤더(B PR에서 글로벌 헤더와 동일 className으로 통일) + 분기 + 매치 placeholder + 대시보드 카드 활성화 (PR #7-C/#7-D + B PR)
├── features/
│   ├── editor/                   ✅  CodeEditor + EditorPanel + ResultPanel + types
│   ├── match/                    ✅  MatchStatusBar + SoundToggle + 4 hooks (Realtime/Sounds/Timer/Status) + utils (createInviteToken/isInviteExpired) + types/invite
│   ├── problem/                  ✅  ProblemPanel + types
│   ├── profile/                  ✅  types/index.ts + utils 4종(getProfileStats / isAutoGeneratedNickname / formatJoinDate / validateNickname, PR #18)
│   └── review/                   ⏳  빈 디렉토리 (AI 리뷰 UI 미구현)
├── shared/
│   ├── components/
│   │   ├── QueryProvider.tsx     ✅  staleTime 60s + retry 1 글로벌 + AuthListener 마운트 (PR #7-C)
│   │   ├── AuthListener.tsx      ✅  onAuthStateChange 전역 단일 구독 (PR #7-C)
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

- 매치 생성 → 참가자 등록 → 매치 시작 → 코드 작성 → 실시간 진행 상태 → 최종 채점 → 승자 판정 → 결과 표시
- Race condition 방어: `submit/route.ts`에서 `eq("status", "ongoing")` 가드로 동시 finish 방지
- 멱등성: 동일 유저의 중복 제출 시 기존 submission 반환
- 점수 산출: `(passed/total × 1000) + ((Tmax-Tused)/Tmax × 500)` (서버 단독, anti-cheat)

### 인증 인프라 (Step 3 — PR #6 + #7-A + #7-B + #7-C)

- OAuth(Google/GitHub) 로그인 (`/login`) + `/auth/callback`에서 `exchangeCodeForSession` + 닉네임/아바타 동기화
- `auth.users` AFTER INSERT 트리거 → `public.profiles` 자동 생성 (best-effort)
- `useAuth` 단일 진입점 + 트리거 실패 대비 fallback upsert + `AUTH_QUERY_KEY` export (PR #7-C)
- `profiles` RLS 3종 (`public_read` + `self_update` + `self_insert`)
- 게스트(익명) 로그인 플로우 전면 제거 (PR #11)
- middleware 라우트 가드 — 보호 prefix(`/play`, `/result`, `/dashboard`, `/profile/me`) SSR redirect + `/api/*`는 쿠키 갱신만 (PR #7-C)
- AuthListener 전역 단일 구독 — `onAuthStateChange`에서 SIGNED_IN/SIGNED_OUT/USER_UPDATED만 `AUTH_QUERY_KEY` invalidate (PR #7-C)
- UserMenu 드롭다운 — 로그인/비로그인 분기 + Avatar + 로그아웃 (보호 prefix면 `/`로 push, 아니면 refresh) (PR #7-C)
- HomeClient — 홈 페이지 client view (UserMenu 헤더 + 분기 + placeholder 카드) + `app/page.tsx`는 서버 wrapper로 축소 (PR #7-C)
- 보안 헬퍼 3종 — `sanitizeNext` (open redirect 차단) / `requireUser` (API 라우트 401 가드 통일) / `protectedPaths` (middleware + client 공유 prefix 매칭) (PR #7-C)

### 실시간 (Supabase Realtime broadcast)

- 채널: `match:{matchId}`
- 이벤트: `PLAYER_READY`, `PROGRESS_UPDATE`, `OPPONENT_SUBMITTED`, `MATCH_FINISHED`
- 호출처: `useMatchRealtime` hook + `submit/route.ts`

### UX 보강 (Step 2)

- 사운드 토글 (Zustand persist) — `useSoundStore` + `SoundToggle`
- 매치 타이머 (`useMatchTimer`) — 15분 카운트다운
- 매치 사운드 (`useMatchSounds`) — 효과음 재생

### Step 3 매칭 (PR #7-D)

- 친구 초대 매칭 흐름 — 호스트가 `/dashboard`에서 invite URL 발급 → 게스트가 `/invite/[token]` 접속 → 입장 → `/play/[matchId]` 자동 전환
- `POST /api/match/invite` — Node.js runtime, `crypto.randomBytes(16).toString("base64url")` 22자 토큰, 충돌 재시도 3회 (PostgrestError 23505), inviteUrl 3-tier fallback (envOrigin → headerOrigin → requestUrlOrigin)
- `/dashboard` + `InviteCard` — Dialog 안에 inviteUrl 노출 + 클립보드 복사 (1.5초 시각 피드백) + "방으로 입장" CTA
- `/invite/[token]` 비인증 허용 서버 컴포넌트 — 5분기 검증 (not_found / already_started / already_finished / expired / full). status를 만료보다 먼저 검사
- `JoinInvite` 클라이언트 — 호스트 본인 자기 redirect / 비로그인 시 `/login?next=...` CTA / 게스트 입장 버튼 (`/api/match/[matchId]/join` 호출)
- `useMatchStatus` 훅 — 초기 fetch + Realtime postgres_changes UPDATE filter + 30초 polling fallback (3개 useEffect 자체 isMounted 가드, 채널명 `match-status:${matchId}`로 broadcast 분리)
- `HostWaitingView` — URL 복사 + 만료 분기 (isInviteExpired 헬퍼 + useMemo) + Realtime 끊김 안내 (만료 분기와 상호배타)
- `WaitingForGameStart` — 비호스트 waiting → ongoing 전환 직전 race window 스피너
- `/play/[matchId]` 통합 — 5단계 분기 추가 + 기존 `fetchProblem`의 matches select 중복 제거 → useMatchStatus의 problemId/startTime 위임 + isMountedRef 도입 (handleRun useCallback + handleSubmit 가드)
- `buttonVariants` server-safe 모듈 분리 (`components/ui/button-variants.ts`) — `"use client"` 파일에서 export된 함수가 server component에서 호출 불가능한 RSC 룰 우회
- HomeClient의 "대시보드" 카드 활성화 (`<Link href="/dashboard"><Card />`)

### Step 3 보안 강화 + 코드 복기 (PR #14)

- **마이그레이션 `20260510_tighten_rls_for_invite_security.sql`** — `matches.public_read` → `matches_self_or_participant_read (TO authenticated, host_id = auth.uid() OR participant)`, `match_participants.match_read` → `match_participants_co_participant_read (TO authenticated, 자기 row OR 같은 매치 참가자)`, `profiles.public_read` → `profiles_authenticated_read (TO authenticated, USING true)`. anon이 invite_token, profiles, 다른 매치 row를 직접 SELECT하지 못하게 차단
- **`get_invite_match_by_token(p_token text)` RPC 신설** — SECURITY DEFINER STABLE, anon+authenticated EXECUTE. 반환 컬럼에서 `invite_token` 제외(`id`, `status`, `host_id`, `invite_expires_at`, `participant_count`만). `/invite/[token]` 비로그인 페이지가 RLS 좁힘 후에도 토큰 검증 가능
- **`/api/match/[matchId]/join`에 invite token 검증 추가** — body의 token이 DB의 `invite_token`과 일치할 때만 join 허용. RLS만으로 끝내지 않고 mutation 흐름 자체에 게이트
- **`admin.ts` 신설** — `app/shared/lib/supabase/admin.ts` service-role 클라이언트 (`/api/match/[matchId]/join` 사용). 기존 `service.ts`와 역할 중복 — §D-2-a 후속 정리 대상
- **`useMatchRealtime` cascading render fix** — effect body 내 동기 `setIsSubscribed` 호출 제거 → subscribe callback 1곳으로 통일. 부수 이득으로 채널 끊김(CLOSED / CHANNEL_ERROR / TIMED_OUT)도 정확히 반영
- **`UserMenu` base-ui `MenuGroupRootContext` 누락 fix** — `DropdownMenuLabel`을 `DropdownMenuGroup`으로 래핑. 아바타 클릭 시 드롭다운 미표시 런타임 에러 해결
- **`useMatchStatus.ts` 검증용 console.log 3줄 제거** (이전 세션 §B)
- **코드 복기 주석 5곳** — `/auth/callback`, `/api/match/invite`, `/api/match/[matchId]/join`, `useMatchRealtime`, `useMatchStatus`. 시니어→주니어 톤 블록 단위, 동작 변경 없음

### §D-2 후속 정리 + 회귀 fix (PR #16, dev 머지 대기)

- **§D-2-a — `admin.ts` 제거 + `service.ts` 재사용**: PR #14에서 만든 `app/shared/lib/supabase/admin.ts` 삭제. `/api/match/[matchId]/join`이 `createServiceClient()`(싱글턴 + fail-fast E_SERVICE) 재사용. 인터페이스 동일(`{ client }`)이라 호출부는 import 1줄 + try/catch 추가로 끝.
- **§D-2-b — `matches.participant_update` WITH CHECK + 보호 컬럼 트리거** (`supabase/migrations/20260516_tighten_matches_participant_update.sql`): 기존 `participant_update` 정책에 `WITH CHECK`가 부재해서 참가자가 `winner_id`/`host_id` 등 임의 컬럼 UPDATE 가능했음. WITH CHECK로 `status IN ('ongoing','finished')` + `winner_id`는 같은 매치 참가자만 강제. 추가로 `prevent_protected_matches_update` BEFORE UPDATE 트리거가 `id`/`host_id`/`invite_token`/`invite_expires_at`/`problem_id`/`start_time`/`created_at` 7개 컬럼을 OLD에 고정. service_role은 `auth.role() = 'service_role'`로 우회 (Supabase 공식 JWT 클레임 헬퍼).
- **§D-2-c — `/api/match/route.ts` dead code 제거**: 호출처 0건 grep cross-check 후 파일 삭제. 친구 초대 흐름이 `/api/match/invite`로 통일된 이후 미사용.
- **§D-2-d — `match_participants.self_update` 정책 신설 + 보호 컬럼 트리거** (`supabase/migrations/20260516_match_participants_self_update.sql`, **회귀 fix**): DB 검증으로 `match_participants` UPDATE 정책 부재 확인 → RLS deny 상태에서 `submit/route.ts:354`의 `match_participants.update({ score })`가 silently 차단되고 있었음. 결과: `score` 26건 전부 NULL, 매치 winner 판정이 score 비교 없이 동점 분기(submitted_at)로만 결정되는 회귀. `self_update` 정책(`user_id = auth.uid()`) + `prevent_protected_match_participants_update` 트리거로 `score`만 인가 사용자 갱신 허용, 나머지 6개 컬럼(`id`/`match_id`/`user_id`/`created_at`/`mmr_change`/`is_disconnected`) OLD에 고정.
- **`submit/route.ts:354` silent fail 가드**: `.update({ score })`에 `.select("id")` 추가 + `affected row === 0`이면 500 반환. 향후 RLS/정책 미스매치 회귀가 다시 발생해도 즉시 감지.
- **score write primitive fix (PR #16 후속 커밋)**: 외부 리뷰 발견. `match_participants.self_update` 정책 DROP 으로 인가 사용자 UPDATE 를 default deny 로 되돌리고, `submit/route.ts:356` 의 score 갱신을 같은 라우트의 `serviceClient` 로 전환. matches 가 winner_id/host_id 등을 WITH CHECK + 트리거로 잠갔던 비대칭 해소. `20260516_fix_match_participants_score_write_primitive.sql` 신규.
- **winner write primitive fix (PR #16 후속 커밋, 외부 리뷰 2차)**: `matches.participant_update` 정책이 트리거 보호 컬럼에서 status/winner_id/end_time 을 제외하여 인증된 참가자가 PostgREST PATCH 로 자기를 winner 로 직접 선언할 수 있던 결함(score primitive 와 대칭). `participant_update` 정책 DROP 으로 matches 인가 사용자 UPDATE 를 default deny 로 되돌리고, `submit/route.ts:399` 의 matches finalize UPDATE 를 같은 라우트의 `serviceClient` 로 전환. `20260516_fix_matches_winner_write_primitive.sql` 신규.
- **운영 적용 주의**: Supabase 마이그레이션 2개를 `BEGIN/COMMIT`으로 묶어 Studio SQL Editor에서 한 번에 실행 → `schema_migrations` 수동 INSERT (또는 `supabase db push`) → 코드 배포 순서 엄수. 코드만 먼저 배포되면 모든 submit이 새 가드로 500 반환.

---

## 부분 구현 / 스텁 영역 🔄 ⏳

| 영역                       | 마커 | 비고                                                                                                                                                                             |
| -------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/page.tsx` 홈 화면     | ✅   | 서버 wrapper + HomeClient (UserMenu 헤더 + 분기 + placeholder 카드, PR #7-C)                                                                                                     |
| `app/(auth)/login/`        | ✅   | PR #7-B 완료 + sanitizeNext 적용 (PR #7-C)                                                                                                                                       |
| `app/auth/callback/`       | ✅   | PR #7-B 완료 + sanitizeNext 적용 (PR #7-C)                                                                                                                                       |
| `app/(main)/dashboard/`    | ✅   | 친구 초대 카드 + InviteCard Dialog (PR #7-D)                                                                                                                                     |
| `app/invite/[token]/`      | ✅   | 비인증 허용 서버 컴포넌트 + JoinInvite (PR #7-D)                                                                                                                                 |
| `app/(main)/profile/[id]/` | ✅   | 서버 컴포넌트 + ProfileView + ProfileEditDialog + NicknameFallbackDialog. middleware `/profile` prefix 일반화로 `/profile/me` + `/profile/[userId]` 둘 다 비로그인 차단 (PR #18) |
| `app/(main)/profile/me/`   | ✅   | server component — auth.getUser() → redirect(/profile/${user.id}) (PR #18)                                                                                                       |
| `app/api/profile/me/`      | ✅   | PATCH 본인 프로필 갱신 (PR #18)                                                                                                                                                  |
| `app/(main)/leaderboard/`  | ⏳   | 명세 미정 (장기)                                                                                                                                                                 |
| `app/(main)/result/[id]/`  | ⏳   | 빈 디렉토리. 결과는 `/play` 페이지 인라인 (분리 여부 미정). middleware 가드 활성                                                                                                 |
| `app/api/ai/`              | ⏳   | 빈 디렉토리. Gemini 코드 리뷰 API 미구현                                                                                                                                         |
| `app/features/review/`     | ⏳   | 빈 디렉토리. AI 리뷰 UI 미구현                                                                                                                                                   |
| 라우트 가드 (middleware)   | ✅   | 보호 prefix(`/play`, `/result`, `/dashboard`, `/profile/me`) SSR 가드 + `/api/*` 분기 (PR #7-C)                                                                                  |
| AuthListener (전역)        | ✅   | `app/shared/components/AuthListener.tsx` — QueryProvider 내부 마운트 (PR #7-C)                                                                                                   |
| UserMenu                   | ✅   | `app/shared/components/UserMenu.tsx` — HomeClient에서만 마운트 (글로벌 헤더는 다음 PR)                                                                                           |
| HomeClient                 | ✅   | `app/_components/HomeClient.tsx` — UserMenu + 분기 + placeholder 카드 (PR #7-C)                                                                                                  |
| (main) 글로벌 헤더         | ⏳   | `(main)/layout.tsx` 미도입. `/play`, `/dashboard`, `/profile`은 헤더 없음 (다음 PR 결정)                                                                                         |
| Edge Functions             | ⏳   | 0개 (`mcp__supabase__list_edge_functions` 결과 비어있음)                                                                                                                         |

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

### 3. ✅ Resolved — `app/page.tsx` 홈 화면 (PR #7-C)

- 서버 wrapper(`app/page.tsx`) + `HomeClient` (UserMenu 헤더 + 로그인/비로그인 분기 + 매치/대시보드 placeholder 카드)
- 매치 찾기 / 대시보드 카드는 disabled placeholder — Step 3 매칭/프로필 PR에서 활성화 예정

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

### 7. ℹ️ 코드 리뷰 nit 후속 (PR #7-C 묶음 C)

- placeholder Card의 시멘틱 정리 (현재 `aria-disabled="true"`만, 인터랙티브 element 아니라 의미 약함). 매칭 PR에서 카드를 실제 `<button>`/`<Link>`로 전환할 때 `role`/keyboard focus 일괄 정리
- "준비중 — 다음 PR에서 제공됩니다" 카피의 개발 jargon. 알파/베타 사용자 노출 직전에 "곧 제공될 예정" 류로 일괄 변경
- LoginPage `text-zinc-400` 하드코딩 vs HomeClient `text-muted-foreground` design token. LoginPage도 token으로 통일하면 다크/라이트 호환성 일관됨
- `app/_components/` 폴더 컨벤션 가이드 추가 (home 전용 vs route별 `_components` 구분)

### 8. ✅ Resolved — `admin.ts` ↔ `service.ts` 중복 (PR #16, §D-2-a)

- `app/shared/lib/supabase/admin.ts` 제거 → `/api/match/[matchId]/join`이 `createServiceClient()`(싱글턴 + fail-fast E_SERVICE) 재사용
- 인터페이스 동일(`{ client }`)이라 호출부는 import 1줄 + try/catch 추가로 끝

### 9. ✅ Resolved — `matches.participant_update` `WITH CHECK` 누락 (PR #16, §D-2-b)

- `WITH CHECK` 추가: `status IN ('ongoing','finished')` + `winner_id`는 NULL 또는 같은 매치 참가자만
- `prevent_protected_matches_update` BEFORE UPDATE 트리거: `id`/`host_id`/`invite_token`/`invite_expires_at`/`problem_id`/`start_time`/`created_at` 7개 컬럼 OLD 고정
- service_role 우회는 `auth.role() = 'service_role'`로 식별 (Supabase 공식 JWT 클레임 헬퍼)

### 10. ✅ Resolved — `match_participants` UPDATE 정책 부재 → score silent fail + 후속 score write primitive (PR #16 + PR #16 후속 커밋, §D-2-d)

- DB 검증으로 확인: `match_participants` 에 UPDATE 정책이 부재했고, `submit/route.ts:354` 의 `match_participants.update({ score })` 가 RLS deny 로 silently 차단되어 `score` 26건 전부 NULL 이던 상태
- 매치 winner 판정이 score 비교 없이 동점 분기(submitted_at)로만 결정되는 회귀 — 매치 1건 finished 확인됨
- **1차 fix** (`20260516_match_participants_self_update.sql`, 머지 전 적용 마이그레이션): `self_update` 정책 + 보호 컬럼 트리거 도입. 그러나 트리거 보호 컬럼에서 `score` 를 제외하여 인가 사용자가 PostgREST PATCH 로 자기 score 를 위조 가능한 score write primitive 노출 (외부 리뷰가 HIGH 로 식별)
- **최종 fix** (`20260516_fix_match_participants_score_write_primitive.sql`, PR #16 후속 커밋): `self_update` 정책 DROP → match_participants 인가 사용자 UPDATE 를 default deny 로 복귀. `submit/route.ts:356` 의 score 갱신은 같은 라우트의 `serviceClient` 로 전환되어 RLS 를 우회. silent fail 가드(`.select("id")` + 0 rows 검사)는 그대로 유지하여 향후 회귀 즉시 감지

### 11. ℹ️ 후속 정리 후보 (PR #16 리뷰 중 발견)

- `match_participants.self_insert` / `self_delete` 정책이 `TO public` 으로 남아있음 (다른 정책은 `TO authenticated`). 동작 영향은 거의 없으나 일관성 정비 필요
- `submissions` 테이블 UPDATE 정책 부재 (현재는 기본 deny라 즉시 위협 아님) — 후속 PR에서 명시적 self_update or 차단 정책 검토
- 마이그레이션 파일명 prefix가 같은 일자(`20260516_*`) 2건 — `supabase db push` 알파벳 순으로 실행되지만 의존성 없어 무해

### 12. ✅ Resolved — `matches.participant_update` 정책 + 트리거의 winner write primitive (PR #16 후속 커밋, 외부 리뷰 2차)

- 같은 PR 의 §D-2-b 가 도입한 `matches.participant_update` 정책 + `prevent_protected_matches_update` 트리거 조합이 status/winner_id/end_time 을 보호 대상에서 제외하여, 인증된 매치 참가자가 PostgREST PATCH 로 `{status: 'finished', winner_id: 자기, end_time: now}` 를 직접 박을 수 있었음. 피해자 submit 은 `if (match.status !== "ongoing") return 400` 가드에 막혀 winner 정정 불가 → 위조 winner 영구 유지
- score primitive(§D-2-d, 9bbe908) 와 완벽 대칭 결함. §D-2-b 마이그레이션 주석은 "status·winner_id 를 잠그고..." 라고 명시했지만 실제 트리거 본문에 비교 절이 없는 의도-구현 불일치
- **fix** (`20260516_fix_matches_winner_write_primitive.sql`, PR #16 후속 커밋): `participant_update` 정책 DROP → matches 인가 사용자 UPDATE 를 default deny 로 복귀. `submit/route.ts:399` 의 matches finalize UPDATE 를 같은 라우트의 `serviceClient` 로 전환 (이미 score 갱신용으로 재사용 중). 트리거는 안전망 역할로 유지

---

## DB 상태

### 테이블 (7개, 모두 RLS enabled)

| 테이블               | rows | 정책 수 | 주요 FK                                                                                                              |
| -------------------- | ---- | ------- | -------------------------------------------------------------------------------------------------------------------- |
| `profiles`           | 3    | 3       | `id → auth.users.id` (PR #11 익명 정리 후: 시드 2 + 본인 1)                                                          |
| `problems`           | 9    | 1       | —                                                                                                                    |
| `test_cases`         | 43   | 1       | `problem_id → problems.id` (`is_hidden` NOT NULL + (problem_id, input, is_hidden) UNIQUE, PR #9)                     |
| `matches`            | 16   | 3       | `winner_id`, `host_id → profiles.id`, `problem_id → problems.id` (status: waiting 6 / ongoing 9 / finished 1)        |
| `match_participants` | 26   | 3       | `match_id → matches.id`, `user_id → profiles.id` (PR #16 후속 커밋에서 self_update DROP — score write primitive fix) |
| `submissions`        | 2    | 2       | `match_id → matches.id`, `user_id → profiles.id`                                                                     |
| `ai_reviews`         | 0    | 1       | `submission_id → submissions.id`                                                                                     |

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

### 함수

- `public.handle_new_user()` — profiles 자동 생성
- `public.rls_auto_enable()` — 용도 미상 (`20260412_minimal_rls.sql` 외 어디서도 참조 없음 — 잔재 가능성)
- `public.get_invite_match_by_token(p_token text)` — SECURITY DEFINER STABLE, anon+authenticated EXECUTE. `/invite/[token]` 비인증 검증용. 반환 컬럼에서 `invite_token` 제외 (`id`, `status`, `host_id`, `invite_expires_at`, `participant_count`만) (PR #14)
- `public.prevent_protected_matches_update()` — `matches` BEFORE UPDATE 트리거 함수 (SECURITY INVOKER, PR #16). `auth.role() = 'service_role'` 분기로 service_role 호출은 검사 패스, 그 외에는 보호 컬럼 7종이 OLD와 다르면 RAISE EXCEPTION
- `public.prevent_protected_match_participants_update()` — `match_participants` BEFORE UPDATE 트리거 함수 (SECURITY INVOKER, PR #16). 동일 패턴으로 보호 컬럼 6종 잠금
- `public.get_profile_stats(p_user_id uuid)` — SECURITY DEFINER STABLE, anon+authenticated EXECUTE. matches/match_participants RLS가 본인 외 데이터 SELECT 차단하므로 타인 프로필 진입 시 전적 0/0/0 회귀 방지 목적. 반환: `{wins, losses, draws, total_finished}`. winner_id NULL이면서 status='finished'면 draw로 카운트 (PR #18)

### `matches` 추가 컬럼 (PR #6 선반영, PR #8에서 사용 예정)

- `invite_token TEXT UNIQUE`
- `invite_expires_at TIMESTAMPTZ`
- `host_id UUID REFERENCES profiles(id)`

---

## 마이그레이션 이력 (`supabase/migrations/`)

| 파일                                                        | 내용                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20260412_minimal_rls.sql`                                  | 최소 RLS (matches/match_participants/submissions)                                                                                                                                                                                                                                                                                                    |
| `20260425_handle_new_user_trigger.sql`                      | profiles 자동 생성 트리거 + 함수                                                                                                                                                                                                                                                                                                                     |
| `20260425_backfill_missing_profiles.sql`                    | 누락 익명 유저 백필                                                                                                                                                                                                                                                                                                                                  |
| `20260425_profiles_rls_policies.sql`                        | profiles `public_read` + `self_update`                                                                                                                                                                                                                                                                                                               |
| `20260425_match_invite_columns.sql`                         | matches invite 컬럼 3종 + 부분 인덱스                                                                                                                                                                                                                                                                                                                |
| `20260425_pr5_review_index_cleanup.sql`                     | UNIQUE 제약과 중복된 인덱스 제거 (Code Reviewer 피드백)                                                                                                                                                                                                                                                                                              |
| `20260425_pr7a_profiles_insert_policy.sql`                  | profiles `self_insert` 정책 (Code Reviewer Critical fix)                                                                                                                                                                                                                                                                                             |
| `20260426_rls_problems_test_cases.sql`                      | problems/test_cases/ai_reviews RLS 3종 (히든은 service role 전용)                                                                                                                                                                                                                                                                                    |
| `20260426_seed_problems.sql`                                | 9 problems + 43 test_cases 멱등 시드 (SoT 확보)                                                                                                                                                                                                                                                                                                      |
| `20260427_test_cases_unique_constraint.sql`                 | `test_cases (problem_id, input, is_hidden)` UNIQUE 제약 + `is_hidden NOT NULL` (DO 블록 멱등, I-5 follow-up)                                                                                                                                                                                                                                         |
| `20260510_tighten_rls_for_invite_security.sql`              | matches/match_participants/profiles RLS 좁힘(TO authenticated, anon 차단) + `get_invite_match_by_token` SECURITY DEFINER RPC 신설 (PR #14)                                                                                                                                                                                                           |
| `20260516_tighten_matches_participant_update.sql`           | `matches.participant_update` 정책에 WITH CHECK 추가(status·winner_id 잠금) + `prevent_protected_matches_update` BEFORE UPDATE 트리거(7개 보호 컬럼 OLD 고정, service_role 우회) (PR #16)                                                                                                                                                             |
| `20260516_match_participants_self_update.sql`               | `match_participants.self_update` 정책 신설(user_id=auth.uid()) + `prevent_protected_match_participants_update` BEFORE UPDATE 트리거(6개 보호 컬럼 OLD 고정, score만 인가 갱신 허용, service_role 우회) (PR #16 회귀 fix)                                                                                                                             |
| `20260516_fix_match_participants_score_write_primitive.sql` | `match_participants.self_update` 정책 DROP — score write primitive(인가 사용자가 PostgREST PATCH 로 자기 score 를 위조하는 경로) 차단. submit 라우트의 score 갱신은 service-role 로 전환 (PR #16 후속 커밋, 외부 리뷰 발견)                                                                                                                          |
| `20260516_fix_matches_winner_write_primitive.sql`           | `matches.participant_update` 정책 DROP — winner write primitive(인가 사용자가 PostgREST PATCH 로 자기 row 의 status/winner_id/end_time 을 위조하는 경로) 차단. submit 라우트의 matches finalize UPDATE 는 service-role 로 전환 (PR #16 후속 커밋, 외부 리뷰 2차 발견)                                                                                |
| `20260517_profile_stats_rpc.sql`                            | `get_profile_stats(uuid)` SECURITY DEFINER STABLE RPC 신설. matches/match_participants RLS가 본인 외 데이터 차단하므로 타인 프로필 전적 집계가 0/0/0으로 잘못 표시되는 회귀를 막기 위해 RLS 우회. 반환은 카운트만 (개별 match row / opponent / PII 누출 없음). 사용자가 Supabase Studio에서 직접 적용 + 검증 SQL `(0,0,0,0)` 정상 반환 확인 (PR #18) |

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

- **일자**: 2026-05-17
- **시점**: A PR #18 `feature/step3-profile` (4커밋 push 완료, dev 머지 대기) — **Step 3 100% 종료**. 프로필 페이지 + 닉네임 편집 + fallback 모달 + `get_profile_stats` RPC + middleware `/profile` prefix 일반화. Code Review 2건 + lint fix 1건 + P3 review fix 2건 동일 PR에 반영. URL: https://github.com/als982001/code-clash/pull/18
- **커밋 4건**: `1190a2f` (feat) + `d19f020` (docs) + `1da4089` (테스트용 코드 원복, 사용자 직접) + `ef164cb` (P3 review fix)
- **변경 요약**: PROJECT_STATUS — 한 줄 진단에 PR #18 라인 추가 / 앱 구조에서 `(main)/profile/[userId]/` + `(main)/profile/me/` + `api/profile/me/` + `features/profile/` 신규 항목 ⏳ → ✅ / 부분 구현 표에서 `app/(main)/profile/[id]/` 행 ✅ + `app/(main)/profile/me/` + `app/api/profile/me/` 신규 행 / DB 함수에 `get_profile_stats(uuid)` 추가 / 마이그레이션 이력에 `20260517_profile_stats_rpc.sql` 행 추가.
- **운영 적용 주의**: PR #18 의 마이그레이션 (`20260517_profile_stats_rpc.sql`) 은 `CREATE OR REPLACE FUNCTION` 한 건이라 트랜잭션 묶음 불필요 + 코드/마이그레이션 순서 의존성 없음 (RPC 추가만, 정책 DROP 없음). 사용자가 Supabase Studio SQL Editor 에서 직접 적용 + 검증 SQL `SELECT * FROM public.get_profile_stats('00000000-0000-0000-0000-000000000000');` 가 `(0,0,0,0)` 반환 확인 완료. `schema_migrations` 수동 INSERT 는 이전 14건과 마찬가지로 미적용 (호스팅 측 supabase_migrations 빈 배열) — 향후 CLI 자동화 도입 시 한 번에 reconcile.
- **P3 review fix `ef164cb`**: 다른 세션 PR 리뷰에서 발견된 INFORMATIONAL 2건 적용. P3-1 `get_profile_stats` RPC `draws` FILTER 의 중복 `status = 'finished'` 조건 제거 (JOIN ON 에서 이미 거름 → redundant). 마이그레이션 파일만 정정, DB 함수 본문 sync 는 사용자가 Studio 에서 SQL 재실행 시 갱신 (CREATE OR REPLACE 라 안전, 미실행해도 동작 동일). P3-2 ProfileEditDialog 성공 분기에 `isMountedRef` 가드 1줄 추가 (실패 분기 2회 vs 성공 분기 0회 불일치 해소). P3-3 RPC 실패 표식은 트레이드오프로 skip — 후속 follow-up 후보.
- **다음 액션 순서**:
  1. **A PR push → PR 생성 → 머지** (현재 단계 — 사용자 명시 요청 시에만)
  2. **§C Realtime 채널 구조 분석** — PR #14 주석으로 일부 흡수됐으나 구조 분석(채널 책임/cleanup 순서/polling fallback 신뢰성)은 미수행. 코드 변경 없는 노트 또는 메모리 기록 (사용자 요청 살아있음)
  3. **Step 4 진입** — 결과 페이지 (`/result/[matchId]`) + Gemini AI 리뷰 (`/api/ai/` + `features/review/`) 인프라
  4. **§D-2 후속 정리 후보 (PR #16 리뷰 발견)** — `match_participants.self_insert`/`self_delete`의 `TO authenticated` 일관화 / `submissions` UPDATE 정책 명시화
  5. **`/play` 비참가자 가드 강화** — PR #14 RLS 좁힘으로 자연 해소 가능. 검증만 필요
  6. **invite 토큰 lazy cleanup** — 만료된 waiting 매치 자동 정리 (Step 4 cron 또는 매치 진입 시 lazy delete)
  7. **코드 리뷰 nit 후속** — placeholder Card 시멘틱 / "다음 PR" 카피 / LoginPage design token 통일 / `app/_components/` 폴더 컨벤션 가이드
  8. **CODE_CONVENTIONS.md "React Compiler" 표현 명확화** — 현재 자동 메모는 비활성 (lint 룰만 동작). "Compiler가 강제" → "lint 룰이 강제 (Compiler 도입 시 추가로 자동 메모)"로 정정
  9. **시드 SQL ON CONFLICT 단순화** (별도 후속 — 우선순위 낮음)
