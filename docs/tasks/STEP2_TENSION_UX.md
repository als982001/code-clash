# Step 2: 긴장감 UX — 상세 작업 목록

> 이 문서는 WORK_PLAN.md의 Step 2(Phase 2)를 세부 태스크로 분해한 실행 가이드입니다.
> 참고: `docs/tasks/STEP1_CORE_BATTLE_LOOP.md`, `docs/TECH_STACK.md`, `BLUE_PRINT/BLUEPRINT.md`

---

## 목표

Step 1에서 구축한 핵심 대전 루프 위에 **"긴장감 UX"** 레이어를 얹어서, 플레이어가 실시간으로 상대의 진행 상황과 시간 압박을 체감하도록 만든다.

| 항목               | Step 1 상태             | Step 2에서 할 일                                    |
| ------------------ | ----------------------- | --------------------------------------------------- |
| 상대 프로그레스 바 | 에디터 하단에 간단 표시 | 상단 헤더로 이동 + 내 진행률과 나란히 비교          |
| 상대 제출 알림     | 배너 형태               | 토스트(sonner)로 교체                               |
| 타이머             | 없음                    | 15분 카운트다운 + 경고/위험 상태 시각화 + 자동 제출 |
| 사운드 / 음소거    | 없음                    | 효과음 5종 + 전역 음소거 토글 (영속화)              |

---

## 2-0. 선행 작업

### 2-0-1. 대전 제한 시간을 15분으로 통일

- [x] `app/api/match/[matchId]/submit/route.ts`의 `DEFAULT_MATCH_TIME_LIMIT`를 `1800` → `900`으로 수정

**이유**: WORK_PLAN의 "15분 카운트다운"과 점수 산식의 `T_max`를 일치시켜야 시간 보너스가 정합성 있게 계산된다.

### 2-0-2. sonner 토스트 라이브러리 설치

- [x] `npx shadcn@latest add sonner` 실행
- [x] 자동 생성된 `components/ui/sonner.tsx` 확인
- [x] `app/layout.tsx`의 `<body>` 내부(QueryProvider 바깥)에 `<Toaster />` 배치

**이유**: shadcn 생태계에서 가장 경량이고 사용이 간단한 토스트 라이브러리. Step 2 작업 3(상대 제출 알림)과 4(사운드 경고)에서 사용.

### 2-0-3. 사운드 파일 준비

- [x] `public/sounds/` 디렉토리 생성
- [x] 효과음 파일 6종 배치 (아래 표 참고 — `draw.wav`는 Step 2-4 구현 중 추가됨)

| 파일명                | 용도                  | 길이(권장) |
| --------------------- | --------------------- | ---------- |
| `submit.wav`          | 내가 최종 제출 완료   | ~0.5s      |
| `opponent-submit.wav` | 상대가 최종 제출 완료 | ~0.8s      |
| `warning.wav`         | 타이머 1분 경고 진입  | ~0.6s      |
| `win.wav`             | 승리 확정             | ~1.5s      |
| `lose.wav`            | 패배 확정             | ~1.5s      |
| `draw.wav`            | 무승부 확정           | ~1.5s      |

**주의사항**:

- CC0 / Royalty-free 라이선스 파일만 사용 (freesound.org, mixkit.co 등)
- 브라우저 자동재생 정책 회피를 위해 첫 유저 상호작용(`PLAYER_READY` 브로드캐스트) 이후부터 재생 시작

---

## 2-1. 타이머 (15분 카운트다운)

### 2-1-1. 타이머 로직 훅

- [x] `app/features/match/hooks/useMatchTimer.ts` 생성
- [x] `matches.start_time`을 기준으로 남은 시간 계산
- [x] `setInterval(1000ms)` 대신 **`Date.now()` 기반 재계산**으로 백그라운드 탭 정확도 보장
- [~] 반환값: `{ remainingSeconds, isWarning, isCritical, isExpired }` — 현재 `{ remainingSeconds, isExpired, isWarning }`의 2단계(≤30s)만 구현. 문서 스펙의 `isWarning ≤300s / isCritical ≤60s` 3단계 재설계는 별도 후속 작업으로 분리.

**상태 기준**:

| 상태         | 조건                    | 시각 효과                     |
| ------------ | ----------------------- | ----------------------------- |
| 기본         | 5분 초과 남음           | 흰색 텍스트                   |
| `isWarning`  | 5분 이하 남음 (≤ 300초) | 주황색 텍스트                 |
| `isCritical` | 1분 이하 남음 (≤ 60초)  | 빨강 + `animate-pulse`        |
| `isExpired`  | 0초 도달                | 타이머 숨김, 자동 제출 트리거 |

