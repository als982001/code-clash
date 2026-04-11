# Code Clash - 작업 계획서

## Step 0: 프로젝트 초기 세팅

- [x] 청사진 작성
- [x] 기술 스택 확정 문서화
- [x] Next.js 프로젝트 생성 (App Router, TypeScript, Tailwind v4)
- [x] shadcn/ui 초기화
- [x] 프로젝트 폴더 구조 생성
- [x] Supabase 클라이언트 설정 (패키지 설치 + 환경변수 템플릿)
- [x] ESLint 설정
- [x] 기본 레이아웃 컴포넌트 (QueryProvider, Layout)

## Step 1: 핵심 대전 루프 (Phase 1)

### 1-1. 문제 시스템

- [x] DB 스키마 생성 (problems, test_cases)
- [x] 하드코딩 문제 5~10개 시드 데이터
- [x] 문제 조회 API (GET /api/problems)

### 1-2. 코드 에디터 + 채점

- [x] `/play/[matchId]` 페이지 레이아웃 (문제 + 에디터 분할)
- [x] Monaco Editor 통합 (언어 선택, 테마)
- [x] Judge0 API 연동 (코드 실행 -> 채점 결과)
- [x] 채점 결과 UI (통과/실패, 실행 시간, 에러 표시)
- [x] 실행 간격 제한 (3초 Rate Limiting)

### 1-3. 실시간 대전 방

- [x] DB 스키마 생성 (matches, match_participants, submissions)
- [x] Supabase Realtime 채널 구성
- [x] 2인 대전 방 생성/참가 로직
- [x] 실시간 상태 동기화 (PLAYER_READY, PROGRESS_UPDATE)
- [x] 최종 제출 + 점수 계산 (서버사이드)
- [x] 승패 판정 로직

## Step 2: 긴장감 UX (Phase 2)

- [ ] 실시간 프로그레스 바 (상대 테스트 통과 수)
- [ ] 상대 제출 알림 토스트 (OPPONENT_SUBMITTED)
- [ ] 타이머 (15분 카운트다운, 5분 색상 변경, 1분 깜빡임)
- [ ] 사운드 피드백 + 음소거 토글

## Step 3: 인증 + 매칭 (Phase 3)

- [ ] Supabase Auth 설정 (Google, GitHub 소셜 로그인)
- [ ] DB 스키마 생성 (profiles)
- [ ] 로그인/회원가입 플로우
- [ ] 초대 링크로 친구 대전
- [ ] 기본 프로필 페이지 (`/profile/[userId]`)
- [ ] 인증 미들웨어 (보호 라우트)

## Step 4: 결과 + AI 리뷰 (Phase 4)

- [ ] `/result/[matchId]` 결과 화면
- [ ] AI 코드 리뷰 연동 (Vercel AI SDK + Gemini)
- [ ] MMR 변동 계산 + 표시
- [ ] 코드 비교 뷰 (나 vs 상대)

## Step 5: 커뮤니티 + 확장 (Phase 5, 이후)

- [ ] 자동 매칭 큐 (ELO 기반)
- [ ] 리더보드 (`/leaderboard`)
- [ ] 프로필 통계 + 역량 분석 (방사형 차트)
- [ ] AI 대전 상대 (Bot)
- [ ] AI 문제 생성기

## 폴더 구조

```
app/
├── (auth)/              # 인증 관련 라우트 그룹
│   ├── login/
│   └── callback/
├── (main)/              # 인증 후 메인 라우트 그룹
│   ├── dashboard/
│   ├── play/[matchId]/
│   ├── result/[matchId]/
│   ├── profile/[userId]/
│   └── leaderboard/
├── api/                 # API Routes
│   ├── judge/
│   ├── match/
│   └── ai/
├── features/            # 기능별 모듈
│   ├── editor/          # Monaco 에디터 관련
│   ├── match/           # 대전 로직
│   ├── problem/         # 문제 관련
│   └── review/          # AI 리뷰
├── shared/              # 공용 컴포넌트
│   ├── components/
│   ├── hooks/
│   └── lib/
├── types/               # 공용 타입
└── utils/               # 공용 유틸
```
