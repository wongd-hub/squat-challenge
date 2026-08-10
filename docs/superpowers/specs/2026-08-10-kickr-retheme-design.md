# Kickr-Inspired Retheme — Design

**Date:** 2026-08-10
**Branch:** `feature/kickr-retheme` (off `main`)
**Status:** Approved design, pending spec review

## Goal

Fully retheme the app to a Claude/Raycast-inspired flat aesthetic with grainy gradient
highlights, borrowing the design language directly from the sibling project
`/Users/darrenwong/Documents/Projects/kickr` (`src/styles/theme.css`, `src/ui/tokens.ts`,
`src/ui/components/{Button,Panel}.tsx`). Retire the neobrutalist theme. Preserve the
`SquatDial` component's interaction logic exactly as-is — only its color values change.

## Background / current state

- Next.js 15 app, Tailwind CSS v3 (config-based, `tailwind.config.ts`) with the standard
  shadcn/ui token architecture: semantic color tokens (`background`, `foreground`, `card`,
  `border`, `muted`, `accent`, `destructive`, etc.) defined as **HSL-triplet** CSS custom
  properties in `app/globals.css` (`:root` / `.dark`), consumed via `hsl(var(--x))` in
  `tailwind.config.ts`.
- Two existing visual themes coexist behind a `THEME_STYLE` env var (default `glass`):
  glassmorphism (`.glass`, `.glass-strong`, `.glass-subtle` — frosted blur panels) and
  neobrutalism (`.theme-neobrut` — bold borders, hard drop shadows, bright palette).
  `app/layout.tsx` picks the theme class at the `<body>` level.
- `.gradient-bg` (applied to the root layout wrapper) is a multi-hue linear gradient with a
  faint procedural noise `::before` layer — the current "atmosphere" treatment.
- Font: `Inter` via `next/font/google`, applied at the `<body>` level. No mono font.
- `components/SquatDial.tsx` implements the drag-to-count dial: pointer-event geometry math
  (`getAngleFromPoint`, `getBoundingClientRect`), a `transform: rotate()`-driven inner disc,
  `contain`/`willChange` performance hints, and hardcoded inline SVG `<linearGradient>`
  stops (`purpleGradientCircular` for adding, `orangeRoseGradient` for removing) plus two
  Tailwind literal-utility color spots (`text-destructive` for the center number and status
  text when removing). None of the interaction/geometry code touches color.
- `text-destructive` / `Alert variant="destructive"` are genuinely used elsewhere for error
  states (`components/AuthModal.tsx` auth failures, `components/ui/form.tsx` validation) —
  this token cannot be repointed to a non-red color without breaking those.
- `StarBorder` (animated glowing border button) is used in exactly one place: the dial's
  Bank/Remove button in `SquatDial.tsx`. `ShinyText` (shimmer text effect) is used in two
  places: `app/page.tsx` and `components/PreChallengeWelcome.tsx`. `CountUp` (animated
  number counter) is used in two places: `components/StatsOverview.tsx` and
  `components/LeaderboardPreview.tsx`.

## Kickr's design language (source of truth for values)

From `src/styles/theme.css`:
- Fonts: Space Grotesk (400/500/700) for display/body, JetBrains Mono (400/500) for
  monospace, loaded as static `@fontsource` imports there — in this Next.js app, loaded
  instead via `next/font/google` (self-hosted, matches the existing `Inter` pattern).
- Dark palette: `bg #0b0b0c`, `surface #141416`, `raised #1c1c1f`, `border #2a2a2e`,
  `text #ededef`, `muted #8b8b93`, `accent #d97757` (warm terracotta).
- Backdrop: a fixed near-black base with two soft, heavily-blurred radial gradient pools —
  warm (`accent`) from the top-left, cool (`#4a90d9`, unnamed second pool color) from the
  bottom-right — sitting behind opaque flat panels.
- Grain: a reusable SVG fractal-noise data-URI tile applied via a pseudo-element,
  `soft-light` blend mode, used sparingly (page backdrop + one celebratory panel variant),
  explicitly *not* applied everywhere ("reads as characterful on first sight reads as dirty
  by the twentieth run").
- Components stay flat: `Panel.tsx` is a bordered, opaque, non-blurred surface; `Button.tsx`
  is bordered/flat with a filled-accent primary variant (`bg-accent ... text-bg`) and no
  glow/animation.

## Chosen approach: token-value swap, not a component rewrite

Redefine what the existing semantic tokens and class names (`background`, `card`, `border`,
`.glass*`, `.gradient-bg`) resolve to, rather than renaming tokens or rewriting component
classNames. Because nearly every component already consumes these tokens rather than
hardcoded colors, the entire visual transformation is achievable by editing
`app/globals.css`, `tailwind.config.ts`, and `app/layout.tsx` — almost no component files
change. `SquatDial.tsx` needs only its handful of hardcoded inline colors swapped; its
geometry/interaction code is never touched.

Rejected alternatives: renaming tokens to match kickr's own names (touches 20+ files
including every shadcn primitive, for no user-visible benefit, more risk to the dial);
migrating to Tailwind v4 to match kickr's build tooling (unrelated infrastructure churn —
the ask is the look, not the toolchain).

