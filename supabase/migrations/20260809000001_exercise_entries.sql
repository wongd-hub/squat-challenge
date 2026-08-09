/* Per-exercise entry log. A day's user_progress row remains the single
   source of truth for its total/target/streak-eligibility (unchanged);
   entries are purely additive records of what exercise each portion of
   that total came from, used only to reconstruct a per-exercise
   breakdown for the leaderboard. Banking today logs one entry per bank
   action (the delta, tagged with the exercise selected at that moment).
   Editing a past day replaces that day's entries with a single new one. */

CREATE TABLE IF NOT EXISTS user_progress_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  challenge_id text NOT NULL,
  exercise text NOT NULL,
  reps integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entries_user_date ON user_progress_entries (user_id, date);
CREATE INDEX IF NOT EXISTS idx_entries_user_challenge ON user_progress_entries (user_id, challenge_id);

ALTER TABLE user_progress_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own entries" ON user_progress_entries;
CREATE POLICY "Users can read own entries"
  ON user_progress_entries FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own entries" ON user_progress_entries;
CREATE POLICY "Users can insert own entries"
  ON user_progress_entries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own entries" ON user_progress_entries;
CREATE POLICY "Users can delete own entries"
  ON user_progress_entries FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Public read access for leaderboard breakdown (mirrors user_progress's policy)
DROP POLICY IF EXISTS "Public can read entries for leaderboard" ON user_progress_entries;
CREATE POLICY "Public can read entries for leaderboard"
  ON user_progress_entries FOR SELECT TO public
  USING (true);

-- Leaderboard breakdown now sums real per-exercise reps from entries
-- instead of counting days labelled with the day's last-used exercise.
DROP FUNCTION IF EXISTS get_total_leaderboard(text, text);
CREATE OR REPLACE FUNCTION get_total_leaderboard(
  p_challenge_id text,
  p_exercise_filter text DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  email text,
  total_squats bigint,
  days_active bigint,
  days_completed bigint,
  exercise_breakdown text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.display_name,
    p.email,
    COALESCE(SUM(up.squats_completed), 0)::bigint AS total_squats,
    COUNT(up.date)::bigint AS days_active,
    COALESCE(SUM(CASE WHEN up.squats_completed >= up.target_squats
                       AND up.target_squats > 0 THEN 1 ELSE 0 END), 0)::bigint AS days_completed,
    (SELECT string_agg(x.total_reps || ' ' || x.exercise, ', ' ORDER BY x.total_reps DESC, x.exercise)
       FROM (
         SELECT ue.exercise, SUM(ue.reps) AS total_reps
         FROM user_progress_entries ue
         WHERE ue.user_id = p.id AND ue.challenge_id = p_challenge_id
         GROUP BY ue.exercise
         HAVING SUM(ue.reps) > 0
       ) x
    ) AS exercise_breakdown
  FROM profiles p
  LEFT JOIN user_progress up ON p.id = up.user_id
    AND up.challenge_id = p_challenge_id
    AND (p_exercise_filter IS NULL OR up.exercise = p_exercise_filter)
  GROUP BY p.id, p.display_name, p.email
  ORDER BY days_completed DESC, total_squats DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
