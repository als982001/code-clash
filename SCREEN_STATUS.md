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

| 영역                               | 상태 | 위치 / 파일                                                                   | 설명                                                                                                                                             |
| ---------------------------------- | ---- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 통합 인증 상태 훅                  | ✅   | `app/shared/hooks/useAuth.ts`                                                 | React Query 단일 진입점. user + profiles 조회 + fallback upsert                                                                                  |
| Supabase anon 클라이언트           | ✅   | `app/shared/lib/supabase/{client,server}.ts`                                  | 브라우저/서버 클라이언트 분리 (RLS 검증 경로)                                                                                                    |
| Supabase service 클라이언트        | ✅   | `app/shared/lib/supabase/service.ts` (PR #8)                                  | 서버 전용 service-role. 히든 test_cases 채점 시 RLS bypass                                                                                       |
| middleware.ts                      | ✅   | `middleware.ts`                                                               | 세션 쿠키 갱신 + 보호 prefix(`/play`, `/result`, `/dashboard`, `/profile/me`) SSR 가드 + `/api/*` 분기 (PR #7-C)                                 |
| OAuth 로그인 플로우                | ✅   | `app/(auth)/login/_components/OAuthButton.tsx` + `app/auth/callback/route.ts` | `signInWithOAuth` 단일 경로 + 콜백에서 `exchangeCodeForSession` + 닉네임/아바타 동기화 (PR #7-B)                                                 |
| AuthListener (전역 단일)           | ✅   | `app/shared/components/AuthListener.tsx`                                      | QueryProvider 내부 마운트. SIGNED_IN/SIGNED_OUT/USER_UPDATED만 `AUTH_QUERY_KEY` invalidate (PR #7-C)                                             |
| UserMenu 드롭다운                  | ✅   | `app/shared/components/UserMenu.tsx`                                          | 로그인/비로그인 분기 + Avatar 드롭다운 + 로그아웃. HomeClient + /dashboard 임시 헤더에서 마운트 (글로벌 헤더는 다음 PR) (PR #7-C/#7-D)           |
| `requireUser` API 가드             | ✅   | `app/shared/lib/auth/requireUser.ts`                                          | 6개 API 라우트(match × 3, judge, problems × 2)에 401 가드 통일 (PR #7-C). 신규 `match/invite`도 동일 적용 (PR #7-D)                              |
| `protectedPaths` 보호 prefix       | ✅   | `app/shared/lib/auth/protectedPaths.ts`                                       | middleware + UserMenu 공유. `PROTECTED_PREFIXES` + `isProtectedPath()` (PR #7-C)                                                                 |
| `sanitizeNext` open redirect 차단  | ✅   | `app/(auth)/login/_utils/sanitizeNext.ts`                                     | `/login`, OAuth callback, OAuth start, middleware 4곳 same-origin 화이트리스트 (PR #7-C)                                                         |
| `useMatchStatus` 훅                | ✅   | `app/features/match/hooks/useMatchStatus.ts`                                  | 초기 fetch + Realtime postgres_changes UPDATE + 30초 polling fallback (3개 useEffect 자체 isMounted, 채널명 `match-status:${matchId}`) (PR #7-D) |
| `buttonVariants` server-safe 모듈  | ✅   | `components/ui/button-variants.ts`                                            | cva 정의를 `"use client"` 없는 별도 모듈로 분리. server/client 양쪽에서 호출 가능 (PR #7-D)                                                      |
| `admin.ts` service-role 클라이언트 | ✅   | `app/shared/lib/supabase/admin.ts`                                            | `/api/match/[matchId]/join`에서 invite token 검증 + 참가자 추가 시 RLS 우회용. `service.ts`와 중복(§D-2-a 후속 정리 대상) (PR #14)               |
| `get_invite_match_by_token` RPC    | ✅   | `supabase/migrations/20260510_tighten_rls_for_invite_security.sql`            | SECURITY DEFINER STABLE, anon+authenticated EXECUTE. `/invite/[token]` 비인증 검증용. 반환 컬럼에서 `invite_token` 제외 (PR #14)                 |

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
- `profiles` RLS: `profiles_authenticated_read` (TO authenticated USING true — anon 차단, PR #14) + `self_update` + `self_insert` (PR #7-A 보강)
- `problems` RLS: `public_read` (PR #8)
- `test_cases` RLS: `visible_read` (PR #8 — 히든은 service role 전용)
- `ai_reviews` RLS: `self_read` (PR #8 — `submission_id IN (...)` + `TO authenticated`)
- `matches` RLS: `matches_self_or_participant_read` (TO authenticated, `host_id = auth.uid()` OR participant — anon 차단, PR #14) / `anon_insert` / `participant_update` / `participant_delete_waiting`
- `match_participants` RLS: `match_participants_co_participant_read` (TO authenticated, 자기 row OR 같은 매치 참가자 row — anon 차단, PR #14) / `self_insert` / `self_delete`
- **RPC**: `get_invite_match_by_token(p_token text)` — SECURITY DEFINER STABLE, anon+authenticated EXECUTE. `/invite/[token]` 비인증 페이지가 RLS 좁힘 후에도 토큰 검증 가능. 반환 컬럼에서 `invite_token` 제외 (PR #14)
- `auth.users` AFTER INSERT 트리거: `handle_new_user` 적용 완료
- `matches`: `invite_token` UNIQUE + `invite_expires_at` + `host_id` 컬럼 (PR #6 선반영, PR #7-D/#14에서 사용)
- `supabase_realtime` publication: `matches` + `match_participants` 둘 다 포함 (PR #7-D `useMatchStatus` postgres_changes 구독에 사용)
- 시드: `problems` 9건 + `test_cases` 43건 (visible 27 / hidden 16) — 멱등 마이그레이션 SoT 확보 (PR #8)

## 마지막 갱신

- **일자**: 2026-05-16
- **PR**: PR #14 dev 머지 완료 (`8f7d600`, squash). 화면 추가 없음 — 인증/공통 인프라(`admin.ts` + RPC 행 추가) + DB/RLS 상태 갱신만.
- **변경 요약**: matches/match_participants/profiles RLS 좁힘(TO authenticated, anon 차단 — `matches_self_or_participant_read` / `match_participants_co_participant_read` / `profiles_authenticated_read`) / `get_invite_match_by_token` SECURITY DEFINER RPC 신설(반환 컬럼에서 `invite_token` 제외) / `/api/match/[matchId]/join`에 invite token 검증 추가 / `admin.ts` service-role 클라이언트 신설(`service.ts`와 중복 — §D-2-a 후속 정리) / `useMatchRealtime` effect body 동기 setState 제거(React 19 cascading render fix, 채널 끊김 감지 부수 이득) / `UserMenu` `DropdownMenuGroup` 래핑 fix(base-ui `MenuGroupRootContext` 누락 런타임 에러) / `useMatchStatus.ts` console.log 3줄 제거(이전 세션 §B) / `/auth/callback`, `/api/match/invite`, `/api/match/[matchId]/join`, `useMatchRealtime`, `useMatchStatus`에 동작 원리 주석 5곳.
- **다음 PR 예정 순서**:
  1. **§D-2 후속 정리 PR** — `admin.ts` 제거하고 `createServiceClient()` 재사용(§D-2-a) / `matches.participant_update` `WITH CHECK` 추가(§D-2-b) / `/api/match/route.ts` dead code 정리(§D-2-c) / profiles RLS 더 좁힘 검토(§D-2-d). 1~2 PR로 묶기 가능
  2. **§C Realtime 채널 구조 분석** — PR #14 주석으로 일부 흡수됐으나 구조 분석(채널 책임/cleanup 순서/polling fallback 신뢰성)은 미수행. 코드 변경 없는 노트 또는 메모리 기록
  3. **Step 3 프로필 PR (예정 #15)** — `/profile/[userId]` + `/profile/me` + 닉네임 편집 + 닉네임 3차 fallback 모달
  4. **(main) 글로벌 헤더 PR** — `(main)/layout.tsx` 도입으로 `/play`, `/dashboard`, `/profile` 등에 UserMenu 일괄 마운트 (도입 시 `/dashboard` 임시 헤더 제거)
  5. **`/play` 비참가자 가드 강화** — PR #14 RLS 좁힘으로 자연 해소 가능. 검증만 필요
  6. **invite 토큰 lazy cleanup** — 만료된 waiting 매치 자동 정리 (Step 4 cron 또는 매치 진입 시 lazy delete)
  7. **코드 리뷰 nit 후속** — placeholder Card 시멘틱 / "다음 PR" 카피 / LoginPage design token 통일 / `app/_components/` 폴더 컨벤션 가이드 (프로필 PR과 함께 처리 가능)
