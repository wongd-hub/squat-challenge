# Daily Exercise Breakdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a per-exercise breakdown badge on the leaderboard's **Today** tab (e.g. `"40 Squats"`), scoped to that day's activity, matching the badge already shown on the **All-Time** tab.

**Architecture:** A new pure function sums reps-per-exercise from `user_progress_entries` rows and formats them into a display string. `getDailyLeaderboard` fetches that day's entries, groups them by user, and attaches the formatted string as a new `todayExerciseBreakdown` field alongside the existing lifetime `exerciseBreakdown` field. Both leaderboard UIs pick whichever field matches the active tab.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase JS client, Vitest (Node environment, `lib/**/*.test.ts` only — no component/DOM test harness exists in this repo).

## Global Constraints

- Breakdown string format: `"{reps} {exercise}"` per exercise, joined by `", "`, sorted by reps descending then exercise name ascending (tiebreak) — must match the existing all-time `exercise_breakdown` convention from `supabase/migrations/20260809000001_exercise_entries.sql` exactly, so the Today and All-Time badges read consistently when a user switches tabs.
- No new Supabase migration — `user_progress_entries` already has a public-read RLS policy (`"Public can read entries for leaderboard"`), so this is a client-only change.
- No component-test harness exists (`vitest.config.ts` scopes tests to `lib/**/*.test.ts`, Node environment). Only the new pure formatting function gets automated tests; everything else is verified via `npx next build` (type-checks) and careful diff review.

## File Structure

