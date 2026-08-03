/* Add exercise / goal_mode / challenge_id to user_progress, then backfill
   existing rows to the prior challenge without deleting anything. The prior
   challenge id is derived from the earliest logged date so it is never
   mislabelled; all pre-existing rows belong to that single prior run. */
ALTER TABLE user_progress
  ADD COLUMN IF NOT EXISTS exercise text,
  ADD COLUMN IF NOT EXISTS goal_mode text,
  ADD COLUMN IF NOT EXISTS challenge_id text;

ALTER TABLE user_progress
  DROP CONSTRAINT IF EXISTS user_progress_goal_mode_check;
ALTER TABLE user_progress
  ADD CONSTRAINT user_progress_goal_mode_check
  CHECK (goal_mode IN ('full','half')) NOT VALID;

DO $$
DECLARE
  prior_id text;
BEGIN
  SELECT to_char(MIN(date), 'YYYY-MM') INTO prior_id FROM user_progress;
  -- Fallback for a fresh DB with no prior progress rows.
  prior_id := COALESCE(prior_id, '2025-06');
  UPDATE user_progress
    SET exercise     = COALESCE(exercise, 'Sit-ups'),
        goal_mode    = COALESCE(goal_mode, 'full'),
        challenge_id = COALESCE(challenge_id, prior_id)
    WHERE exercise IS NULL OR goal_mode IS NULL OR challenge_id IS NULL;
END $$;

ALTER TABLE user_progress VALIDATE CONSTRAINT user_progress_goal_mode_check;

CREATE INDEX IF NOT EXISTS idx_user_progress_challenge
  ON user_progress (challenge_id, date);