**파일 경로**: `app/features/match/hooks/useMatchTimer.ts`

### 2-1-2. 타이머 UI 컴포넌트

- [~] `app/features/match/components/MatchTimer.tsx` 생성 → Step 2-2에서 `MatchStatusBar`로 통합되며 **파일 삭제**. 타이머 UI는 `MatchStatusBar` 내부에 인라인으로 구현.
- [x] `useMatchTimer` 훅 사용
- [x] 표기 포맷: `mm:ss`
- [x] 상태별 색상/애니메이션 적용 (현재는 2단계: 기본/alert)

**파일 경로**: `app/features/match/components/MatchTimer.tsx`

### 2-1-3. 시간 초과 자동 제출

- [x] `/play/[matchId]/page.tsx`에서 `isExpired === true`이고 내가 아직 제출하지 않았다면, 현재 에디터 코드(또는 빈 코드 → `"// time out"` placeholder)로 `handleSubmit`을 자동 호출한다. `hasAutoSubmittedRef` + `expiredRef` 이중 방어.

**구현 근거**:

- 서버 신규 엔드포인트를 추가하지 않고 기존 `POST /api/match/[matchId]/submit`을 재사용한다.
- `submit/route.ts`는 이미 **멱등성(matchId + userId 기준 첫 번째 제출만 유효)**과 **양쪽 제출 완료 시 자동 판정**이 구현되어 있어 그대로 동작한다.
- 빈 코드로 제출되면 테스트 케이스가 전부 실패해 0점 처리되고, 양쪽 판정 로직이 정상 작동한다.

**주의사항**:

- `start_time`이 `null`인 경우(아직 `waiting` 상태) 타이머는 숨김 처리한다.

---

## 2-2. 실시간 프로그레스 바 (재배치)

### 2-2-1. 기존 하단 프로그레스 바 제거

- [x] `app/features/editor/components/EditorPanel.tsx` 142-157줄의 상대 프로그레스 바 블록 제거
- [x] `EditorPanel`의 `opponentProgress` prop 제거

**이유**: Step 1에서는 에디터 하단에 작게 붙어있어 시야에 들어오기 어려웠다. 긴장감을 주려면 상단 헤더로 이동해 양쪽 바를 나란히 비교할 수 있게 한다.

### 2-2-2. 통합 헤더 컴포넌트

- [x] `app/features/match/components/MatchStatusBar.tsx` 생성
- [x] 레이아웃: `[타이머] [나: ▓▓▓░░ 3/5] vs [상대: ▓▓░░░ 2/5] [🔊 음소거 토글]` — 음소거 토글 자리는 Step 2-4에서 추가 예정
- [x] 내 바는 초록, 상대 바는 빨강
- [x] 프로그레스 변화 시 `transition-all duration-500` 부드러운 애니메이션

**파일 경로**: `app/features/match/components/MatchStatusBar.tsx`

### 2-2-3. 내 진행률 상태 추가

- [x] `/play/[matchId]/page.tsx`에 `myProgress` 상태 추가 (`passedCount`, `totalCount`)
- [x] `handleRun` 내부에서 `judgeResult`를 받을 때 `setMyProgress`로 업데이트
- [x] 이미 존재하는 `PROGRESS_UPDATE` 브로드캐스트는 그대로 유지 (상대 시점용)

**이유**: 기존에는 브로드캐스트로 상대에게만 전달했고 내 바는 따로 없었다. 헤더에 양쪽 바를 나란히 놓으려면 로컬 상태도 필요하다.

---

## 2-3. 상대 제출 알림 토스트

### 2-3-1. 기존 배너 제거

- [x] `/play/[matchId]/page.tsx` 315-319줄의 `opponentSubmitted` 기반 배너 제거
- [~] ~~`opponentSubmitted` 상태는 제거하지 않고 유지~~ → 사용처가 없어 TS/ESLint unused 경고 발생, YAGNI 원칙으로 **state 및 setter 제거**. 필요해지면 다시 추가 가능.

### 2-3-2. sonner 토스트 호출

- [x] `handleOpponentSubmitted` 콜백 내부에서 `toast.warning("상대방이 최종 제출을 완료했습니다!", { duration: 5000 })` 호출
- [x] 같은 지점에서 사운드도 트리거 (작업 2-4 참고)

**파일 경로**: `app/(main)/play/[matchId]/page.tsx`

---

## 2-4. 사운드 피드백 + 음소거 토글

### 2-4-1. 음소거 상태 전역 스토어

