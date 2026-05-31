-- profiles 평점 컬럼(mmr/tier/wins/losses/streak) + 불변 컬럼(id/created_at) 위조 차단.
-- self_update 정책은 유지(nickname/bio/avatar_url 편집 경로). 트리거가 보호 컬럼만 OLD 고정.
-- service_role 호출(submit 라우트의 MMR 갱신)은 auth.role() 분기로 우회.

CREATE OR REPLACE FUNCTION public.prevent_protected_profiles_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- service_role 은 검사 패스 (서버 라우트의 service 클라이언트 우회용)
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.mmr        IS DISTINCT FROM OLD.mmr
     OR NEW.tier    IS DISTINCT FROM OLD.tier
     OR NEW.wins    IS DISTINCT FROM OLD.wins
     OR NEW.losses  IS DISTINCT FROM OLD.losses
     OR NEW.streak  IS DISTINCT FROM OLD.streak
     OR NEW.id         IS DISTINCT FROM OLD.id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'protected profile column may not be modified by authenticated user';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_protected_profiles_update ON public.profiles;

CREATE TRIGGER prevent_protected_profiles_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_protected_profiles_update();
