# 다음 세션 컨텍스트

## 현재 완료 상태

- 기술 스택 확정 (`docs/TECH_STACK.md`)
- 작업 계획서 작성 (`docs/WORK_PLAN.md`)
- Next.js 15 + Tailwind v4 + shadcn/ui 환경 구축 완료
- TanStack Query, Zustand, Supabase 패키지 설치 완료
- Supabase 클라이언트 유틸 생성 완료 (`app/shared/lib/supabase/client.ts`, `server.ts`)
- QueryProvider 설정 완료
- 폴더 구조 생성 완료 (라우트 그룹, features, shared 등)
- Supabase 프로젝트 생성 완료 + `.env.local` 설정 완료
- Auth 설정은 아직 미진행 (Step 3에서 진행 예정)

## 다음 세션 목표: Step 1 - 핵심 대전 루프

### 진행 순서

1. **DB 테이블 생성** — `docs/SUPABASE_SETUP.md` 섹션 5 참고
   - Step 1에 필요한 테이블: `problems`, `test_cases`, `matches`, `match_participants`, `submissions`
   - `profiles`는 Auth 없이도 생성 가능하지만, Step 1에서는 직접 사용하지 않음
   - `ai_reviews`는 Step 4에서 필요

2. **문제 시드 데이터 삽입** (5~10개)
   - 알고리즘 문제 + 테스트 케이스 하드코딩
   - 난이도 Level 1~3 골고루 분배

3. **`/play/[matchId]` 페이지 구현**
   - 좌: 문제 지문 / 우: Monaco Editor 분할 레이아웃
   - Monaco Editor 통합 (`@monaco-editor/react` 패키지 설치 필요)
   - 언어 선택 (JavaScript, Python)

4. **Judge0 API 연동**
   - RapidAPI 키 필요 → `.env.local`에 `JUDGE0_API_URL`, `JUDGE0_API_KEY` 추가
   - API Route: `app/api/judge/route.ts`
   - 실행 간격 제한 (3초 Rate Limiting)

5. **Supabase Realtime 대전 방**
   - 2인 대전 방 생성/참가
   - Broadcast 이벤트: `PLAYER_READY`, `PROGRESS_UPDATE`, `OPPONENT_SUBMITTED`

### 선행 작업 (사용자가 직접)

- [ ] Judge0 API 키 발급 (RapidAPI에서 Judge0 CE 구독)
- [ ] `.env.local`에 Judge0 키 추가

### 참고 파일

| 파일                      | 내용                                              |
| ------------------------- | ------------------------------------------------- |
| `BLUE_PRINT/BLUEPRINT.md` | 전체 청사진 (스키마, 통신 프로토콜, 점수 공식 등) |
| `docs/TECH_STACK.md`      | 확정된 기술 스택                                  |
| `docs/WORK_PLAN.md`       | Step별 체크리스트                                 |
| `docs/SUPABASE_SETUP.md`  | DB 테이블 생성 SQL                                |
| `.env.example`            | 필요한 환경변수 목록                              |

### 주의사항

- 점수 계산, 승패 판정은 반드시 서버사이드(API Route)에서 처리 (Anti-Cheat)
- 제출 멱등성 보장: `matchId` + `userId` 기준 첫 번째 제출만 유효
- Judge0 무료 플랜 일일 제한 있음 → 개발 중 불필요한 호출 절제
