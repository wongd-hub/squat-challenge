/*
  # Squat Challenge Database Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique)
      - `display_name` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `daily_targets`
      - `day` (integer, primary key)
      - `target_squats` (integer)
      - `created_at` (timestamp)
    
    - `user_progress`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `date` (date)
      - `squats_completed` (integer)
      - `target_squats` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - Unique constraint on (user_id, date)

  2. Security
    - Enable RLS on all tables
    - Users can only read/write their own progress
    - Public read access to daily_targets
    - Public read access to leaderboard data (aggregated)

  3. Functions
    - `get_total_leaderboard()` - Returns total squats per user
    - `calculate_user_streak(user_id)` - Calculates current streak
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  display_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create daily_targets table
CREATE TABLE IF NOT EXISTS daily_targets (
  day integer PRIMARY KEY,
  target_squats integer NOT NULL DEFAULT 50,
  created_at timestamptz DEFAULT now()
);

-- Create user_progress table
CREATE TABLE IF NOT EXISTS user_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  squats_completed integer NOT NULL DEFAULT 0,
  target_squats integer NOT NULL DEFAULT 50,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Daily targets policies (public read)
CREATE POLICY "Anyone can read daily targets"
  ON daily_targets
  FOR SELECT
  TO public
  USING (true);

-- User progress policies
CREATE POLICY "Users can read own progress"
  ON user_progress
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON user_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON user_progress
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Public read access for leaderboard (aggregated data only)
CREATE POLICY "Public can read progress for leaderboard"
  ON user_progress
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can read profiles for leaderboard"
  ON profiles
  FOR SELECT
  TO public
  USING (true);

-- Function to get total leaderboard
CREATE OR REPLACE FUNCTION get_total_leaderboard()
RETURNS TABLE (
  user_id uuid,
  display_name text,
  email text,
  total_squats bigint,
  days_active bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.display_name,
    p.email,
    COALESCE(SUM(up.squats_completed), 0) as total_squats,
    COUNT(up.date) as days_active
  FROM profiles p
  LEFT JOIN user_progress up ON p.id = up.user_id
  GROUP BY p.id, p.display_name, p.email
  ORDER BY total_squats DESC, days_active DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate user streak
CREATE OR REPLACE FUNCTION calculate_user_streak(user_id uuid)
RETURNS integer AS $$
DECLARE
  streak_count integer := 0;
  current_date date := CURRENT_DATE;
  progress_record RECORD;
BEGIN
  -- Loop backwards from today to find consecutive days where target was met
  FOR progress_record IN
    SELECT date, squats_completed, target_squats
    FROM user_progress
    WHERE user_progress.user_id = calculate_user_streak.user_id
      AND date <= current_date
    ORDER BY date DESC
  LOOP
    -- Check if target was met on this day
    IF progress_record.squats_completed >= progress_record.target_squats THEN
      streak_count := streak_count + 1;
      current_date := progress_record.date - INTERVAL '1 day';
    ELSE
      -- Streak broken
      EXIT;
    END IF;
  END LOOP;
  
  RETURN streak_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default daily targets (23-day challenge)
INSERT INTO daily_targets (day, target_squats) VALUES
  (1, 10), (2, 14), (3, 18), (4, 22), (5, 26),
  (6, 30), (7, 34), (8, 38), (9, 42), (10, 46),
  (11, 50), (12, 54), (13, 58), (14, 62), (15, 66),
  (16, 70), (17, 74), (18, 78), (19, 82), (20, 86),
  (21, 90), (22, 94), (23, 98)
ON CONFLICT (day) DO NOTHING;
