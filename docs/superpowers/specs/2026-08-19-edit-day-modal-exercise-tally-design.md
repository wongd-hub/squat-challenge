# Exercise Tally in the Edit-Day Modal — Design

**Date:** 2026-08-19
**Branch:** `feature/dial-exercise-tally`
**Status:** Approved design, pending spec review

## Goal

Extend the per-exercise tally shipped in `docs/superpowers/specs/2026-08-17-dial-today-exercise-tally-design.md`
(currently live-dial-only) to also show in `EditDayModal` when editing a **past** day
from the progress chart — otherwise editing a past day gives no visibility into what was
actually banked that day before you overwrite it.

## Background / current state

- `database.getTodayExerciseBreakdown(userId, date)` (`lib/supabase.ts`) already queries
  `user_progress_entries` for a single user/date/challenge and formats the result with
  `formatExerciseBreakdown`. Despite its name, it already takes an arbitrary `date` — it
  was only ever *called* with today's date so far (from `app/page.tsx`'s `loadData`,
  `handleSquatsUpdate`, and `handleSaveEditedDay`).
- `EditDayModal.tsx` is a purely props-driven component: it takes `currentSquats`,
  `initialExercise`, `initialGoalMode` etc. — all computed/fetched by `app/page.tsx` and
  passed down — and never calls `lib/supabase.ts` directly itself. Its internal
  `SquatDial` call (line ~154) does not currently receive `exerciseBreakdown`, so no
  badge shows there regardless of which day is open.
- `app/page.tsx`'s `handleDayClick(date, currentSquats, target)` is what opens the modal
  (from a progress-chart bar click) — it currently just sets `selectedEditDate` /
  `selectedEditSquats` / modal-open state synchronously.

## Chosen approach: rename the fetcher to be date-agnostic, fetch in `handleDayClick`, thread through as a prop

Rename `getTodayExerciseBreakdown` → `getExerciseBreakdownForDate` (same signature,
same body — purely a naming fix, since it already works for any date and calling a past
day through a function named "Today" would misread on every future call site). Update
its doc comment and its 3 existing call sites.

Rejected alternative — give `EditDayModal` its own data-fetching `useEffect` keyed on
`selectedDate`/`isOpen`: would work, but breaks the component's established "props only,
no direct Supabase calls" boundary that every other piece of its state already follows
(`currentSquats`, `initialExercise`, `initialGoalMode` are all fetched/derived in
`app/page.tsx` and passed down). Keeping `app/page.tsx` as the single place that talks to
`lib/supabase.ts` for this feature is more consistent with the rest of the file.

## Data flow

1. `app/page.tsx` gets a new `selectedEditExerciseBreakdown: string | null | undefined`
   state, initialized to `undefined`.
2. `handleDayClick(date, currentSquats, target)`: after the existing synchronous state
   sets (so the modal opens immediately, unblocked), reset
   `selectedEditExerciseBreakdown` to `undefined`, then — only when
   `dataSource === "supabase" && user` — call
   `database.getExerciseBreakdownForDate(user.id, date)` and set the result once it
   resolves. In local/offline mode it simply stays `undefined`, same convention as the
   live dial.
3. Pass `exerciseBreakdown={selectedEditExerciseBreakdown}` to `<EditDayModal>`
   (`app/page.tsx`'s existing `EditDayModal` JSX call).
4. `EditDayModal` gains an `exerciseBreakdown?: string | null` prop, passed straight
   through to its own internal `<SquatDial exerciseBreakdown={exerciseBreakdown} />` call
   — no fetching logic added inside the modal itself.

## Edge cases

- **Loading gap**: the breakdown arrives a moment after the modal opens (a fetch
  round-trip), same as the live dial's badge on first page load — no skeleton/spinner,
  it just pops in once resolved. Consistent with the existing feature; not worth the
  extra complexity for a sub-second gap.
- **Editing today via the chart**: this now triggers two independent fetches for the same
  date — one for `todayExerciseBreakdown` (existing, unchanged) and one for
  `selectedEditExerciseBreakdown` (new, for the modal). This mirrors the existing
  duplication between `todaySquats` and `selectedEditSquats`, which are already two
  separate pieces of state for the same underlying value. Not deduplicated — consistent
  with the existing pattern, and this is a cheap single-row query either way.
- **Rest days**: `EditDayModal` already short-circuits to a "Rest Day" screen before
  rendering `SquatDial` at all when `isRestDay` is true, so the badge question doesn't
  arise there.

## Testing / verification

Same constraints as the original spec — no component-test infrastructure exists in this
repo. Verify manually: click a past day with known logged exercises, confirm the modal's
dial shows the correct tally for that specific day (not today's); click a different past
day and confirm it updates to that day's tally; click today's bar and confirm today's
tally still shows correctly in the modal.
