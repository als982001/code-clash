# Project Status — Code Clash

> 프로젝트 전체 현황 SoT(Single Source of Truth). 화면 단위 추적은 `SCREEN_STATUS.md` 참고.
> 작업 시작 전 이 문서로 큰 그림 파악 → SCREEN_STATUS로 화면 단위 검증 → 코드 진입.

---

## 한 줄 진단

**[2026-06-03 최신] MVP 2번 자동 매칭 큐 (A-2) 구현 완료 — DB 적용·머지 전.** `invite_token` 없이 두 유저를 MMR 기반 자동 매칭. 신규 `matchmaking_queue` 테이블(RLS: self_read/self_delete만, **INSERT/UPDATE default deny** → status/match_id 는 service-role RPC 단독, write primitive 방지) + service-role 원자 매칭 RPC `find_or_enqueue_match`(`FOR UPDATE SKIP LOCKED`로 동시 진입 race 차단, 대기 상대 MMR 가장 가까운 1명, 없으면 ON CONFLICT 멱등 등록) + `POST /api/match/matchmaking/{join,leave}` + `MatchmakingDialog` 공용 모달(홈 "매치 찾기" + 대시보드 "자동 매칭" placeholder 2곳 활성화) + `useMatchmakingQueue` 훅(Realtime postgres_changes + 5초 폴링). 자동 매칭 매치는 `host_id=NULL`이라 **`getResultData`의 host/guest 슬롯을 host_id 비의존(`host_id ?? user_id 정렬`)으로 수정 + `IResultMatch.hostId` nullable 전환**(회귀 fix — 결과 컴포넌트는 슬롯+isMe swap만 써서 영향 없음, 승패는 winner_id 기반). 마이그레이션 `20260603_matchmaking_queue.sql`(신규 테이블 1개). brainstorming→spec→plan→agent-team-workflow(opus)→Code Review(opus). **Code Review C-1**(self_insert 가 status/match_id 위조 INSERT 허용하는 write primitive → self_insert 정책 미생성으로 default deny) + **W-1**(DELETE↔INSERT 사이 더블클릭 23505 → ON CONFLICT upsert 멱등화) + N-2 fix 반영. **후속(B-7)**: 즉시 매칭 시 상대 `matched` 큐 row 누적(재매칭 전까지 잔존, 동접 극소 전제라 MVP 무해) — 전역 좀비 정리 cron 은 B-5 와 묶음. **다음: MVP 3번 프로필 역량 분석(A-3).**

**[2026-06-03] MVP 0·1번 완료** — ① **PR #22 (`bf15a08`)**: UserMenu에 프로필(`/profile/me`) 진입 버튼(로그아웃 중 가드) + 홈 "대시보드"→"대전하기" 카피 + 프로필 화면 MMR/tier 배지(`profiles.mmr` select + `getTierByMmr` 파생). ② **PR #23 (`f6910fc`) — 리더보드 MVP A-1**: `/leaderboard` server component. `getLeaderboard`(profiles MMR DESC→created*at ASC, 익명 `Anon*`제외, RLS`TO authenticated USING true`직접 조회 — RPC 불필요) +`rankEntries`(동점 같은 순위 1-2-2-2-5, 한 번 순회) + `LeaderboardView`(순위 리스트, 행 Link로 프로필 이동, 본인 하이라이트, tier/mmr 배지). 진입 동선: 글로벌 헤더(`(main)/layout.tsx`) "리더보드" 링크 + 홈 카드. `/leaderboard` 보호 prefix 추가. **DB 스키마 변경 0**. 전적(승/패)은 **Post-MVP 최우선**(`get_leaderboard` 집계 RPC)으로 분리(`profiles.wins/losses`는 미신뢰 컬럼). 신규 feature `app/features/leaderboard/`(types + getLeaderboard + rankEntries, server-only). 리뷰 fix(익명 유저 제외)는 별도 커밋(`441b98e`). **다음: MVP 2번 자동 매칭 큐(A-2) — 착수 전 B-2(MMR read-modify-write 비원자성) 선처리 검토 + DB 상태 검증.**

