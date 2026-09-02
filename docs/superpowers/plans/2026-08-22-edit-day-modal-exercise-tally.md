# Exercise Tally in the Edit-Day Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the per-exercise tally in `EditDayModal` too, for whichever past day is being edited from the progress chart, not just the live dial's "today."

**Architecture:** Rename the existing `getTodayExerciseBreakdown` data-layer function to `getExerciseBreakdownForDate` (no behavior change — it already takes an arbitrary date), fetch it in `app/page.tsx`'s `handleDayClick` for whichever date was clicked, and thread it through as a prop into `EditDayModal`'s existing internal `SquatDial` call.

**Tech Stack:** Next.js (React), TypeScript, Supabase JS client.

## Global Constraints

- No behavior change to the 3 existing call sites during the rename — same function body, same signature, only the name changes.
- `EditDayModal.tsx` stays props-only: no direct Supabase/`lib/supabase.ts` calls added inside it. The fetch happens in `app/page.tsx`, matching how `currentSquats`/`initialExercise`/`initialGoalMode` already work.
- No loading skeleton for the badge in the modal — it pops in once the fetch resolves, same as the live dial's existing behavior.
- No new automated tests (same reasoning as the prior plan: no component-test infrastructure in this repo, and the renamed function has no new branching logic to test beyond what's already covered by `formatExerciseBreakdown`'s existing unit tests).

---

### Task 1: Rename `getTodayExerciseBreakdown` to `getExerciseBreakdownForDate`

**Files:**
- Modify: `lib/supabase.ts:242-258` (function + doc comment)
- Modify: `app/page.tsx` (3 call sites)

**Interfaces:**
- Produces: `database.getExerciseBreakdownForDate(userId: string, date: string): Promise<string | null>` — Task 2 calls this exact name.

- [ ] **Step 1: Rename the function and update its comment**

Find in `lib/supabase.ts`:
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
Replace with:
```typescript
  // Reads a single user's per-exercise mix for one date, for display in the
  // dial (not the leaderboard, which aggregates across all users instead).
  // Works for any date — used for both today's live dial and for whichever
  // past day is open in the edit-day modal.
  async getExerciseBreakdownForDate(userId: string, date: string): Promise<string | null> {
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
      console.error("❌ Error loading exercise breakdown:", error)
      return null
    }
  },
```

- [ ] **Step 2: Update all 3 call sites in `app/page.tsx`**

All 3 existing call sites use the identical literal `database.getTodayExerciseBreakdown(user.id, currentDate)`. Replace every occurrence with `database.getExerciseBreakdownForDate(user.id, currentDate)` (a global find-and-replace of that exact string across `app/page.tsx` is sufficient — no surrounding context differs between them in a way that matters here).

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: only the 4 pre-existing `components/ui/chart.tsx` errors (unrelated to this codebase area) — no new errors, and specifically no "Property 'getTodayExerciseBreakdown' does not exist" anywhere.

- [ ] **Step 4: Confirm no remaining references to the old name**

Run: `grep -rn "getTodayExerciseBreakdown" --include="*.ts" --include="*.tsx" . | grep -v node_modules`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add lib/supabase.ts app/page.tsx
git commit -m "refactor: rename getTodayExerciseBreakdown to getExerciseBreakdownForDate"
```

---

### Task 2: Fetch and display the tally in the edit-day modal

**Files:**
- Modify: `app/page.tsx` (new state, `handleDayClick`, `EditDayModal` JSX call)
- Modify: `components/EditDayModal.tsx` (new prop, threaded to its internal `SquatDial`)

**Interfaces:**
- Consumes: `database.getExerciseBreakdownForDate(userId, date)` from Task 1.
- Produces: `EditDayModal`'s new `exerciseBreakdown?: string | null` prop — no later tasks depend on this, it's the final consumer (same prop name/type as `SquatDial`'s existing prop from the prior plan, so it passes straight through).

- [ ] **Step 1: Add state in `app/page.tsx`**

Find:
```typescript
  const [selectedEditDate, setSelectedEditDate] = useState<string | null>(null)
  const [selectedEditSquats, setSelectedEditSquats] = useState(0)
```
Replace with:
```typescript
  const [selectedEditDate, setSelectedEditDate] = useState<string | null>(null)
  const [selectedEditSquats, setSelectedEditSquats] = useState(0)
  const [selectedEditExerciseBreakdown, setSelectedEditExerciseBreakdown] = useState<string | null | undefined>(undefined)
```

- [ ] **Step 2: Fetch it in `handleDayClick`**

Find:
```typescript
  const handleDayClick = (date: string, currentSquats: number, target: number) => {
    setSelectedEditDate(date)
    setSelectedEditSquats(currentSquats)
    setModalOpenedFromChart(true)
    setEditDayModalOpen(true)
  }
```
Replace with:
```typescript
  const handleDayClick = (date: string, currentSquats: number, target: number) => {
    setSelectedEditDate(date)
    setSelectedEditSquats(currentSquats)
    setModalOpenedFromChart(true)
    setEditDayModalOpen(true)
    setSelectedEditExerciseBreakdown(undefined)
    if (dataSource === "supabase" && user) {
      database.getExerciseBreakdownForDate(user.id, date).then(setSelectedEditExerciseBreakdown)
    }
  }
