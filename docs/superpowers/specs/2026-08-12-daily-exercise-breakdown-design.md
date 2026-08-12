# Daily Exercise Breakdown on the Leaderboard — Design

**Date:** 2026-08-12
**Branch:** `feature/gradual-blur-header`
**Status:** Approved design, pending spec review

## Goal

Show a per-exercise breakdown badge (e.g. `"40 Squats"`, `"20 Push-ups, 20 Squats"`) next
to each leaderboard entry on the **Today** tab, matching the badge that already exists on
the **All-Time** tab — but scoped to just that day's activity instead of lifetime totals.

## Background / current state

- `getTotalLeaderboard()` (`lib/supabase.ts`) calls the `get_total_leaderboard` RPC, which
  returns `exercise_breakdown`: a lifetime, per-user string built by summing
  `user_progress_entries.reps` grouped by `exercise`, formatted as
  `"{reps} {exercise}"` joined by `, `, ordered by reps desc then exercise asc
  (`supabase/migrations/20260809000001_exercise_entries.sql`).
- `getDailyLeaderboard(date?)` queries `user_progress` filtered to a single `date`
  (defaulting to today) and returns `todaySquats` per user — no exercise breakdown.
- `getFullLeaderboard()` merges the two: every entry carries the lifetime
  `exerciseBreakdown` plus `todaySquats` from the daily query.
- `LeaderboardPreview.tsx` and `app/leaderboard/page.tsx` both render an
  `entry.exerciseBreakdown` badge under the user's name. Until just now this rendered
  unconditionally on both the Today and All-Time tabs, which meant the **lifetime**
  breakdown (including pre-challenge test entries) displayed as if it were today's
  activity — the bug just fixed by gating the badge to `activeTab === 'total'` only. That
  fix is correct but incomplete: it makes Today tab correct by omission (no badge) rather
  than showing what actually happened today.
- `user_progress_entries` (added in the same migration) is an append-only log: one row
  per bank action, tagged with `user_id, date, challenge_id, exercise, reps`. It already
  has a public-read RLS policy (`"Public can read entries for leaderboard"`), so it's
  queryable directly from the client without any new migration or RPC.

## Chosen approach: client-side aggregation from `user_progress_entries`

Fetch `user_progress_entries` rows for the target date (already how `getDailyLeaderboard`
fetches raw `user_progress` rows and processes them in JS, rather than going through an
RPC), aggregate reps per user per exercise in JS, and format using the same
`"{reps} {exercise}"` convention as the all-time breakdown so the two badges look
consistent when a user switches tabs.

Rejected alternative — new SQL RPC mirroring `get_total_leaderboard` but scoped by date:
keeps aggregation logic server-side (consistent with the all-time query's pattern), but
requires writing and deploying a new migration for what is, per day, a small dataset. Not
worth the extra moving part.

## Data flow

1. `getDailyLeaderboard(date?)`:
   - Add a second query: `user_progress_entries` filtered to
     `date = targetDate AND challenge_id = CHALLENGE_CONFIG.CHALLENGE_ID`, selecting
     `user_id, exercise, reps`.
   - Aggregate: group rows by `user_id`, then by `exercise`, summing `reps`; format each
     user's group as `"{reps} {exercise}"` joined by `, `, sorted by reps desc then
     exercise asc.
   - Extract this aggregation/formatting step into a standalone exported function (e.g.
     `formatExerciseBreakdown(entries: {exercise: string; reps: number}[]): string | null`)
     in `lib/supabase.ts` so it has no Supabase-client dependency and can be unit tested
     directly. Reused for one user's rows at a time.
   - Attach the result as `todayExerciseBreakdown` on each daily-leaderboard entry
     (kept separate from the all-time `exerciseBreakdown` field — the UI needs both at
     once and picks per tab).
2. `getFullLeaderboard()`: carry `todayExerciseBreakdown` through the merge in both
   branches (matched total+daily entry, and daily-only "new user" entry).
3. `lib/mockData.ts`: add `todayExerciseBreakdown?: string | null` to the
   `LeaderboardEntry` interface (type only — no need to populate demo data with a sample
   value).
4. `LeaderboardPreview.tsx` / `app/leaderboard/page.tsx`: replace the current
   `activeTab === 'total' && entry.exerciseBreakdown` gate with
   `activeTab === 'total' ? entry.exerciseBreakdown : entry.todayExerciseBreakdown`, so
   each tab shows its own correct breakdown. No other rendering changes — same badge
   styling, same conditional wrapper.

## Error handling

If a user has `squats_completed > 0` for today in `user_progress` but no matching
`user_progress_entries` rows (e.g. pre-migration legacy data), `todayExerciseBreakdown`
is simply absent/null and no badge renders for that entry — same fallback the all-time
badge already relies on. No new error states are introduced; the added query follows the
same try/catch-and-degrade-to-empty pattern already used throughout `lib/supabase.ts`.

## Testing

No component-test harness exists in this repo (`vitest.config.ts` scopes tests to
`lib/**/*.test.ts` in a Node environment; no jsdom/RTL). Plan:

- Add `lib/leaderboard-breakdown.test.ts` unit-testing `formatExerciseBreakdown` directly:
  empty input → `null`; single exercise → `"40 Squats"`; multiple exercises → correct sum
  per exercise and correct sort order (reps desc, then exercise name asc as a tiebreak).
- Verify the Supabase-fetching and JSX wiring by reading the diff carefully and running
  `npx next build`. No way to click through the live leaderboard directly — the user will
  confirm the real-data result once deployed.
