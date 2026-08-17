/* 20260817000001 gated the rest-day branch on the user having real activity,
   but missed that the completion branch has the same hole: on a rest day
   (target_squats = 0), a never-active user's squats_completed defaults to 0
   via COALESCE, so "0 >= 0" is trivially true regardless of the new EXISTS
   guard — days_completed stayed 1 for zero-activity profiles. Require the
   completion branch's target to be > 0 so it can never fire on a rest day. */

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
      WHERE (
              COALESCE(dt.target_squats, 50) = 0
              AND EXISTS (
                SELECT 1 FROM user_progress up3
                WHERE up3.user_id = p.id AND up3.challenge_id = p_challenge_id
              )
            )
         OR (
           COALESCE(dt.target_squats, 50) > 0
           AND COALESCE(up2.squats_completed, 0) >= COALESCE(dt.target_squats, 50)
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
  ORDER BY total_squats DESC, days_completed DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
