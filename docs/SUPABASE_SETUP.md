# Supabase 프로젝트 설정 가이드

## 1. 프로젝트 생성

1. [supabase.com](https://supabase.com) 로그인
2. **New Project** 클릭
3. 설정값 입력:
   - **Organization**: 본인 조직 선택
   - **Project name**: `code-clash`
   - **Database Password**: 안전한 비밀번호 설정 (따로 메모해둘 것)
   - **Region**: `Northeast Asia (Tokyo)` — 한국에서 가장 가까움
4. **Create new project** 클릭 후 프로비저닝 완료 대기 (1~2분)

## 2. 환경변수 설정

프로젝트 생성 완료 후:

1. Supabase 대시보드 → **Settings** → **API**
2. 아래 두 값을 복사:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon (public)` 키 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. 프로젝트 루트에 `.env.local` 파일 생성 후 붙여넣기:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

## 3. Authentication 설정

대시보드 → **Authentication** → **Providers**:

- **Google**: Step 3에서 설정 예정 (지금은 Skip)
- **GitHub**: Step 3에서 설정 예정 (지금은 Skip)
- **Email**: 개발 중 테스트용으로 활성화 권장

## 4. Realtime 활성화 확인

대시보드 → **Database** → **Replication**:

- Realtime이 기본 활성화되어 있는지 확인
- 추후 `matches`, `match_participants` 테이블에 Realtime 활성화 필요

## 5. DB 테이블 생성 (Step 1 진입 시)

> Step 1 작업 시작할 때 진행할 내용. 지금은 참고만.

대시보드 → **SQL Editor**에서 아래 테이블들을 순서대로 생성:

### 5-1. problems (문제 은행)

```sql
CREATE TABLE problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Level 1', 'Level 2', 'Level 3')),
  time_limit INTEGER NOT NULL DEFAULT 2000,
  memory_limit INTEGER NOT NULL DEFAULT 256000,
  tags TEXT[] DEFAULT '{}',
  is_ai_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5-2. test_cases (테스트 케이스)

```sql
CREATE TABLE test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  is_hidden BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5-3. profiles (유저 프로필)

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT UNIQUE,
  avatar_url TEXT,
  mmr INTEGER DEFAULT 1000,
  tier TEXT DEFAULT 'Bronze',
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5-4. matches (대전 기록)

```sql
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'ongoing', 'finished')),
  winner_id UUID REFERENCES profiles(id),
  problem_id UUID REFERENCES problems(id),
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5-5. match_participants (대전 참가자)

```sql
CREATE TABLE match_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  score FLOAT,
  mmr_change INTEGER,
  is_disconnected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5-6. submissions (제출 이력)

```sql
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  match_id UUID NOT NULL REFERENCES matches(id),
  code TEXT NOT NULL,
  language TEXT NOT NULL,
  status TEXT,
  runtime FLOAT,
  memory FLOAT,
  passed_cases INTEGER DEFAULT 0,
  total_cases INTEGER DEFAULT 0,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5-7. ai_reviews (AI 리뷰)

```sql
CREATE TABLE ai_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL UNIQUE REFERENCES submissions(id) ON DELETE CASCADE,
  content JSONB NOT NULL,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 6. 테스트용 유저 삽입 (Step 1 개발용)

> Step 1에서 대전 테스트를 위해 필요한 임시 유저 데이터입니다.

```sql
-- 테스트용 유저 2명 (auth.users에 직접 삽입)
INSERT INTO auth.users (id, email, role, aud, created_at, updated_at)
VALUES
  ('b1000000-0000-0000-0000-000000000001', 'player1@test.com', 'authenticated', 'authenticated', NOW(), NOW()),
  ('b1000000-0000-0000-0000-000000000002', 'player2@test.com', 'authenticated', 'authenticated', NOW(), NOW());

-- profiles 레코드
INSERT INTO profiles (id, nickname, mmr, tier)
VALUES
  ('b1000000-0000-0000-0000-000000000001', 'Player1', 1000, 'Bronze'),
  ('b1000000-0000-0000-0000-000000000002', 'Player2', 1000, 'Bronze');
```

## 체크리스트

- [ ] Supabase 프로젝트 생성 완료
- [ ] `.env.local` 파일에 URL + ANON KEY 설정 완료
- [ ] Email 인증 활성화 확인
- [ ] Realtime 활성화 확인
- [ ] 테스트용 유저 2명 삽입 완료
