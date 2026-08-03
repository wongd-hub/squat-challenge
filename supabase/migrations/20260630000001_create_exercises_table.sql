/* Create shared exercises table with normalised dedup key.
   normalized_name must match lib/exercises.ts normalizeExerciseName:
   lower(trim(name)) then collapse non-[a-z0-9] runs to a single space. */
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
  ('Sit-ups',  'sit ups'),
  ('Push-ups', 'push ups'),
  ('Squats',   'squats'),
  ('Burpees',  'burpees'),
  ('Lunges',   'lunges'),
  ('Crunches', 'crunches')
ON CONFLICT (normalized_name) DO NOTHING;
