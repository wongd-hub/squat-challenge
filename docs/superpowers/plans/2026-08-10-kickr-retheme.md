# Kickr-Inspired Retheme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retheme the app to a flat, Claude/Raycast-inspired look borrowed from the sibling `kickr` project — near-black/warm-white flat panels, a warm/cool radial-gradient-pool backdrop with restrained grain, Space Grotesk + JetBrains Mono — while leaving `SquatDial`'s interaction logic completely untouched.

**Architecture:** Token-value swap, not a component rewrite. Redefine what the existing semantic CSS custom properties and class names (`background`, `card`, `border`, `.glass*`, `.gradient-bg`) resolve to; almost no component files change because they already consume these tokens rather than hardcoded colors. `SquatDial.tsx` gets only its handful of hardcoded inline colors swapped.

**Tech Stack:** Next.js 15, Tailwind CSS v3 (config-based), `next/font/google`, shadcn/ui component primitives (unchanged).

## Global Constraints

- Token storage format changes from **HSL-triplet** to **RGB-triplet** (`--x: 11 11 12`), wrapped in `tailwind.config.ts` as `rgb(var(--x) / <alpha-value>)` instead of `hsl(var(--x))`, for every token EXCEPT `--chart-1` through `--chart-5` (explicitly out of scope — keep both their current values and their current `hsl(var(--chart-N))` wrapper untouched).
- `--destructive` / `--destructive-foreground` must render as the **exact same color as today** — only their storage format changes (HSL → equivalent RGB), never their rendered hue. This token is genuinely used elsewhere for real error states (`components/AuthModal.tsx`'s `<Alert variant="destructive">`, `components/ui/form.tsx`'s validation text) and must not be repointed to any other color.
- Exact color values (dark / light hex, already converted to RGB triplets — use these verbatim, do not re-derive):
  - `background`: `11 11 12` / `250 248 246`
  - `card`, `muted`, `secondary`: `20 20 22` / `255 255 255`
  - `popover`: `28 28 31` / `255 255 255`
  - `foreground`: `237 237 239` / `28 26 24`
  - `muted-foreground`: `139 139 147` / `138 131 120`
  - `border`, `input`: `42 42 46` / `228 224 218`
  - `accent`, `primary`, `ring`: `217 119 87` / `217 119 87` (same both modes)
  - `accent-foreground`, `primary-foreground`: `11 11 12` / `255 255 255`
  - `destructive`: `127 29 29` / `239 68 68`
  - `destructive-foreground`: `250 250 250` / `250 250 250`
