# 화면 구현 상태

> 작업 시작 전/완료 후 갱신. 매치 실행 없이 코드 기반 리뷰 시 SoT(Single Source of Truth).
> 상태 마커는 `CLAUDE.md` "화면 구현 상태 추적 규칙" 참고.

## 라우트별 상태

| 라우트              | 상태 | 파일                                                                                                               | 설명                                                                                                                                                                                                                                                                                          |
| ------------------- | ---- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                 | ✅   | `app/page.tsx` + `app/_components/HomeClient.tsx`                                                                  | 서버 wrapper + HomeClient (UserMenu 헤더 + 로그인/비로그인 분기 + 매치 찾기 placeholder + 대시보드 카드 활성화, PR #7-C/#7-D)                                                                                                                                                                 |
| `/play/[matchId]`   | ✅   | `app/(main)/play/[matchId]/page.tsx` + `_components/HostWaitingView.tsx` + `_components/WaitingForGameStart.tsx`   | middleware SSR 가드 + 5단계 분기 (loading / matchStatusError / matchStatus null / waiting+host(HostWaitingView) / waiting+게스트(WaitingForGameStart) / ongoing\|finished 게임 화면), `useMatchStatus` 훅으로 matches 실시간 동기화 (postgres_changes + 30초 polling fallback) (PR #7-C/#7-D) |
| `/invite/[token]`   | ✅   | `app/invite/[token]/page.tsx` + `_components/JoinInvite.tsx`                                                       | 비인증 허용 서버 컴포넌트 + 5분기 검증 (`not_found` / `already_started` / `already_finished` / `expired` / `full`). JoinInvite 클라이언트 — 호스트 본인 자기 redirect / 비로그인 시 `/login?next=...` CTA / 게스트 입장 버튼 (PR #7-D)                                                        |
| `/result/[matchId]` | ⏳   | `app/(main)/result/[matchId]/` (디렉토리만)                                                                        | 별도 라우트 미구현. 결과는 현재 `/play` 페이지 내 `matchResult` state 인라인                                                                                                                                                                                                                  |
| `/login`            | ✅   | `app/(auth)/login/page.tsx` + `_components/OAuthButton.tsx` + `_utils/buildOAuthRedirect.ts` + `(auth)/layout.tsx` | OAuth(Google/GitHub) 버튼 + 정식 계정 자동 redirect (PR #7-B, 게스트 플로우는 `feature/remove-guest-flow`에서 제거)                                                                                                                                                                           |
| `/auth/callback`    | ✅   | `app/auth/callback/route.ts` (라우트 그룹 밖, runtime=nodejs)                                                      | `exchangeCodeForSession` + `profiles.update`로 닉네임/아바타 동기화 (1·2단 fallback) + `?next` 또는 `/`로 redirect (PR #7-B)                                                                                                                                                                  |
| `/dashboard`        | ✅   | `app/(main)/dashboard/page.tsx` + `_components/InviteCard.tsx`                                                     | 친구 초대 카드 — `POST /api/match/invite` 호출 → Dialog 모달에 inviteUrl 노출 + 클립보드 복사 + "방으로 입장" CTA (PR #7-D). `(main)` 글로벌 헤더 PR 도입 시 임시 헤더 제거 예정                                                                                                              |
| `/leaderboard`      | ⏳   | `app/(main)/leaderboard/` (디렉토리만)                                                                             | 향후 단계 — 현재 명세 미정                                                                                                                                                                                                                                                                    |
| `/profile/[userId]` | ⏳   | `app/(main)/profile/[userId]/` (디렉토리만)                                                                        | Step 3 프로필 PR 예정 (프로필 보기 + 닉네임 편집)                                                                                                                                                                                                                                             |

## 인증 / 공통 인프라

| 영역                              | 상태 | 위치 / 파일                                                                   | 설명                                                                                                                                             |
| --------------------------------- | ---- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 통합 인증 상태 훅                 | ✅   | `app/shared/hooks/useAuth.ts`                                                 | React Query 단일 진입점. user + profiles 조회 + fallback upsert                                                                                  |
| Supabase anon 클라이언트          | ✅   | `app/shared/lib/supabase/{client,server}.ts`                                  | 브라우저/서버 클라이언트 분리 (RLS 검증 경로)                                                                                                    |
| Supabase service 클라이언트       | ✅   | `app/shared/lib/supabase/service.ts` (PR #8)                                  | 서버 전용 service-role. 히든 test_cases 채점 시 RLS bypass                                                                                       |
| middleware.ts                     | ✅   | `middleware.ts`                                                               | 세션 쿠키 갱신 + 보호 prefix(`/play`, `/result`, `/dashboard`, `/profile/me`) SSR 가드 + `/api/*` 분기 (PR #7-C)                                 |
| OAuth 로그인 플로우               | ✅   | `app/(auth)/login/_components/OAuthButton.tsx` + `app/auth/callback/route.ts` | `signInWithOAuth` 단일 경로 + 콜백에서 `exchangeCodeForSession` + 닉네임/아바타 동기화 (PR #7-B)                                                 |
| AuthListener (전역 단일)          | ✅   | `app/shared/components/AuthListener.tsx`                                      | QueryProvider 내부 마운트. SIGNED_IN/SIGNED_OUT/USER_UPDATED만 `AUTH_QUERY_KEY` invalidate (PR #7-C)                                             |
| UserMenu 드롭다운                 | ✅   | `app/shared/components/UserMenu.tsx`                                          | 로그인/비로그인 분기 + Avatar 드롭다운 + 로그아웃. HomeClient + /dashboard 임시 헤더에서 마운트 (글로벌 헤더는 다음 PR) (PR #7-C/#7-D)           |
| `requireUser` API 가드            | ✅   | `app/shared/lib/auth/requireUser.ts`                                          | 6개 API 라우트(match × 3, judge, problems × 2)에 401 가드 통일 (PR #7-C). 신규 `match/invite`도 동일 적용 (PR #7-D)                              |
| `protectedPaths` 보호 prefix      | ✅   | `app/shared/lib/auth/protectedPaths.ts`                                       | middleware + UserMenu 공유. `PROTECTED_PREFIXES` + `isProtectedPath()` (PR #7-C)                                                                 |
| `sanitizeNext` open redirect 차단 | ✅   | `app/(auth)/login/_utils/sanitizeNext.ts`                                     | `/login`, OAuth callback, OAuth start, middleware 4곳 same-origin 화이트리스트 (PR #7-C)                                                         |
| `useMatchStatus` 훅               | ✅   | `app/features/match/hooks/useMatchStatus.ts`                                  | 초기 fetch + Realtime postgres_changes UPDATE + 30초 polling fallback (3개 useEffect 자체 isMounted, 채널명 `match-status:${matchId}`) (PR #7-D) |
| `buttonVariants` server-safe 모듈 | ✅   | `components/ui/button-variants.ts`                                            | cva 정의를 `"use client"` 없는 별도 모듈로 분리. server/client 양쪽에서 호출 가능 (PR #7-D)                                                      |

## API 라우트 (참고용)

| 경로                              | 상태 | 설명                                                               |
| --------------------------------- | ---- | ------------------------------------------------------------------ |
| `app/api/match/route.ts`          | ✅   | 매치 생성 (자동 매칭용, 기존)                                      |
| `app/api/match/invite/route.ts`   | ✅   | 친구 초대 매치 + 토큰 발급 (Node.js runtime, 충돌 재시도, PR #7-D) |
| `app/api/match/[matchId]/join/`   | ✅   | 매치 참가                                                          |
| `app/api/match/[matchId]/submit/` | ✅   | 코드 제출 + 결과 반영                                              |
| `app/api/judge/route.ts`          | ✅   | AI 채점                                                            |
| `app/api/problems/route.ts`       | ✅   | 문제 목록                                                          |
| `app/api/problems/[problemId]/`   | ✅   | 문제 단건 조회                                                     |

## DB / RLS 상태 (요약)

> 상세 검증은 `CLAUDE.md` "Supabase DB 상태 검증 규칙" 참고.
> 테이블별 row/정책 카운트는 `PROJECT_STATUS.md` "DB 상태" 섹션 참고.

- 테이블: `profiles`, `matches`, `match_participants`, `submissions`, `problems`, `test_cases`, `ai_reviews` 모두 RLS enabled
- `profiles` RLS: `public_read` + `self_update` + `self_insert` (PR #7-A 보강)
- `problems` RLS: `public_read` (PR #8)
- `test_cases` RLS: `visible_read` (PR #8 — 히든은 service role 전용)
- `ai_reviews` RLS: `self_read` (PR #8 — `submission_id IN (...)` + `TO authenticated`)
- `matches` RLS: `public_read` (anon 포함 SELECT 허용 — `/invite/[token]` 비인증 검증에 사용) / `anon_insert` / `participant_update` / `participant_delete_waiting`
- `match_participants` RLS: `match_read` (anon 포함 SELECT, 정원 카운트에 사용) / `self_insert` / `self_delete`
- `auth.users` AFTER INSERT 트리거: `handle_new_user` 적용 완료
- `matches`: `invite_token` UNIQUE + `invite_expires_at` + `host_id` 컬럼 (PR #6 선반영, PR #7-D에서 사용)
- `supabase_realtime` publication: `matches` + `match_participants` 둘 다 포함 (PR #7-D `useMatchStatus` postgres_changes 구독에 사용)
- 시드: `problems` 9건 + `test_cases` 43건 (visible 27 / hidden 16) — 멱등 마이그레이션 SoT 확보 (PR #8)

## 마지막 갱신

- **일자**: 2026-05-09
- **PR**: PR #7-D (예정 #13) — `feature/step3-matching-invite` 브랜치 5커밋 (`8be66e3` 묶음 A / `bb415fa` 묶음 B / `68d57e8` 묶음 C / `3a56643` 묶음 C 후속 / `5536652` 묶음 D, 본 커밋이 묶음 E). PR 생성 + dev 머지 대기.
- **변경 요약**: Step 3 매칭 PR — 친구 초대 매칭 흐름 구현. POST /api/match/invite 라우트(`node:crypto.randomBytes(16).toString("base64url")` 22자 토큰 + 충돌 재시도 3회 + Node.js runtime + inviteUrl 3-tier fallback `envOrigin → headerOrigin → requestUrlOrigin`) / `/dashboard` + InviteCard(Dialog로 invite URL 노출 + 클립보드 복사 + "방으로 입장" CTA) / HomeClient 대시보드 카드 활성화 / `/invite/[token]` 비인증 허용 서버 컴포넌트(5분기 검증 — status를 만료보다 먼저 검사) + JoinInvite 클라이언트(호스트 자기 redirect / 비로그인 CTA / 게스트 입장) / `useMatchStatus` 훅(초기 fetch + Realtime postgres_changes UPDATE + 30초 polling fallback, 3개 useEffect 자체 `let isMounted` 가드, 채널명 `match-status:${matchId}`로 broadcast 분리) / `HostWaitingView`(URL 복사 + 만료 분기 + Realtime 끊김 안내) / `WaitingForGameStart`(비호스트 race window) / `/play/[matchId]` 5단계 분기 통합 + 기존 fetchProblem의 matches select 중복 제거 + isMountedRef 도입(handleRun useCallback + handleSubmit 가드). 부수 작업: `buttonVariants`를 server-safe 모듈(`components/ui/button-variants.ts`)로 분리.
- **다음 PR 예정 순서**:
  1. **Step 3 프로필 PR** — `/profile/[userId]` + `/profile/me` + 닉네임 편집 + 닉네임 3차 fallback 모달
  2. **(main) 글로벌 헤더 PR** — `(main)/layout.tsx` 도입으로 `/play`, `/dashboard`, `/profile` 등에 UserMenu 일괄 마운트 여부 결정 (도입 시 `/dashboard` 임시 헤더 제거)
  3. **`/play` 비참가자 가드 강화** — middleware는 인증만, RLS public_read=true. URL 추측 가드는 별도 PR (PR #7-D 묶음 D 분석에서 식별)
  4. **invite 토큰 lazy cleanup** — 만료된 waiting 매치 자동 정리 (Step 4 cron 또는 매치 진입 시 lazy delete)
  5. **코드 리뷰 nit 후속** — placeholder Card 시멘틱 / "다음 PR" 카피 / LoginPage design token 통일 / `app/_components/` 폴더 컨벤션 가이드 (프로필 PR과 함께 처리 가능)
