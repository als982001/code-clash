# Step 1: 핵심 대전 루프 — 상세 작업 목록

> 이 문서는 WORK_PLAN.md의 Step 1을 세부 태스크로 분해한 실행 가이드입니다.
> 참고: `BLUE_PRINT/BLUEPRINT.md`, `docs/SUPABASE_SETUP.md`, `docs/NEXT_SESSION.md`

---

## 1-1. 문제 시스템

### 1-1-1. DB 스키마 생성

- [x] `problems` 테이블 생성
- [x] `test_cases` 테이블 생성

**실행 방법**: Supabase 대시보드 → SQL Editor에서 실행  
**SQL 참고**: `docs/SUPABASE_SETUP.md` 섹션 5-1, 5-2

**스키마 요약:**

| 테이블       | 주요 필드                                                   |
| ------------ | ----------------------------------------------------------- |
| `problems`   | title, description, difficulty(Level 1~3), time_limit, tags |
| `test_cases` | problem_id(FK), input, expected_output, is_hidden           |

### 1-1-2. 시드 데이터 삽입

- [x] 알고리즘 문제 5~10개 작성 (난이도 Level 1~3 골고루 분배)
- [x] 각 문제당 테스트 케이스 3~5개 작성 (공개 + 히든 혼합)

**기준:**

- Level 1: 기초 (배열 탐색, 문자열 처리 등)
- Level 2: 중급 (정렬 응용, 해시맵, 스택/큐 등)
- Level 3: 심화 (DP, 그래프 탐색 등)
- 테스트 케이스 중 최소 1개는 `is_hidden: true`로 설정 (채점 신뢰도 확보)

### 1-1-3. 문제 조회 API

- [x] `GET /api/problems` — 전체 문제 목록 조회
- [x] `GET /api/problems/[problemId]` — 단일 문제 상세 조회 (테스트 케이스 포함)
- [x] 목록 응답에 난이도, 태그 포함 (테스트 케이스 본문은 제외)
- [x] 상세 응답에 공개 테스트 케이스 포함 (`is_hidden: false`만)

**파일 경로**: `app/api/problems/route.ts`, `app/api/problems/[problemId]/route.ts`  
**용도**: 목록 API는 문제 선택/배정용, 상세 API는 `/play/[matchId]` 페이지에서 매치에 배정된 문제를 렌더링할 때 사용

---

## 1-2. 코드 에디터 + 채점

### 1-2-1. `/play/[matchId]` 페이지 레이아웃

- [x] 분할 레이아웃 구현: 좌측 = 문제 지문 / 우측 = 코드 에디터
- [x] 반응형 고려 (최소 데스크톱 우선, 모바일은 Phase 2 이후)

**파일 경로**: `app/(main)/play/[matchId]/page.tsx`  
**관련 feature**: `app/features/editor/`, `app/features/problem/`

### 1-2-2. Monaco Editor 통합

- [x] `@monaco-editor/react` 패키지 설치
- [x] 에디터 컴포넌트 구현
- [x] 언어 선택 기능 (JavaScript, Python)
- [x] 에디터 기본 설정 (테마, 폰트 사이즈, 자동 완성)

**파일 경로**: `app/features/editor/components/CodeEditor.tsx`

**주의사항:**

- Monaco Editor는 SSR 불가 → `dynamic import`로 클라이언트 전용 로드 필수
- Next.js에서 Monaco 웹 워커 설정이 필요할 수 있음 (빌드 시 확인)

### 1-2-3. Judge0 API 연동

- [x] API Route 생성: `app/api/judge/route.ts`
- [x] Judge0 CE에 코드 제출 → 결과 폴링 로직 구현
- [x] `.env.local`에 환경변수 추가: `JUDGE0_API_URL`, `JUDGE0_API_KEY`

**선행 작업 (사용자 직접):**

- RapidAPI에서 Judge0 CE 구독 후 API 키 발급
- `.env.local`에 키 추가

**채점 흐름:**

```
FE (코드 + 언어) → POST /api/judge → Judge0 CE 제출 → 결과 폴링 → 채점 결과 반환
```

**Judge0 언어 ID 매핑:**

| 언어       | Judge0 Language ID |
| ---------- | ------------------ |
| JavaScript | 63 (Node.js)       |
| Python     | 71 (Python 3)      |

### 1-2-4. 채점 결과 UI

- [x] 테스트 케이스별 통과/실패 표시
- [x] 실행 시간, 메모리 사용량 표시
- [x] 컴파일/런타임 에러 메시지 표시
- [x] Judge0 타임아웃 시 "채점 서버 지연" 메시지 + 재시도 버튼

### 1-2-5. 실행 간격 제한 (Rate Limiting)

- [x] 코드 실행 버튼 클릭 후 3초간 재실행 불가
- [x] 쿨다운 중 버튼 비활성화 + 남은 시간 표시

**이유**: Judge0 무료 플랜 일일 호출 제한 보호 + 서버 부하 방지

---

## 1-3. 실시간 대전 방

### 1-3-1. DB 스키마 생성

- [x] `matches` 테이블 생성
- [x] `match_participants` 테이블 생성
- [x] `submissions` 테이블 생성

**SQL 참고**: `docs/SUPABASE_SETUP.md` 섹션 5-4, 5-5, 5-6

**주의사항:**

- `matches`, `match_participants`는 Supabase Realtime 활성화 필요
  - 대시보드 → Database → Replication에서 해당 테이블 활성화
