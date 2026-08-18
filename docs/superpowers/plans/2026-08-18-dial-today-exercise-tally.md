# Today's Exercise Tally in the Dial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a per-exercise tally of today's banked reps (e.g. "170 Sit-ups, 97 Squats") directly under "Already banked today: X of Y" in the squat dial.

**Architecture:** A new thin Supabase query function reads today's rows from `user_progress_entries` for the current user and formats them with the already-existing `formatExerciseBreakdown` helper. `app/page.tsx` fetches this alongside its other today-data reloads and passes it down as a new optional prop to `SquatDial`, which renders it as a small outlined badge (or a placeholder if nothing's banked yet). The prop is only wired into the live dial — `EditDayModal`'s separate `SquatDial` instance (for editing a past day) is left untouched and never receives it.

**Tech Stack:** Next.js (React), TypeScript, Supabase JS client, Tailwind, shadcn/ui `Badge`.

## Global Constraints

- Feature is Supabase-only. Local/offline storage mode never tracked per-exercise entries, so the badge must not appear there — the prop's `undefined` state (as opposed to `null`) is what encodes "not applicable here" vs. "applicable but nothing banked."
- Reuse the existing `formatExerciseBreakdown(entries: {exercise: string; reps: number}[]): string | null` from `lib/exerciseBreakdown.ts` — do not reimplement the aggregation/formatting logic.
- Reuse the existing `Badge` component (`components/ui/badge.tsx`) with `variant="outline"`, matching the styling already used for the leaderboard's breakdown badges (`text-[10px] px-1.5 py-0`).
- Do not modify `components/EditDayModal.tsx` — its `SquatDial` instance is for editing an arbitrary past day and must not show today's tally.
- No new automated test is added for the new Supabase query function: the project's `vitest` config (`vitest.config.ts`) only runs `lib/**/*.test.ts` in a `node` environment, with no Supabase-client mocking anywhere in the codebase and no component-test infrastructure (no jsdom, no React Testing Library). The new function is a thin query+format wrapper with no branching logic of its own (all real logic is in the already-tested `formatExerciseBreakdown`), so it is verified manually instead (Task 1, Step 3).

---

### Task 1: Add `getTodayExerciseBreakdown` to the data layer

**Files:**
- Modify: `lib/supabase.ts` (add new function after `addProgressEntry`, i.e. after line 240)

**Interfaces:**
- Consumes: `formatExerciseBreakdown` (already imported at the top of `lib/supabase.ts`, line 4: `import { formatExerciseBreakdown } from "./exerciseBreakdown"`), `CHALLENGE_CONFIG.CHALLENGE_ID` (already defined in this file), the module-level `supabase` client.
- Produces: `database.getTodayExerciseBreakdown(userId: string, date: string): Promise<string | null>` — later tasks call this exact function with these exact parameter names/order.

- [ ] **Step 1: Add the function**

Open `lib/supabase.ts` and find the end of `addProgressEntry` (it ends at line 240 with `},`). Insert this new function immediately after it, before the comment `// Editing a past day sets one absolute number...` (line 242):

```typescript
  // Reads today's per-exercise mix for a single user, for display in the
  // dial (not the leaderboard, which aggregates across all users instead).
  async getTodayExerciseBreakdown(userId: string, date: string): Promise<string | null> {
    if (!supabase) return null
    try {
      const { data, error } = await supabase
        .from("user_progress_entries")
        .select("exercise, reps")
        .eq("user_id", userId)
        .eq("date", date)
        .eq("challenge_id", CHALLENGE_CONFIG.CHALLENGE_ID)
      if (error) throw error
      return formatExerciseBreakdown(data || [])
    } catch (error) {
      console.error("❌ Error loading today's exercise breakdown:", error)
      return null
    }
  },

```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors introduced (the project already has `typescript.ignoreBuildErrors: true` in `next.config.js`, but this command still surfaces real type errors worth catching before moving on).

- [ ] **Step 3: Verify against real data**

This project's local `.env.local` points at the live Supabase project used for the current challenge (this is the existing, established way this codebase gets manually verified — see the rest of this repo's `fix:` commit history). Confirm the query shape is right by running it directly against the real table for a user/date you know has entries:

```bash
set -a; source .env.local; set +a
curl -s "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/user_progress_entries?select=exercise,reps&user_id=eq.<a real user_id>&date=eq.<a real YYYY-MM-DD date with entries>&challenge_id=eq.${NEXT_PUBLIC_CHALLENGE_ID}" \
  -H "apikey: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" -H "Authorization: Bearer ${NEXT_PUBLIC_SUPABASE_ANON_KEY}"
```

Expected: a JSON array of `{exercise, reps}` rows. Manually sum reps per exercise and confirm it matches what `formatExerciseBreakdown` would produce (reps descending, exercise name ascending as tiebreak, joined by `", "`) — e.g. `[{"exercise":"Squats","reps":72},{"exercise":"Sit-ups","reps":100}]` should format as `"100 Sit-ups, 72 Squats"`.