- `--radius` (`0.5rem`) is unchanged.
- `SquatDial.tsx`'s pointer-event geometry (`getAngleFromPoint`, `handleStart`/`handleMove`/`handleEnd`, `calculateSquats`, rotation math), sizing classes (`dialSize`/`innerDialSize`), and `contain`/`willChange`/`touchAction` performance hints must not be modified — only inline color values and the Bank-button wrapper change.
- Grain (kickr's SVG fractal-noise technique) applies only to the page backdrop (`.gradient-bg`) and exactly one other surface: the challenge-complete card in `app/page.tsx`. No other panel gets grain.
- Neobrutalism theme and the `THEME_STYLE` env switch are retired entirely — no code path should reference either after this plan completes.
- Dial "removing reps" color is a dedicated blue (`#4a90d9` / `rgb(74 144 217)`), not a repoint of `--destructive` and not a new third hue.
- Mono font (JetBrains Mono) applies only to: `SquatDial`'s center number and the shared `CountUp` component (covers stat cards and leaderboard numbers). Not applied to body text.
- No new automated tests — this is a pure CSS/font change with no new logic. Verify via `npm run build` + `npx tsc --noEmit` + targeted `grep` checks + one final manual check.

## Testing Strategy

Every task ends with `npm run build` (must succeed) and, where relevant, a `grep` command proving old references are gone / new ones are correctly scoped. The final task is a manual verification checklist run by a human in a browser (drag the dial, toggle light/dark, trigger an auth error) — no tool in this environment can substitute for actually looking at the rendered page.

## File Structure

- Modify: `tailwind.config.ts` — color token wrapper format, `fontFamily` additions.
- Modify: `app/globals.css` — token values, delete both neobrut blocks, flat panel rules, gradient-backdrop + grain rules.
- Modify: `app/layout.tsx` — remove `THEME_STYLE` branching, swap `Inter` for `Space Grotesk` + add `JetBrains Mono`.
- Modify: `README.md` — remove stale `THEME_STYLE` documentation.
- Modify: `components/CountUp.tsx` — add `font-mono` to the rendered span.
- Modify: `components/SquatDial.tsx` — inline gradient/color swaps, `font-mono` on center number, `hsl()`→`rgb()` fix, `StarBorder` → `Button` swap.
- Modify: `components/ShinyText.tsx` — restyle using kickr's `.shimmer` technique, fix `hsl()`→`rgb()`.
- Modify: `app/page.tsx` — add `grain-strong` to the challenge-complete card.
- Delete: `components/StarBorder.tsx` (after Task 6 migrates its one call site).

---

### Task 1: Color token infrastructure

**Files:**
- Modify: `tailwind.config.ts:30-71`
- Modify: `app/globals.css:19-75`

**Interfaces:**
- Produces: every Tailwind color utility (`bg-background`, `text-foreground`, `bg-card`, `border-border`, `bg-primary`, `bg-accent`, `text-destructive`, etc.) continues to work exactly as before, now resolving to the new palette. `--chart-1..5` and their `hsl()` wrapper are untouched.

- [ ] **Step 1: Update `tailwind.config.ts`'s color block**

Replace:
```ts
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
      },
```
with:
```ts
      colors: {
        background: 'rgb(var(--background) / <alpha-value>)',
        foreground: 'rgb(var(--foreground) / <alpha-value>)',
        card: {
          DEFAULT: 'rgb(var(--card) / <alpha-value>)',
          foreground: 'rgb(var(--card-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'rgb(var(--popover) / <alpha-value>)',
          foreground: 'rgb(var(--popover-foreground) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
          foreground: 'rgb(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--secondary) / <alpha-value>)',
          foreground: 'rgb(var(--secondary-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'rgb(var(--muted) / <alpha-value>)',
          foreground: 'rgb(var(--muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          foreground: 'rgb(var(--accent-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'rgb(var(--destructive) / <alpha-value>)',
          foreground: 'rgb(var(--destructive-foreground) / <alpha-value>)',
        },
        border: 'rgb(var(--border) / <alpha-value>)',
        input: 'rgb(var(--input) / <alpha-value>)',
        ring: 'rgb(var(--ring) / <alpha-value>)',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
      },
```

- [ ] **Step 2: Replace the `:root` and `.dark` token blocks in `app/globals.css`**

Replace the entire block (lines 19-75, from `@layer base {` through its closing `}`):
```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 3.9%;
    --primary: 0 0% 9%;
    --primary-foreground: 0 0% 98%;
    --secondary: 0 0% 96.1%;
    --secondary-foreground: 0 0% 9%;
    --muted: 0 0% 96.1%;
    --muted-foreground: 0 0% 45.1%;
    --accent: 0 0% 96.1%;
    --accent-foreground: 0 0% 9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 89.8%;
    --input: 0 0% 89.8%;
    --ring: 0 0% 3.9%;
    --chart-1: 12 76% 61%;
    --chart-2: 173 58% 39%;
    --chart-3: 197 37% 24%;
    --chart-4: 43 74% 66%;
    --chart-5: 27 87% 67%;
    --radius: 0.5rem;
    --radius-md: calc(var(--radius) - 2px);
    --radius-sm: calc(var(--radius) - 4px);
  }
  .dark {
    --background: 0 0% 3.9%;
    --foreground: 0 0% 98%;
    --card: 0 0% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 0 0% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 0 0% 9%;
    --secondary: 0 0% 14.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 0 0% 14.9%;
    --muted-foreground: 0 0% 63.9%;
    --accent: 0 0% 14.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 14.9%;
    --input: 0 0% 14.9%;
    --ring: 0 0% 83.1%;
    --chart-1: 220 70% 50%;
    --chart-2: 160 60% 45%;
    --chart-3: 30 80% 55%;
    --chart-4: 280 65% 60%;
    --chart-5: 340 75% 55%;
  }
}
```
with:
```css
@layer base {
  :root {
    --background: 250 248 246;
    --foreground: 28 26 24;
    --card: 255 255 255;
    --card-foreground: 28 26 24;
    --popover: 255 255 255;
    --popover-foreground: 28 26 24;
    --primary: 217 119 87;
    --primary-foreground: 255 255 255;
    --secondary: 255 255 255;
    --secondary-foreground: 28 26 24;
    --muted: 255 255 255;
    --muted-foreground: 138 131 120;
    --accent: 217 119 87;
    --accent-foreground: 255 255 255;
    --destructive: 239 68 68;
    --destructive-foreground: 250 250 250;
    --border: 228 224 218;
    --input: 228 224 218;
    --ring: 217 119 87;
    --chart-1: 12 76% 61%;
    --chart-2: 173 58% 39%;
    --chart-3: 197 37% 24%;
    --chart-4: 43 74% 66%;
    --chart-5: 27 87% 67%;
    --radius: 0.5rem;
    --radius-md: calc(var(--radius) - 2px);
    --radius-sm: calc(var(--radius) - 4px);
  }
  .dark {
    --background: 11 11 12;
    --foreground: 237 237 239;
    --card: 20 20 22;
    --card-foreground: 237 237 239;
    --popover: 28 28 31;
    --popover-foreground: 237 237 239;
    --primary: 217 119 87;
    --primary-foreground: 11 11 12;
    --secondary: 20 20 22;
    --secondary-foreground: 237 237 239;
    --muted: 20 20 22;
    --muted-foreground: 139 139 147;
    --accent: 217 119 87;
    --accent-foreground: 11 11 12;
    --destructive: 127 29 29;
    --destructive-foreground: 250 250 250;
    --border: 42 42 46;
    --input: 42 42 46;
    --ring: 217 119 87;
    --chart-1: 220 70% 50%;
    --chart-2: 160 60% 45%;
    --chart-3: 30 80% 55%;
    --chart-4: 280 65% 60%;
    --chart-5: 340 75% 55%;
  }
}
```

- [ ] **Step 3: Verify**

Run: `npm run build`
Expected: succeeds (colors will look visually wrong/mixed until later tasks touch `.glass*`/`.gradient-bg`, which still reference the old hardcoded rgba values at this point — that's expected, not a bug in this task).

Run: `grep -n "^\s*--chart-1" app/globals.css` — expected: two matches (`:root` and `.dark`), values unchanged (`12 76% 61%` and `220 70% 50%`), confirming chart tokens were untouched.

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.ts app/globals.css
git commit -m "feat: switch color tokens to kickr-inspired palette (RGB-triplet format)"
```

---

### Task 2: Retire neobrutalism theme + THEME_STYLE

**Files:**
- Modify: `app/globals.css` (delete two blocks)
- Modify: `app/layout.tsx`
- Modify: `README.md`

**Interfaces:**
- Produces: no code path reads `process.env.THEME_STYLE`; no CSS selector references `.theme-neobrut`.

- [ ] **Step 1: Delete the first neobrut block from `app/globals.css`**

Delete this entire block in full (it currently sits between the `.glass-subtle`/`.dark .glass-subtle` rules and the `/* Custom dial animations */` comment):
```css
/* Neobrutalism theme overrides (inspired by https://www.neobrutalism.dev/) */
.theme-neobrut {
  /* Brighter palettes and stronger borders */
  --background: 54 100% 97%; /* light yellow background */
  --foreground: 0 0% 7%;
  --card: 54 100% 95%;
  --card-foreground: 0 0% 7%;
  --popover: 54 100% 96%;
  --popover-foreground: 0 0% 7%;
  --primary: 240 5% 15%; /* near-black for text and borders */
  --primary-foreground: 54 100% 97%;
  --secondary: 48 100% 90%;
  --secondary-foreground: 0 0% 7%;
  --muted: 48 100% 92%;
  --muted-foreground: 0 0% 20%;
  --accent: 270 100% 90%; /* violet */
  --accent-foreground: 0 0% 7%;
  --destructive: 0 100% 60%;
  --destructive-foreground: 54 100% 97%;
  --border: 240 5% 10%; /* black-ish */
  --input: 54 100% 92%;
  --ring: 240 5% 10%;
  --radius: 0.5rem;
  --radius-md: calc(var(--radius) - 2px);
  --radius-sm: calc(var(--radius) - 4px);
}

.theme-neobrut .glass,
.theme-neobrut .glass-strong,
.theme-neobrut .glass-subtle {
  background: hsl(var(--card));
  border: 3px solid hsl(var(--border));
  box-shadow: 6px 6px 0 hsl(var(--border));
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.theme-neobrut .glass-subtle {
  box-shadow: 4px 4px 0 hsl(var(--border));
}

.theme-neobrut .glass-strong {
  box-shadow: 8px 8px 0 hsl(var(--border));
}

.theme-neobrut .gradient-bg {
  background: repeating-linear-gradient(
    45deg,
    hsl(54 100% 95%),
    hsl(54 100% 95%) 10px,
    hsl(48 100% 92%) 10px,
    hsl(48 100% 92%) 20px
  );
}

.theme-neobrut .gradient-bg::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    radial-gradient(circle at 10px 10px, rgba(0,0,0,0.08) 1.5px, transparent 2px);
  background-size: 24px 24px;
  opacity: 0.4;
  mix-blend-mode: multiply;
}

/* Dark neobrut variant */
.dark.theme-neobrut {
  --background: 240 5% 10%;
  --foreground: 54 100% 97%;
  --card: 240 5% 13%;
  --card-foreground: 54 100% 97%;
  --border: 54 100% 97%;
  --muted: 240 5% 18%;
  --muted-foreground: 54 100% 90%;
}

.dark.theme-neobrut .glass,
.dark.theme-neobrut .glass-strong,
.dark.theme-neobrut .glass-subtle {
  background: hsl(var(--card));
  border: 3px solid hsl(var(--border));
  box-shadow: 6px 6px 0 hsl(var(--border));
}

```

- [ ] **Step 2: Delete the second neobrut block from `app/globals.css`**

Delete this entire block in full (the "Neobrutalist refinements" section near the end of the file):
```css
/* Neobrutalist refinements (CSS-only, backward compatible) */
/* Sharper radii for neobrut theme */
.theme-neobrut {
  --radius: 0.375rem; /* ~6px */
  --radius-md: calc(var(--radius) - 2px);
  --radius-sm: calc(var(--radius) - 4px);
}

/* Ensure larger utility radius is also slightly reduced */
.theme-neobrut .rounded-xl { border-radius: 0.625rem !important; }

/* Background: clean white with subtle grid and thick inner border */
.theme-neobrut .gradient-bg {
  background: #ffffff;
  position: relative;
}
.theme-neobrut .gradient-bg::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(to right, rgba(0,0,0,0.08) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(0,0,0,0.08) 1px, transparent 1px);
  background-size: 40px 40px, 40px 40px; /* grid size */
  mix-blend-mode: normal;
  opacity: 1;
}
.theme-neobrut .gradient-bg::after {
  content: '';
  position: absolute;
  inset: 8px; /* inner frame */
  border: 3px solid hsl(var(--border));
  pointer-events: none;
}

/* Buttons: slide-in hover with chunky shadow */
.theme-neobrut button:not(:disabled) {
  border: 3px solid hsl(var(--border));
  box-shadow: 8px 8px 0 hsl(var(--border));
  transform: translate(-3px, -3px);
  transition: transform 140ms cubic-bezier(.2,.8,.2,1), box-shadow 140ms ease, background-color 140ms ease, filter 140ms ease;
}
.theme-neobrut button:hover:not(:disabled) {
  transform: translate(0, 0);
  box-shadow: 6px 6px 0 hsl(var(--border));
}
.theme-neobrut button:active:not(:disabled) {
  transform: translate(1px, 1px);
  box-shadow: 5px 5px 0 hsl(var(--border));
}

/* Recharts: brutalist bars with thick outlines and crisp axes */
.theme-neobrut .recharts-wrapper rect { rx: 10px; ry: 10px; }
.theme-neobrut .recharts-wrapper rect[stroke] { stroke: hsl(var(--border)) !important; stroke-width: 3px !important; vector-effect: non-scaling-stroke; }
.theme-neobrut .recharts-wrapper .recharts-cartesian-grid line { stroke: rgba(0,0,0,0.25) !important; stroke-width: 1.5px; }
.theme-neobrut .recharts-wrapper .recharts-cartesian-axis-line,
.theme-neobrut .recharts-wrapper .recharts-cartesian-axis-tick-line { stroke: hsl(var(--border)) !important; stroke-width: 2px; }
.theme-neobrut .recharts-wrapper .recharts-text { fill: hsl(var(--primary)) !important; font-weight: 600; }
.theme-neobrut .recharts-wrapper g { transition: transform 120ms cubic-bezier(.2,.8,.2,1); }
.theme-neobrut .recharts-wrapper g:hover { transform: translate(-2px, -2px); }
```

- [ ] **Step 3: Remove `THEME_STYLE` branching from `app/layout.tsx`**

Replace:
```tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const themeStyle = (process.env.THEME_STYLE || 'glass').toLowerCase();
  const themeClass = themeStyle === 'glass' ? 'theme-glass' : 'theme-neobrut';
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} ${themeClass}`}>
```
with:
```tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
```

