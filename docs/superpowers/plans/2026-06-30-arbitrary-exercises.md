# Arbitrary Exercises + Challenge Re-run Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generalise the situp-only tracker into an app where each participant picks any exercise and a half/full daily target per day, competes on one completion-based leaderboard, and where all data is scoped to a challenge run so last year's reps never appear this year.

**Architecture:** Approach A (additive). Keep DB columns `squats_completed`/`target_squats` as internal labels; add `exercise`, `goal_mode`, `challenge_id` columns; add a shared normalised `exercises` table; scope `daily_targets` and the leaderboard/streak SQL by `challenge_id`; generalise all user-facing "situp/squat" wording in the React layer. Pure logic (name normalisation, half math, challenge-id derivation) lives in small unit-tested modules; DB access stays in `lib/supabase.ts`.

**Tech Stack:** Next.js 15 (App Router, server-rendered on Vercel), TypeScript, Supabase (Postgres + RLS + RPC), Tailwind + shadcn/ui, Vitest (new, for pure-logic unit tests).

## Global Constraints

- **No DB column rename.** `squats_completed` and `target_squats` keep their names everywhere in SQL and the data layer. Generalisation is user-facing text only.
- **Retain all existing data.** Migrations are additive + backfill only. No `DELETE`, no `DROP` of data-bearing tables.
- **Challenge id format:** `YYYY-MM`, derived from `CHALLENGE_CONFIG.START_DATE`. This run = `2026-07`. Overridable via `NEXT_PUBLIC_CHALLENGE_ID`.
- **Half rounding:** `Math.round(prescribed / 2)`. Rest days (`prescribed === 0`) stay `0`.
- **Name normalisation rule (identical client + server):** `lower(trim(name))`, then collapse every run of non-`[a-z0-9]` characters to a single space, then trim. Dedup on this value.
- **Seed exercises (display names):** `Sit-ups`, `Push-ups`, `Squats`, `Burpees`, `Lunges`, `Crunches`. Default exercise = `Sit-ups`.
- **Offline-first must survive:** with no Supabase configured, the app still runs using the hardcoded seed list; "add custom exercise" is disabled offline.
- **`npm run build` must pass** at the end of every task that touches TS/TSX (`ignoreBuildErrors` is on, so also run `npx tsc --noEmit` where a task adds pure TS logic).

## Testing Strategy

- **Tasks 1–2 (pure logic):** real TDD with Vitest — failing test first, then implement.
- **Tasks 3–6 (SQL migrations):** apply the migration to a Supabase dev/branch database, then run the provided `SELECT` assertion queries and confirm the stated expected rows. Never test against production first.
- **Tasks 7–14 (data layer + UI):** verify with `npm run build` + `npx tsc --noEmit`, plus the explicit manual browser checks listed in each task.

## File Structure

- Create: `vitest.config.ts` — Vitest config (jsdom not needed; node env).
- Create: `lib/challenge.ts` — pure: `deriveChallengeId`, `effectiveTarget`.
- Create: `lib/challenge.test.ts` — unit tests.
- Create: `lib/exercises.ts` — pure: `normalizeExerciseName`, `SEED_EXERCISES`, `DEFAULT_EXERCISE`, `Exercise` type.
- Create: `lib/exercises.test.ts` — unit tests.
- Create: `supabase/migrations/20260630000001_create_exercises_table.sql`
- Create: `supabase/migrations/20260630000002_add_exercise_goal_challenge_to_progress.sql`
- Create: `supabase/migrations/20260630000003_challenge_scope_daily_targets.sql`
- Create: `supabase/migrations/20260630000004_leaderboard_and_streak_by_challenge.sql`
- Create: `components/ExercisePicker.tsx` — combobox + add-custom.
- Create: `components/GoalModeToggle.tsx` — Full/Half toggle.
- Modify: `lib/supabase.ts` — `CHALLENGE_ID`, write/read wiring, exercises + last-choice data fns, leaderboard call, storage last-choice.
- Modify: `app/page.tsx` — per-day exercise/goal selection, effective target, dynamic wording.
- Modify: `components/DailyTarget.tsx`, `components/SquatDial.tsx` — dynamic exercise label + effective target.
- Modify: `components/EditDayModal.tsx` — exercise/goal controls.
- Modify: `components/LeaderboardPreview.tsx`, `app/leaderboard/page.tsx` — reps + favourite-exercise badge + exercise filter + completion ranking.
- Modify: `components/PreChallengeWelcome.tsx` — wording.
- Modify: `app/layout.tsx` — `THEME_STYLE` default → `glass`, metadata wording.
- Modify: `lib/mockData.ts` — add `exercise`/`goal_mode`/`challenge_id` to mock rows.
- Modify: `package.json` — add `test` script + Vitest dev deps.

---

### Task 1: Vitest harness + `lib/challenge.ts` pure helpers

**Files:**
- Modify: `package.json` (scripts + devDependencies)
- Create: `vitest.config.ts`
- Create: `lib/challenge.ts`
- Test: `lib/challenge.test.ts`

**Interfaces:**
- Produces: `deriveChallengeId(startDate: string): string` — `"2026-07-09" → "2026-07"`. Produces `effectiveTarget(prescribed: number, goalMode: 'full' | 'half'): number` — `Math.round(prescribed/2)` when `half`, else `prescribed`; returns `0` when `prescribed` is `0`.

- [ ] **Step 1: Add Vitest deps and script**

