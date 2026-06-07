-- PR #5 코드 리뷰 보강: 중복 인덱스 정리
-- matches_invite_token_key (UNIQUE 인덱스, 자동 생성)와
-- idx_matches_invite_token (부분 인덱스)이 동일 컬럼을 커버하여 중복 상태였다.
-- UNIQUE 인덱스만으로 토큰 lookup이 충분하므로 부분 인덱스를 제거해 INSERT/UPDATE 시 추가 쓰기 비용을 줄인다.

DROP INDEX IF EXISTS public.idx_matches_invite_token;
