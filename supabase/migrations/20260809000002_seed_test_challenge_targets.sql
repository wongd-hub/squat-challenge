/* Seed daily_targets for a solo test challenge run: 24 days starting
   2026-08-11, matching the referenced Pushup Challenge schedule. Uses a
   distinct challenge_id ("2026-08-test") rather than the auto-derived
   "2026-08" so it never collides with any stray rows already written
   under "2026-08" from earlier ad-hoc testing (when the start-date env
   var was accidentally left at the current date). */

INSERT INTO daily_targets (challenge_id, day, target_squats) VALUES
  ('2026-08-test',  1, 100),
  ('2026-08-test',  2,  72),
  ('2026-08-test',  3, 120),
  ('2026-08-test',  4, 150),
  ('2026-08-test',  5,   0), -- Rest day
  ('2026-08-test',  6, 140),
  ('2026-08-test',  7, 170),
  ('2026-08-test',  8, 130),
  ('2026-08-test',  9, 160),
  ('2026-08-test', 10, 167),
  ('2026-08-test', 11, 191),
  ('2026-08-test', 12,   0), -- Rest day
  ('2026-08-test', 13, 120),
  ('2026-08-test', 14, 220),
  ('2026-08-test', 15, 160),
  ('2026-08-test', 16, 190),
  ('2026-08-test', 17, 170),
  ('2026-08-test', 18, 208),
  ('2026-08-test', 19,   0), -- Rest day
  ('2026-08-test', 20, 120),
  ('2026-08-test', 21, 180),
  ('2026-08-test', 22, 229),
  ('2026-08-test', 23, 160),
  ('2026-08-test', 24, 150)
ON CONFLICT (challenge_id, day) DO UPDATE SET target_squats = EXCLUDED.target_squats;