- [ ] **Step 4: Commit**

```bash
git add lib/supabase.ts
git commit -m "feat: add getTodayExerciseBreakdown for the current user's daily dial"
```

---

### Task 2: Wire it into the dial

**Files:**
- Modify: `app/page.tsx` (new state; fetch it in `loadData`, `handleSquatsUpdate`, `handleSaveEditedDay`; pass the new prop to the live `SquatDial`)
- Modify: `components/SquatDial.tsx` (new prop; render the badge)

**Interfaces:**
- Consumes: `database.getTodayExerciseBreakdown(userId, date)` from Task 1.
- Produces: `SquatDial`'s new `exerciseBreakdown?: string | null` prop — no later tasks depend on this, it's the final consumer.

- [ ] **Step 1: Add state in `app/page.tsx`**

Find line 45:
```typescript
  const [todaySquats, setTodaySquats] = useState(0)
```
Add immediately after it:
```typescript
  const [todayExerciseBreakdown, setTodayExerciseBreakdown] = useState<string | null | undefined>(undefined)
```

- [ ] **Step 2: Fetch it in `loadData`'s Supabase branch**

Find (around line 409-412):
```typescript
        const [recentResult, challengeResult] = await Promise.all([
          database.getUserProgress(user.id, 7),
          database.getChallengeProgress(user.id)
        ])
```
Replace with:
```typescript
        const [recentResult, challengeResult, todayExerciseBreakdownResult] = await Promise.all([
          database.getUserProgress(user.id, 7),
          database.getChallengeProgress(user.id),
          database.getTodayExerciseBreakdown(user.id, currentDate)
        ])
```

Find (around line 459-460):
```typescript
        // Set today's squats from the most authoritative source
        setTodaySquats(todaySquatsFromData)
```
Replace with:
```typescript
        // Set today's squats from the most authoritative source
        setTodaySquats(todaySquatsFromData)
        setTodayExerciseBreakdown(todayExerciseBreakdownResult)
```

- [ ] **Step 3: Reset to `undefined` on the non-Supabase / error paths**

Find (around line 461-477):
```typescript
      } catch (error) {
        console.error("❌ Error loading Supabase data:", error)
        if (DISABLE_OFFLINE_MODE) {
          console.error("❌ Supabase data load failed and offline mode disabled")
          // Don't fallback to local storage when offline mode is disabled
          setTodaySquats(0)
          setProgressData([])
          setChallengeProgressData([])
        } else {
          // Fallback to local storage
          loadLocalData(freshDailyTargets)
        }
      }
    } else {
      // Load from local storage
      loadLocalData(freshDailyTargets)
    }
  }, [dataSource, user, currentDate, currentDay])
```
Replace with:
```typescript
      } catch (error) {
        console.error("❌ Error loading Supabase data:", error)
        if (DISABLE_OFFLINE_MODE) {
          console.error("❌ Supabase data load failed and offline mode disabled")
          // Don't fallback to local storage when offline mode is disabled
          setTodaySquats(0)
          setProgressData([])
          setChallengeProgressData([])
          setTodayExerciseBreakdown(undefined)
        } else {
          // Fallback to local storage
          loadLocalData(freshDailyTargets)
          setTodayExerciseBreakdown(undefined)
        }
      }
    } else {
      // Load from local storage
      loadLocalData(freshDailyTargets)
      setTodayExerciseBreakdown(undefined)
    }
  }, [dataSource, user, currentDate, currentDay])
```

- [ ] **Step 4: Refetch after a dial bank in `handleSquatsUpdate`**

Find (around line 864-868):
```typescript
        // Reload both challenge progress AND recent progress to update all displays
        const [challengeResult, recentResult] = await Promise.all([
          database.getChallengeProgress(user.id),
          database.getUserProgress(user.id, 7)
        ])
```
Replace with:
```typescript
        // Reload both challenge progress AND recent progress to update all displays
        const [challengeResult, recentResult, todayExerciseBreakdownResult] = await Promise.all([
          database.getChallengeProgress(user.id),
          database.getUserProgress(user.id, 7),
          database.getTodayExerciseBreakdown(user.id, currentDate)
        ])
        setTodayExerciseBreakdown(todayExerciseBreakdownResult)
```

- [ ] **Step 5: Refetch after a same-day edit in `handleSaveEditedDay`**

Find (around line 1050-1052):
```typescript
        // If editing today's date, update today's squats and check milestones
        if (date === currentDate) {
          setTodaySquats(squats)
```
Replace with:
```typescript
        // If editing today's date, update today's squats and check milestones
        if (date === currentDate) {
          setTodaySquats(squats)
          setTodayExerciseBreakdown(await database.getTodayExerciseBreakdown(user.id, currentDate))
```

- [ ] **Step 6: Add the prop and render logic in `components/SquatDial.tsx`**

