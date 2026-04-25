-- profiles RLS 정책
-- profiles 테이블의 RLS는 이미 활성화되어 있으나 정책이 0개여서 anon SELECT/UPDATE가 모두 차단되는 상태였다.
-- public_read: 닉네임/아바타/누적 전적은 공개 정보이므로 누구나 SELECT 허용
-- self_update: 본인 row만 UPDATE 가능 (닉네임/한 줄 소개 편집)
-- INSERT 정책은 추가하지 않는다 (handle_new_user 트리거가 SECURITY DEFINER로 처리)

DROP POLICY IF EXISTS public_read ON public.profiles;
DROP POLICY IF EXISTS self_update ON public.profiles;

CREATE POLICY public_read
ON public.profiles
FOR SELECT
TO public
USING (true);

CREATE POLICY self_update
ON public.profiles
FOR UPDATE
TO public
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
