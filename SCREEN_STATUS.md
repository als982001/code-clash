# 화면 구현 상태

> 작업 시작 전/완료 후 갱신. 매치 실행 없이 코드 기반 리뷰 시 SoT(Single Source of Truth).
> 상태 마커는 `CLAUDE.md` "화면 구현 상태 추적 규칙" 참고.

## 라우트별 상태

| 라우트              | 상태 | 파일                                        | 설명                                                                         |
| ------------------- | ---- | ------------------------------------------- | ---------------------------------------------------------------------------- |
| `/`                 | 🚨   | `app/page.tsx`                              | **Next.js 기본 create-next-app 템플릿 그대로** — 실제 메인 화면 미구현       |
| `/play/[matchId]`   | ✅   | `app/(main)/play/[matchId]/page.tsx`        | 익명 자동 가입 + 문제 패널 + 코드 에디터 + 채점 + 결과 인라인 표시까지 동작  |
| `/result/[matchId]` | ⏳   | `app/(main)/result/[matchId]/` (디렉토리만) | 별도 라우트 미구현. 결과는 현재 `/play` 페이지 내 `matchResult` state 인라인 |
| `/login`            | ⏳   | `app/(auth)/login/` (디렉토리만)            | PR #7-B 예정 (OAuth Provider 버튼 + linkIdentity 분기)                       |
| `/auth/callback`    | ⏳   | `app/(auth)/callback/` (디렉토리만)         | PR #7-B 예정 (`exchangeCodeForSession` + 서버측 닉네임 동기화)               |
| `/dashboard`        | ⏳   | `app/(main)/dashboard/` (디렉토리만)        | Step 3 매칭 PR 예정 (친구 초대 매치 리스트)                                  |
| `/leaderboard`      | ⏳   | `app/(main)/leaderboard/` (디렉토리만)      | 향후 단계 — 현재 명세 미정                                                   |
| `/profile/[userId]` | ⏳   | `app/(main)/profile/[userId]/` (디렉토리만) | Step 3 프로필 PR 예정 (프로필 보기 + 닉네임 편집)                            |

## 인증 / 공통 인프라

| 영역                        | 상태 | 위치 / 파일                                  | 설명                                                                                  |
| --------------------------- | ---- | -------------------------------------------- | ------------------------------------------------------------------------------------- |
| 익명 자동 가입              | ✅   | `app/shared/hooks/useAutoAnonymousAuth.ts`   | `/play` 진입 시 트리거. `signInAnonymously` + 유저 ID 노출 (isMounted 가드 적용 완료) |
| 통합 인증 상태 훅           | ✅   | `app/shared/hooks/useAuth.ts`                | React Query 단일 진입점. user + profiles 조회 + fallback upsert                       |
| 익명 유저 판별 유틸         | ✅   | `app/shared/utils/isAnonymousUser.ts`        | 객체 매개변수 컨벤션 적용                                                             |
| Supabase anon 클라이언트    | ✅   | `app/shared/lib/supabase/{client,server}.ts` | 브라우저/서버 클라이언트 분리 (RLS 검증 경로)                                         |
| Supabase service 클라이언트 | ✅   | `app/shared/lib/supabase/service.ts` (PR #8) | 서버 전용 service-role. 히든 test_cases 채점 시 RLS bypass                            |
| middleware.ts               | 🔄   | `middleware.ts`                              | 세션 쿠키 자동 갱신만 동작. 라우트 가드는 PR #7-C 예정                                |
| OAuth 로그인 플로우         | ⏳   | —                                            | PR #7-B 예정 (`signInWithOAuth` + `linkIdentity` 분기)                                |
| AuthListener (전역 단일)    | ⏳   | —                                            | PR #7-C 예정 (`onAuthStateChange` 단일 구독)                                          |
| UserMenu 드롭다운           | ⏳   | —                                            | PR #7-C 예정                                                                          |

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

- **일자**: 2026-04-26
- **PR**: #9 (`chore/step3-followup-fixes`) dev 머지 완료
- **변경 요약**: 후속 보강 — isMounted 가드 / useAuth retry + queryFn explicit throw / service singleton + fail-fast + 명시 타입 / test_cases UNIQUE + is_hidden NOT NULL (DO 블록 멱등) / ENV 에러 메시지 차별화 (E_JUDGE0 / E_SERVICE)
- **다음 PR 예정 순서**:
  1. **PR #7-B** — `/login` + `/auth/callback` (OAuth + linkIdentity)
  2. **PR #7-C** — middleware 가드 + AuthListener + UserMenu + **메인 화면 재작성**
  3. **Step 3 매칭 PR** — 친구 초대 + dashboard
  4. **Step 3 프로필 PR** — `/profile/[userId]`
