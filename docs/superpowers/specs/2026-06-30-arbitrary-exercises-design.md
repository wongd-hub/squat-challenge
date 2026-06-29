# Arbitrary Exercises + Challenge Re-run — Design

**Date:** 2026-06-30
**Branch:** `feature/arbitrary-exercises` (off `feature/situp`)
**Status:** Approved design, pending spec review

## Goal

Re-run the challenge in July 2026 while generalising it from a situp-only app to one
where each participant can do **any exercise**, choose a **half or full** daily target,
and compete on a **single completion-based leaderboard** — without losing or showing
last year's data. Also revert the visual theme to the previous glassmorphism style and
serve the app at `situp.herdmentality.xyz`.

## Background / current state

- Next.js 15 App Router app, **server-rendered on Vercel** (has an API route
  `/api/github-issue`; `output: 'export'` is commented out — it is *not* a static export
  despite the README).
- Data layer in `lib/supabase.ts` with offline-first localStorage fallback. Challenge
  dates/length are env-driven (`NEXT_PUBLIC_CHALLENGE_START_DATE`, `_TOTAL_DAYS`);
  `DAILY_TARGETS` are hardcoded in code but **overridden by the `daily_targets` DB table
  when populated**.
- Tables: `profiles(id,email,display_name,…)`, `daily_targets(day PK, target_squats)`,
  `user_progress(id, user_id, date, squats_completed, target_squats, UNIQUE(user_id,date))`.
- Leaderboard: `get_total_leaderboard(start_date,end_date)` ranks by total reps;
  `calculate_user_streak(user_id, challenge_start_date, total_challenge_days)` computes
  consecutive completion streak, reading `daily_targets` for per-day prescribed targets.
- Theme: `app/layout.tsx` reads `THEME_STYLE` env (default `neobrut`) and applies
  `theme-neobrut` or `theme-glass`. **Both themes coexist in `globals.css`**; glass is the
  original and is fully intact.

## Chosen approach: A — additive, generalise in the UI

Keep DB column names `squats_completed` / `target_squats` as internal labels (no risky
rename migration); add columns for exercise, goal mode, and challenge id; generalise all
user-facing "situp"/"squat" wording in the React layer. Rejected alternatives: full
`squats`→`reps` rename through DB+functions+RLS (risky, cosmetic-only gain); client-only
exercise list (can't satisfy shared custom exercises).

## Requirements (resolved with user)

1. **Exercise choice is per day**, chosen before the first log of that day, defaulting to
   the user's last-used exercise (persisted).
2. **Half/full target is per day**, chosen before the first log, defaulting to last-used.
3. **Shared, growing exercise list**: a dropdown sourced from a DB table; users may add a
   custom exercise that becomes available to everyone, **normalised** so "situps" /
   "Sit-Ups" / "sit ups" collapse to one entry.
4. **Leaderboard is completion-based**: rank by streak / days-target-hit; still display
   total reps; show a hint of each user's favoured exercise; allow filtering by exercise.
5. **Retain all prior data**; tag existing rows as the situp exercise, `full` goal, and
   last year's challenge id. Never show prior-challenge reps in the current leaderboard.
6. **Challenge identifier** (`YYYY-MM`) scopes all data to a specific run (this run =
   `2026-07`).
7. **Revert theme** to glassmorphism (default).
8. **Serve at `situp.herdmentality.xyz`** (subdomain).

## Data model changes (additive migrations)

### New table: `exercises`
| column | type | notes |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `name` | text | display form, e.g. "Sit-ups" |
| `normalized_name` | text UNIQUE | lowercased, trimmed, non-alphanumerics collapsed; dedup key |
| `created_by` | uuid NULL | references `profiles(id)`; NULL for seeded |
| `created_at` | timestamptz | `now()` |

- RLS: anyone may `SELECT`; authenticated users may `INSERT`.
- Seed: Sit-ups, Push-ups, Squats, Burpees, Lunges, Crunches (adjustable).
- **Normalisation rule** (applied identically client + server): `lower(trim(name))`, then
  collapse any run of non-`[a-z0-9]` characters to a single space, then trim. Insert is
  idempotent: if `normalized_name` exists, reuse that row instead of erroring.

### `user_progress` — new columns
| column | type | notes |
|---|---|---|
| `exercise` | text | display name of the exercise for that day; defaults to seeded situp |
| `goal_mode` | text | `CHECK (goal_mode IN ('full','half'))`, default `'full'` |
| `challenge_id` | text | `YYYY-MM`; default = current challenge id |

- `target_squats` continues to store the **effective** target (already halved when
  `goal_mode='half'`), so existing completion/streak comparisons keep working unchanged.

### `daily_targets` — challenge-scoped
- Add `challenge_id text`; change PK from `day` to `(challenge_id, day)`.
- Backfill existing rows with last year's challenge id.
- Seed this challenge's targets under `2026-07` (the July 2026 situp numbers already in
  `CHALLENGE_CONFIG.DAILY_TARGETS`). This closes the gotcha where a populated
  `daily_targets` table silently overrode the code's targets.