- **profiles FK 제거 (Step 1 한정)**: `profiles` 테이블은 Step 3(인증)에서 생성 예정이므로, Step 1에서는 아래 컬럼의 FK 제약을 제거하고 단순 UUID로만 사용한다.
  - `matches.winner_id` — `REFERENCES profiles(id)` 제거
  - `match_participants.user_id` — `REFERENCES profiles(id)` 제거
  - `submissions.user_id` — `REFERENCES profiles(id)` 제거
  - Step 3에서 Auth + profiles 테이블 생성 후 FK를 추가하는 마이그레이션 진행

**스키마 요약:**

| 테이블               | 주요 필드                                                       |
| -------------------- | --------------------------------------------------------------- |
| `matches`            | status(waiting/ongoing/finished), winner_id, problem_id         |
| `match_participants` | match_id(FK), user_id(FK), score, mmr_change                    |
| `submissions`        | user_id(FK), match_id(FK), code, language, status, passed_cases |

### 1-3-2. Supabase Realtime 채널 구성

- [x] 대전 방 채널 생성: `match:{matchId}`
- [x] Broadcast 이벤트 정의 및 송수신 구현

**이벤트 목록:**

| 이벤트               | 방향         | 설명                    | Payload 예시                          |
| -------------------- | ------------ | ----------------------- | ------------------------------------- |
| `PLAYER_READY`       | Client → All | 플레이어 준비 완료      | `{ userId }`                          |
| `PROGRESS_UPDATE`    | Client → All | 테스트 케이스 통과 현황 | `{ userId, passedCount, totalCount }` |
| `OPPONENT_SUBMITTED` | Server → All | 상대방 최종 제출 알림   | `{ userId }`                          |
| `MATCH_FINISHED`     | Server → All | 대전 종료 + 결과        | `{ winnerId, scores, mmrChange }`     |

**파일 경로**: `app/features/match/hooks/useMatchRealtime.ts`

### 1-3-3. 2인 대전 방 생성/참가 로직

- [x] 방 생성 API: `POST /api/match` → `matches` 레코드 생성 (status: waiting)
- [x] 방 참가 API: `POST /api/match/[matchId]/join` → `match_participants` 추가
- [x] 2명 참가 시 자동으로 status를 `ongoing`으로 변경 + 랜덤 문제 배정

**파일 경로**: `app/api/match/route.ts`, `app/api/match/[matchId]/join/route.ts`

### 1-3-4. 실시간 상태 동기화

- [x] 양쪽 플레이어 READY 확인 후 게임 시작
- [x] 코드 실행 시 `PROGRESS_UPDATE` 브로드캐스트
- [x] 상대방 진행률 UI 반영 (Step 2에서 프로그레스 바로 확장)

### 1-3-5. 최종 제출 + 점수 계산 (서버사이드)

- [x] 제출 API: `POST /api/match/[matchId]/submit`
- [x] 제출 멱등성 보장: `matchId` + `userId` 기준 첫 번째 제출만 유효
- [x] Judge0로 전체 테스트 케이스 채점 (히든 포함)
- [x] 점수 산출 공식 적용:
  ```
  Score = (passed / total × 1000) + ((T_max - T_used) / T_max × 500)
  ```
- [x] `submissions` 테이블에 결과 저장

**파일 경로**: `app/api/match/[matchId]/submit/route.ts`

**주의사항:**

- 점수 계산은 반드시 서버사이드에서 처리 (Anti-Cheat)
- 클라이언트는 결과만 수신하여 표시

### 1-3-6. 승패 판정 로직

- [x] 양쪽 제출 완료 또는 시간 초과 시 승패 판정
- [x] `matches.winner_id` 업데이트 + status를 `finished`로 변경
- [x] `MATCH_FINISHED` 이벤트 브로드캐스트

**판정 기준:**

| 상황      | 기준                                       |
| --------- | ------------------------------------------ |
| 정상 종료 | 점수 높은 유저 승리                        |
| 동점      | `submitted_at` 타임스탬프가 빠른 유저 승리 |
| 중도 퇴장 | 퇴장한 유저 즉시 패배                      |
| 시간 초과 | 제출 시점까지의 점수로 비교                |

---

## 진행 순서 (권장)

```
1-1-1  DB 스키마 (problems, test_cases)
  ↓
1-1-2  시드 데이터 삽입
  ↓
1-2-1  /play/[matchId] 레이아웃
  ↓
1-2-2  Monaco Editor 통합
  ↓
1-2-3  Judge0 API 연동
  ↓
1-2-4  채점 결과 UI
  ↓
1-2-5  Rate Limiting
  ↓
1-3-1  DB 스키마 (matches, match_participants, submissions)
  ↓
1-3-2  Realtime 채널 구성
  ↓
1-3-3  방 생성/참가
  ↓
1-3-4  상태 동기화
  ↓
1-3-5  제출 + 점수 계산
  ↓
1-3-6  승패 판정
```

## 선행 작업 (사용자가 직접 수행)

- [x] Judge0 API 키 발급 (RapidAPI → Judge0 CE 구독)
- [x] `.env.local`에 `JUDGE0_API_URL`, `JUDGE0_API_KEY` 추가

## 참고 문서

| 파일                      | 내용                                  |
| ------------------------- | ------------------------------------- |
| `BLUE_PRINT/BLUEPRINT.md` | 전체 청사진 (스키마, 통신, 점수 공식) |
| `docs/SUPABASE_SETUP.md`  | DB 테이블 생성 SQL                    |
| `docs/TECH_STACK.md`      | 확정된 기술 스택                      |
| `.env.example`            | 필요한 환경변수 목록                  |