(`inter.className` here becomes `spaceGrotesk.className` in Task 5 — a later, separate edit to this same line.)

- [ ] **Step 4: Remove stale `THEME_STYLE` documentation from `README.md`**

Delete this block (currently inside the `.env.local` example, between the Challenge Configuration and GitHub Integration sections):
```
   
   # Theme
   THEME_STYLE=glass                                  # 'glass' (default) or 'neobrut'
```
(leave the surrounding `# Challenge Configuration` and `# GitHub Integration` sections' blank-line spacing as a single blank line between them.)

Delete this entire section:
```
### Theming
Set `THEME_STYLE` to switch the visual style:
```env
THEME_STYLE=glass     # Glassmorphism UI (default)
THEME_STYLE=neobrut   # Neobrutalist UI (alternative)
```

```
Delete this line from the "Environment Variables" section:
```
# Theme (server-side, not NEXT_PUBLIC_)
THEME_STYLE=glass                                  # 'glass' (default) or 'neobrut'

```
Delete this line from the "Environment Variables for Production" section:
```
THEME_STYLE=glass
```

- [ ] **Step 5: Verify**

Run: `grep -rn "THEME_STYLE\|theme-glass\|theme-neobrut" app components README.md`
Expected: no matches.

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 6: Commit**

```bash
git add app/globals.css app/layout.tsx README.md
git commit -m "feat: retire neobrutalism theme and THEME_STYLE switch"
```

---

### Task 3: Flat panels (`.glass`, `.glass-strong`, `.glass-subtle`)

**Files:**
- Modify: `app/globals.css`

**Interfaces:**
- Produces: `.glass`, `.glass-strong`, `.glass-subtle` render as flat opaque/semi-opaque bordered panels. No component markup changes (class names are reused as-is).

- [ ] **Step 1: Replace the glassmorphism rule block**

Replace:
```css
/* Enhanced Glassmorphism effects */
.glass {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
}

.dark .glass {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5);
}

.glass-strong {
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 12px 40px 0 rgba(31, 38, 135, 0.4);
}

.dark .glass-strong {
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 12px 40px 0 rgba(0, 0, 0, 0.6);
}

.glass-subtle {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 4px 24px 0 rgba(31, 38, 135, 0.2);
}

.dark .glass-subtle {
  background: rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 24px 0 rgba(0, 0, 0, 0.3);
}
```
with:
```css
/* Flat panels: opaque surface, thin border, no blur, no shadow.
   Same class names as before -- referencing them via the semantic
   background/border tokens means dark mode needs no separate override,
   the .dark token block already resolves them to the right color. */
.glass,
.glass-strong {
  background: rgb(var(--card));
  border: 1px solid rgb(var(--border));
}

.glass-subtle {
  background: rgb(var(--card) / 0.5);
  border: 1px solid rgb(var(--border) / 0.5);
}
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: succeeds.

Run: `grep -n "backdrop-filter" app/globals.css`
Expected: no matches (all blur removed).

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat: replace frosted-glass panels with flat opaque panels"
```

---

### Task 4: Gradient backdrop + grain

**Files:**
- Modify: `app/globals.css`
- Modify: `app/page.tsx`

**Interfaces:**
- Produces: `.gradient-bg` renders the two-pool radial gradient with grain (dark: `soft-light` @ 0.5 opacity; light: `multiply` @ 0.35 opacity). New `.grain-strong` utility class, applied to the challenge-complete card only.

- [ ] **Step 1: Replace `.gradient-bg` and its pseudo-element in `app/globals.css`**

Replace:
```css
/* Gradient backgrounds with film grain effect */
.gradient-bg {
  background: linear-gradient(135deg, 
    rgba(99, 102, 241, 0.1) 0%, 
    rgba(168, 85, 247, 0.1) 25%, 
    rgba(236, 72, 153, 0.1) 50%, 
    rgba(251, 146, 60, 0.1) 75%, 
    rgba(34, 197, 94, 0.1) 100%);
  position: relative;
}

.gradient-bg::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    radial-gradient(circle at 50% 50%, transparent 50%, rgba(255, 255, 255, 0.03) 50.5%, transparent 51%),
    radial-gradient(circle at 25% 25%, rgba(0, 0, 0, 0.02) 0%, transparent 50%),
    radial-gradient(circle at 75% 75%, rgba(255, 255, 255, 0.01) 0%, transparent 50%),
    radial-gradient(ellipse at 30% 70%, transparent 40%, rgba(0, 0, 0, 0.015) 40.5%, transparent 41%);
  background-size: 2px 2px, 3px 3px, 1px 1px, 4px 4px;
  opacity: 0.8;
  mix-blend-mode: multiply;
  pointer-events: none;
}

.dark .gradient-bg {
  background: linear-gradient(135deg, 
    rgba(99, 102, 241, 0.05) 0%, 
    rgba(168, 85, 247, 0.05) 25%, 
    rgba(236, 72, 153, 0.05) 50%, 
    rgba(251, 146, 60, 0.05) 75%, 
    rgba(34, 197, 94, 0.05) 100%);
}

.dark .gradient-bg::before {
  background-image: 
    radial-gradient(circle at 50% 50%, transparent 50%, rgba(255, 255, 255, 0.02) 50.5%, transparent 51%),
    radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.01) 0%, transparent 50%),
    radial-gradient(circle at 75% 75%, rgba(0, 0, 0, 0.03) 0%, transparent 50%),
    radial-gradient(ellipse at 30% 70%, transparent 40%, rgba(255, 255, 255, 0.008) 40.5%, transparent 41%);
  background-size: 1px 1px, 2px 2px, 3px 3px, 1.5px 1.5px;
  opacity: 0.6;
  mix-blend-mode: screen;
}
```
with:
```css
/* Backdrop: flat background with two soft radial gradient pools (warm
   accent top-left, cool blue bottom-right) plus a grain layer. Opaque
   flat panels sit on top -- the gradient/grain never shows through them. */
.gradient-bg {
  position: relative;
  background:
    radial-gradient(24rem 16rem at 10% -20%, color-mix(in oklab, rgb(var(--accent)) 20%, transparent), transparent 70%),
    radial-gradient(20rem 14rem at 100% 120%, color-mix(in oklab, #4a90d9 14%, transparent), transparent 70%),
    rgb(var(--background));
}

.dark .gradient-bg {
  background:
    radial-gradient(24rem 16rem at 10% -20%, color-mix(in oklab, rgb(var(--accent)) 26%, transparent), transparent 70%),
    radial-gradient(20rem 14rem at 100% 120%, color-mix(in oklab, #4a90d9 18%, transparent), transparent 70%),
    rgb(var(--background));
}

.gradient-bg::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  mix-blend-mode: multiply;
  opacity: 0.35;
}

.dark .gradient-bg::before {
  mix-blend-mode: soft-light;
  opacity: 0.5;
}

/* Stronger grain reserved for exactly one celebratory surface (the
   challenge-complete card) -- not used on regular panels. */
.grain-strong {
  position: relative;
  overflow: hidden;
}

.grain-strong::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  mix-blend-mode: multiply;
  opacity: 0.35;
}

.dark .grain-strong::after {
  mix-blend-mode: soft-light;
  opacity: 0.5;
}
```

- [ ] **Step 2: Apply `.grain-strong` to the challenge-complete card in `app/page.tsx`**

Find (search for `Challenge Complete!` — it's inside a `Card` a few lines above):
```tsx
        {challengeComplete && (
          <Card className="mb-6 md:mb-8 glass-strong border-green-500/20 max-w-4xl mx-auto">
```
Replace with:
```tsx
        {challengeComplete && (
          <Card className="mb-6 md:mb-8 glass-strong grain-strong border-green-500/20 max-w-4xl mx-auto">
```

- [ ] **Step 3: Verify**

Run: `npm run build`
Expected: succeeds.

Run: `grep -n "grain-strong" app/page.tsx app/globals.css`
Expected: one match in `app/page.tsx` (the challenge-complete `Card`), plus the class definition matches in `app/globals.css`.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css app/page.tsx
git commit -m "feat: replace multi-hue gradient backdrop with kickr-style gradient pools + grain"
```

---

### Task 5: Fonts (Space Grotesk + JetBrains Mono)

**Files:**
- Modify: `app/layout.tsx`
- Modify: `tailwind.config.ts`
- Modify: `components/CountUp.tsx`

**Interfaces:**
- Produces: `font-sans` Tailwind utility resolves to Space Grotesk; new `font-mono` utility resolves to JetBrains Mono. `CountUp`'s rendered number always uses `font-mono`.

- [ ] **Step 1: Swap the font loader in `app/layout.tsx`**

Replace:
```tsx
import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });
```
with:
```tsx
import './globals.css';
import type { Metadata } from 'next';
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
});
```

- [ ] **Step 2: Apply both font variables at the body level**

Replace (this is the `body` line already changed by Task 2 — it currently reads `inter.className`):
```tsx
      <body className={inter.className}>
