/*
  # Make Challenge Functions Dynamic
  
  This migration updates the calculate_user_streak function to accept 
  challenge_start_date and total_challenge_days as parameters instead 
  of hardcoding them, allowing the frontend to pass values from 
  environment variables.
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS calculate_user_streak(uuid);

-- Create the new dynamic function
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
BEGIN
  -- Calculate current challenge day
  current_challenge_day := LEAST(
    EXTRACT(days FROM (CURRENT_DATE - challenge_start_date))::integer + 1,
    total_challenge_days
  );
  
  -- If before challenge start or after challenge end, return 0
  IF CURRENT_DATE < challenge_start_date OR current_challenge_day > total_challenge_days THEN
    RETURN 0;
  END IF;
  
  -- Loop backwards from yesterday to day 1 (skip today to match JavaScript logic)
  -- This ensures we only count CONSECUTIVE streak, not historical streaks
  FOR check_day IN REVERSE (current_challenge_day - 1)..1 LOOP
    -- Calculate the date for this challenge day
    day_date := challenge_start_date + (check_day - 1);
    
    -- Get progress for this specific day
    SELECT date, squats_completed, target_squats
    INTO progress_record
    FROM user_progress
    WHERE user_progress.user_id = input_user_id
      AND date = day_date;
    
    -- If no record exists, treat as 0 squats with default target
    IF NOT FOUND THEN
      progress_record.date := day_date;
      progress_record.squats_completed := 0;
      progress_record.target_squats := 50; -- Default target
    END IF;
    
    -- Skip rest days (they don't break streak)
    IF progress_record.target_squats = 0 THEN
      CONTINUE;
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
  
  -- Limit streak to challenge duration (can't have a streak longer than the challenge itself)
  RETURN LEAST(streak_count, total_challenge_days);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 