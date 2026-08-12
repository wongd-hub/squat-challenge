/* days_completed required target_squats > 0, so rest days could never count
   as completed even though nothing was owed on them — same bug already
   fixed for calculate_user_streak in 20250104000000_fix_streak_rest_days.sql,
   never carried over here (GitHub issue #19).

   Unlike the streak function, this can't just look at existing user_progress
   rows: most rest days never get a row at all (nobody logs reps when nothing
   is due), so "count rows where target_squats = 0" would still undercount.
   Instead this walks every day of the challenge via generate_series + a
   daily_targets lookup (falling back to 50, matching calculate_user_streak's
   default), and counts a day as completed if it's a rest day OR the logged
   reps meet that day's target — independent of whether a user_progress row
   exists for that date.

   The generate_series upper bound is clamped to "today's challenge day"
   (mirroring calculate_user_streak's current_challenge_day), not the full
   challenge length — otherwise every future rest day auto-counts as
   completed for every participant well before the challenge gets there. */

DROP FUNCTION IF EXISTS get_total_leaderboard(text, text);
CREATE OR REPLACE FUNCTION get_total_leaderboard(
  p_challenge_id text,
  p_exercise_filter text DEFAULT NULL,
  p_challenge_start_date date DEFAULT NULL,
  p_total_challenge_days integer DEFAULT NULL
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
    COALESCE((
      SELECT COUNT(*)
      FROM generate_series(1, LEAST(
        GREATEST((CURRENT_DATE - COALESCE(p_challenge_start_date, CURRENT_DATE)) + 1, 0),
        COALESCE(p_total_challenge_days, 0)
      )) AS day_num
      LEFT JOIN daily_targets dt
        ON dt.challenge_id = p_challenge_id AND dt.day = day_num
      LEFT JOIN user_progress up2
        ON up2.user_id = p.id
        AND up2.challenge_id = p_challenge_id
        AND up2.date = p_challenge_start_date + (day_num - 1)
      WHERE COALESCE(dt.target_squats, 50) = 0
         OR (
           COALESCE(up2.squats_completed, 0) >= COALESCE(dt.target_squats, 50)
           AND (p_exercise_filter IS NULL OR up2.exercise = p_exercise_filter)
         )
    ), 0)::bigint AS days_completed,
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