```
with:
```tsx
      <body className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} font-sans`}>
```

- [ ] **Step 3: Wire the font variables into `tailwind.config.ts`**

In the `extend` object (alongside `backgroundImage`, `borderRadius`, `colors`), add a `fontFamily` key:
```ts
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
```
(Place it as a new top-level key inside `extend: { ... }`, e.g. right after the `backgroundImage` block.)

- [ ] **Step 4: Apply `font-mono` inside `CountUp`**

Replace:
```tsx
  return (
    <span>
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </span>
  )
```
with:
```tsx
  return (
    <span className="font-mono">
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </span>
  )
```

- [ ] **Step 5: Verify**

Run: `npm run build`
Expected: succeeds. Check the build output for two new font chunks (Space Grotesk + JetBrains Mono) instead of Inter's.

Run: `grep -n "Inter\b" app/layout.tsx`
Expected: no matches.

- [ ] **Step 6: Commit**

```bash
git add app/layout.tsx tailwind.config.ts components/CountUp.tsx
git commit -m "feat: swap Inter for Space Grotesk + add JetBrains Mono for numeric displays"
```

---

### Task 6: Dial color treatment + retire StarBorder

**Files:**
- Modify: `components/SquatDial.tsx`
- Delete: `components/StarBorder.tsx`