- **Create** `lib/exerciseBreakdown.ts` — pure function `formatExerciseBreakdown`. The approved design spec said to put this in `lib/supabase.ts`, but this repo has an established convention for exactly this kind of pure, dependency-free helper: `lib/challenge.ts` (`deriveChallengeId`, `effectiveTarget`) and `lib/exercises.ts` (`normalizeExerciseName`) both live in their own small files with a co-located `*.test.ts`, specifically so tests don't import anything that touches the Supabase client. Following that same pattern here (rather than bolting the function onto the 696-line `lib/supabase.ts`) fulfills the spec's actual intent — "no Supabase-client dependency, unit-testable directly" — more cleanly than the literal file location it named.
- **Create** `lib/exerciseBreakdown.test.ts` — unit tests for the above.
- **Modify** `lib/supabase.ts` — `getDailyLeaderboard` (fetch+aggregate today's entries) and `getFullLeaderboard` (carry the new field through the merge).
- **Modify** `lib/mockData.ts` — add `todayExerciseBreakdown` to the shared `LeaderboardEntry` interface.
- **Modify** `app/leaderboard/page.tsx` — map the new field from the database response; both mobile and desktop badge blocks pick the tab-appropriate field.
- **Modify** `components/LeaderboardPreview.tsx` — same mapping + badge change as above.

---

### Task 1: Pure exercise-breakdown formatter

**Files:**
- Create: `lib/exerciseBreakdown.ts`
- Test: `lib/exerciseBreakdown.test.ts`

**Interfaces:**
- Produces: `formatExerciseBreakdown(entries: { exercise: string; reps: number }[]): string | null` — sums `reps` per `exercise`, returns `null` for an empty array, otherwise a string like `"86 Push-ups + 10kg, 14 Squats"` (reps desc, exercise name asc tiebreak). Task 2 calls this once per user with that user's entry rows for the target date.

- [ ] **Step 1: Write the failing test**

Create `lib/exerciseBreakdown.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { formatExerciseBreakdown } from './exerciseBreakdown'

describe('formatExerciseBreakdown', () => {
  it('returns null for no entries', () => {
    expect(formatExerciseBreakdown([])).toBeNull()
  })

  it('formats a single exercise', () => {
    expect(formatExerciseBreakdown([{ exercise: 'Squats', reps: 40 }])).toBe('40 Squats')
  })

  it('sums repeated entries for the same exercise', () => {
    const entries = [
      { exercise: 'Squats', reps: 20 },
      { exercise: 'Squats', reps: 20 },
    ]
    expect(formatExerciseBreakdown(entries)).toBe('40 Squats')
  })

  it('sorts multiple exercises by reps descending', () => {
    const entries = [
      { exercise: 'Squats', reps: 14 },
      { exercise: 'Push-ups + 10kg', reps: 86 },
    ]
    expect(formatExerciseBreakdown(entries)).toBe('86 Push-ups + 10kg, 14 Squats')
  })

  it('breaks reps ties by exercise name ascending', () => {
    const entries = [
      { exercise: 'Squats', reps: 10 },
      { exercise: 'Push-ups', reps: 10 },
    ]
    expect(formatExerciseBreakdown(entries)).toBe('10 Push-ups, 10 Squats')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/exerciseBreakdown.test.ts`
Expected: FAIL — `Cannot find module './exerciseBreakdown'` (the source file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `lib/exerciseBreakdown.ts`:

```typescript
export interface ExerciseReps {
  exercise: string
  reps: number
}

// Sums reps per exercise and formats as "86 Push-ups, 14 Squats" (reps desc,
// exercise name asc as a tiebreak) — matches get_total_leaderboard's
// exercise_breakdown convention so the daily and lifetime badges read
// consistently when a user switches tabs.
export function formatExerciseBreakdown(entries: ExerciseReps[]): string | null {
  const totals = new Map<string, number>()
  for (const { exercise, reps } of entries) {
    totals.set(exercise, (totals.get(exercise) || 0) + reps)
  }
  if (totals.size === 0) return null
  return Array.from(totals.entries())
    .sort(([exerciseA, repsA], [exerciseB, repsB]) => repsB - repsA || exerciseA.localeCompare(exerciseB))
    .map(([exercise, reps]) => `${reps} ${exercise}`)
    .join(', ')
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/exerciseBreakdown.test.ts`
Expected: PASS — all 5 assertions green.

- [ ] **Step 5: Commit**

```bash
git add lib/exerciseBreakdown.ts lib/exerciseBreakdown.test.ts
git commit -m "feat: add formatExerciseBreakdown helper for daily leaderboard badges"
```

---

### Task 2: Wire today's exercise breakdown through the data layer

**Files:**
- Modify: `lib/supabase.ts:379-496` (`getDailyLeaderboard`, `getFullLeaderboard`)

**Interfaces:**
- Consumes: `formatExerciseBreakdown` from `./exerciseBreakdown` (Task 1).
- Produces: every object returned by `database.getDailyLeaderboard()` and `database.getFullLeaderboard()` gains a `todayExerciseBreakdown: string | null` field, alongside the existing `exerciseBreakdown: string | null` (lifetime) field. Task 3 (mockData type) and Tasks 4-5 (UI) depend on this exact field name.

- [ ] **Step 1: Add the import**

In `lib/supabase.ts`, near the top with the other local imports:

```typescript
import { normalizeExerciseName, SEED_EXERCISES, DEFAULT_EXERCISE, type Exercise } from "./exercises"
import { formatExerciseBreakdown } from "./exerciseBreakdown"
```

- [ ] **Step 2: Fetch and aggregate today's entries in `getDailyLeaderboard`**

Replace the full `getDailyLeaderboard` method (`lib/supabase.ts:379-444`) with:

```typescript
  async getDailyLeaderboard(date?: string) {
    if (!supabase) return { data: [], error: "Supabase not configured" }

    try {
      const targetDate = date || getLocalDateString()

      const { data, error } = await supabase
        .from('user_progress')
        .select(`
          user_id,
          squats_completed,
          profiles!inner(display_name, email)
        `)
        .eq('date', targetDate)
        .order('squats_completed', { ascending: false })

      if (error) {
        console.warn("⚠️ Daily leaderboard not available:", error.message)
        return { data: [], error: null }
      }

      if (!data || data.length === 0) {
        return { data: [], error: null }
      }

      const { data: entriesData, error: entriesError } = await supabase
        .from('user_progress_entries')
        .select('user_id, exercise, reps')
        .eq('date', targetDate)
        .eq('challenge_id', CHALLENGE_CONFIG.CHALLENGE_ID)

      if (entriesError) {
        console.warn("⚠️ Daily exercise entries not available:", entriesError.message)
      }

      const entriesByUser = new Map<string, { exercise: string; reps: number }[]>()
      for (const entry of entriesData || []) {
        const list = entriesByUser.get(entry.user_id) || []
        list.push({ exercise: entry.exercise, reps: entry.reps })
        entriesByUser.set(entry.user_id, list)
      }

      // Get streaks for each user with timeout protection
      const dailyLeaderboard = await Promise.allSettled(
        data.map(async (entry: any) => {
          const todayExerciseBreakdown = formatExerciseBreakdown(entriesByUser.get(entry.user_id) || [])
          try {
            const { data: streakData, error: streakError } = await supabase.rpc('calculate_user_streak', {
              input_user_id: entry.user_id,
              challenge_start_date: CHALLENGE_CONFIG.START_DATE,
              total_challenge_days: CHALLENGE_CONFIG.TOTAL_DAYS,
              p_challenge_id: CHALLENGE_CONFIG.CHALLENGE_ID,
            })

            return {
              id: entry.user_id,
              name: entry.profiles.display_name,
              email: entry.profiles.email,
              todaySquats: entry.squats_completed,
              todayExerciseBreakdown,
              streak: streakError ? 0 : (streakData || 0),
            }
          } catch (error) {
            return {
              id: entry.user_id,
              name: entry.profiles.display_name,
              email: entry.profiles.email,
              todaySquats: entry.squats_completed,
              todayExerciseBreakdown,
              streak: 0,
            }
          }
        })
      )

      // Filter successful results
      const successfulResults = dailyLeaderboard
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value)

      return { data: successfulResults, error: null }
    } catch (error) {
      console.warn("⚠️ Daily leaderboard service unavailable")
      return { data: [], error: null }
    }
  },
```

Note: `todayExerciseBreakdown` is computed once before the `try`, so it's available identically in both the success and catch branches (streak lookup failing shouldn't blank out the exercise badge).

- [ ] **Step 3: Carry the field through `getFullLeaderboard`'s merge**

In `lib/supabase.ts:459-489`, update both branches of the merge:

```typescript
      // Merge the data
      const fullLeaderboard = totalData.map(totalEntry => {
        const dailyEntry = dailyData.find(d => d.id === totalEntry.id)
        return {
          id: totalEntry.id,
          name: totalEntry.name,
          email: totalEntry.email,
          todaySquats: dailyEntry?.todaySquats || 0,
          todayExerciseBreakdown: dailyEntry?.todayExerciseBreakdown || null,
          totalSquats: totalEntry.totalSquats,
          streak: totalEntry.streak,
          daysActive: totalEntry.daysActive,
          daysCompleted: totalEntry.daysCompleted,
          exerciseBreakdown: totalEntry.exerciseBreakdown,
        }
      })

      // Add users who have daily data but not total data (new users)
      dailyData.forEach(dailyEntry => {
        if (!fullLeaderboard.find(f => f.id === dailyEntry.id)) {
          fullLeaderboard.push({
            id: dailyEntry.id,
            name: dailyEntry.name,
            email: dailyEntry.email,
            todaySquats: dailyEntry.todaySquats,
            todayExerciseBreakdown: dailyEntry.todayExerciseBreakdown || null,
            totalSquats: dailyEntry.todaySquats, // Same as today if no history
            streak: dailyEntry.streak,
            daysActive: 1,
            daysCompleted: 0,
            exerciseBreakdown: null,
          })
        }
      })
```

- [ ] **Step 4: Verify the project still type-checks and builds**

Run: `npx next build`
Expected: build succeeds with 0 errors (same as the baseline before this change — this repo's `tsc --noEmit` is broken for unrelated pre-existing toolchain reasons, so `next build` is the real signal here).

- [ ] **Step 5: Run the full unit test suite to confirm nothing broke**

Run: `npm test`
Expected: all existing tests plus Task 1's new tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/supabase.ts
git commit -m "feat: compute today's exercise breakdown in getDailyLeaderboard/getFullLeaderboard"
```

---

### Task 3: Add the field to the shared leaderboard type

**Files:**
- Modify: `lib/mockData.ts:1-11`

**Interfaces:**
- Consumes: nothing new.
- Produces: `LeaderboardEntry.todayExerciseBreakdown?: string | null`, used by Tasks 4-5.

- [ ] **Step 1: Update the interface**

In `lib/mockData.ts`, replace:

```typescript
export interface LeaderboardEntry {
  id: string;
  name: string;
  todaySquats: number;
  totalSquats: number;
  streak: number;
  rank: number;
  daysCompleted?: number;
  exerciseBreakdown?: string | null;
}
```

with:

```typescript
export interface LeaderboardEntry {
  id: string;
  name: string;
  todaySquats: number;
  totalSquats: number;
  streak: number;
  rank: number;
  daysCompleted?: number;
  exerciseBreakdown?: string | null;
  todayExerciseBreakdown?: string | null;
}
```

- [ ] **Step 2: Verify the project still builds**

Run: `npx next build`
Expected: build succeeds with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add lib/mockData.ts
git commit -m "feat: add todayExerciseBreakdown to LeaderboardEntry type"
```

---

### Task 4: Show the daily breakdown on the full leaderboard page

**Files:**
- Modify: `app/leaderboard/page.tsx:44-53` (data mapping)
- Modify: `app/leaderboard/page.tsx:301-314` (mobile badge)
- Modify: `app/leaderboard/page.tsx:344-357` (desktop badge)

**Interfaces:**
- Consumes: `entry.todayExerciseBreakdown` from `database.getFullLeaderboard()` (Task 2), `LeaderboardEntry.todayExerciseBreakdown` (Task 3).

- [ ] **Step 1: Map the new field from the database response**

In `app/leaderboard/page.tsx:44-53`, update the mapping:

```typescript
          const formattedData: LeaderboardEntry[] = data.map((entry, index) => ({
            id: entry.id,
            name: entry.name,
            todaySquats: entry.todaySquats,
            totalSquats: entry.totalSquats,
            streak: entry.streak,
            rank: index + 1,
            daysCompleted: entry.daysCompleted,
            exerciseBreakdown: entry.exerciseBreakdown,
            todayExerciseBreakdown: entry.todayExerciseBreakdown,
          }));
```

- [ ] **Step 2: Pick the tab-appropriate breakdown in the mobile layout**

In `app/leaderboard/page.tsx:301-314`, replace:

```typescript
                              {(badgeText || (activeTab === 'total' && entry.exerciseBreakdown)) && (
                                <div className="flex flex-wrap items-center gap-1 mt-1">
                                  {badgeText && (
                                    <Badge className={`text-xs ${getRankBadgeColor(displayRank)}`}>
                                      {badgeText}
                                    </Badge>
                                  )}
                                  {activeTab === 'total' && entry.exerciseBreakdown && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                      {entry.exerciseBreakdown}
                                    </Badge>
                                  )}
                                </div>
                              )}
```

with:

```typescript
                              {(() => {
                                const breakdown = activeTab === 'total' ? entry.exerciseBreakdown : entry.todayExerciseBreakdown;
                                return (badgeText || breakdown) && (
                                  <div className="flex flex-wrap items-center gap-1 mt-1">
                                    {badgeText && (
                                      <Badge className={`text-xs ${getRankBadgeColor(displayRank)}`}>
                                        {badgeText}
                                      </Badge>
                                    )}
                                    {breakdown && (
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                        {breakdown}
                                      </Badge>
                                    )}
                                  </div>
                                );
                              })()}
```

- [ ] **Step 3: Pick the tab-appropriate breakdown in the desktop layout**

In `app/leaderboard/page.tsx:344-357` (the desktop-layout copy of the same block, one indent level shallower than the mobile one), replace:

```typescript
                            {(badgeText || (activeTab === 'total' && entry.exerciseBreakdown)) && (
                              <div className="flex flex-wrap items-center gap-1 mt-1">
                                {badgeText && (
                                  <Badge className={`text-xs ${getRankBadgeColor(displayRank)}`}>
                                    {badgeText}
                                  </Badge>
                                )}
                                {activeTab === 'total' && entry.exerciseBreakdown && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                    {entry.exerciseBreakdown}
                                  </Badge>
                                )}
                              </div>
                            )}
```

with:

```typescript
                            {(() => {
                              const breakdown = activeTab === 'total' ? entry.exerciseBreakdown : entry.todayExerciseBreakdown;
                              return (badgeText || breakdown) && (
                                <div className="flex flex-wrap items-center gap-1 mt-1">
                                  {badgeText && (
                                    <Badge className={`text-xs ${getRankBadgeColor(displayRank)}`}>
                                      {badgeText}
                                    </Badge>
                                  )}
                                  {breakdown && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                      {breakdown}
                                    </Badge>
                                  )}
                                </div>
                              );
                            })()}
```

- [ ] **Step 4: Verify the project still builds**

Run: `npx next build`
Expected: build succeeds with 0 errors.

- [ ] **Step 5: Commit**

```bash
git add app/leaderboard/page.tsx
git commit -m "feat: show today's exercise breakdown on the leaderboard page's Today tab"
```

---

### Task 5: Show the daily breakdown on the homepage leaderboard widget

**Files:**
- Modify: `components/LeaderboardPreview.tsx:99-108` (data mapping)
- Modify: `components/LeaderboardPreview.tsx:389-402` (badge)

**Interfaces:**
- Consumes: same as Task 4, applied to `LeaderboardPreview.tsx`.

- [ ] **Step 1: Map the new field from the database response**

In `components/LeaderboardPreview.tsx:99-108`, update the mapping:

```typescript
          const formattedData: LeaderboardEntry[] = data.map((entry, index) => ({
            id: entry.id,
            name: entry.name,
            todaySquats: entry.todaySquats,
            totalSquats: entry.totalSquats,
            streak: entry.streak,
            rank: index + 1,
            daysCompleted: entry.daysCompleted,
            exerciseBreakdown: entry.exerciseBreakdown,
            todayExerciseBreakdown: entry.todayExerciseBreakdown,
          }));
```

- [ ] **Step 2: Pick the tab-appropriate breakdown in the badge block**

In `components/LeaderboardPreview.tsx:389-402`, replace:

```typescript
                            {(badgeText || (activeTab === 'total' && entry.exerciseBreakdown)) && (
                              <motion.div layout className="flex flex-wrap items-center gap-1 mt-1">
                                {badgeText && (
                                  <Badge className={`text-xs ${getRankBadgeColor(displayRank)}`}>
                                    {badgeText}
                                  </Badge>
                                )}
                                {activeTab === 'total' && entry.exerciseBreakdown && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                    {entry.exerciseBreakdown}
                                  </Badge>
                                )}
                              </motion.div>
                            )}
```

with:

```typescript
                            {(() => {
                              const breakdown = activeTab === 'total' ? entry.exerciseBreakdown : entry.todayExerciseBreakdown;
                              return (badgeText || breakdown) && (
                                <motion.div layout className="flex flex-wrap items-center gap-1 mt-1">
                                  {badgeText && (
                                    <Badge className={`text-xs ${getRankBadgeColor(displayRank)}`}>
                                      {badgeText}
                                    </Badge>
                                  )}
                                  {breakdown && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                      {breakdown}
                                    </Badge>
                                  )}
                                </motion.div>
                              );
                            })()}
```

- [ ] **Step 3: Verify the full test suite and build one more time**

Run: `npm test && npx next build`
Expected: all tests pass, build succeeds with 0 errors. This is the final check across every task in this plan.

- [ ] **Step 4: Commit**

```bash
git add components/LeaderboardPreview.tsx
git commit -m "feat: show today's exercise breakdown on the homepage leaderboard widget"
```