```

- [ ] **Step 3: Pass the prop to `EditDayModal`**

Find:
```typescript
        <EditDayModal
          isOpen={editDayModalOpen}
          onClose={() => {
            setEditDayModalOpen(false)
            setModalOpenedFromChart(false)
          }}
          selectedDate={selectedEditDate}
          currentSquats={selectedEditSquats}
          dailyTargets={dailyTargets}
          onSave={handleSaveEditedDay}
          openedFromChart={modalOpenedFromChart}
          initialExercise={challengeProgressData.find((p) => p.date === selectedEditDate)?.exercise ?? DEFAULT_EXERCISE}
          initialGoalMode={(challengeProgressData.find((p) => p.date === selectedEditDate)?.goal_mode as 'full' | 'half') ?? 'full'}
          canAddCustom={dataSource === "supabase" && !!user}
          userId={user?.id}
        />
```
Replace with:
```typescript
        <EditDayModal
          isOpen={editDayModalOpen}
          onClose={() => {
            setEditDayModalOpen(false)
            setModalOpenedFromChart(false)
          }}
          selectedDate={selectedEditDate}
          currentSquats={selectedEditSquats}
          dailyTargets={dailyTargets}
          onSave={handleSaveEditedDay}
          openedFromChart={modalOpenedFromChart}
          initialExercise={challengeProgressData.find((p) => p.date === selectedEditDate)?.exercise ?? DEFAULT_EXERCISE}
          initialGoalMode={(challengeProgressData.find((p) => p.date === selectedEditDate)?.goal_mode as 'full' | 'half') ?? 'full'}
          canAddCustom={dataSource === "supabase" && !!user}
          userId={user?.id}
          exerciseBreakdown={selectedEditExerciseBreakdown}
        />
```

- [ ] **Step 4: Thread the prop through `EditDayModal.tsx`**

Find:
```typescript
interface EditDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string | null;
  currentSquats: number;
  dailyTargets: any[];
  onSave: (date: string, squats: number, exercise: string, goalMode: 'full' | 'half') => Promise<void>;
  openedFromChart?: boolean;
  initialExercise?: string;
  initialGoalMode?: 'full' | 'half';
  canAddCustom: boolean;
  userId?: string;
}

export function EditDayModal({
  isOpen,
  onClose,
  selectedDate,
  currentSquats,
  dailyTargets,
  onSave,
  openedFromChart = false,
  initialExercise,
  initialGoalMode,
  canAddCustom,
  userId
}: EditDayModalProps) {
```
Replace with:
```typescript
interface EditDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string | null;
  currentSquats: number;
  dailyTargets: any[];
  onSave: (date: string, squats: number, exercise: string, goalMode: 'full' | 'half') => Promise<void>;
  openedFromChart?: boolean;
  initialExercise?: string;
  initialGoalMode?: 'full' | 'half';
  canAddCustom: boolean;
  userId?: string;
  exerciseBreakdown?: string | null;
}

export function EditDayModal({
  isOpen,
  onClose,
  selectedDate,
  currentSquats,
  dailyTargets,
  onSave,
  openedFromChart = false,
  initialExercise,
  initialGoalMode,
  canAddCustom,
  userId,
  exerciseBreakdown
}: EditDayModalProps) {
```

Then find:
```typescript
              <SquatDial
                currentSquats={currentSquats}
                targetSquats={target}
                onSquatsChange={handleSquatsChange}
                currentDay={challengeDay}
                compact={false}
                hideTip={openedFromChart}
                exerciseLabel={exercise}
              />
```
Replace with:
```typescript
              <SquatDial
                currentSquats={currentSquats}
                targetSquats={target}
                onSquatsChange={handleSquatsChange}
                currentDay={challengeDay}
                compact={false}
                hideTip={openedFromChart}
                exerciseLabel={exercise}
                exerciseBreakdown={exerciseBreakdown}
              />
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: only the 4 pre-existing `components/ui/chart.tsx` errors — no new ones.

- [ ] **Step 6: Manual verification**

Run: `npm run dev`, log in with a real account.

1. Click a past day in the progress chart that has known logged exercises. Confirm the modal's dial shows that day's tally (it may take a moment to appear after the modal opens — that's expected).
2. Close the modal, click a *different* past day, confirm the tally updates to that day's mix (not left over from the previous day).
3. Click today's bar in the chart. Confirm the modal shows today's tally too (same value as the live dial's badge).
4. Click a rest day. Confirm the "Rest Day" screen still shows with no dial/badge (unchanged from before).

- [ ] **Step 7: Commit**

```bash
git add app/page.tsx components/EditDayModal.tsx
git commit -m "feat: show the per-exercise tally in the edit-day modal too"
```

---

## Self-Review Notes

- **Spec coverage:** rename (Task 1) ✅, fetch-on-click for whichever date (Task 2 Step 2) ✅, props-only `EditDayModal` boundary preserved (Task 2 Step 4, no Supabase import added) ✅, local/offline mode stays `undefined` (Task 2 Step 2's `dataSource === "supabase" && user` guard) ✅, rest-day short-circuit unaffected (noted in spec edge cases, verified in Step 6.4) ✅.
- **Placeholder scan:** none found.
- **Type consistency:** `getExerciseBreakdownForDate(userId: string, date: string): Promise<string | null>` used identically in all 4 call sites (3 renamed + 1 new). `exerciseBreakdown?: string | null` prop name matches between `EditDayModal`'s interface, its destructured params, its own `SquatDial` call, and `app/page.tsx`'s state/`EditDayModal` call — same name and type as `SquatDial`'s existing prop from the prior plan.
