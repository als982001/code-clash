-- matches 테이블에 친구 초대 흐름용 컬럼 추가
-- invite_token: 초대 링크용 random token (UUID 노출 회피, UNIQUE)
-- invite_expires_at: 초대 만료 시각 (기본 30분, lazy cleanup의 기준)
-- host_id: 방을 생성한 유저 (정식 계정만 가능, 결정 ④)
-- 모두 NULLable이라 기존 INSERT 흐름은 무영향. PR #7에서 실제 활용.

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS invite_token TEXT,
  ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS host_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'matches_invite_token_key' AND conrelid = 'public.matches'::regclass
  ) THEN
    ALTER TABLE public.matches ADD CONSTRAINT matches_invite_token_key UNIQUE (invite_token);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_matches_invite_token
  ON public.matches (invite_token)
  WHERE invite_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_matches_host_id
  ON public.matches (host_id)
  WHERE host_id IS NOT NULL;