**Interfaces:**
- Consumes: `Button` from `@/components/ui/button` (already exists, `variant="default"` now resolves to the new flat accent-filled style via Task 1's `--primary` = `--accent`).
- Produces: dial renders accent color (`#d97757`) when adding, dedicated blue (`#4a90d9`) when removing. No change to any exported prop, function signature, or interaction behavior.

- [ ] **Step 1: Replace the SVG gradient defs and background-circle stroke**

Replace:
```tsx
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" style={{ pointerEvents: 'none' }}>
            <defs>
              {/* Purple gradient for positive progress */}
              <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f9a8d4" /> {/* from-pink-300 */}
                <stop offset="50%" stopColor="#c4b5fd" /> {/* via-purple-300 */}
                <stop offset="100%" stopColor="#818cf8" /> {/* to-indigo-400 */}
              </linearGradient>
              {/* Alternative gradient for better circular effect */}
              <linearGradient id="purpleGradientCircular" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f9a8d4" />
                <stop offset="33%" stopColor="#c4b5fd" />
                <stop offset="66%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#818cf8" />
              </linearGradient>
              {/* Orange to rose gradient for negative progress */}
              <linearGradient id="orangeRoseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#fb923c" /> {/* from-orange-400 */}
                <stop offset="100%" stopColor="#fb7185" /> {/* to-rose-400 */}
              </linearGradient>
            </defs>
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth="2"
              opacity="0.3"
            />
            {/* Progress circle */}
            {tempSquats !== 0 && (
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={isNegative ? 'url(#orangeRoseGradient)' : 'url(#purpleGradientCircular)'}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="282.7"
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 50 50)"
                className="transition-all duration-300 ease-out"
              />
            )}
          </svg>
```
with:
```tsx
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" style={{ pointerEvents: 'none' }}>
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="rgb(var(--border))"
              strokeWidth="2"
              opacity="0.3"
            />
            {/* Progress circle: accent when adding, dedicated blue when removing */}
            {tempSquats !== 0 && (
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={isNegative ? '#4a90d9' : '#d97757'}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="282.7"
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 50 50)"
                className="transition-all duration-300 ease-out"
              />
            )}
          </svg>
```

- [ ] **Step 2: Replace the center-number color and add `font-mono`**

Replace:
```tsx
            <div 
              className={`absolute inset-0 flex items-center justify-center ${compact ? 'text-4xl' : 'text-4xl sm:text-5xl md:text-6xl'} font-bold ${isNegative ? 'text-destructive' : 'text-foreground'}`}
              style={{
                transform: `rotate(${-dialRotation}deg)`, // Counter-rotate to keep number upright
              }}
            >
              {tempSquats > 0 ? `+${tempSquats}` : tempSquats}
            </div>
```
with:
```tsx
            <div 
              className={`absolute inset-0 flex items-center justify-center font-mono ${compact ? 'text-4xl' : 'text-4xl sm:text-5xl md:text-6xl'} font-bold`}
              style={{
                transform: `rotate(${-dialRotation}deg)`, // Counter-rotate to keep number upright
                color: isNegative ? '#4a90d9' : 'rgb(var(--foreground))',
              }}
            >
              {tempSquats > 0 ? `+${tempSquats}` : tempSquats}
            </div>
```

- [ ] **Step 3: Replace the circular indicator's inline gradient**

Replace:
```tsx
                style={{ 
                  background: isNegative ? 'linear-gradient(135deg, #fb923c 0%, #fb7185 100%)' : 'linear-gradient(135deg, #f9a8d4 0%, #c4b5fd 50%, #818cf8 100%)',
                }}
```
with:
```tsx
                style={{ 
                  background: isNegative ? '#4a90d9' : '#d97757',
                }}
```

- [ ] **Step 4: Replace the "Removing/Adding" status text color**

Replace:
```tsx
        {tempSquats !== 0 && (
          <p className={`${compact ? 'text-sm' : 'text-base'} ${isNegative ? 'text-destructive' : 'text-green-600 dark:text-green-400'} mt-2`}>
            {isNegative ? `Removing ${Math.abs(tempSquats)} ${exerciseLabel.toLowerCase()}` : `Adding ${tempSquats} ${exerciseLabel.toLowerCase()}`}
          </p>
        )}
```
with:
```tsx
        {tempSquats !== 0 && (
          <p
            className={`${compact ? 'text-sm' : 'text-base'} mt-2`}
            style={{ color: isNegative ? '#4a90d9' : '#d97757' }}
          >
            {isNegative ? `Removing ${Math.abs(tempSquats)} ${exerciseLabel.toLowerCase()}` : `Adding ${tempSquats} ${exerciseLabel.toLowerCase()}`}
          </p>
        )}
```

- [ ] **Step 5: Replace the `StarBorder` Bank button with the standard `Button`**

Replace the import:
```tsx
import StarBorder from './StarBorder';
```
with:
```tsx
import { Button } from './ui/button';
```

Replace:
```tsx
      {/* Bank Button with StarBorder */}
      <StarBorder
        as="button"
        className={`${compact ? 'w-48 h-12' : 'w-52 h-12 sm:w-56 sm:h-12 md:w-64 md:h-14'} ${!canBankSquats ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        color="cyan"
        speed="5s"
        onClick={bankSquats}
        disabled={!canBankSquats}
      >
        <span className={`${compact ? 'text-base' : 'text-base sm:text-lg md:text-lg'} font-medium`}>
          {isNegative ? `Remove ${exerciseLabel}` : isTargetReached ? (targetSquats === 0 ? 'Enjoying Rest Day' : 'Target Reached!') : `Bank ${exerciseLabel}`}
        </span>
      </StarBorder>
```
with:
```tsx
      {/* Bank Button */}
      <Button
        className={`${compact ? 'w-48 h-12' : 'w-52 h-12 sm:w-56 sm:h-12 md:w-64 md:h-14'} ${compact ? 'text-base' : 'text-base sm:text-lg md:text-lg'} font-medium rounded-full`}
        onClick={bankSquats}
        disabled={!canBankSquats}
      >
        {isNegative ? `Remove ${exerciseLabel}` : isTargetReached ? (targetSquats === 0 ? 'Enjoying Rest Day' : 'Target Reached!') : `Bank ${exerciseLabel}`}
      </Button>
```
(The shadcn `Button`'s own `disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed` classes already cover what the old inline `opacity-50 cursor-not-allowed` conditional did — no need to reproduce that conditional manually.)

- [ ] **Step 6: Verify no other file imports `StarBorder`, then delete it**

Run: `grep -rln "StarBorder" app components --include="*.tsx"`
Expected: only `components/SquatDial.tsx` (the import you just replaced) — if it still appears, the `Step 5` edit didn't take; if any *other* file appears, stop and report back rather than deleting the component.

Delete the file: `components/StarBorder.tsx`

- [ ] **Step 7: Verify**

Run: `npm run build`
Expected: succeeds, no "module not found" errors for `StarBorder`.

Run: `npx tsc --noEmit`
Expected: no new errors introduced by this task (pre-existing unrelated `components/ui/chart.tsx` errors, if any, are not in scope).

- [ ] **Step 8: Commit**

```bash
git add components/SquatDial.tsx
git rm components/StarBorder.tsx
git commit -m "feat: dial uses accent/blue color treatment, retire StarBorder for flat Button"
```

---

### Task 7: Restyle `ShinyText`

**Files:**
- Modify: `components/ShinyText.tsx`

**Interfaces:**
- Consumes/Produces: same props (`text`, `disabled`, `speed`, `className`) and same default export — both existing call sites (`app/page.tsx`, `components/PreChallengeWelcome.tsx`) need no changes.

- [ ] **Step 1: Replace the component body**

Replace the full file content:
```tsx
import React, { useEffect, useState } from 'react';

interface ShinyTextProps {
    text: string;
    disabled?: boolean;
    speed?: number;
    className?: string;
}

const ShinyText: React.FC<ShinyTextProps> = ({ text, disabled = false, speed = 5, className = '' }) => {
    const [isShining, setIsShining] = useState(false);

    useEffect(() => {
        // Inject custom animation styles
        const styleId = 'shiny-text-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                @keyframes customShine {
                    0% {
                        background-position: 200% 0;
                    }
                    40% {
                        background-position: -200% 0;
                    }
                    100% {
                        background-position: -200% 0;
                    }
                }
                .custom-shine-animation {
                    animation: customShine 4s linear;
                }
            `;
            document.head.appendChild(style);
        }
    }, []);

    useEffect(() => {
        if (disabled) return;

        const scheduleNextShine = () => {
            // Random interval between 5-10 seconds (5000-10000ms)
            const randomDelay = Math.random() * 5000 + 5000;
            
            setTimeout(() => {
                setIsShining(true);
                
                // Remove the animation after it completes (4 seconds)
                setTimeout(() => {
                    setIsShining(false);
                    // Schedule the next shine
                    scheduleNextShine();
                }, 4000);
            }, randomDelay);
        };

        // Start the first shine cycle
        scheduleNextShine();
    }, [disabled]);

    return (
        <div
            className={`inline-block ${isShining ? 'custom-shine-animation' : ''} ${className}`}
            style={{
                backgroundImage: disabled 
                    ? 'none'
                    : 'linear-gradient(110deg, hsl(var(--muted-foreground)) 45%, #fff 55%, hsl(var(--muted-foreground)) 65%)',
                backgroundSize: '200% 100%',
                WebkitBackgroundClip: disabled ? 'initial' : 'text',
                backgroundClip: disabled ? 'initial' : 'text',
                WebkitTextFillColor: disabled ? 'hsl(var(--muted-foreground))' : 'transparent',
                color: disabled ? 'hsl(var(--muted-foreground))' : 'transparent',
            }}
        >
            {text}
        </div>
    );
};

export default ShinyText; 
```
with:
```tsx
import React, { useEffect, useState } from 'react';

interface ShinyTextProps {
    text: string;
    disabled?: boolean;
    speed?: number;
    className?: string;
}

const ShinyText: React.FC<ShinyTextProps> = ({ text, disabled = false, speed = 5, className = '' }) => {
    const [isShining, setIsShining] = useState(false);

    useEffect(() => {
        // Inject custom animation styles
        const styleId = 'shiny-text-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                @keyframes customShine {
                    0% {
                        background-position: 200% 0;
                    }
                    100% {
                        background-position: -80% 0;
                    }
                }
                .custom-shine-animation {
                    animation: customShine 2.4s ease-in-out;
                }
                @media (prefers-reduced-motion: reduce) {
                    .custom-shine-animation {
                        animation: none;
                        background-position: 100% 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }, []);

    useEffect(() => {
        if (disabled) return;

        const scheduleNextShine = () => {
            // Random interval between 5-10 seconds (5000-10000ms)
            const randomDelay = Math.random() * 5000 + 5000;
            
            setTimeout(() => {
                setIsShining(true);
                
                // Remove the animation after it completes (2.4 seconds)
                setTimeout(() => {
                    setIsShining(false);
                    // Schedule the next shine
                    scheduleNextShine();
                }, 2400);
            }, randomDelay);
        };

        // Start the first shine cycle
        scheduleNextShine();
    }, [disabled]);

    return (
        <div
            className={`inline-block ${isShining ? 'custom-shine-animation' : ''} ${className}`}
            style={{
                backgroundImage: disabled 
                    ? 'none'
                    : 'linear-gradient(100deg, rgb(var(--foreground)) 40%, #d97757 50%, rgb(var(--foreground)) 60%)',
                backgroundSize: '250% 100%',
                WebkitBackgroundClip: disabled ? 'initial' : 'text',
                backgroundClip: disabled ? 'initial' : 'text',
                WebkitTextFillColor: disabled ? 'rgb(var(--muted-foreground))' : 'transparent',
                color: disabled ? 'rgb(var(--muted-foreground))' : 'transparent',
            }}
        >
            {text}
        </div>
    );
};

export default ShinyText; 
```

(This ports kickr's `.shimmer` sweep — a single ease-in-out pass across `foreground` → accent-tinted highlight → `foreground`, `background-size: 250%` for a longer sweep distance, plus a `prefers-reduced-motion` fallback that kickr's own `.shimmer` has and the original component lacked — rather than the original's linear 3-keyframe loop-in-a-loop.)

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: succeeds.

Run: `grep -n "hsl(var" components/ShinyText.tsx`
Expected: no matches.

- [ ] **Step 3: Commit**

```bash
git add components/ShinyText.tsx
git commit -m "feat: restyle ShinyText shimmer using kickr's technique"
```

---

### Task 8: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full build + typecheck**

Run: `npm run build`
Expected: succeeds, all routes compile.

Run: `npx tsc --noEmit`
Expected: no new errors versus the pre-existing baseline (check `git stash` + re-run if unsure what's pre-existing vs newly introduced).

Run: `npm test`
Expected: `lib/challenge.test.ts` and `lib/exercises.test.ts` still pass (7/7) — this branch touches no logic they cover, so this is a regression guard, not new coverage.

- [ ] **Step 2: Confirm complete removal of retired systems**

Run: `grep -rn "THEME_STYLE\|theme-glass\|theme-neobrut\|StarBorder" app components README.md --include="*.tsx" --include="*.ts" --include="*.md"`
Expected: no matches.

Run: `grep -rn "hsl(var(--" app components --include="*.tsx" --include="*.ts"`
Expected: no matches (every direct `hsl(var(--x))` usage outside the now-deleted neobrut block and the intentionally-untouched `--chart-N` tokens has been migrated to `rgb(var(--x))`).

- [ ] **Step 3: Confirm `destructive` still renders as a warning red, not blue**

Run: `grep -n "^\s*--destructive:" app/globals.css`
Expected: `--destructive: 239 68 68;` (light) and `--destructive: 127 29 29;` (dark) — both red, not `74 144 217` (the dial's blue).

- [ ] **Step 4: Manual browser check (human, not a subagent)**

Start the dev server (`npm run dev`) and check:
1. Dial drags and counts correctly in both directions; adding shows the accent (terracotta) ring/number, removing shows blue — geometry/responsiveness feel identical to before.
2. Toggle light/dark mode — both look like the approved mockups (flat panels, gradient pools, grain visible on the backdrop).
3. Trigger an auth error in `AuthModal` (e.g. submit an invalid code) — the error `Alert` is still red, not blue or orange.
4. Reach the challenge-complete state (or temporarily inspect it in dev tools) — grain is visible on that card specifically, not on every card.
5. Check the leaderboard and stats overview — numbers render in the new mono font.
6. Confirm no visual trace of the old bold-border neobrutalist look anywhere.

## Self-Review

- **Spec coverage:** RGB-triplet token migration (T1) ✓; destructive-preserving-color (T1, T8) ✓; neobrut + THEME_STYLE retirement (T2) ✓; flat panels (T3) ✓; gradient pools + restrained grain, incl. the challenge-complete-only `.grain-strong` (T4) ✓; Space Grotesk + JetBrains Mono, scoped to dial number + CountUp only (T5, T6) ✓; dial accent/blue treatment with interaction code untouched (T6) ✓; StarBorder retirement (T6) ✓; ShinyText restyle (T7) ✓; manual verification incl. colorblind-safety-relevant dial check and destructive-stays-red check (T8) ✓.
- **Placeholder scan:** none — every step contains complete, exact code (no "similar to above," no TBD values).
- **Type consistency:** `SquatDial`'s prop interface (`onSquatsChange`, `currentSquats`, `targetSquats`, `currentDay`, `compact`, `hideTip`, `exerciseLabel`) is untouched by Task 6; `CountUp`'s prop interface is untouched by Task 5; `ShinyText`'s prop interface is untouched by Task 7 — all three are pure internal-implementation edits, consistent with the design's "no component API changes" intent.