In `package.json`, add to `"scripts"`: `"test": "vitest run"`. Add to `"devDependencies"`: `"vitest": "^2.1.9"`. Then install:

```bash
npm install --save-dev vitest@^2.1.9 --legacy-peer-deps
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: { environment: 'node', include: ['lib/**/*.test.ts'] },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
})
```

- [ ] **Step 3: Write the failing test** — `lib/challenge.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { deriveChallengeId, effectiveTarget } from './challenge'

describe('deriveChallengeId', () => {
  it('takes YYYY-MM from a start date', () => {
    expect(deriveChallengeId('2026-07-09')).toBe('2026-07')
    expect(deriveChallengeId('2025-06-15')).toBe('2025-06')
  })
})

describe('effectiveTarget', () => {
  it('returns the prescribed number in full mode', () => {
    expect(effectiveTarget(120, 'full')).toBe(120)
  })
  it('halves and rounds in half mode', () => {
    expect(effectiveTarget(75, 'half')).toBe(38) // 37.5 -> 38
    expect(effectiveTarget(120, 'half')).toBe(60)
  })
  it('keeps rest days at zero in both modes', () => {
    expect(effectiveTarget(0, 'full')).toBe(0)
    expect(effectiveTarget(0, 'half')).toBe(0)
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './challenge'`.

- [ ] **Step 5: Implement `lib/challenge.ts`**

```ts
export function deriveChallengeId(startDate: string): string {
  const [year, month] = startDate.split('-')
  return `${year}-${month}`
}

export type GoalMode = 'full' | 'half'

export function effectiveTarget(prescribed: number, goalMode: GoalMode): number {
  if (prescribed === 0) return 0
  return goalMode === 'half' ? Math.round(prescribed / 2) : prescribed
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test`
Expected: PASS (5 assertions).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts lib/challenge.ts lib/challenge.test.ts
git commit -m "feat: add vitest + pure challenge helpers (challenge id, half target)"
```

---

### Task 2: `lib/exercises.ts` — normalisation + seed list

**Files:**
- Create: `lib/exercises.ts`
- Test: `lib/exercises.test.ts`

**Interfaces:**
- Produces: `normalizeExerciseName(name: string): string`; `SEED_EXERCISES: string[]` (display names); `DEFAULT_EXERCISE: string` = `'Sit-ups'`; `type Exercise = { id: string; name: string; normalized_name: string }`.

- [ ] **Step 1: Write the failing test** — `lib/exercises.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { normalizeExerciseName, SEED_EXERCISES, DEFAULT_EXERCISE } from './exercises'

describe('normalizeExerciseName', () => {
  it('collapses case, punctuation and spacing to one key', () => {
    const key = normalizeExerciseName('Sit-ups')
    expect(normalizeExerciseName('situps')).toBe(key)
    expect(normalizeExerciseName('Sit-Ups')).toBe(key)
    expect(normalizeExerciseName('  sit   ups  ')).toBe(key)
  })
  it('produces the expected normalised string', () => {
    expect(normalizeExerciseName('Push-ups!!')).toBe('push ups')
  })
})

