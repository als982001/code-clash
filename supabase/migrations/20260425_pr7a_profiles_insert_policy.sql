-- PR #7-A 보강: profiles INSERT RLS 정책 추가
-- handle_new_user 트리거(SECURITY DEFINER)가 silent 실패하는 경우 useAuth 훅이
-- 클라이언트에서 1회 upsert로 fallback을 수행한다. 그러나 PR #6 시점엔 INSERT 정책이
-- 부재하여 anon/authenticated 키의 INSERT가 RLS로 차단되어 fallback이 무력화된 상태였다.
-- self_insert 정책으로 본인 row만 INSERT 가능하도록 좁게 허용한다 (auth.uid() = id).

DROP POLICY IF EXISTS self_insert ON public.profiles;

CREATE POLICY self_insert
ON public.profiles
FOR INSERT
TO public
WITH CHECK (auth.uid() = id);
