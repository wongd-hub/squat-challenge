/* Challenge-scope the streak + leaderboard functions:
   - calculate_user_streak gains p_challenge_id and filters user_progress +
     daily_targets by it.
   - get_total_leaderboard is keyed by challenge_id, takes an optional exercise
     filter, and returns days_completed + favourite_exercise; ranking is
     completion-first. */

DROP FUNCTION IF EXISTS calculate_user_streak(uuid, date, integer);
DROP FUNCTION IF EXISTS calculate_user_streak(uuid);
CREATE OR REPLACE FUNCTION calculate_user_streak(
  input_user_id uuid,
  challenge_start_date date,
  total_challenge_days integer,
  p_challenge_id text
)
RETURNS integer AS $$
DECLARE
  streak_count integer := 0;
  current_challenge_day integer;
  check_day integer;
  day_date date;
  progress_record RECORD;
  actual_target integer;
BEGIN
  current_challenge_day := LEAST(
    (CURRENT_DATE - challenge_start_date) + 1, total_challenge_days);
  IF CURRENT_DATE < challenge_start_date OR current_challenge_day > total_challenge_days THEN
    RETURN 0;
  END IF;

  FOR check_day IN REVERSE (current_challenge_day - 1)..1 LOOP
    day_date := challenge_start_date + (check_day - 1);

    SELECT target_squats INTO actual_target
      FROM daily_targets WHERE challenge_id = p_challenge_id AND day = check_day;
    IF NOT FOUND THEN actual_target := 50; END IF;
    IF actual_target = 0 THEN CONTINUE; END IF;

    SELECT date, squats_completed, target_squats INTO progress_record
      FROM user_progress
      WHERE user_id = input_user_id AND challenge_id = p_challenge_id AND date = day_date;
    IF NOT FOUND THEN
      progress_record.squats_completed := 0;
      progress_record.target_squats := actual_target;
    END IF;

    IF progress_record.squats_completed >= progress_record.target_squats
       AND progress_record.target_squats > 0 THEN
      streak_count := streak_count + 1;
    ELSE
      EXIT;
    END IF;
  END LOOP;

  RETURN LEAST(streak_count, total_challenge_days);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


DROP FUNCTION IF EXISTS get_total_leaderboard(date, date);
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
  favourite_exercise text
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
    (SELECT up2.exercise FROM user_progress up2
       WHERE up2.user_id = p.id AND up2.challenge_id = p_challenge_id
       GROUP BY up2.exercise ORDER BY COUNT(*) DESC, up2.exercise LIMIT 1) AS favourite_exercise
  FROM profiles p
  LEFT JOIN user_progress up ON p.id = up.user_id
    AND up.challenge_id = p_challenge_id
    AND (p_exercise_filter IS NULL OR up.exercise = p_exercise_filter)
  GROUP BY p.id, p.display_name, p.email
  ORDER BY days_completed DESC, total_squats DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
