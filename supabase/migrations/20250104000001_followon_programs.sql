-- Follow-on Programs Migration
-- This adds support for post-challenge continuation programs

-- Table to store follow-on program definitions
CREATE TABLE followon_programs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🔥',
  duration INTEGER NOT NULL DEFAULT 28,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store daily targets for follow-on programs
CREATE TABLE followon_daily_targets (
  id BIGSERIAL PRIMARY KEY,
  program_id TEXT NOT NULL REFERENCES followon_programs(id) ON DELETE CASCADE,
  day INTEGER NOT NULL,
  target_squats INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(program_id, day)
);

-- Table to store user follow-on program selections
CREATE TABLE user_followon_selections (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id TEXT NOT NULL REFERENCES followon_programs(id) ON DELETE CASCADE,
  selected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, program_id, is_active) -- Only one active selection per user per program
);

-- Enable RLS on all tables
ALTER TABLE followon_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE followon_daily_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_followon_selections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for followon_programs (read-only for all authenticated users)
CREATE POLICY "Anyone can view followon programs" ON followon_programs
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies for followon_daily_targets (read-only for all authenticated users)
CREATE POLICY "Anyone can view followon daily targets" ON followon_daily_targets
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for user_followon_selections (users can only see/modify their own)
CREATE POLICY "Users can view their own followon selections" ON user_followon_selections
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own followon selections" ON user_followon_selections
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own followon selections" ON user_followon_selections
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Insert the two follow-on programs
INSERT INTO followon_programs (id, name, description, emoji, duration) VALUES
  ('RETAIN', 'Retain Strength', 'Maintain your strength with smart, science-based maintenance volume (~50% of peak)', '🔒', 28),
  ('RAMPUP', 'Ramp Up', 'Continue building strength beyond the challenge peak', '🚀', 28);

-- Insert daily targets for RETAIN program
INSERT INTO followon_daily_targets (program_id, day, target_squats) VALUES
  -- Week 1: Transition to maintenance (60-70% of peak)
  ('RETAIN', 1, 140),
  ('RETAIN', 2, 100),
  ('RETAIN', 3, 150),
  ('RETAIN', 4, 110),
  ('RETAIN', 5, 160),
  ('RETAIN', 6, 90),
  ('RETAIN', 7, 0), -- Rest day
  
  -- Week 2: Core maintenance targets (50-60% of peak)
  ('RETAIN', 8, 130),
  ('RETAIN', 9, 95),
  ('RETAIN', 10, 140),
  ('RETAIN', 11, 105),
  ('RETAIN', 12, 150),
  ('RETAIN', 13, 85),
  ('RETAIN', 14, 0), -- Rest day
  
  -- Week 3: Sustainable maintenance
  ('RETAIN', 15, 135),
  ('RETAIN', 16, 100),
  ('RETAIN', 17, 145),
  ('RETAIN', 18, 110),
  ('RETAIN', 19, 155),
  ('RETAIN', 20, 90),
  ('RETAIN', 21, 0), -- Rest day
  
  -- Week 4: Long-term maintenance pattern
  ('RETAIN', 22, 120),
  ('RETAIN', 23, 90),
  ('RETAIN', 24, 130),
  ('RETAIN', 25, 100),
  ('RETAIN', 26, 140),
  ('RETAIN', 27, 80),
  ('RETAIN', 28, 0); -- Rest day

-- Insert daily targets for RAMPUP program
INSERT INTO followon_daily_targets (program_id, day, target_squats) VALUES
  -- Week 1: Build on challenge peak (230)
  ('RAMPUP', 1, 235),
  ('RAMPUP', 2, 200),
  ('RAMPUP', 3, 240),
  ('RAMPUP', 4, 210),
  ('RAMPUP', 5, 245),
  ('RAMPUP', 6, 185),
  ('RAMPUP', 7, 0), -- Rest day
  
  -- Week 2: Progressive increase
  ('RAMPUP', 8, 250),
  ('RAMPUP', 9, 220),
  ('RAMPUP', 10, 255),
  ('RAMPUP', 11, 230),
  ('RAMPUP', 12, 260),
  ('RAMPUP', 13, 200),
  ('RAMPUP', 14, 0), -- Rest day
  
  -- Week 3: Higher targets
  ('RAMPUP', 15, 265),
  ('RAMPUP', 16, 235),
  ('RAMPUP', 17, 270),
  ('RAMPUP', 18, 245),
  ('RAMPUP', 19, 275),
  ('RAMPUP', 20, 210),
  ('RAMPUP', 21, 0), -- Rest day
  
  -- Week 4: Peak performance
  ('RAMPUP', 22, 280),
  ('RAMPUP', 23, 250),
  ('RAMPUP', 24, 285),
  ('RAMPUP', 25, 255),
  ('RAMPUP', 26, 290),
  ('RAMPUP', 27, 230),
  ('RAMPUP', 28, 0); -- Rest day

-- Function to get user's active follow-on program
CREATE OR REPLACE FUNCTION get_user_active_followon_program(input_user_id UUID)
RETURNS TABLE (
  program_id TEXT,
  program_name TEXT,
  program_description TEXT,
  program_emoji TEXT,
  program_duration INTEGER,
  selected_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fp.id,
    fp.name,
    fp.description,
    fp.emoji,
    fp.duration,
    ufs.selected_at,
    ufs.started_at
  FROM user_followon_selections ufs
  JOIN followon_programs fp ON ufs.program_id = fp.id
  WHERE ufs.user_id = input_user_id 
    AND ufs.is_active = true
    AND ufs.completed_at IS NULL
  ORDER BY ufs.selected_at DESC
  LIMIT 1;
END;
$$;

-- Function to get daily targets for a follow-on program
CREATE OR REPLACE FUNCTION get_followon_daily_targets(input_program_id TEXT)
RETURNS TABLE (
  day INTEGER,
  target_squats INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fdt.day,
    fdt.target_squats
  FROM followon_daily_targets fdt
  WHERE fdt.program_id = input_program_id
  ORDER BY fdt.day;
END;
$$;

-- Function to select a follow-on program for a user
CREATE OR REPLACE FUNCTION select_followon_program(
  input_user_id UUID,
  input_program_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Deactivate any existing active selections for this user
  UPDATE user_followon_selections 
  SET is_active = false, updated_at = NOW()
  WHERE user_id = input_user_id AND is_active = true;
  
  -- Insert new selection
  INSERT INTO user_followon_selections (user_id, program_id, selected_at, is_active)
  VALUES (input_user_id, input_program_id, NOW(), true);
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Function to start a follow-on program
CREATE OR REPLACE FUNCTION start_followon_program(
  input_user_id UUID,
  input_program_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_followon_selections
  SET started_at = NOW(), updated_at = NOW()
  WHERE user_id = input_user_id 
    AND program_id = input_program_id 
    AND is_active = true;
  
  RETURN FOUND;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Add updated_at trigger for user_followon_selections
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_followon_selections_updated_at 
  BEFORE UPDATE ON user_followon_selections 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 