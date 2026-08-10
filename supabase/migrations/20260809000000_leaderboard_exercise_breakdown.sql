/* Replace the single "favourite exercise" with a full per-exercise
   breakdown ("3x Crunches, 2x Push-ups"), since users can now mix
   exercises within a day and across the challenge. Counts days where
   that exercise was actually logged (squats_completed > 0) — a day
   only ever carries one exercise label (the last one used that day),
   so this counts days-labelled-as, not true per-exercise reps.
   Unaffected by p_exercise_filter, matching the prior favourite_exercise
   behaviour (always shows the user's full mix regardless of the
   leaderboard's active filter). */

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
    (SELECT string_agg(x.cnt || 'x ' || x.exercise, ', ' ORDER BY x.cnt DESC, x.exercise)
       FROM (
         SELECT up2.exercise, COUNT(*) AS cnt
         FROM user_progress up2
         WHERE up2.user_id = p.id AND up2.challenge_id = p_challenge_id
           AND up2.squats_completed > 0
         GROUP BY up2.exercise
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
