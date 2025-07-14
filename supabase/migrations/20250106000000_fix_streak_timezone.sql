/*
  # Fix Streak Calculation Timezone Issue
  
  This migration fixes the timezone issue where streaks don't update immediately
  when a user completes their daily target. The problem is that the database
  function uses CURRENT_DATE (server timezone) while the frontend uses local dates.
  
  The fix ensures the streak calculation uses the same date logic as the frontend
  by calculating "today" based on the challenge start date and current day.
*/

-- Update the streak calculation function to fix timezone issues
CREATE OR REPLACE FUNCTION calculate_user_streak(
  input_user_id uuid,
  challenge_start_date date,
  total_challenge_days integer
)
RETURNS integer AS $$
DECLARE
  streak_count integer := 0;
  current_challenge_day integer;
  check_day integer;
  day_date date;
  progress_record RECORD;
  actual_target integer;
  today_date date;
BEGIN
  -- Calculate current challenge day using the same logic as frontend
  current_challenge_day := LEAST(
    (CURRENT_DATE - challenge_start_date) + 1,
    total_challenge_days
  );
  
  -- If before challenge start or after challenge end, return 0
  IF CURRENT_DATE < challenge_start_date OR current_challenge_day > total_challenge_days THEN
    RETURN 0;
  END IF;
  
  -- Calculate today's date using the same logic as frontend
  today_date := challenge_start_date + (current_challenge_day - 1);
  
  -- Loop backwards from yesterday to day 1 (skip today initially)
  FOR check_day IN REVERSE (current_challenge_day - 1)..1 LOOP
    -- Calculate the date for this challenge day
    day_date := challenge_start_date + (check_day - 1);
    
    -- Get the actual target for this challenge day from daily_targets table
    SELECT target_squats INTO actual_target
    FROM daily_targets
    WHERE day = check_day;
    
    -- If no target found in database, use default
    IF NOT FOUND THEN
      actual_target := 50;
    END IF;
    
    -- Skip rest days (they don't break streak)
    IF actual_target = 0 THEN
      CONTINUE;
    END IF;
    
    -- Get progress for this specific day
    SELECT date, squats_completed, target_squats
    INTO progress_record
    FROM user_progress
    WHERE user_progress.user_id = input_user_id
      AND date = day_date;
    
    -- If no progress record exists, treat as 0 squats with actual target
    IF NOT FOUND THEN
      progress_record.date := day_date;
      progress_record.squats_completed := 0;
      progress_record.target_squats := actual_target;
    END IF;
    
    -- Check if this day was completed (hit target)
    IF progress_record.squats_completed >= progress_record.target_squats 
       AND progress_record.target_squats > 0 THEN
      streak_count := streak_count + 1;
    ELSE
      -- As soon as we hit an incomplete day, the consecutive streak is broken
      EXIT;
    END IF;
  END LOOP;
  
  -- NOW evaluate TODAY using the calculated today_date, not CURRENT_DATE
  SELECT target_squats INTO actual_target
  FROM daily_targets
  WHERE day = current_challenge_day;
  
  IF NOT FOUND THEN
    actual_target := 50;
  END IF;
  
  -- Only add today to streak if it's not a rest day and target is met
  IF actual_target > 0 THEN
    SELECT squats_completed
    INTO progress_record
    FROM user_progress
    WHERE user_progress.user_id = input_user_id
      AND date = today_date;  -- Use calculated today_date instead of CURRENT_DATE
    
    IF FOUND AND progress_record.squats_completed >= actual_target THEN
      streak_count := streak_count + 1;
    END IF;
  END IF;
  
  -- Limit streak to challenge duration
  RETURN LEAST(streak_count, total_challenge_days);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 