## Requirements (resolved with user, via visual companion + terminal Q&A)

1. **Accent color**: kickr's own `#d97757`, unchanged between light and dark mode.
2. **Light and dark modes both supported** (not dark-only like kickr) — light follows the
   same recipe (flat surfaces, same accent, gradient pools + grain), validated visually
   rather than assumed, since kickr never built a light variant.
3. **Light-mode atmosphere is "bold"**: same grain opacity treatment as dark (via
   `multiply` blend instead of `soft-light`, tuned for a light base — see below) and
   clearly visible (not barely-there) gradient pools.
4. **Dial "removing" color**: a dedicated blue (`#4a90d9`, reusing the backdrop's cool pool
   color) rather than introducing a third hue. Explicitly chosen over a muted rose
   alternative for color-vision-deficiency safety — red-green color blindness (the most
   common form) collapses orange and rose into similar-looking tones, which would defeat
   the purpose of using color to distinguish add/remove at a glance. Orange-vs-blue stays
   reliably distinguishable for the vast majority of colorblind users.
5. **Neobrutalism theme: retired entirely**, along with the `THEME_STYLE` env-based theme
   switch. One theme going forward.
6. **Mono font (JetBrains Mono) scope**: the dial's center number, stat-card/`CountUp`
   values, and leaderboard numbers. Not applied to body text or digits in flowing prose.

## Data model changes

None — this is a pure frontend styling change. No database, API, or data-shape changes.

## Token values

Switching the CSS custom property format from **HSL-triplet** to **RGB-triplet**
(`--background: 11 11 12` wrapped as `rgb(var(--background) / <alpha-value>)` in
`tailwind.config.ts`, replacing every `hsl(var(--x))` wrapper). This makes every value an
exact, lossless conversion from kickr's hex codes — no manual HSL rounding — while
preserving Tailwind's opacity-modifier syntax (`bg-card/50`, etc.) that the codebase
already relies on in places.

| Token | Dark (hex → rgb triplet) | Light (hex → rgb triplet) |
|---|---|---|
| `background` | `#0b0b0c` → `11 11 12` | `#faf8f6` → `250 248 246` |
| `card` / `muted` / `secondary` / `popover` (flat panel surface) | `#141416` → `20 20 22` | `#ffffff` → `255 255 255` |
| `foreground` | `#ededef` → `237 237 239` | `#1c1a18` → `28 26 24` |
| `muted-foreground` | `#8b8b93` → `139 139 147` | `#8a8378` → `138 131 120` |
| `border` / `input` | `#2a2a2e` → `42 42 46` | `#e4e0da` → `228 224 218` |
| `accent` / `primary` | `#d97757` → `217 119 87` | `#d97757` → `217 119 87` |
| `accent-foreground` / `primary-foreground` | `#0b0b0c` → `11 11 12` | `#ffffff` → `255 255 255` |
| `ring` | same as `accent` | same as `accent` |
| `destructive` / `destructive-foreground` | **unchanged** — stays the existing warning red; still used by `AuthModal` and `form.tsx` for genuine error states | unchanged |

`--radius` (`0.5rem`) is unchanged — it already matches kickr's `rounded-lg`. The
neobrut-specific sharper-radius override is deleted along with the rest of `.theme-neobrut`.

`--primary` is set equal to `--accent` (kickr has one accent concept, not two) so every
existing shadcn `Button` `default` variant — used elsewhere in the app beyond the dial —
automatically becomes the new flat accent button, without touching those call sites.

Chart tokens (`--chart-1..5`) are out of scope for this pass — the recharts styling in the
neobrut block is deleted with the rest of that theme, and chart colors are left as their
current values (a separate, later concern if the chart needs its own retheme pass).

## Component mapping

- **`.glass`, `.glass-strong`, `.glass-subtle`** (in `app/globals.css`): class names are
  unchanged (zero component files touched — every existing `className="glass-strong"`
  etc. keeps working). Their rule bodies change from frosted-blur (`backdrop-filter: blur`,
  translucent background) to flat opaque panels: `background: rgb(var(--card))`,
  `border: 1px solid rgb(var(--border))`, no blur, no heavy box-shadow (kickr panels use
  only a thin border, no shadow).
- **`.gradient-bg`**: becomes the two-pool radial gradient over the flat `background` —
  warm `accent` pool top-left, cool `#4a90d9` pool bottom-right, both via
  `color-mix(in oklab, ...)` matching kickr's exact technique, with light/dark-appropriate
  opacity (dark: 26%/18% mix; light: 20%/14% mix, per the "bold" light treatment).
