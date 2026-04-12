-- P0 Fix: 최소 RLS 정책 (depth-in-defense)
-- 애플리케이션 레이어가 우회되더라도 DB 레이어에서 auth.uid() 불일치를 차단한다.

-- match_participants: 본인만 자신의 행 INSERT 가능
ALTER TABLE match_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "self_insert" ON match_participants FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "match_read" ON match_participants FOR SELECT
  USING (true);

CREATE POLICY "self_delete" ON match_participants FOR DELETE
  USING (user_id = auth.uid());

-- submissions: 본인 것만 INSERT, 본인 것만 SELECT
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "self_insert" ON submissions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "match_participant_read" ON submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM match_participants mp
      WHERE mp.match_id = submissions.match_id
        AND mp.user_id = auth.uid()
    )
  );

-- matches: 누구나 읽기/생성, 참가자만 UPDATE
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read" ON matches FOR SELECT
  USING (true);

CREATE POLICY "anon_insert" ON matches FOR INSERT
  WITH CHECK (true);

CREATE POLICY "participant_update" ON matches FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM match_participants
      WHERE match_id = matches.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "participant_delete_waiting" ON matches FOR DELETE
  USING (
    status = 'waiting'
    AND EXISTS (
      SELECT 1 FROM match_participants
      WHERE match_id = matches.id AND user_id = auth.uid()
    )
  );
