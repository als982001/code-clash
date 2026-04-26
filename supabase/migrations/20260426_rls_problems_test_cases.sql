-- PR: fix/db-rls-and-seed
-- problems / test_cases / ai_reviews RLS 정책 부재로 anon 키 SELECT가 차단되는 문제 해결.
-- depth-in-defense: anon은 visible 케이스만, 히든은 service_role(API 서버)만 접근.

-- ===== problems: 공개 콘텐츠 =====
ALTER TABLE public.problems ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_read ON public.problems;

CREATE POLICY public_read
ON public.problems
FOR SELECT
TO public
USING (true);

-- ===== test_cases: visible만 anon 노출, hidden은 service_role 전용 =====
ALTER TABLE public.test_cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS visible_read ON public.test_cases;

CREATE POLICY visible_read
ON public.test_cases
FOR SELECT
TO public
USING (is_hidden = false);

-- ===== ai_reviews: 본인 submission에 대한 리뷰만 본인이 조회 =====
-- TO authenticated: 익명/비로그인 호출 즉시 거부 (의도 명시)
-- (SELECT auth.uid()): row마다 함수 재호출되지 않도록 stable 평가 (Supabase RLS 모범 사례)
-- IN (subquery): submissions.user_id 매칭을 invoker RLS와 분리해 안정적 평가
ALTER TABLE public.ai_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS self_read ON public.ai_reviews;

CREATE POLICY self_read
ON public.ai_reviews
FOR SELECT
TO authenticated
USING (
  submission_id IN (
    SELECT id FROM public.submissions
    WHERE user_id = (SELECT auth.uid())
  )
);
