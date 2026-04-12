# ⚔️ Code Clash

> 실시간 1:1 알고리즘 대전 플랫폼

![매치 진행 화면](public/images/match-overview.png)

두 명의 플레이어가 같은 알고리즘 문제를 실시간으로 풀며 대결하는 웹 애플리케이션입니다.
제한 시간 내에 더 많은 테스트 케이스를 통과하는 사람이 승리합니다.

> 🚧 현재 **Step 2**까지 구현 완료 · Step 3(로비/매칭 UI) 미착수

## 주요 기능

### 실시간 대전

- Supabase Realtime 기반 1:1 매치 (방 생성 → 참가 → 대전 → 결과)
- 15분 제한 타이머 및 자동 제출
- 실시간 진행률 HUD — 내 진행률과 상대 진행률을 상단 바에서 동시 확인

![HUD 프로그레스 바](public/images/hud-progress.png)

### 코드 에디터 & 채점

- Monaco Editor 기반 코드 작성 (JavaScript / Python)
- Judge0 CE API를 통한 자동 채점 (테스트케이스별 pass/fail 판정)
- 3초 Rate Limiting으로 과도한 채점 요청 방지

### 긴장감 UX

- 상대가 코드를 제출하면 토스트 알림으로 즉시 안내
- 사운드 피드백 — 제출, 상대 제출, 경고, 승리, 패배, 무승부
- 음소거 토글 지원

![상대 제출 토스트 알림](public/images/toast-opponent-submit.png)

### 인증

- Supabase Anonymous Auth 기반 익명 인증
- 서버 사이드에서 `auth.getUser()`로 사용자 검증 (body.userId 신뢰 제거)

## 기술 스택

| 분류         | 기술                                          |
| ------------ | --------------------------------------------- |
| Framework    | Next.js 16 (App Router)                       |
| Language     | TypeScript, React 19                          |
| Backend / DB | Supabase (PostgreSQL, Realtime, Auth, RLS)    |
| 상태 관리    | Zustand, TanStack React Query                 |
| 코드 에디터  | Monaco Editor (`@monaco-editor/react`)        |
| 채점 엔진    | Judge0 CE (RapidAPI)                          |
| 스타일링     | Tailwind CSS 4, shadcn/ui                     |
| 기타         | sonner (토스트), react-markdown, lucide-react |

## 시작하기

### 사전 요구사항

- Node.js 18+
- Supabase 프로젝트 (Anonymous Auth 활성화 필요)
- Judge0 CE API 키 ([RapidAPI](https://rapidapi.com/judge0-official/api/judge0-ce))

### 환경변수 설정

프로젝트 루트에 `.env.local` 파일을 생성합니다:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Judge0 CE (RapidAPI)
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=your_rapidapi_key
JUDGE0_API_HOST=judge0-ce.p.rapidapi.com
```

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

`http://localhost:3000`에서 접속할 수 있습니다.

### Supabase 설정

`supabase/seed.sql`에 알고리즘 문제 시드 데이터가 포함되어 있습니다.
Supabase 대시보드의 SQL Editor에서 실행하면 문제 데이터가 추가됩니다.

## 프로젝트 구조

```
app/
├── (auth)/                  # 인증 라우트 (미구현)
├── (main)/
│   └── play/[matchId]/      # 매치 플레이 페이지
├── api/
│   ├── judge/               # Judge0 코드 채점
│   ├── match/               # 매치 생성
│   ├── match/[matchId]/     # 참가(join), 제출(submit)
│   └── problems/            # 문제 목록 및 상세
├── features/
│   ├── editor/              # 코드 에디터 (Monaco)
│   ├── match/               # 매치 상태, 타이머, 사운드
│   ├── problem/             # 문제 표시 (Markdown)
│   └── review/              # 리뷰 (미구현)
├── shared/
│   ├── hooks/               # useAnonymousAuth
│   ├── lib/supabase/        # Supabase 클라이언트
│   └── stores/              # useSoundStore (Zustand)
└── middleware.ts             # Supabase 세션 쿠키 자동 갱신
```

## 개발 로드맵

- [x] **Step 0** — 프로젝트 환경 구축
- [x] **Step 1** — 핵심 대전 루프 (매치 생성/참가, 에디터, 채점, 실시간 동기화, 승패 판정)
- [x] **Step 2** — 긴장감 UX (타이머, HUD, 사운드, 토스트 알림, Anonymous Auth)
- [ ] **Step 3** — 로비 / 매칭 UI
- [ ] **Step 4** — OAuth 로그인 (Google, GitHub) 및 프로필 시스템
- [ ] **Step 5** — 리더보드 / MMR 시스템