- [x] `app/shared/stores/useSoundStore.ts` 생성
- [x] Zustand + `persist` 미들웨어 사용
- [x] localStorage 키: `code-clash-sound`
- [~] SSR hydration mismatch 방지를 위해 `createJSONStorage` 내부에서 `typeof window === "undefined"` 가드 + `skipHydration: true` 적용. 클라이언트 `SoundToggle`에서 `useEffect`로 `persist.rehydrate()` 명시적 호출.

**스토어 형태**:

```ts
interface ISoundStore {
  isMuted: boolean;
  toggleMute: () => void;
  setMuted: (params: { muted: boolean }) => void; // 확장성을 위해 추가
}
```

### 2-4-2. 사운드 재생 훅

- [x] `app/features/match/hooks/useMatchSounds.ts` 생성
- [x] `playSound({ type })` 함수 노출
- [~] 타입: `"submit" | "opponentSubmit" | "warning" | "win" | "lose" | "draw"` — 무승부 사운드(`draw.wav`) 추가됨
- [x] 내부적으로 `Audio` 객체를 **모듈 싱글톤 + lazy init**으로 풀링 (재생 지연 최소화, SSR/StrictMode 안전)
- [x] `isMuted`면 no-op
- [~] `playSound`를 영구 안정 참조로 만들기 위해 `isMutedRef` 패턴 적용. 상위 `handleSubmit`/`handleOpponentSubmitted`/`handleMatchFinished` 불필요한 재생성 차단.

### 2-4-3. 음소거 토글 버튼

- [x] `app/features/match/components/SoundToggle.tsx` 생성
- [x] 아이콘: `Volume2` / `VolumeX` (lucide-react)
- [x] `MatchStatusBar` 우측에 배치
- [~] 매치 종료 후 `MatchStatusBar`가 언마운트되므로 **결과 배너 우측 상단에도 `SoundToggle`을 absolute 배치**하여 종료 후에도 토글 접근 가능하도록 보강.
- [~] 접근성/UX: `focus-visible:ring-2` 포커스 링, `p-1.5` 히트 영역 확장, 한국어 `aria-label` 적용.

**파일 경로**: `app/features/match/components/SoundToggle.tsx`

### 2-4-4. 사운드 트리거 지점

모두 `/play/[matchId]/page.tsx`에서 호출한다.

| 사운드           | 트리거 시점                                                          | 구현 상태 |
| ---------------- | -------------------------------------------------------------------- | --------- |
| `submit`         | `handleSubmit` 시작 시 (수동/자동 제출 모두)                         | [x]       |
| `opponentSubmit` | `handleOpponentSubmitted` 콜백 내부                                  | [x]       |
| `warning`        | 타이머가 `isWarning`으로 **처음 진입할 때** (1회만)                  | [x]       |
| `win`            | `handleMatchFinished`에서 `winnerId === userId`                      | [x]       |
| `lose`           | `handleMatchFinished`에서 `winnerId !== userId && winnerId !== null` | [x]       |
| `draw`           | `handleMatchFinished`에서 `winnerId === null`                        | [x]       |

**주의사항**:

- [x] `warning`은 매초 발생하면 안 되므로 `hasPlayedWarningRef`로 1회 가드
- [x] 매치 종료 결과 사운드도 Realtime 중복 수신 대비해 `hasPlayedResultRef`로 1회 가드 (`setMatchResult`도 가드 뒤로 이동)
- [~] 타이머 단계가 현재 2단계(기본/≤30s warning)라 `warning` 사운드는 30초 진입 시 1회 재생. 원래 스펙은 `isCritical ≤ 60s` 기준이었으나 Step 2-1 deviation을 따른다.
- [x] 새로고침 시 이미 warning 구간이면 즉시 1회 재생 (사용자가 경고를 놓치지 않도록 의도적 허용, 코드 주석으로 명시)
- [~] 자동재생 정책은 일반적으로 사용자 첫 클릭(PLAYER_READY 시점) 이후 unlock되므로 `try/catch` 대신 `audio.play().catch(console.error)`로 조용히 실패 허용.

---

## 진행 순서 (권장)

```
2-0-1  제한 시간 900초로 수정
  ↓
2-0-2  sonner 설치
  ↓
2-0-3  사운드 파일 배치
  ↓
2-1-1  useMatchTimer 훅
  ↓
2-1-2  MatchTimer 컴포넌트
  ↓
2-2-1  EditorPanel 기존 프로그레스 제거
  ↓
2-2-2  MatchStatusBar 컴포넌트
  ↓
2-2-3  myProgress 상태 추가 + 페이지에 헤더 배치
  ↓
2-1-3  타이머 자동 제출 연결
  ↓
2-3    상대 제출 토스트 교체
  ↓
2-4-1  useSoundStore
  ↓
2-4-2  useMatchSounds
  ↓
2-4-3  SoundToggle
  ↓
2-4-4  트리거 지점 연결
```

