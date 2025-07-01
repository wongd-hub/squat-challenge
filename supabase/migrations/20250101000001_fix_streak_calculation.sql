/*
  # Fix User Streak Calculation Function

  1. Function Updates
    - Fix streak calculation to properly handle rest days (target_squats = 0)
    - Ensure consecutive day checking starting from current challenge day
    - Match the logic from the corrected JavaScript calculateStreak function
    - Only count days within the challenge period
    - Skip rest days (don't break streak, but don't count toward it)

  2. Changes Made
    - Proper consecutive day checking from today backwards
    - Rest day handling (skip days with target_squats = 0)
    - Challenge period filtering (only days within challenge dates)
    - Match JavaScript logic exactly
*/

-- Drop the existing function first
DROP FUNCTION IF EXISTS calculate_user_streak(uuid);

-- Create the corrected function
CREATE OR REPLACE FUNCTION calculate_user_streak(input_user_id uuid)
RETURNS integer AS $$
DECLARE
  streak_count integer := 0;
  streak_started boolean := false;
  challenge_start_date date := '2025-06-26'::date; -- Challenge start date
  total_challenge_days integer := 23; -- Total challenge days
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
  
  -- Loop backwards from current challenge day to day 1
  FOR check_day IN REVERSE current_challenge_day..1 LOOP
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
    
    -- Skip rest days (they don't break or contribute to streak)
    IF progress_record.target_squats = 0 THEN
      CONTINUE;
    END IF;
    
    -- Check if this day was completed (hit target)
    IF progress_record.squats_completed >= progress_record.target_squats 
       AND progress_record.target_squats > 0 THEN
      streak_count := streak_count + 1;
      streak_started := true;
    ELSE
      -- If we haven't started counting yet (today might not be completed), continue looking back
      IF NOT streak_started THEN
        CONTINUE;
      END IF;
      -- If we've started counting and hit an incomplete day, streak is broken
      EXIT;
    END IF;
  END LOOP;
  
  RETURN streak_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 