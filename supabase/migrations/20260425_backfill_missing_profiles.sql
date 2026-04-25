-- 누락된 profiles row 백필
-- auth.users에 존재하지만 public.profiles에 없는 모든 유저를 멱등적으로 채운다.
-- nickname UNIQUE 제약을 만족시키기 위해 UUID prefix 8자를 사용한다.
-- 적용 시점에 익명 유저 1명(aaed51f4-...)이 누락되어 있으나 SQL 자체는 임의 시점에 안전하게 재실행 가능하다.

INSERT INTO public.profiles (id, nickname, avatar_url)
SELECT
  u.id,
  CASE
    WHEN u.is_anonymous THEN 'Anon_' || substring(u.id::text, 1, 8)
    ELSE 'Player_' || substring(u.id::text, 1, 8)
  END,
  u.raw_user_meta_data->>'avatar_url'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT DO NOTHING;