- **Grain**: kickr's SVG fractal-noise data-URI ported byte-for-byte as new `.grain` /
  `.grain-strong` utility classes (`::after` pseudo-element). Applied to the `.gradient-bg`
  backdrop layer (dark: `soft-light` blend @ 0.5 opacity; light: `multiply` blend @ 0.35
  opacity), plus `.grain-strong` on exactly one other surface: the challenge-complete card
  (the "you finished the whole challenge" state in `app/page.tsx`) — a true once-per-run
  event, not the daily "target reached" state, which happens every day someone hits their
  target and would violate kickr's own stated restraint principle ("characterful on first
  sight reads as dirty by the twentieth run") if grain were applied there instead. No other
  panels get grain.
- **Neobrut retirement**: delete `.theme-neobrut`, `.dark.theme-neobrut`, and every
  `.theme-neobrut ...` override block in `app/globals.css` (recharts styling, button
  hover/active transforms, gradient-bg grid override, sharper radius). Delete the
  `THEME_STYLE` env read and `themeClass` branching in `app/layout.tsx` — the body just
  applies the one theme unconditionally (dark/light still toggles via the existing
  `next-themes` `.dark` class mechanism, untouched).

## Fonts

`app/layout.tsx`: replace the `Inter` `next/font/google` call with `Space_Grotesk`
(weights 400/500/700, matching kickr's loaded weights), and add a second `next/font/google`
call for `JetBrains_Mono` (weights 400/500). Both exposed as CSS variables
(`--font-sans`, `--font-mono`) and wired into `tailwind.config.ts`'s `fontFamily.sans` /
`fontFamily.mono`. Apply `font-mono` directly inside the shared `CountUp` component (covers
both approved surfaces — `StatsOverview` and `LeaderboardPreview` — from one edit) and to
`SquatDial`'s center-number element.

## Dial-specific changes (`components/SquatDial.tsx`)

Only inline color values change:
- The two SVG `<linearGradient>` defs (`purpleGradient`, `purpleGradientCircular`,
  `orangeRoseGradient`) are replaced with two solid-color (non-gradient, or a subtle
  single-hue gradient) treatments: `accent` (`#d97757`) for adding, the dedicated dial-remove
  blue (`#4a90d9`) for removing.
- The small circular indicator's inline `background: linear-gradient(...)` gets the same
  two-color treatment.
- The two `text-destructive` utility usages (center number, "Removing N reps" status text)
  are replaced with the dial's own inline blue — **not** a repoint of the shared
  `destructive` token, since that token is genuinely used for unrelated error states
  elsewhere (`AuthModal`, `form.tsx`) and must stay red.
- `StarBorder` is removed from the Bank button; the button switches to the standard shadcn
  `Button` component (`variant="default"`, i.e. the new flat filled-accent style), matching
  the site-wide button treatment everywhere else. `StarBorder`'s only other consumer is
  none (confirmed single usage) — the component file itself can be deleted once its one
  call site is migrated.
- No changes to `getAngleFromPoint`, `handleStart/Move/End`, `calculateSquats`, rotation
  math, sizing classes (`dialSize`/`innerDialSize`), or any `contain`/`willChange`/
  `touchAction` performance/interaction hints.

## `ShinyText` restyle

`components/ShinyText.tsx`'s current shimmer implementation is restyled to use kickr's
`.shimmer` technique (a text-clipped gradient sweep: `foreground` → accent-tinted highlight
→ `foreground`, animated once via `background-position`, respecting
`prefers-reduced-motion`) instead of its current gradient/animation values. Both existing
call sites (`app/page.tsx`, `PreChallengeWelcome.tsx`) are unaffected code-wise — only the
shared component's internal styling changes.

## Testing / verification

No new automated tests (this is a pure CSS/token/font change with no new logic to unit
test — the existing `lib/challenge.test.ts` / `lib/exercises.test.ts` suite is unaffected
and should still pass). Verification is manual + build-based:

1. `npm run build` passes after every task.
2. Manual check in both light and dark mode: dial drag-to-count still works (add and
   remove), colors match the approved mockups, no layout/sizing regression in the dial's
   circular geometry.
3. Manual check that `AuthModal`'s error `Alert` and form validation errors still render
   red (confirming `destructive` was not accidentally repointed).
4. Manual check of the leaderboard, stats overview, and challenge-complete/celebratory
   states for the mono-font application and (where present) the grain treatment.
5. Confirm neobrut is fully gone — no `THEME_STYLE` references remain, no visual trace of
   the old bold-border look.

## Success criteria

1. The app looks and feels like the kickr reference (flat panels, near-black/warm-white
   surfaces, warm/cool gradient-pool backdrop, restrained grain, Space Grotesk + JetBrains
   Mono) in both light and dark mode.
2. The dial drags, counts, and banks exactly as before — only its colors changed.
3. No neobrutalism code or `THEME_STYLE` switch remains.
4. `destructive`-driven error UI (auth, form validation) is still visually red.
5. `npm run build` passes.