Find (lines 1-15):
```typescript
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useHaptic } from 'use-haptic';
import { Button } from './ui/button';

interface SquatDialProps {
  onSquatsChange: (squats: number) => void;
  currentSquats: number;
  targetSquats: number;
  currentDay: number;
  compact?: boolean;
  hideTip?: boolean;
  exerciseLabel?: string;
}

export function SquatDial({ onSquatsChange, currentSquats, targetSquats, currentDay, compact = false, hideTip = false, exerciseLabel = "reps" }: SquatDialProps) {
```
Replace with:
```typescript
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useHaptic } from 'use-haptic';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface SquatDialProps {
  onSquatsChange: (squats: number) => void;
  currentSquats: number;
  targetSquats: number;
  currentDay: number;
  compact?: boolean;
  hideTip?: boolean;
  exerciseLabel?: string;
  exerciseBreakdown?: string | null;
}

export function SquatDial({ onSquatsChange, currentSquats, targetSquats, currentDay, compact = false, hideTip = false, exerciseLabel = "reps", exerciseBreakdown }: SquatDialProps) {
```

Find (lines 412-414):
```typescript
        <p className={`${compact ? 'text-base' : 'text-xl'} font-semibold text-foreground`}>
          {currentSquats} of {targetSquats}
        </p>
```
Replace with:
```typescript
        <p className={`${compact ? 'text-base' : 'text-xl'} font-semibold text-foreground`}>
          {currentSquats} of {targetSquats}
        </p>
        {exerciseBreakdown !== undefined && (
          <div className="flex justify-center mt-1">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
              {exerciseBreakdown || 'No reps banked yet'}
            </Badge>
          </div>
        )}
```

- [ ] **Step 7: Pass the prop from `app/page.tsx`'s live dial**

Find (around line 1872-1879):
```typescript
                  <SquatDial
                    onSquatsChange={handleSquatsUpdate}
                    currentSquats={todaySquats}
                    targetSquats={todayTarget}
                    currentDay={displayDay}
                    compact={false}
                    exerciseLabel={exercise}
                  />
```
Replace with:
```typescript
                  <SquatDial
                    onSquatsChange={handleSquatsUpdate}
                    currentSquats={todaySquats}
                    targetSquats={todayTarget}
                    currentDay={displayDay}
                    compact={false}
                    exerciseLabel={exercise}
                    exerciseBreakdown={todayExerciseBreakdown}
                  />
```

Do **not** touch `components/EditDayModal.tsx` — its own `SquatDial` call (around its line 154) is left exactly as-is, so `exerciseBreakdown` stays `undefined` there and the badge never renders in the past-day edit modal.

- [ ] **Step 8: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 9: Manual verification**

Run: `npm run dev`, open the app, and log in with a real account.

1. Confirm the badge appears under "Already banked today: X of Y" showing today's already-logged exercise mix (or "No reps banked yet" if nothing's logged today).
2. Bank a few reps with one exercise selected, then switch the exercise picker and bank a few more. Confirm the badge updates immediately after each bank and reflects both exercises (e.g. `"20 Push-ups, 10 Squats"`).
3. Refresh the page. Confirm the badge still shows the same tally (proves it's read from the DB via `getTodayExerciseBreakdown`, not just held in transient state).
4. Open the progress chart, click on **today's** bar to open the edit modal, and confirm the modal's own dial does **not** show any breakdown line. Change the total there and save; confirm the main page's badge (behind the modal) updates to match once the modal closes.
5. Click on a **past** day's bar, edit it, and save. Confirm nothing errors and today's badge is unaffected.
6. Force local/offline mode by running `localStorage.setItem('force_local_mode', 'true')` in the browser console, then reload. Confirm no badge line appears at all — not even a "No reps banked yet" placeholder. Run `localStorage.removeItem('force_local_mode')` and reload again afterward to restore normal Supabase mode.

- [ ] **Step 10: Commit**

```bash
git add app/page.tsx components/SquatDial.tsx
git commit -m "feat: show today's per-exercise tally under the dial's banked-reps count"
```

---

## Self-Review Notes

- **Spec coverage:** Data layer (Task 1) ✅, state + all three refetch points + reset-to-undefined paths (Task 2 Steps 1-5) ✅, prop + badge rendering (Task 2 Step 6) ✅, wiring only into the live dial and explicitly not `EditDayModal` (Task 2 Step 7 + note) ✅, empty-state placeholder text (Task 2 Step 6) ✅, local-mode exclusion (Task 2 Step 3 + manual verification Step 9.6) ✅.
- **Placeholder scan:** none found — every step has literal code or a literal shell command.
- **Type consistency:** `getTodayExerciseBreakdown(userId: string, date: string): Promise<string | null>` (Task 1) is called identically in all three Task 2 call sites; `exerciseBreakdown?: string | null` prop name matches between the interface, destructured params, and the JSX render check and the page.tsx call site.