### Backfill of existing data (no deletion)
- Determine last year's challenge id from the **earliest** `user_progress.date`
  (`to_char(min(date),'YYYY-MM')`) rather than assuming, then:
  - `UPDATE user_progress SET exercise='Sit-ups', goal_mode='full', challenge_id=<prior_id> WHERE challenge_id IS NULL`.
  - `UPDATE daily_targets SET challenge_id=<prior_id> WHERE challenge_id IS NULL`.

## Challenge id derivation

- `CHALLENGE_CONFIG.CHALLENGE_ID = <YYYY-MM from START_DATE>` (e.g. START_DATE
  `2026-07-09` → `2026-07`), overridable via `NEXT_PUBLIC_CHALLENGE_ID` env.
- All writes from `lib/supabase.ts` stamp `challenge_id = CHALLENGE_CONFIG.CHALLENGE_ID`.

## Exercise selection UX

- A combobox (shadcn `Command`/`Popover`) populated from `exercises`, with a persistent
  **"+ Add “<typed text>”"** affordance. On add: normalise → reuse existing match or
  `INSERT` a new shared row → select it.
- **Last-choice memory**: read the user's most recent `user_progress` row for default
  exercise + `goal_mode` (works cross-device); mirror in `localStorage` for instant /
  offline default.
- **Offline / no Supabase**: dropdown falls back to a hardcoded seed list; "add custom"
  is disabled with an explanatory tooltip (custom exercises require the DB).
- Exercise + half/full are presented **before the first log of the day**; once a count is
  banked for that day, the day's exercise/goal are locked (editable via the existing
  Edit-Day modal, which will gain the same controls).

## Half / full target math

- `prescribed` = that day's target from config/DB.
- `effectiveTarget = goal_mode === 'half' ? Math.round(prescribed / 2) : prescribed`.
- Rest days (`prescribed === 0`) stay `0` in both modes and never break a streak.
- The dial, `DailyTarget`, and `ProgressChart` all read `effectiveTarget`.
- Because the **effective** target is persisted on the row, `calculate_user_streak` (which
  compares `squats_completed >= target_squats`) needs **no change** for half/full.

## Leaderboard changes

- `get_total_leaderboard` gains a `challenge_id` parameter (filters `user_progress` to that
  run) and an optional `exercise_filter`; returns an added `favourite_exercise` column
  (the user's most frequent `exercise` within the challenge).
- Ranking becomes **completion-based**: order by streak desc, then days-target-hit desc,
  then total reps desc (tiebreaker/flavour). Streak is challenge-scoped via the existing
  `calculate_user_streak` (already takes start date + length; all rows are now filtered by
  `challenge_id`).
- UI (`LeaderboardPreview`, `app/leaderboard/page.tsx`): show total reps prominently, a
  small exercise badge per user, and an All / per-exercise filter control.

## Wording / theme

- Replace hardcoded "situp"/"squat" copy in `page.tsx`, `PreChallengeWelcome`,
  `DailyTarget`, `SquatDial`, metadata, etc. with the **active exercise name** passed via
  prop/context. Component filenames (`SquatDial`, etc.) stay; only rendered text changes.
- Update README to reflect arbitrary exercises and that it is a server (not static) app.
- **Theme revert:** change the `THEME_STYLE` default in `app/layout.tsx` from `neobrut` to
  `glass` (and/or set `THEME_STYLE=glass` in Vercel). Neobrutalism remains available behind
  the flag — nothing deleted.

## Deployment

- Add `situp.herdmentality.xyz` to the `squat-challenge` Vercel project's Domains
  (dashboard action, no code).
- Set Vercel env for the new run: `NEXT_PUBLIC_CHALLENGE_START_DATE` (July 2026),
  `NEXT_PUBLIC_CHALLENGE_ID=2026-07` (or rely on derivation), `THEME_STYLE=glass`.

## Out of scope (tracked separately, not in this work)

- Pinning the ~25 `"latest"` dependencies to lockfile versions (reproducibility risk).
- Deleting dead `next.config.mjs` / `postcss.config.mjs` and the stale `out/` dir.
- Removing `webpack config.cache = false` for faster Vercel builds.

These are real but unrelated cleanups; do them in their own small commits.

## Risks / notes

- The **`exercises` insert race** (two users add the same new exercise simultaneously) is
  handled by the `normalized_name` UNIQUE constraint + reuse-on-conflict.
- The prior challenge id must match when last year actually ran; deriving it from the data
  avoids a wrong guess (code default START_DATE is `2025-06-15`; the live env value may
  differ — confirm against the data during implementation).
- Changing `daily_targets` PK to `(challenge_id, day)` requires updating any query/RLS that
  assumed `day` was the sole key; audit references during implementation.

## Success criteria

1. Existing users' last-year reps are tagged `challenge_id=<prior>` and **do not** appear
   in the `2026-07` leaderboard.
2. A user can pick an exercise (incl. adding a new shared one) and a half/full target per
   day, with both defaulting to their last choice.
3. Adding "Sit-Ups" when "Sit-ups" exists reuses the existing entry (no duplicate).
4. Leaderboard ranks by completion, shows reps + favourite-exercise badge, and filters by
   exercise.
5. App renders the glassmorphism theme by default.
6. `npm run build` passes; offline mode still works with the hardcoded fallback list.
