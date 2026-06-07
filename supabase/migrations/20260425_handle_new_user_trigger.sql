-- handle_new_user trigger
-- auth.users INSERT 직후 public.profiles에 대응 row를 자동 생성한다.
-- nickname은 UNIQUE 제약을 우회하기 위해 UUID prefix 8자를 사용한다.
-- 트리거 실패는 best-effort로 흡수해 auth.users INSERT 자체는 성공시키고,
-- 누락된 profiles row는 클라이언트 측 fallback(useAuth)이 보강한다.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname, avatar_url)
  VALUES (
    NEW.id,
    CASE
      WHEN NEW.is_anonymous THEN 'Anon_' || substring(NEW.id::text, 1, 8)
      ELSE 'Player_' || substring(NEW.id::text, 1, 8)
    END,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
