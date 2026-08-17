# Today's Exercise Tally in the Dial — Design

**Date:** 2026-08-17
**Branch:** `main`
**Status:** Approved design, pending spec review

## Goal

Show a per-exercise tally of what's already been banked today (e.g. `"170 Sit-ups, 97
Squats"`) directly under the "Already banked today: X of Y" text in the dial
(`components/SquatDial.tsx`), so a user can see their own exercise mix without having to
find themselves on the daily leaderboard to see the breakdown badge there.

## Background / current state

- Every bank action (`handleSquatsUpdate` in `app/page.tsx`) writes an append-only row to
  `user_progress_entries` (`user_id, date, challenge_id, exercise, reps`) via
  `database.addProgressEntry`. Editing a past day via the progress-chart modal
  (`handleSaveEditedDay`) writes to the same table via
  `database.replaceProgressEntriesForDay`, and — since that modal doesn't block editing
  the current day — can affect today's entries too.
- `lib/exerciseBreakdown.ts` already exports `formatExerciseBreakdown(entries)`, which
  sums reps per exercise and formats them as `"{reps} {exercise}"` joined by `, ` (reps
  desc, exercise name asc tiebreak). This is the same formatting the leaderboard's
  breakdown badges use (`get_total_leaderboard`'s lifetime badge, and
  `getDailyLeaderboard`'s daily badge) — reusing it keeps this new tally visually and
  textually consistent with what's already on the leaderboard.
- `SquatDial` currently only receives `currentSquats` (today's total) as a prop — it has
  no visibility into the per-exercise mix behind that number.
- Local/offline storage mode (`dataSource === "local"`) never tracked per-exercise
  entries — it only ever stored a single `squats_${date}` number in `localStorage`. This
  feature is Supabase-only; local mode simply won't populate it.

## Chosen approach: dedicated per-user query, refetched alongside existing today-data reloads

Add `database.getTodayExerciseBreakdown(userId, date)` in `lib/supabase.ts`: queries
`user_progress_entries` for that single user/date/challenge, then formats with the
existing `formatExerciseBreakdown` helper. Returns `string | null`.

Rejected alternative — reuse `getDailyLeaderboard`'s existing per-user entry aggregation:
that function already computes `todayExerciseBreakdown` for every user on the daily
leaderboard, but pulling the current user's value out of it would mean either fetching
the entire leaderboard just to read one entry, or threading leaderboard state into the
dial's data flow. A small dedicated single-user query is simpler and keeps the dial's
data loading independent of the leaderboard's.

## Data flow

1. `app/page.tsx` gets a new `todayExerciseBreakdown: string | null | undefined` state,
   initialized to `undefined` (see Edge cases below for why `undefined` vs `null` matters
   here).
2. Fetch it (via `database.getTodayExerciseBreakdown(user.id, currentDate)`) in three
   places, alongside the existing today-data reloads:
   - `loadData()` — initial load, in parallel with the existing `Promise.all`.
   - `handleSquatsUpdate` — after a successful dial bank, in the existing refresh block.
   - `handleSaveEditedDay` — after a successful chart-modal save, in the existing refresh
     block (covers the case where that modal edits today).
3. Pass `exerciseBreakdown={todayExerciseBreakdown}` only to the live/current-day
   `<SquatDial>` instance. The modal's separate `<SquatDial>` instance (used for editing
   an arbitrary past day) does not receive this prop at all — it's about a different
   day, so the prop stays `undefined` there and the line doesn't render.
4. `SquatDial.tsx` gains an optional `exerciseBreakdown?: string | null` prop. Directly
   under the existing "Already banked today: X of Y" text, if the prop was passed at all
   (i.e. `!== undefined`), render a small outlined badge (reusing the `Badge` component
   and `variant="outline"` styling already used for the leaderboard's breakdown pills):
   the tally string if non-null, otherwise the placeholder text "No reps banked yet".

## Edge cases

- **Zero reps banked today**: `getTodayExerciseBreakdown` returns `null`
  (`formatExerciseBreakdown` returns `null` for an empty entry list) → badge renders
  "No reps banked yet" rather than being omitted, so the layout doesn't shift when the
  first entry lands (per explicit product decision).
- **Local/offline mode**: `todayExerciseBreakdown` state is simply never set (stays at
  its initial `null`)... but since the prop is only wired up inside the
  `dataSource === "supabase"` data-loading branches, offline mode needs its own
  consideration: initialize `todayExerciseBreakdown` state to `undefined` (not `null`) so
  local mode's dial renders no line at all (consistent with the feature not existing
  there), while Supabase mode explicitly sets it to `null` or a string once loaded.
- **Rest days**: no special handling needed — if `targetSquats` is 0, no one is banking
  reps for that day, so `getTodayExerciseBreakdown` naturally returns `null` and the
  placeholder shows.

## Testing / verification

No existing automated test coverage touches `SquatDial` or the day-loading flow in
`app/page.tsx` (the repo's `vitest` suite covers `lib/challenge.ts`,
`lib/exercises.ts`, and `lib/exerciseBreakdown.ts` only). Add a unit test for the new
`getTodayExerciseBreakdown` — actually, since it's a thin Supabase-client query wrapper
with no branching logic of its own (all the real logic lives in the already-tested
`formatExerciseBreakdown`), it isn't independently unit-testable without mocking the
Supabase client, which the codebase doesn't currently do anywhere. Verify manually
instead: bank a mix of exercises today, confirm the badge updates after each bank and
after editing today via the chart modal, and confirm the modal's past-day dial never
shows the line.
