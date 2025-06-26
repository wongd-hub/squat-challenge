/*
  # Fix Daily Targets with Correct Values

  1. Updates
    - Update all daily_targets with correct values from the mobile app screenshots
    - Includes rest days (0 squats) on days 5, 12, and 19
    - Peak challenge day 22 with 230 squats

  2. Data
    - Day 1: 120, Day 2: 75, Day 3: 140, Day 4: 143, Day 5: 0 (rest)
    - Day 6: 128, Day 7: 103, Day 8: 170, Day 9: 167, Day 10: 130
    - Day 11: 200, Day 12: 0 (rest), Day 13: 163, Day 14: 174, Day 15: 160
    - Day 16: 170, Day 17: 210, Day 18: 191, Day 19: 0 (rest), Day 20: 220
    - Day 21: 170, Day 22: 230, Day 23: 150
*/

-- Update daily targets with correct values
UPDATE daily_targets SET target_squats = 120 WHERE day = 1;
UPDATE daily_targets SET target_squats = 75 WHERE day = 2;
UPDATE daily_targets SET target_squats = 140 WHERE day = 3;
UPDATE daily_targets SET target_squats = 143 WHERE day = 4;
UPDATE daily_targets SET target_squats = 0 WHERE day = 5;
UPDATE daily_targets SET target_squats = 128 WHERE day = 6;
UPDATE daily_targets SET target_squats = 103 WHERE day = 7;
UPDATE daily_targets SET target_squats = 170 WHERE day = 8;
UPDATE daily_targets SET target_squats = 167 WHERE day = 9;
UPDATE daily_targets SET target_squats = 130 WHERE day = 10;
UPDATE daily_targets SET target_squats = 200 WHERE day = 11;
UPDATE daily_targets SET target_squats = 0 WHERE day = 12;
UPDATE daily_targets SET target_squats = 163 WHERE day = 13;
UPDATE daily_targets SET target_squats = 174 WHERE day = 14;
UPDATE daily_targets SET target_squats = 160 WHERE day = 15;
UPDATE daily_targets SET target_squats = 170 WHERE day = 16;
UPDATE daily_targets SET target_squats = 210 WHERE day = 17;
UPDATE daily_targets SET target_squats = 191 WHERE day = 18;
UPDATE daily_targets SET target_squats = 0 WHERE day = 19;
UPDATE daily_targets SET target_squats = 220 WHERE day = 20;
UPDATE daily_targets SET target_squats = 170 WHERE day = 21;
UPDATE daily_targets SET target_squats = 230 WHERE day = 22;
UPDATE daily_targets SET target_squats = 150 WHERE day = 23;

-- Insert any missing days (in case some don't exist)
INSERT INTO daily_targets (day, target_squats) VALUES
  (1, 120), (2, 75), (3, 140), (4, 143), (5, 0),
  (6, 128), (7, 103), (8, 170), (9, 167), (10, 130),
  (11, 200), (12, 0), (13, 163), (14, 174), (15, 160),
  (16, 170), (17, 210), (18, 191), (19, 0), (20, 220),
  (21, 170), (22, 230), (23, 150)
ON CONFLICT (day) DO UPDATE SET
  target_squats = EXCLUDED.target_squats;