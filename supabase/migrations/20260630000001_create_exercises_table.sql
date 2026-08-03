/* Create shared exercises table with normalised dedup key.
   normalized_name must match lib/exercises.ts normalizeExerciseName:
   lower(name) then REMOVE all non-[a-z0-9] characters (so "Sit-ups",
   "situps", "Sit-Ups" and "sit ups" all collapse to "situps"). */
CREATE TABLE IF NOT EXISTS exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  normalized_name text NOT NULL UNIQUE,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read exercises"
  ON exercises FOR SELECT USING (true);

CREATE POLICY "Authenticated users can add exercises"
  ON exercises FOR INSERT TO authenticated WITH CHECK (true);

-- Seed
INSERT INTO exercises (name, normalized_name) VALUES
  ('Sit-ups',  'situps'),
  ('Push-ups', 'pushups'),
  ('Squats',   'squats'),
  ('Burpees',  'burpees'),
  ('Lunges',   'lunges'),
  ('Crunches', 'crunches')
ON CONFLICT (normalized_name) DO NOTHING;
