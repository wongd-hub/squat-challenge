/* calculate_user_streak stopped counting the current day when it was
   rewritten for challenge-scoping in 20260630000004_leaderboard_and_streak_by_challenge.sql
   — the "count today once its target is met" step that
   20250106000000_fix_streak_timezone.sql had deliberately added was never
   carried over. Early in a challenge this caps everyone's streak at
   (challenge day - 1) even after completing every day so far, e.g. on day 2
   of a challenge the backward-only loop can only ever check day 1, so
   completing it still shows a streak of 1 (GitHub issue #27).

   Re-add the today check, scoped to p_challenge_id, mirroring the same
   rest-day and per-row target comparison used for prior days. */

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

  -- Credit today too, if it's not a rest day and its target has been met.
  day_date := challenge_start_date + (current_challenge_day - 1);

  SELECT target_squats INTO actual_target
    FROM daily_targets WHERE challenge_id = p_challenge_id AND day = current_challenge_day;
  IF NOT FOUND THEN actual_target := 50; END IF;

  IF actual_target > 0 THEN
    SELECT squats_completed, target_squats INTO progress_record
      FROM user_progress
      WHERE user_id = input_user_id AND challenge_id = p_challenge_id AND date = day_date;

    IF FOUND AND progress_record.squats_completed >= progress_record.target_squats THEN
      streak_count := streak_count + 1;
    END IF;
  END IF;

  RETURN LEAST(streak_count, total_challenge_days);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