**Step 3 100% 종료 (PR #18 dev 머지 완료, `386a406`). §C Realtime 채널 구조 분석 노트 작성 완료 (`docs/notes/realtime-channels.md`, 2026-05-30). Step 4-A `/result/[matchId]` 결과 페이지 PR (브랜치 `feature/step4a-result-page`) 구현 완료 — server component + Promise.all + Shiki SSR + RLS 자연 게이트, /play finished 배너에 "결과 자세히 보기" Link 추가. AI 리뷰는 Step 4-B, MMR은 Phase 4.5로 분리**. 프로필 페이지(`/profile/[userId]` + `/profile/me` + ProfileEditDialog + NicknameFallbackDialog) + PATCH `/api/profile/me` + `get_profile_stats(uuid)` SECURITY DEFINER STABLE RPC(matches/match_participants RLS 우회로 타인 전적 집계) + middleware `/profile` prefix 일반화(비로그인 전체 차단). Code Review fix 2건 + lint fix 1건(`react-hooks/set-state-in-effect` → `useState` lazy initializer) + 다른 세션 PR 리뷰의 P3 review fix 2건(SQL redundant filter 제거 + 성공 분기 isMountedRef 가드) 동일 PR에 반영.

**Step 4-B 완료 (PR #20 dev 머지 완료, `3e440e5` squash)**: `/result/[matchId]`에 AI 코드 리뷰 신설. 본인 `ai_reviews` SSR 조회(캐싱 히트 즉시 표시) → 없으면 `AiReviewSection`(client)이 `POST /api/match/[matchId]/review` lazy 호출 → Gemini JSON 구조화 출력(복잡도/강점/개선/상대비교 — 본인 코드 리뷰 + 상대 코드 비교 컨텍스트). `ai_reviews` write 정책 부재(default deny) 유지 → INSERT는 service-role 단독(write primitive 방지, score/winner fix와 동일 패턴). `submission_id` UNIQUE(`ai_reviews_submission_id_key`) 기존재 + `ON CONFLICT DO NOTHING` + 저장값 재조회로 멱등. `@google/genai@^2.7.0` 추가, `AiReviewPlaceholder` → `AiReviewSection` 대체. **DB 스키마 변경 없음.** Code Review(opus) Critical 0 / W-1·W-2·W-3·N-3 fix 반영, W-4(me·opponent DRY) 별도 보류.

**Step 4.5 완료 (PR #21 dev 머지 완료 `08753ba`, 마이그레이션 DB 적용 완료)**: 매치 종료 시 Elo(K=32) MMR 산출 + tier 재산정 + 결과 페이지 변동 정적 표시. **DB 사전 검증으로 `profiles.mmr`(default 1000)/`tier`(default Bronze)/`wins`/`losses`/`streak` + `match_participants.mmr_change` 컬럼이 이미 전부 존재함을 확인** → 작업을 "컬럼 신설"이 아닌 "빈 컬럼 채우기"로 재정의(CLAUDE.md DB 검증 규칙이 정확히 짚은 케이스). 신규 순수 유틸 `calculateMmr`/`getTierByMmr`(`app/features/match/utils/`), `submit/route.ts` finalize 블록에 service-role 단독 MMR 갱신(best-effort — 실패해도 winner 보존, `.select("id")` row 0 가드 포함) + `mmrChange` 브로드캐스트 payload, 결과 페이지(`getResultData`/result types/`ParticipantCodeCard`) 변동 표시(`+24 · Silver 1224`, mmr_change NULL이면 숨김). **보안**: `profiles.self_update` 가 컬럼 제한 없이 mmr/tier 위조 가능하던 write primitive 를 `prevent_protected_profiles_update` BEFORE UPDATE 트리거로 차단(`20260531_protect_profiles_rating_columns.sql`, DB 적용 완료. self_update 정책은 유지하여 nickname/bio 편집 보존, 트리거가 평점 컬럼만 OLD 고정, `auth.role()='service_role'` 우회). 스코프: MMR+tier 만(wins/losses/streak 는 기존 `get_profile_stats` RPC 유지로 이중 소스 회피). 기존 finished 3건 소급 없음. Code Review(opus) Critical 0 / W-1(row 0 가드 누락) fix 반영, W-2(read-modify-write 비원자성, 1:1 구조상 무해) 인지.

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
│   ├── profile/me/route.ts       ✅  PATCH 본인 프로필 갱신 + requireUser + UNIQUE 23505 → 409 정밀 매핑 + RLS silent fail 가드 (PR #18)
│   └── ai/                       ⏳  빈 디렉토리 (미사용 — AI 리뷰는 match/[matchId]/review로 구현)
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

| 영역                         | 마커 | 비고                                                                                                                                                                             |
| ---------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/page.tsx` 홈 화면       | ✅   | 서버 wrapper + HomeClient (UserMenu 헤더 + 분기 + placeholder 카드, PR #7-C)                                                                                                     |
| `app/(auth)/login/`          | ✅   | PR #7-B 완료 + sanitizeNext 적용 (PR #7-C)                                                                                                                                       |
| `app/auth/callback/`         | ✅   | PR #7-B 완료 + sanitizeNext 적용 (PR #7-C)                                                                                                                                       |
| `app/(main)/dashboard/`      | ✅   | 친구 초대 카드 + InviteCard Dialog (PR #7-D)                                                                                                                                     |
| `app/invite/[token]/`        | ✅   | 비인증 허용 서버 컴포넌트 + JoinInvite (PR #7-D)                                                                                                                                 |
| `app/(main)/profile/[id]/`   | ✅   | 서버 컴포넌트 + ProfileView + ProfileEditDialog + NicknameFallbackDialog. middleware `/profile` prefix 일반화로 `/profile/me` + `/profile/[userId]` 둘 다 비로그인 차단 (PR #18) |
| `app/(main)/profile/me/`     | ✅   | server component — auth.getUser() → redirect(/profile/${user.id}) (PR #18)                                                                                                       |
| `app/api/profile/me/`        | ✅   | PATCH 본인 프로필 갱신 (PR #18)                                                                                                                                                  |
| `app/(main)/leaderboard/`    | ✅   | MVP A-1 — `profiles` MMR DESC 정렬 순위 화면(전적 제외, server component). 전적은 Post-MVP 최우선(`get_leaderboard` RPC)                                                         |
| `app/(main)/result/[id]/`    | ✅   | Step 4-A(결과) + Step 4-B(AI 리뷰, PR #20) 완료 — server component + Shiki SSR + AI 리뷰 SSR 조회/lazy 생성 (`AiReviewSection`)                                                  |
| `app/api/match/[id]/review/` | ✅   | AI 코드 리뷰 생성/조회 API (PR Step 4-B). `app/api/ai/` 디렉토리는 미사용                                                                                                        |
| `app/features/review/`       | ✅   | types + utils(generateReview / getAiReview) (PR Step 4-B)                                                                                                                        |
| 라우트 가드 (middleware)     | ✅   | 보호 prefix(`/play`, `/result`, `/dashboard`, `/profile/me`) SSR 가드 + `/api/*` 분기 (PR #7-C)                                                                                  |
| AuthListener (전역)          | ✅   | `app/shared/components/AuthListener.tsx` — QueryProvider 내부 마운트 (PR #7-C)                                                                                                   |
| UserMenu                     | ✅   | `app/shared/components/UserMenu.tsx` — HomeClient에서만 마운트 (글로벌 헤더는 다음 PR)                                                                                           |
| HomeClient                   | ✅   | `app/_components/HomeClient.tsx` — UserMenu + 분기 + placeholder 카드 (PR #7-C)                                                                                                  |
| (main) 글로벌 헤더           | ⏳   | `(main)/layout.tsx` 미도입. `/play`, `/dashboard`, `/profile`은 헤더 없음 (다음 PR 결정)                                                                                         |
| Edge Functions               | ⏳   | 0개 (`mcp__supabase__list_edge_functions` 결과 비어있음)                                                                                                                         |

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

### 테이블 (8개, 모두 RLS enabled)

| 테이블               | rows | 정책 수 | 주요 FK                                                                                                                                                               |
| -------------------- | ---- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profiles`           | 5    | 3       | `id → auth.users.id`. self_update 유지 + Step 4.5 `prevent_protected_profiles_update` 트리거로 평점 컬럼 보호                                                         |
| `problems`           | 9    | 1       | —                                                                                                                                                                     |
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

### `matches` 추가 컬럼 (PR #6 선반영, PR #8에서 사용 예정)

- `invite_token TEXT UNIQUE`
- `invite_expires_at TIMESTAMPTZ`
- `host_id UUID REFERENCES profiles(id)`

---

## 마이그레이션 이력 (`supabase/migrations/`)

| 파일                                                        | 내용                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20260412_minimal_rls.sql`                                  | 최소 RLS (matches/match_participants/submissions)                                                                                                                                                                                                                                                                                                                                                                           |
| `20260425_handle_new_user_trigger.sql`                      | profiles 자동 생성 트리거 + 함수                                                                                                                                                                                                                                                                                                                                                                                            |
| `20260425_backfill_missing_profiles.sql`                    | 누락 익명 유저 백필                                                                                                                                                                                                                                                                                                                                                                                                         |
| `20260425_profiles_rls_policies.sql`                        | profiles `public_read` + `self_update`                                                                                                                                                                                                                                                                                                                                                                                      |
| `20260425_match_invite_columns.sql`                         | matches invite 컬럼 3종 + 부분 인덱스                                                                                                                                                                                                                                                                                                                                                                                       |
| `20260425_pr5_review_index_cleanup.sql`                     | UNIQUE 제약과 중복된 인덱스 제거 (Code Reviewer 피드백)                                                                                                                                                                                                                                                                                                                                                                     |
| `20260425_pr7a_profiles_insert_policy.sql`                  | profiles `self_insert` 정책 (Code Reviewer Critical fix)                                                                                                                                                                                                                                                                                                                                                                    |
| `20260426_rls_problems_test_cases.sql`                      | problems/test_cases/ai_reviews RLS 3종 (히든은 service role 전용)                                                                                                                                                                                                                                                                                                                                                           |
| `20260426_seed_problems.sql`                                | 9 problems + 43 test_cases 멱등 시드 (SoT 확보)                                                                                                                                                                                                                                                                                                                                                                             |
| `20260427_test_cases_unique_constraint.sql`                 | `test_cases (problem_id, input, is_hidden)` UNIQUE 제약 + `is_hidden NOT NULL` (DO 블록 멱등, I-5 follow-up)                                                                                                                                                                                                                                                                                                                |
| `20260510_tighten_rls_for_invite_security.sql`              | matches/match_participants/profiles RLS 좁힘(TO authenticated, anon 차단) + `get_invite_match_by_token` SECURITY DEFINER RPC 신설 (PR #14)                                                                                                                                                                                                                                                                                  |
| `20260516_tighten_matches_participant_update.sql`           | `matches.participant_update` 정책에 WITH CHECK 추가(status·winner_id 잠금) + `prevent_protected_matches_update` BEFORE UPDATE 트리거(7개 보호 컬럼 OLD 고정, service_role 우회) (PR #16)                                                                                                                                                                                                                                    |
| `20260516_match_participants_self_update.sql`               | `match_participants.self_update` 정책 신설(user_id=auth.uid()) + `prevent_protected_match_participants_update` BEFORE UPDATE 트리거(6개 보호 컬럼 OLD 고정, score만 인가 갱신 허용, service_role 우회) (PR #16 회귀 fix)                                                                                                                                                                                                    |
| `20260516_fix_match_participants_score_write_primitive.sql` | `match_participants.self_update` 정책 DROP — score write primitive(인가 사용자가 PostgREST PATCH 로 자기 score 를 위조하는 경로) 차단. submit 라우트의 score 갱신은 service-role 로 전환 (PR #16 후속 커밋, 외부 리뷰 발견)                                                                                                                                                                                                 |
| `20260516_fix_matches_winner_write_primitive.sql`           | `matches.participant_update` 정책 DROP — winner write primitive(인가 사용자가 PostgREST PATCH 로 자기 row 의 status/winner_id/end_time 을 위조하는 경로) 차단. submit 라우트의 matches finalize UPDATE 는 service-role 로 전환 (PR #16 후속 커밋, 외부 리뷰 2차 발견)                                                                                                                                                       |
| `20260517_profile_stats_rpc.sql`                            | `get_profile_stats(uuid)` SECURITY DEFINER STABLE RPC 신설. matches/match_participants RLS가 본인 외 데이터 차단하므로 타인 프로필 전적 집계가 0/0/0으로 잘못 표시되는 회귀를 막기 위해 RLS 우회. 반환은 카운트만 (개별 match row / opponent / PII 누출 없음). 사용자가 Supabase Studio에서 직접 적용 + 검증 SQL `(0,0,0,0)` 정상 반환 확인 (PR #18)                                                                        |
| `20260531_protect_profiles_rating_columns.sql`              | `prevent_protected_profiles_update` BEFORE UPDATE 트리거 신설. `profiles.self_update` 가 컬럼 제한 없이 mmr/tier 등을 위조 가능하던 write primitive 차단(보호 컬럼 7종 mmr/tier/wins/losses/streak/id/created_at OLD 고정, service_role 우회). self_update 정책은 유지(nickname/bio 편집). 사용자가 DB 직접 적용 + 트리거 존재 검증 완료 (Step 4.5)                                                                         |
| `20260603_matchmaking_queue.sql`                            | **MVP A-2** — `matchmaking_queue` 테이블 신설(user_id UNIQUE FK, mmr, status, match_id, created_at) + RLS self_read/self_delete만(**INSERT/UPDATE default deny** — status/match_id write primitive 방지, self_insert 의도적 미생성) + realtime publication ADD(멱등 DO 블록) + `find_or_enqueue_match` SECURITY DEFINER RPC(service_role 단독, `FOR UPDATE SKIP LOCKED` 원자 매칭, ON CONFLICT 멱등 등록). **DB 적용 대기** |

---

## 외부 의존성 / 환경 변수

| 변수                                         | 용도                        | 코드 사용처                                                             |
| -------------------------------------------- | --------------------------- | ----------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                   | Supabase 프로젝트 URL       | client.ts, server.ts, middleware.ts                                     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`              | anon 키                     | 동상                                                                    |
| `SUPABASE_SERVICE_ROLE_KEY`                  | service role 키 (서버 전용) | `service.ts` (히든 케이스 조회 + score/winner 갱신 + ai_reviews INSERT) |
| `LEGACY_NEXT_PUBLIC_SUPABASE_*`              | 구 키 잔재 (정리 후보)      | 미사용                                                                  |
| `CALLBACK_URL`                               | OAuth callback URL          | (PR #7-B에서 사용 예정)                                                 |
| `JUDGE0_API_URL` / `_KEY` / `_HOST`          | Judge0 (RapidAPI)           | judge/route.ts, submit/route.ts                                         |
| `GEMINI_API_KEY`                             | Gemini AI 리뷰              | `generateReview.ts` (PR Step 4-B)                                       |
| `GEMINI_MODEL` (선택)                        | Gemini 모델명 override      | `generateReview.ts` 기본값 `gemini-2.5-flash`                           |
| `GITHUB_CLIENT_ID` / `_SECRETS`              | GitHub OAuth Provider       | (PR #7-B에서 사용 예정)                                                 |
| `클라이언트_ID` / `클라이언트_보안_비밀번호` | Google OAuth Provider       | (PR #7-B에서 사용 예정)                                                 |

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

- **일자**: 2026-06-03 (MVP 2번 자동 매칭 큐 A-2 — 코드 구현 + Code Review fix 완료, **마이그레이션 DB 적용 + 커밋/머지 대기**)
- **시점**: A-2 자동 매칭 큐 코드 구현 완료. brainstorming(동접 극소·워커 없음·무한대기+취소·MMR 가장 가까운 1명·인라인 모달 확정) → spec(`docs/superpowers/specs/2026-06-03-a2-matchmaking-queue-design.md`) → plan(`docs/superpowers/plans/2026-06-03-a2-matchmaking-queue.md`) → agent-team-workflow(opus, Analyzer 단계는 spec/plan 으로 대체) → Code Review(opus).
- **A-2 요약**: 신규 `matchmaking_queue` 테이블 + service-role 원자 매칭 RPC `find_or_enqueue_match`(`FOR UPDATE SKIP LOCKED`) + `POST /api/match/matchmaking/{join,leave}` + `MatchmakingDialog` 공용 모달(홈/대시보드 placeholder 2곳 활성화) + `useMatchmakingQueue` 훅(Realtime + 5초 폴링). 자동 매칭 매치는 `host_id=NULL`이라 `getResultData` host/guest 슬롯을 host_id 비의존으로 + `IResultMatch.hostId` nullable 전환(회귀 fix). 신규 feature 파일: `app/features/match/{components/MatchmakingDialog,hooks/useMatchmakingQueue,types/matchmaking}`. 마이그레이션 `20260603_matchmaking_queue.sql`.
- **Code Review(opus)**: Critical 1 fix 반영 — **C-1**(self_insert 정책이 `status`/`match_id` 위조 INSERT 허용하는 write primitive → self_insert 정책 미생성으로 INSERT default deny). Warning fix — **W-1**(DELETE↔INSERT 사이 더블클릭 23505 → `(c)` 분기 `ON CONFLICT (user_id) DO UPDATE` 멱등화). **N-2**(폴링 catch 변수명 통일). N-1/N-3~N-6(host_id 회귀 정합성·effect 가드·useMemo/useCallback·base-ui·React Compiler) 전부 부합 확인.
- **후속(B-7)**: 즉시 매칭 시 상대 `matched` 큐 row 누적(재매칭 전까지 잔존). 동접 극소 전제라 MVP 무해. 전역 좀비 정리 cron 은 B-5(invite 토큰 lazy cleanup)와 묶어 후속.
- **검증**: 마이그레이션 미적용(사용자 직접 적용 대기). tsc/lint/build 미실행(자동검증 금지). 실매치(두 계정 동시 매칭 → /play → 대전 루프 → 결과·MMR) 수동 검증 대기.
- **다음 액션**: ① 사용자가 마이그레이션 DB 적용 + 검증 SQL 실행 → ② 실매치 수동 검증 → ③ 커밋/PR/머지(사용자 명시 요청 시) → ④ **MVP 3번 프로필 역량 분석(A-3)**. Post-MVP 최우선은 리더보드 전적 RPC. (상세는 `docs/NEXT_SESSION.md` SoT)

### 이전 갱신 (2026-06-03, MVP 0·1번)

- **시점**: **PR #22(`bf15a08`) + PR #23(`f6910fc`) dev 머지 완료**. 0번 UX 개선(프로필 진입점 + 홈 카피 + 프로필 MMR/tier 배지) + 1번 리더보드 MVP(A-1). 각각 agent-team-workflow(opus) + Code Review(opus). 리더보드 진행 중 GitHub Desktop ↔ CLI 동시 조작으로 stash pop 충돌 1회 발생 후 해소.
- **리더보드 요약**: `/leaderboard` server component — `getLeaderboard`(profiles MMR DESC→created*at ASC, 익명 `Anon*`제외, RLS 전체 read 직접 조회) +`rankEntries`(동점 같은 순위 1-2-2-2-5, 한 번 순회) + `LeaderboardView`(순위 리스트, 행 Link 프로필 이동, 본인 하이라이트, tier/mmr 배지). 진입: 글로벌 헤더 링크 + 홈 카드. `/leaderboard` 보호 prefix. **DB 스키마 변경 0**. 전적은 Post-MVP 최우선(`get_leaderboard` 집계 RPC)으로 분리.

---

### 이전 갱신 (2026-05-31, Step 4.5 MMR)

- **시점**: Step 4.5 MMR 산출 **PR #21 dev 머지 완료 (`08753ba`, squash)**. 마이그레이션은 사용자가 DB 직접 적용 완료. brainstorming + spec(`docs/superpowers/specs/2026-05-31-step45-mmr-design.md`) + plan(`docs/superpowers/plans/2026-05-31-step45-mmr.md`) → agent-team-workflow(opus) 구현 → Code Review(opus) 2회 + 외부 세션 PR 리뷰 → 리뷰 #1(부분 실패 시 화면 모순 — profiles→mmr_change 순서 교체) fix → 머지.
- **변경 요약**: 신규 `app/features/match/utils/calculateMmr.ts`(Elo K=32 순수함수) + `getTierByMmr.ts`(5단계 200간격) + 마이그레이션 `20260531_protect_profiles_rating_columns.sql` / 수정 `submit/route.ts`(finalize 블록에 service-role MMR 갱신 + mmrChange payload)·`getResultData.ts`(mmr_change/mmr/tier select)·result types(`IResultParticipant`에 mmrChange/currentMmr/tier)·`ParticipantCodeCard.tsx`(변동 정적 표시). **DB 스키마 변경 없음** — 평점 컬럼이 이미 전부 존재(DB 검증으로 확인, "신설"→"빈 컬럼 채우기"로 재정의).
- **보안**: `profiles.self_update` 가 컬럼 제한 없이 mmr/tier 위조 가능하던 write primitive 를 `prevent_protected_profiles_update` 트리거로 차단(보호 컬럼 7종 OLD 고정, service_role 우회). PR #16의 score/winner write primitive 와 동일 패턴. self_update 정책은 유지(nickname/bio 편집 보존).
- **Code Review(opus)**: Critical 0. W-1(match_participants/profiles 갱신에 `.select("id")` 후 affected row 0 가드 누락 — CODE_CONVENTIONS "필수" 패턴, PR #16에서 동일 누락이 score 26건 NULL 회귀 일으킨 이력) fix 반영. W-2(profiles mmr read-modify-write 비원자성 — 현 1:1 구조상 무해) 인지 항목. N-1~3(중복 fallback / ±0 표기 등) 보류.
- **스코프**: MMR + tier 만. wins/losses/streak 는 기존 `get_profile_stats` RPC(matches 실시간 집계) 유지로 이중 소스 회피. 기존 finished 3건 소급 없음(mmr_change NULL → 결과 페이지 변동 섹션 숨김).
- **검증**: 마이그레이션 트리거 DB 적용 확인(`prevent_protected_profiles_update` 존재 + service_role 우회 분기). tsc/lint/build 미실행(자동검증 금지). 실매치 MMR 갱신 동작은 수동 검증 대기.
- **다음 액션 순서**:
  1. **Step 4.5 커밋/PR/머지** — 사용자 명시 요청 시. 실매치 1건 완주로 MMR 갱신·결과 표시 수동 검증 권장
  2. **§D-2 후속 정리** — `match_participants.self_insert`/`self_delete` `TO authenticated` 일관화 / `submissions` UPDATE 정책 명시화
  3. **AI 리뷰 후속** — F2(Gemini 동시요청 N배 — `ai_reviews` status 컬럼) / W-4(me·opponent DRY) / Next Step 학습 추천 / F5("finished" const) / 프롬프트 캐싱 / `@google/genai` npm 취약점
  4. **리더보드 (Phase 5)** — MMR 도입 완료로 진입 가능
  5. **§C 개선 후보 ❶ ❷** — Realtime 노트에서 발견