---

## 변경 파일 총괄

| 구분         | 경로                                               |
| ------------ | -------------------------------------------------- |
| 🆕 신규      | `app/features/match/hooks/useMatchTimer.ts`        |
| 🆕 신규      | `app/features/match/hooks/useMatchSounds.ts`       |
| 🆕 신규      | `app/features/match/components/MatchTimer.tsx`     |
| 🆕 신규      | `app/features/match/components/MatchStatusBar.tsx` |
| 🆕 신규      | `app/features/match/components/SoundToggle.tsx`    |
| 🆕 신규      | `app/shared/stores/useSoundStore.ts`               |
| 🆕 신규      | `public/sounds/*.wav` (6개 — `draw.wav` 포함)      |
| 🆕 자동 생성 | `components/ui/sonner.tsx` (shadcn CLI)            |
| ✏️ 수정      | `app/(main)/play/[matchId]/page.tsx`               |
| ✏️ 수정      | `app/features/editor/components/EditorPanel.tsx`   |
| ✏️ 수정      | `app/layout.tsx`                                   |
| ✏️ 수정      | `app/api/match/[matchId]/submit/route.ts`          |

---

## 잠재 리스크 및 대응

| 리스크                                       | 대응                                                          |
| -------------------------------------------- | ------------------------------------------------------------- |
| 타이머 만료 자동 제출이 양쪽에서 동시 발생   | 기존 `submit/route.ts` 멱등성으로 방어됨 (이미 구현됨)        |
| `matches.start_time`이 `null`인 waiting 상태 | 타이머 숨김 처리, 2명 모두 join 후 `start_time` 생성되면 표시 |
| 탭 백그라운드에서 `setInterval` 드리프트     | `Date.now()` 기반 재계산으로 정확도 보장                      |
| 브라우저 자동재생 차단 정책                  | 첫 유저 상호작용(`PLAYER_READY` 브로드캐스트) 이후부터 재생   |
| 사운드 파일 부재 시 에러                     | `useMatchSounds`에 `try/catch` + 파일 404 시 silent fail      |
| `warning` 사운드가 매초 반복                 | `useRef` 플래그로 critical 진입 시 1회만 재생                 |

---

## 선행 작업 (사용자가 직접 수행해야 하는 항목)

- [x] 효과음 파일 5종 다운로드 및 `public/sounds/` 배치

---

## 확인 필요 사항 (구현 시작 전 결정)

### ① 사운드 파일 준비 방식

효과음 5종(`submit`, `opponentSubmit`, `warning`, `win`, `lose`)을 어떻게 준비할지 선택 필요:

- **A안**: CC0 / 무료 라이선스 소스(freesound.org, mixkit.co 등) 링크를 제안받아 사용자가 다운로드 후 배치
- **B안**: 사용자가 이미 준비한 파일을 직접 배치
- **C안**: 일단 **사운드 파일 없이 인프라만 구축** (빈 `playSound` 구현 + 파일 없어도 silent fail) → 나중에 파일만 추가하면 동작

### ② 리팩토링 범위

현재 `/play/[matchId]/page.tsx`가 332줄이고, Step 2 작업 후 더 비대해진다. 옵션:

- **A안**: Step 2 작업 중 `useMatchSession` 커스텀 훅으로 상태/핸들러를 분리 리팩토링 **포함** (추천)
- **B안**: Step 2 본 작업만 진행, 리팩토링은 **별도 Step**으로 뺌

### ③ Code Writer 에이전트 모델

수정 파일 3개 이상 + 다중 컴포넌트 연쇄 수정 + 새로운 훅/스토어 설계 → **`opus`** 적용 예정. 이견 있으시면 알려주세요.

---

## 참고 문서

| 파일                                   | 내용                                          |
| -------------------------------------- | --------------------------------------------- |
| `docs/WORK_PLAN.md`                    | 전체 작업 계획서 (Step 2 항목)                |
| `docs/tasks/STEP1_CORE_BATTLE_LOOP.md` | Step 1 상세 작업 목록                         |
| `docs/TECH_STACK.md`                   | 확정된 기술 스택 (Zustand, shadcn 등)         |
| `BLUE_PRINT/BLUEPRINT.md`              | 전체 청사진 (점수 산식, Realtime 이벤트 정의) |
