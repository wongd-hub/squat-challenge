/* Make daily_targets challenge-scoped so last year's numbers can't override
   this year's targets or streak math. Prior challenge id is self-derived from
   user_progress (same rule as migration 2) — no manual substitution needed. */
ALTER TABLE daily_targets
  ADD COLUMN IF NOT EXISTS challenge_id text;

DO $$
DECLARE
  prior_id text;
BEGIN
  SELECT to_char(MIN(date), 'YYYY-MM') INTO prior_id FROM user_progress;
  prior_id := COALESCE(prior_id, '2025-06');
  UPDATE daily_targets SET challenge_id = prior_id WHERE challenge_id IS NULL;
END $$;

ALTER TABLE daily_targets ALTER COLUMN challenge_id SET NOT NULL;
ALTER TABLE daily_targets DROP CONSTRAINT IF EXISTS daily_targets_pkey;
ALTER TABLE daily_targets ADD PRIMARY KEY (challenge_id, day);

-- Seed this run's targets (2026-07). Values match CHALLENGE_CONFIG.DAILY_TARGETS.
INSERT INTO daily_targets (challenge_id, day, target_squats) VALUES
  ('2026-07', 1,120),('2026-07', 2, 75),('2026-07', 3,140),('2026-07', 4,143),
  ('2026-07', 5,  0),('2026-07', 6,128),('2026-07', 7,103),('2026-07', 8,170),
  ('2026-07', 9,167),('2026-07',10,130),('2026-07',11,200),('2026-07',12,  0),
  ('2026-07',13,163),('2026-07',14,174),('2026-07',15,160),('2026-07',16,170),
  ('2026-07',17,210),('2026-07',18,191),('2026-07',19,  0),('2026-07',20,220),
  ('2026-07',21,170),('2026-07',22,230),('2026-07',23,150)
ON CONFLICT (challenge_id, day) DO UPDATE SET target_squats = EXCLUDED.target_squats;