describe('seed list', () => {
  it('includes the default and has no normalised duplicates', () => {
    expect(SEED_EXERCISES).toContain(DEFAULT_EXERCISE)
    const keys = SEED_EXERCISES.map(normalizeExerciseName)
    expect(new Set(keys).size).toBe(keys.length)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './exercises'`.

- [ ] **Step 3: Implement `lib/exercises.ts`**

```ts
export type Exercise = { id: string; name: string; normalized_name: string }

export const DEFAULT_EXERCISE = 'Sit-ups'

export const SEED_EXERCISES: string[] = [
  'Sit-ups', 'Push-ups', 'Squats', 'Burpees', 'Lunges', 'Crunches',
]

export function normalizeExerciseName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/exercises.ts lib/exercises.test.ts
git commit -m "feat: add exercise name normalisation + seed list"
```

---

### Task 3: Migration — `exercises` table

**Files:**
- Create: `supabase/migrations/20260630000001_create_exercises_table.sql`

**Interfaces:**
- Produces: table `exercises(id uuid, name text, normalized_name text UNIQUE, created_by uuid, created_at timestamptz)`, RLS (public read, authed insert), seeded rows.

- [ ] **Step 1: Write the migration**

```sql
/* Create shared exercises table with normalised dedup key. */
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

-- Seed. normalized_name matches lib/exercises.ts normalizeExerciseName.
INSERT INTO exercises (name, normalized_name) VALUES
  ('Sit-ups',  'sit ups'),
  ('Push-ups', 'push ups'),
  ('Squats',   'squats'),
  ('Burpees',  'burpees'),
  ('Lunges',   'lunges'),
  ('Crunches', 'crunches')
ON CONFLICT (normalized_name) DO NOTHING;
```

- [ ] **Step 2: Apply to the dev database and verify**

Apply the migration (e.g. `supabase db push` against a dev/branch project, or paste into the SQL editor of a non-production project). Then run:

```sql
SELECT name, normalized_name FROM exercises ORDER BY name;
```
Expected: 6 rows; `Sit-ups → sit ups`, `Push-ups → push ups`, etc.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260630000001_create_exercises_table.sql
git commit -m "feat(db): add shared exercises table with RLS and seed"
```

---

### Task 4: Migration — add `exercise`, `goal_mode`, `challenge_id` to `user_progress`

**Files:**
- Create: `supabase/migrations/20260630000002_add_exercise_goal_challenge_to_progress.sql`

**Interfaces:**
- Produces: `user_progress.exercise text`, `user_progress.goal_mode text CHECK IN ('full','half')`, `user_progress.challenge_id text`. Existing rows backfilled to the prior challenge id (derived from earliest date), `Sit-ups`, `full`.

- [ ] **Step 1: Write the migration**

```sql
/* Add exercise / goal_mode / challenge_id to user_progress, then backfill
   existing rows to the prior challenge without deleting anything. */
ALTER TABLE user_progress
  ADD COLUMN IF NOT EXISTS exercise text,
  ADD COLUMN IF NOT EXISTS goal_mode text,
  ADD COLUMN IF NOT EXISTS challenge_id text;

ALTER TABLE user_progress
  ADD CONSTRAINT user_progress_goal_mode_check
  CHECK (goal_mode IN ('full','half')) NOT VALID;

-- Backfill: derive the prior challenge id from the earliest logged date so we
-- never mislabel it. All pre-existing rows belong to that single prior run.
DO $$
DECLARE
  prior_id text;
BEGIN
  SELECT to_char(MIN(date), 'YYYY-MM') INTO prior_id FROM user_progress;
  UPDATE user_progress
    SET exercise    = COALESCE(exercise, 'Sit-ups'),
        goal_mode   = COALESCE(goal_mode, 'full'),
        challenge_id = COALESCE(challenge_id, prior_id)
    WHERE exercise IS NULL OR goal_mode IS NULL OR challenge_id IS NULL;
END $$;

ALTER TABLE user_progress VALIDATE CONSTRAINT user_progress_goal_mode_check;

CREATE INDEX IF NOT EXISTS idx_user_progress_challenge
  ON user_progress (challenge_id, date);
```

- [ ] **Step 2: Apply and verify**

```sql
SELECT challenge_id, exercise, goal_mode, COUNT(*)
FROM user_progress GROUP BY 1,2,3;
```
Expected: every row has a non-null `challenge_id` (last year's `YYYY-MM`), `exercise='Sit-ups'`, `goal_mode='full'`. **Record the prior `challenge_id` value shown here — Task 5 reuses it.**

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260630000002_add_exercise_goal_challenge_to_progress.sql
git commit -m "feat(db): add exercise/goal_mode/challenge_id to user_progress + backfill"
```

---

### Task 5: Migration — challenge-scope `daily_targets`

**Files:**
- Create: `supabase/migrations/20260630000003_challenge_scope_daily_targets.sql`

**Interfaces:**
- Produces: `daily_targets` keyed by `(challenge_id, day)`; existing rows backfilled to the prior id; this run's targets (`2026-07`) seeded from the July 2026 numbers.

- [ ] **Step 1: Write the migration** — replace `<PRIOR_ID>` with the value recorded in Task 4 Step 2.

```sql
/* Make daily_targets challenge-scoped so last year's numbers can't override
   this year's targets or streak math. */
ALTER TABLE daily_targets
  ADD COLUMN IF NOT EXISTS challenge_id text;

UPDATE daily_targets SET challenge_id = '<PRIOR_ID>' WHERE challenge_id IS NULL;

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
```

- [ ] **Step 2: Apply and verify**

```sql
SELECT challenge_id, COUNT(*), SUM(target_squats) FROM daily_targets GROUP BY 1;
```
Expected: a `2026-07` row with `count=23` and `sum=3214`, plus the prior-id row(s) untouched.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260630000003_challenge_scope_daily_targets.sql
git commit -m "feat(db): scope daily_targets by challenge_id + seed 2026-07"
```

---

### Task 6: Migration — challenge-scoped streak + leaderboard functions

**Files:**
- Create: `supabase/migrations/20260630000004_leaderboard_and_streak_by_challenge.sql`

**Interfaces:**
- Produces: `calculate_user_streak(input_user_id uuid, challenge_start_date date, total_challenge_days integer, p_challenge_id text) → integer`. Produces `get_total_leaderboard(p_challenge_id text, p_exercise_filter text DEFAULT NULL) → TABLE(user_id uuid, display_name text, email text, total_squats bigint, days_active bigint, days_completed bigint, favourite_exercise text)`.

- [ ] **Step 1: Write the migration**

```sql
/* Challenge-scope the streak function: filter user_progress + daily_targets
   by challenge_id. Signature gains p_challenge_id. */
DROP FUNCTION IF EXISTS calculate_user_streak(uuid, date, integer);
CREATE OR REPLACE FUNCTION calculate_user_streak(
  input_user_id uuid,
  challenge_start_date date,
  total_challenge_days integer,
  p_challenge_id text
)
RETURNS integer AS $$
DECLARE
  streak_count integer := 0;
  current_challenge_day integer;
  check_day integer;
  day_date date;
  progress_record RECORD;
  actual_target integer;
BEGIN
  current_challenge_day := LEAST(
    (CURRENT_DATE - challenge_start_date) + 1, total_challenge_days);
  IF CURRENT_DATE < challenge_start_date OR current_challenge_day > total_challenge_days THEN
    RETURN 0;
  END IF;

  FOR check_day IN REVERSE (current_challenge_day - 1)..1 LOOP
    day_date := challenge_start_date + (check_day - 1);

    SELECT target_squats INTO actual_target
      FROM daily_targets WHERE challenge_id = p_challenge_id AND day = check_day;
    IF NOT FOUND THEN actual_target := 50; END IF;
    IF actual_target = 0 THEN CONTINUE; END IF;

    SELECT date, squats_completed, target_squats INTO progress_record
      FROM user_progress
      WHERE user_id = input_user_id AND challenge_id = p_challenge_id AND date = day_date;
    IF NOT FOUND THEN
      progress_record.squats_completed := 0;
      progress_record.target_squats := actual_target;
    END IF;

    IF progress_record.squats_completed >= progress_record.target_squats
       AND progress_record.target_squats > 0 THEN
      streak_count := streak_count + 1;
    ELSE
      EXIT;
    END IF;
  END LOOP;

  RETURN LEAST(streak_count, total_challenge_days);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


/* Challenge-scoped leaderboard: filter by challenge_id, optional exercise
   filter, plus days_completed and favourite_exercise. */
DROP FUNCTION IF EXISTS get_total_leaderboard(date, date);
CREATE OR REPLACE FUNCTION get_total_leaderboard(
  p_challenge_id text,
  p_exercise_filter text DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  email text,
  total_squats bigint,
  days_active bigint,
  days_completed bigint,
  favourite_exercise text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.display_name,
    p.email,
    COALESCE(SUM(up.squats_completed), 0)::bigint AS total_squats,
    COUNT(up.date)::bigint AS days_active,
    COALESCE(SUM(CASE WHEN up.squats_completed >= up.target_squats
                       AND up.target_squats > 0 THEN 1 ELSE 0 END), 0)::bigint AS days_completed,
    (SELECT up2.exercise FROM user_progress up2
       WHERE up2.user_id = p.id AND up2.challenge_id = p_challenge_id
       GROUP BY up2.exercise ORDER BY COUNT(*) DESC, up2.exercise LIMIT 1) AS favourite_exercise
  FROM profiles p
  LEFT JOIN user_progress up ON p.id = up.user_id
    AND up.challenge_id = p_challenge_id
    AND (p_exercise_filter IS NULL OR up.exercise = p_exercise_filter)
  GROUP BY p.id, p.display_name, p.email
  ORDER BY days_completed DESC, total_squats DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

- [ ] **Step 2: Apply and verify**

```sql
SELECT display_name, total_squats, days_completed, favourite_exercise
FROM get_total_leaderboard('<PRIOR_ID>') LIMIT 5;
SELECT calculate_user_streak(
  (SELECT id FROM profiles LIMIT 1), '2025-06-15'::date, 23, '<PRIOR_ID>');
```
Expected: leaderboard returns rows with a `favourite_exercise` of `Sit-ups` for backfilled data; streak call returns an integer without error.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260630000004_leaderboard_and_streak_by_challenge.sql
git commit -m "feat(db): challenge-scope streak + leaderboard, add days_completed + favourite_exercise"
```

---

### Task 7: Data layer — `lib/supabase.ts` wiring

**Files:**
- Modify: `lib/supabase.ts`
- Import from: `lib/challenge.ts` (`deriveChallengeId`), `lib/exercises.ts` (`normalizeExerciseName`, `SEED_EXERCISES`, `DEFAULT_EXERCISE`, `Exercise`).

**Interfaces:**
- Consumes: existing `CHALLENGE_CONFIG`, `database`, `storage`.
- Produces: `CHALLENGE_CONFIG.CHALLENGE_ID: string`; `database.getExercises(): Promise<{ data: Exercise[]; error: any }>`; `database.addExercise(name: string, userId?: string): Promise<{ data: Exercise | null; error: any }>`; `database.getLastChoice(userId: string): Promise<{ exercise: string; goalMode: 'full'|'half' }>`; updated `database.updateUserProgress(userId, date, squats, target, exercise: string, goalMode: 'full'|'half')`; `storage.getLastChoice(): { exercise: string; goalMode: 'full'|'half' }` and `storage.setLastChoice(exercise: string, goalMode: 'full'|'half'): void`.

- [ ] **Step 1: Add imports + `CHALLENGE_ID`**

At the top of `lib/supabase.ts` add:
```ts
import { deriveChallengeId } from "./challenge"
import { normalizeExerciseName, SEED_EXERCISES, DEFAULT_EXERCISE, type Exercise } from "./exercises"
```
Inside the `CHALLENGE_CONFIG` object (after `TOTAL_DAYS`), add:
```ts
  CHALLENGE_ID: process.env.NEXT_PUBLIC_CHALLENGE_ID
    || deriveChallengeId(process.env.NEXT_PUBLIC_CHALLENGE_START_DATE || "2025-06-15"),
```

- [ ] **Step 2: Stamp challenge_id + exercise + goal on writes**

Change the `updateUserProgress` signature and both branches:
```ts
  async updateUserProgress(
    userId: string, date: string, squats: number, target: number,
    exercise: string, goalMode: 'full' | 'half'
  ) {
    if (!supabase) throw new Error("Supabase not configured")
    try {
      const { data: updateData, error: updateError } = await supabase
        .from("user_progress")
        .update({
          squats_completed: squats,
          target_squats: target,
          exercise,
          goal_mode: goalMode,
          challenge_id: CHALLENGE_CONFIG.CHALLENGE_ID,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId).eq('date', date).select()
      if (!updateError && updateData && updateData.length > 0) {
        return { data: updateData, error: null }
      }
      const { data: insertData, error: insertError } = await supabase
        .from("user_progress")
        .insert({
          user_id: userId, date, squats_completed: squats, target_squats: target,
          exercise, goal_mode: goalMode, challenge_id: CHALLENGE_CONFIG.CHALLENGE_ID,
        })
        .select()
      if (insertError) { console.error("❌ Error inserting user progress:", insertError); throw insertError }
      return { data: insertData, error: null }
    } catch (error) {
      console.error("❌ Exception in updateUserProgress:", error); throw error
    }
  },
```

- [ ] **Step 3: Scope progress reads by challenge_id**

In `getChallengeProgress`, add `.eq('challenge_id', CHALLENGE_CONFIG.CHALLENGE_ID)` to the query chain (after `.eq("user_id", userId)`).

- [ ] **Step 4: Add exercises + last-choice data functions**

Add these methods to the `database` object:
```ts
  async getExercises(): Promise<{ data: Exercise[]; error: any }> {
    if (!supabase) {
      return { data: SEED_EXERCISES.map((name) => ({ id: name, name, normalized_name: normalizeExerciseName(name) })), error: null }
    }
    const { data, error } = await supabase.from("exercises").select("*").order("name")
    if (error || !data) return { data: [], error }
    return { data: data as Exercise[], error: null }
  },

  async addExercise(name: string, userId?: string): Promise<{ data: Exercise | null; error: any }> {
    if (!supabase) return { data: null, error: "Supabase not configured" }
    const normalized = normalizeExerciseName(name)
    const existing = await supabase.from("exercises").select("*").eq("normalized_name", normalized).maybeSingle()
    if (existing.data) return { data: existing.data as Exercise, error: null }
    const { data, error } = await supabase.from("exercises")
      .insert({ name: name.trim(), normalized_name: normalized, created_by: userId || null })
      .select().single()
    if (error) {
      const retry = await supabase.from("exercises").select("*").eq("normalized_name", normalized).maybeSingle()
      if (retry.data) return { data: retry.data as Exercise, error: null }
      return { data: null, error }
    }
    return { data: data as Exercise, error: null }
  },

  async getLastChoice(userId: string): Promise<{ exercise: string; goalMode: 'full' | 'half' }> {
    if (!supabase) return { exercise: DEFAULT_EXERCISE, goalMode: 'full' }
    const { data } = await supabase.from("user_progress")
      .select("exercise, goal_mode").eq("user_id", userId)
      .order("date", { ascending: false }).limit(1).maybeSingle()
    return {
      exercise: (data?.exercise as string) || DEFAULT_EXERCISE,
      goalMode: (data?.goal_mode as 'full' | 'half') || 'full',
    }
  },
```

- [ ] **Step 5: Update the leaderboard RPC call**

Replace the `getTotalLeaderboard` body's RPC call + accept an optional filter. Change the method signature to `async getTotalLeaderboard(exerciseFilter?: string)` and replace the `rpc('get_total_leaderboard', {...})` call with:
```ts
      const { data, error } = await supabase.rpc('get_total_leaderboard', {
        p_challenge_id: CHALLENGE_CONFIG.CHALLENGE_ID,
        p_exercise_filter: exerciseFilter ?? null,
      })
```
In the per-user mapping, add `challenge_id` to the streak call and surface the new fields:
```ts
            const { data: streakData, error: streakError } = await supabase.rpc('calculate_user_streak', {
              input_user_id: entry.user_id,
              challenge_start_date: CHALLENGE_CONFIG.START_DATE,
              total_challenge_days: CHALLENGE_CONFIG.TOTAL_DAYS,
              p_challenge_id: CHALLENGE_CONFIG.CHALLENGE_ID,
            })
```
and in the returned object add `daysCompleted: Number(entry.days_completed), favouriteExercise: entry.favourite_exercise as string | null,` (in both the success and catch branches; use `0`/`null` in catch). Apply the same `p_challenge_id` addition to the streak call in `getDailyLeaderboard`. In `getFullLeaderboard`'s merge, carry `daysCompleted` and `favouriteExercise` from `totalEntry` onto each row (default `0`/`null` for daily-only users).

- [ ] **Step 6: Add local last-choice storage + carry fields in local history**

In the `storage` object add:
```ts
  getLastChoice(): { exercise: string; goalMode: 'full' | 'half' } {
    if (typeof window === "undefined") return { exercise: DEFAULT_EXERCISE, goalMode: 'full' }
    return {
      exercise: localStorage.getItem("last_exercise") || DEFAULT_EXERCISE,
      goalMode: (localStorage.getItem("last_goal_mode") as 'full' | 'half') || 'full',
    }
  },
  setLastChoice(exercise: string, goalMode: 'full' | 'half'): void {
    if (typeof window === "undefined") return
    localStorage.setItem("last_exercise", exercise)
    localStorage.setItem("last_goal_mode", goalMode)
  },
```
In `updateTodayProgress`, change the signature to `updateTodayProgress(squats: number, exercise: string, goalMode: 'full' | 'half')`, include `exercise, goal_mode: goalMode, challenge_id: CHALLENGE_CONFIG.CHALLENGE_ID` in `progressEntry`, and call `this.setLastChoice(exercise, goalMode)` before returning.

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit` then `npm run build`
Expected: both succeed. (Callers in `page.tsx`/`EditDayModal` are updated in later tasks; if `tsc` flags those call sites, that is expected and fixed in Tasks 10 & 12 — build passes because `ignoreBuildErrors` is on, but note the call sites to update.)

- [ ] **Step 8: Commit**

```bash
git add lib/supabase.ts
git commit -m "feat: wire challenge_id, exercises, goal_mode + last-choice into data layer"
```

---

### Task 8: `ExercisePicker` component

**Files:**
- Create: `components/ExercisePicker.tsx`
- Uses existing: `components/ui/command.tsx`, `components/ui/popover.tsx`, `components/ui/button.tsx`.

**Interfaces:**
- Produces: default export `ExercisePicker` with props `{ value: string; onChange: (name: string) => void; canAddCustom: boolean; userId?: string; disabled?: boolean }`. On selecting or adding, calls `onChange` with the display name; adding calls `database.addExercise` then selects the returned name.

- [ ] **Step 1: Implement the component**

```tsx
"use client"
import { useEffect, useState } from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { database } from "@/lib/supabase"
import { normalizeExerciseName, type Exercise } from "@/lib/exercises"

export default function ExercisePicker({
  value, onChange, canAddCustom, userId, disabled,
}: { value: string; onChange: (name: string) => void; canAddCustom: boolean; userId?: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [adding, setAdding] = useState(false)

  useEffect(() => { database.getExercises().then(({ data }) => setExercises(data)) }, [])

  const norm = normalizeExerciseName(query)
  const exactExists = exercises.some((e) => e.normalized_name === norm)
  const canOfferAdd = canAddCustom && query.trim().length > 0 && !exactExists

  async function handleAdd() {
    setAdding(true)
    const { data } = await database.addExercise(query.trim(), userId)
    setAdding(false)
    if (data) {
      setExercises((prev) => prev.some((e) => e.id === data.id) ? prev : [...prev, data])
      onChange(data.name); setOpen(false); setQuery("")
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} disabled={disabled}
          className="w-full justify-between">
          {value || "Choose exercise"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search exercise..." value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>{canAddCustom ? "No match." : "No exercise found."}</CommandEmpty>
            <CommandGroup>
              {exercises.map((e) => (
                <CommandItem key={e.id} value={e.name}
                  onSelect={() => { onChange(e.name); setOpen(false); setQuery("") }}>
                  <Check className={`mr-2 h-4 w-4 ${value === e.name ? "opacity-100" : "opacity-0"}`} />
                  {e.name}
                </CommandItem>
              ))}
              {canOfferAdd && (
                <CommandItem value={`__add__${query}`} onSelect={handleAdd} disabled={adding}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add “{query.trim()}”
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/ExercisePicker.tsx
git commit -m "feat: exercise picker combobox with shared add-custom"
```

---

### Task 9: `GoalModeToggle` component

**Files:**
- Create: `components/GoalModeToggle.tsx`
- Uses existing: `components/ui/toggle-group.tsx`.

**Interfaces:**
- Produces: default export `GoalModeToggle` with props `{ value: 'full' | 'half'; onChange: (v: 'full' | 'half') => void; disabled?: boolean }`.

- [ ] **Step 1: Implement**

```tsx
"use client"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

export default function GoalModeToggle({
  value, onChange, disabled,
}: { value: 'full' | 'half'; onChange: (v: 'full' | 'half') => void; disabled?: boolean }) {
  return (
    <ToggleGroup type="single" value={value} disabled={disabled}
      onValueChange={(v) => { if (v === 'full' || v === 'half') onChange(v) }}>
      <ToggleGroupItem value="full" aria-label="Full target">Full</ToggleGroupItem>
      <ToggleGroupItem value="half" aria-label="Half target">Half</ToggleGroupItem>
    </ToggleGroup>
  )
}
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/GoalModeToggle.tsx
git commit -m "feat: full/half goal-mode toggle"
```

---

### Task 10: Wire per-day exercise + goal into `app/page.tsx`

**Files:**
- Modify: `app/page.tsx`
- Uses: `ExercisePicker` (Task 8), `GoalModeToggle` (Task 9), `effectiveTarget` (Task 1), `database`/`storage` (Task 7).

**Interfaces:**
- Consumes: `effectiveTarget(prescribed, goalMode)`, `database.getLastChoice`, `storage.getLastChoice/setLastChoice`, updated `database.updateUserProgress(...exercise, goalMode)` and `storage.updateTodayProgress(squats, exercise, goalMode)`.
- Produces: page renders the picker+toggle above the dial, locks them once today has a banked count, and uses the effective (possibly halved) target throughout today's view.

- [ ] **Step 1: Add imports + state**

Add imports near the other component imports:
```tsx
import ExercisePicker from "@/components/ExercisePicker"
import GoalModeToggle from "@/components/GoalModeToggle"
import { effectiveTarget } from "@/lib/challenge"
import { DEFAULT_EXERCISE } from "@/lib/exercises"
```
Add state alongside the existing `useState` hooks in `Home`:
```tsx
const [exercise, setExercise] = useState<string>(DEFAULT_EXERCISE)
const [goalMode, setGoalMode] = useState<'full' | 'half'>('full')
```

- [ ] **Step 2: Initialise the day's choice from last choice**

In the effect that loads today's data (where `user`/`storage` are read on mount), set defaults: if signed in, `const c = await database.getLastChoice(user.id); setExercise(c.exercise); setGoalMode(c.goalMode)`; otherwise `const c = storage.getLastChoice(); setExercise(c.exercise); setGoalMode(c.goalMode)`. If today already has a banked row, prefer that row's `exercise`/`goal_mode` so the locked value matches what was logged.

- [ ] **Step 3: Compute today's effective target**

Find where today's prescribed target is derived (from `database.getDailyTargets()` / `CHALLENGE_CONFIG.DAILY_TARGETS` by challenge day). Wrap it: `const prescribedTarget = <existing lookup>; const todayTarget = effectiveTarget(prescribedTarget, goalMode)`. Use `todayTarget` everywhere the daily target feeds the dial, the `DailyTarget` card, completion checks, and toasts for *today*.

- [ ] **Step 4: Render picker + toggle, locked after banking**

Above the `<SquatDial ... />`, add (inside the main dial card, before the dial):
```tsx
<div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between mb-4">
  <div className="flex-1">
    <ExercisePicker value={exercise} onChange={setExercise}
      canAddCustom={isSupabaseConfigured() && !!user} userId={user?.id}
      disabled={hasBankedToday} />
  </div>
  <GoalModeToggle value={goalMode} onChange={setGoalMode} disabled={hasBankedToday} />
</div>
```
Define `hasBankedToday` from existing today-progress state: `const hasBankedToday = todaySquats > 0` (reuse whatever variable already holds today's banked count).

- [ ] **Step 5: Pass exercise + goal on save**

At the "Bank" handler, update the calls: signed-in path → `database.updateUserProgress(user.id, today, squats, todayTarget, exercise, goalMode)`; offline path → `storage.updateTodayProgress(squats, exercise, goalMode)`. If signed in, also mirror `storage.setLastChoice(exercise, goalMode)` for instant offline defaults next time.

- [ ] **Step 6: Dynamic wording for today's view**

Replace hardcoded "squats"/"situps" nouns in the *dial/target/toast* copy on this page with the active `exercise` label (lowercased where mid-sentence), e.g. `Bank {exercise}` / `{todayTarget} {exercise} today`. (Charity/marketing prose is handled in Task 14.)

- [ ] **Step 7: Verify**

Run: `npm run build` then `npm run dev` and in the browser: pick an exercise, toggle Half (target halves), bank a count, confirm picker+toggle lock, reload and confirm the choice persists.
Expected: build succeeds; manual checks pass.

- [ ] **Step 8: Commit**

```bash
git add app/page.tsx
git commit -m "feat: per-day exercise + half/full selection on main page"
```

---

### Task 11: Dynamic labels in `DailyTarget` + `SquatDial`

**Files:**
- Modify: `components/DailyTarget.tsx`
- Modify: `components/SquatDial.tsx`

**Interfaces:**
- Produces: both components accept an optional `exerciseLabel?: string` prop (default `"reps"`) and render it in place of hardcoded "squats"/"situps". `app/page.tsx` passes `exerciseLabel={exercise}`.

- [ ] **Step 1: Add the prop + use it**

In each component's props type add `exerciseLabel?: string` and default it (`exerciseLabel = "reps"`). Replace hardcoded rep nouns in visible text with `{exerciseLabel}`. In `app/page.tsx`, pass `exerciseLabel={exercise}` to both `<DailyTarget>` and `<SquatDial>`.

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: succeeds; dial + target card show the chosen exercise name.

- [ ] **Step 3: Commit**

```bash
git add components/DailyTarget.tsx components/SquatDial.tsx app/page.tsx
git commit -m "feat: dynamic exercise labels in dial + daily target"
```

---

### Task 12: Exercise + goal controls in `EditDayModal`

**Files:**
- Modify: `components/EditDayModal.tsx`
- Uses: `ExercisePicker`, `GoalModeToggle`, `effectiveTarget`.

**Interfaces:**
- Consumes: the modal's existing save callback (currently passes a squat count for a date). Extend it to also pass `exercise` and `goalMode`, and to recompute the stored target via `effectiveTarget(prescribedForThatDay, goalMode)`.

- [ ] **Step 1: Add controls + state**

Add `exercise`/`goalMode` state to the modal, initialised from the edited day's existing row (fall back to `DEFAULT_EXERCISE`/`'full'`). Render `ExercisePicker` + `GoalModeToggle` in the modal body (picker `canAddCustom` mirrors the page: `isSupabaseConfigured() && !!user`).

- [ ] **Step 2: Thread through save**

Update the modal's save handler and its parent callback in `app/page.tsx` so the edited row is written via `database.updateUserProgress(userId, date, squats, effectiveTarget(prescribedForThatDay, goalMode), exercise, goalMode)` (and the offline equivalent).

- [ ] **Step 3: Verify**

Run: `npm run build` then manually edit a past day, change exercise + toggle Half, save, and confirm the chart/row reflect the new exercise and halved target.
Expected: build succeeds; manual check passes.

- [ ] **Step 4: Commit**

```bash
git add components/EditDayModal.tsx app/page.tsx
git commit -m "feat: edit exercise + half/full when editing a past day"
```

---

### Task 13: Leaderboard UI — reps + favourite badge + exercise filter + completion order

**Files:**
- Modify: `components/LeaderboardPreview.tsx`
- Modify: `app/leaderboard/page.tsx`
- Uses: updated `database.getTotalLeaderboard(exerciseFilter?)` and `database.getExercises()`.

**Interfaces:**
- Consumes: leaderboard rows now include `daysCompleted: number` and `favouriteExercise: string | null`.
- Produces: rows show total reps + a favourite-exercise badge; the full leaderboard page has an All / per-exercise filter that re-queries with `exerciseFilter`.

- [ ] **Step 1: Show the favourite-exercise badge + reps**

In the row renderer of both files, render `entry.favouriteExercise` as a small `Badge` next to the name (skip when null), and keep total reps as the primary number. Ordering already comes from the RPC (`days_completed DESC, total_squats DESC`) — render in received order; do not re-sort by reps client-side.

- [ ] **Step 2: Add the exercise filter (full page only)**

In `app/leaderboard/page.tsx`, add `const [exerciseFilter, setExerciseFilter] = useState<string | null>(null)` and an exercises list from `database.getExercises()`. Render a filter control (shadcn `Select` or a row of buttons): "All" → `null`, plus one entry per exercise. On change, re-run the leaderboard fetch passing `exerciseFilter ?? undefined` to `database.getFullLeaderboard`/`getTotalLeaderboard`. (Extend `getFullLeaderboard(date?, exerciseFilter?)` to forward the filter to `getTotalLeaderboard`.)

- [ ] **Step 3: Verify**

Run: `npm run build` then manually: open the leaderboard, confirm ranking is completion-first, badges show favourite exercise, and switching the filter changes totals.
Expected: build succeeds; manual checks pass.

- [ ] **Step 4: Commit**

```bash
git add components/LeaderboardPreview.tsx app/leaderboard/page.tsx lib/supabase.ts
git commit -m "feat: completion-ranked leaderboard with favourite-exercise badge + filter"
```

---

### Task 14: Wording sweep, theme revert, metadata, README, mockData

**Files:**
- Modify: `app/layout.tsx`, `components/PreChallengeWelcome.tsx`, `app/page.tsx` (remaining prose), `lib/mockData.ts`, `README.md`

**Interfaces:**
- Produces: glass theme by default; no user-facing "situp/squat" copy that implies a fixed exercise; mock data carries the new fields so offline demo renders.

- [ ] **Step 1: Theme default → glass**

In `app/layout.tsx`, change `const themeStyle = (process.env.THEME_STYLE || 'neobrut')` to `... || 'glass'`. Update the `metadata` title/description to be exercise-agnostic (e.g. "Exercise Challenge — Track Your Progress").

- [ ] **Step 2: De-situp remaining prose**

In `components/PreChallengeWelcome.tsx` and any remaining `app/page.tsx` marketing/intro copy, replace fixed "situp/squat" nouns with exercise-agnostic phrasing ("reps", "your exercise", "the challenge"). Leave the charity links unchanged.

- [ ] **Step 3: Update mock data**

In `lib/mockData.ts`, add `exercise: 'Sit-ups'`, `goal_mode: 'full'`, `challenge_id: '2026-07'` to each mock progress row so offline/demo mode matches the new shape.

- [ ] **Step 4: Update README**

Fix the README: it is a **server-rendered Vercel app** (not a static export), supports arbitrary exercises with per-day half/full targets, and is themeable via `THEME_STYLE`. Update the challenge-config section to mention `NEXT_PUBLIC_CHALLENGE_ID`.

- [ ] **Step 5: Verify**

Run: `npm run build` then load the app and confirm the glassmorphism theme renders by default and no copy hardcodes "situps".
Expected: build succeeds; manual checks pass.

- [ ] **Step 6: Commit**

```bash
git add app/layout.tsx components/PreChallengeWelcome.tsx app/page.tsx lib/mockData.ts README.md
git commit -m "feat: default glass theme + exercise-agnostic copy, metadata, README, mock data"
```

---

## Post-implementation (manual, outside this plan)

1. Apply migrations 20260630000001–04 to the **production** Supabase project (after the dev-DB verification above).
2. Set Vercel env for the new run: `NEXT_PUBLIC_CHALLENGE_START_DATE` (July 2026 start), `NEXT_PUBLIC_CHALLENGE_ID=2026-07`, `THEME_STYLE=glass`.
3. Add `situp.herdmentality.xyz` to the Vercel project's Domains.
4. Separate small cleanup commits (not part of this feature): pin the `"latest"` deps to lockfile versions; delete dead `next.config.mjs` / `postcss.config.mjs`; optionally remove `webpack config.cache = false`.

## Self-Review

- **Spec coverage:** per-day exercise (T8,10,12) ✓; per-day half/full (T1,9,10,12) ✓; shared normalised exercise list + add-custom (T2,3,7,8) ✓; completion leaderboard + reps + favourite badge + filter (T6,7,13) ✓; retain + tag old data via challenge_id (T4,5) ✓; challenge_id scoping (T1,4,5,6,7) ✓; theme revert (T14) ✓; wording sweep (T10,11,14) ✓; subdomain + deploy env (Post-implementation) ✓. Housekeeping explicitly out of scope ✓.
- **Placeholder scan:** the only intentional placeholder is `<PRIOR_ID>` in Tasks 5 & 6, resolved from Task 4 Step 2's recorded value; flagged at each use.
- **Type consistency:** `effectiveTarget(number, 'full'|'half')`, `updateUserProgress(...exercise: string, goalMode: 'full'|'half')`, `getTotalLeaderboard(exerciseFilter?)`, RPC `get_total_leaderboard(p_challenge_id, p_exercise_filter)` and `calculate_user_streak(..., p_challenge_id)`, and leaderboard row fields `daysCompleted`/`favouriteExercise` are consistent across Tasks 1, 6, 7, 10, 12, 13.
