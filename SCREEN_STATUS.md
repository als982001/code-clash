# 화면 구현 상태

> 작업 시작 전/완료 후 갱신. 매치 실행 없이 코드 기반 리뷰 시 SoT(Single Source of Truth).
> 상태 마커는 `CLAUDE.md` "화면 구현 상태 추적 규칙" 참고.

## 라우트별 상태

| 라우트              | 상태 | 파일                                                                                                               | 설명                                                                                                                                     |
| ------------------- | ---- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                 | ✅   | `app/page.tsx` + `app/_components/HomeClient.tsx`                                                                  | 서버 wrapper + HomeClient (UserMenu 헤더 + 로그인/비로그인 분기 + 매치 찾기/대시보드 placeholder 카드, PR #7-C)                          |
| `/play/[matchId]`   | ✅   | `app/(main)/play/[matchId]/page.tsx`                                                                               | middleware SSR 가드로 비로그인 차단 (PR #7-C에서 임시 client redirect 제거) + 문제 패널 + 코드 에디터 + 채점 + 결과 인라인 표시까지 동작 |
| `/result/[matchId]` | ⏳   | `app/(main)/result/[matchId]/` (디렉토리만)                                                                        | 별도 라우트 미구현. 결과는 현재 `/play` 페이지 내 `matchResult` state 인라인                                                             |
| `/login`            | ✅   | `app/(auth)/login/page.tsx` + `_components/OAuthButton.tsx` + `_utils/buildOAuthRedirect.ts` + `(auth)/layout.tsx` | OAuth(Google/GitHub) 버튼 + 정식 계정 자동 redirect (PR #7-B, 게스트 플로우는 `feature/remove-guest-flow`에서 제거)                      |
| `/auth/callback`    | ✅   | `app/auth/callback/route.ts` (라우트 그룹 밖, runtime=nodejs)                                                      | `exchangeCodeForSession` + `profiles.update`로 닉네임/아바타 동기화 (1·2단 fallback) + `?next` 또는 `/`로 redirect (PR #7-B)             |
| `/dashboard`        | ⏳   | `app/(main)/dashboard/` (디렉토리만)                                                                               | Step 3 매칭 PR 예정 (친구 초대 매치 리스트)                                                                                              |
| `/leaderboard`      | ⏳   | `app/(main)/leaderboard/` (디렉토리만)                                                                             | 향후 단계 — 현재 명세 미정                                                                                                               |
| `/profile/[userId]` | ⏳   | `app/(main)/profile/[userId]/` (디렉토리만)                                                                        | Step 3 프로필 PR 예정 (프로필 보기 + 닉네임 편집)                                                                                        |

## 인증 / 공통 인프라

| 영역                              | 상태 | 위치 / 파일                                                                   | 설명                                                                                                             |
| --------------------------------- | ---- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 통합 인증 상태 훅                 | ✅   | `app/shared/hooks/useAuth.ts`                                                 | React Query 단일 진입점. user + profiles 조회 + fallback upsert                                                  |
| Supabase anon 클라이언트          | ✅   | `app/shared/lib/supabase/{client,server}.ts`                                  | 브라우저/서버 클라이언트 분리 (RLS 검증 경로)                                                                    |
| Supabase service 클라이언트       | ✅   | `app/shared/lib/supabase/service.ts` (PR #8)                                  | 서버 전용 service-role. 히든 test_cases 채점 시 RLS bypass                                                       |
| middleware.ts                     | ✅   | `middleware.ts`                                                               | 세션 쿠키 갱신 + 보호 prefix(`/play`, `/result`, `/dashboard`, `/profile/me`) SSR 가드 + `/api/*` 분기 (PR #7-C) |
| OAuth 로그인 플로우               | ✅   | `app/(auth)/login/_components/OAuthButton.tsx` + `app/auth/callback/route.ts` | `signInWithOAuth` 단일 경로 + 콜백에서 `exchangeCodeForSession` + 닉네임/아바타 동기화 (PR #7-B)                 |
| AuthListener (전역 단일)          | ✅   | `app/shared/components/AuthListener.tsx`                                      | QueryProvider 내부 마운트. SIGNED_IN/SIGNED_OUT/USER_UPDATED만 `AUTH_QUERY_KEY` invalidate (PR #7-C)             |
| UserMenu 드롭다운                 | ✅   | `app/shared/components/UserMenu.tsx`                                          | 로그인/비로그인 분기 + Avatar 드롭다운 + 로그아웃. HomeClient에서만 마운트 (글로벌 헤더는 다음 PR) (PR #7-C)     |
| `requireUser` API 가드            | ✅   | `app/shared/lib/auth/requireUser.ts`                                          | 6개 API 라우트(match × 3, judge, problems × 2)에 401 가드 통일 (PR #7-C)                                         |
| `protectedPaths` 보호 prefix      | ✅   | `app/shared/lib/auth/protectedPaths.ts`                                       | middleware + UserMenu 공유. `PROTECTED_PREFIXES` + `isProtectedPath()` (PR #7-C)                                 |
| `sanitizeNext` open redirect 차단 | ✅   | `app/(auth)/login/_utils/sanitizeNext.ts`                                     | `/login`, OAuth callback, OAuth start, middleware 4곳 same-origin 화이트리스트 (PR #7-C)                         |

## API 라우트 (참고용)

| 경로                              | 상태 | 설명                  |
| --------------------------------- | ---- | --------------------- |
| `app/api/match/route.ts`          | ✅   | 매치 생성             |
| `app/api/match/[matchId]/join/`   | ✅   | 매치 참가             |
| `app/api/match/[matchId]/submit/` | ✅   | 코드 제출 + 결과 반영 |
| `app/api/judge/route.ts`          | ✅   | AI 채점               |
| `app/api/problems/route.ts`       | ✅   | 문제 목록             |
| `app/api/problems/[problemId]/`   | ✅   | 문제 단건 조회        |

## DB / RLS 상태 (요약)

> 상세 검증은 `CLAUDE.md` "Supabase DB 상태 검증 규칙" 참고.
> 테이블별 row/정책 카운트는 `PROJECT_STATUS.md` "DB 상태" 섹션 참고.

- 테이블: `profiles`, `matches`, `match_participants`, `submissions`, `problems`, `test_cases`, `ai_reviews` 모두 RLS enabled
- `profiles` RLS: `public_read` + `self_update` + `self_insert` (PR #7-A 보강)
- `problems` RLS: `public_read` (PR #8)
- `test_cases` RLS: `visible_read` (PR #8 — 히든은 service role 전용)
- `ai_reviews` RLS: `self_read` (PR #8 — `submission_id IN (...)` + `TO authenticated`)
- `auth.users` AFTER INSERT 트리거: `handle_new_user` 적용 완료
- `matches`: `invite_token` UNIQUE + `invite_expires_at` + `host_id` 컬럼 추가 완료 (PR #6에서 선반영, Step 3 매칭 PR에서 사용 예정)
- 시드: `problems` 9건 + `test_cases` 43건 (visible 27 / hidden 16) — 멱등 마이그레이션 SoT 확보 (PR #8)

## 마지막 갱신

- **일자**: 2026-05-04
- **PR**: PR #7-C (#12) `dev` squash merge 완료 (squash commit `441d766`). feature 4커밋(`5cb48ba`/`42f9aff`/`46fb23f`/`bca2404`)이 단일 squash로 들어감.
- **변경 요약**: middleware 라우트 가드(`/play`, `/result`, `/dashboard`, `/profile/me`) + AuthListener 전역 단일 구독 + UserMenu 드롭다운 + 홈 화면(`app/page.tsx` + `HomeClient`) 재작성. PR #11 보안 후속 3건 모두 처리 — `sanitizeNext` open redirect 차단(`/login`/OAuth callback/OAuth start/middleware 4곳) / middleware SSR 가드(`/play/*`, `/result/*`, `/dashboard`, `/profile/me`) / `requireUser` 헬퍼로 6개 API 라우트 401 가드 통일.
- **다음 PR 예정 순서**:
  1. **Step 3 매칭 PR** — 친구 초대 + `/dashboard` + `POST /api/match/invite` + `/invite/[token]`
  2. **Step 3 프로필 PR** — `/profile/[userId]` + `/profile/me` + 닉네임 편집 + 닉네임 3차 fallback 모달
  3. **(main) 글로벌 헤더 PR** — `(main)/layout.tsx` 도입으로 `/play`, `/dashboard`, `/profile` 등에 UserMenu 일괄 마운트 여부 결정
  4. **코드 리뷰 nit 후속** — placeholder Card 시멘틱 / "다음 PR" 카피 / LoginPage design token 통일 / `app/_components/` 폴더 컨벤션 가이드 (매칭 PR과 함께 처리 가능)
