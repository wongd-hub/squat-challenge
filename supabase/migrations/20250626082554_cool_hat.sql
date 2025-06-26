/*
  # Fix User Streak Calculation Function

  1. Function Updates
    - Fix variable naming conflict in calculate_user_streak function
    - Use proper variable scoping to avoid conflicts with column names
    - Ensure proper date arithmetic syntax

  2. Changes Made
    - Renamed conflicting variables to avoid column name conflicts
    - Fixed date arithmetic syntax
    - Improved function logic for streak calculation
*/

-- Drop the existing function first
DROP FUNCTION IF EXISTS calculate_user_streak(uuid);

-- Create the corrected function
CREATE OR REPLACE FUNCTION calculate_user_streak(input_user_id uuid)
RETURNS integer AS $$
DECLARE
  streak_count integer := 0;
  check_date date := CURRENT_DATE;
  progress_record RECORD;
BEGIN
  -- Loop backwards from today to find consecutive days where target was met
  FOR progress_record IN
    SELECT date, squats_completed, target_squats
    FROM user_progress
    WHERE user_progress.user_id = input_user_id
      AND date <= check_date
    ORDER BY date DESC
  LOOP
    -- Check if target was met on this day (or if it's a rest day with 0 target)
    IF progress_record.squats_completed >= progress_record.target_squats THEN
      streak_count := streak_count + 1;
      check_date := progress_record.date - 1; -- Subtract 1 day
    ELSE
      -- Streak broken
      EXIT;
    END IF;
  END LOOP;
  
  RETURN streak_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;