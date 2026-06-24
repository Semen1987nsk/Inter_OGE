# Task 15 Report: Visual Baseline + axe A11y E2E

## Status: DONE

## Screenshots Generated (win32 baselines)

3 baselines in `experiments/home/e2e/visual-regression.spec.ts-snapshots/`:
- `wall-default-1440-chromium-win32.png` — poster wall at 1440×900
- `wall-drawer-open-chromium-win32.png` — drawer open (first poster clicked)
- `wall-mobile-390-chromium-win32.png` — mobile 390×844 (1 column)

Caveat: win32-only baselines. CI on Linux will differ — known, accepted.

## Axe Result

Initial run found **3 violation types** (critical + serious). All fixed in source:

### 1. `aria-required-children` (critical) — `role="grid"` with `role="button"` children
**Fix**: `experiments/home/src/main.ts` — changed `role="grid"` → `role="group"` on `.poster-grid`.  
Also updated `experiments/home/e2e/home.spec.ts` selector: `[role=grid]` → `[role=group][aria-label]`.

### 2. `invalidrole` / `aria-roles` (critical) — `<role-switch role="student">` invalid ARIA role
**Fix**: `experiments/home/src/components/role-switch.ts` — changed `observedAttributes` and `getAttribute` from `'role'` to `'data-role'`.  
Also updated `experiments/home/src/main.ts` — `roleSwitch.setAttribute('role', ...)` → `setAttribute('data-role', ...)`.  
Also removed redundant `role="searchbox"` from the search `<input type="search">` (implicit role).

### 3. `color-contrast` (serious) — multiple elements below 4.5:1
- **Filter legend** (`#616870` on `#0c1623` = 3.22:1): fixed in `experiments/home/src/styles/home.css` — opacity `0.35` → `0.65`.
- **`.launch-link`** in drawer (`#7eb3ff` on blended bg ≈ 3.93:1): fixed in `experiments/home/src/components/kit-drawer.ts` — color `#7eb3ff` → `#a0c4ff`.
- **`.exp-item--planned`** opacity animation (`opacity: 0.45` made text effectively ~1:1 contrast): fixed in `kit-drawer.ts` — removed full-element `opacity: 0.45`, replaced with background/border muting only; fixed `fade-in` animation endpoint from 0.45 → 1.0.

**A11y drawer test**: required adding `page.emulateMedia({ reducedMotion: 'reduce' })` before `goto` — CSS animations caused axe to catch elements mid-fade (opacity 0→1 over 350ms). With `prefers-reduced-motion: reduce`, the `@media (prefers-reduced-motion: no-preference)` animation block is skipped, elements render at full opacity immediately.

## E2E Run Output

```
11 passed (10.3s)
  ok  1 [chromium] › e2e/a11y.spec.ts:25:1 › A11Y: главная страница — 0 violations (WCAG 2.2 AA)
  ok  2 [chromium] › e2e/a11y.spec.ts:32:1 › A11Y: drawer открыт — 0 violations (WCAG 2.2 AA)
  ok  3-8 [chromium] › e2e/home.spec.ts (all 6 existing tests)
  ok  9 [chromium] › e2e/visual-regression.spec.ts:17:1 › VISUAL: постер-стена default 1440×900
  ok 10 [chromium] › e2e/visual-regression.spec.ts:30:1 › VISUAL: drawer открыт — первый постер
  ok 11 [chromium] › e2e/visual-regression.spec.ts:45:1 › VISUAL: мобайл 1 колонка 390×844
```

## Files Created/Modified

- `experiments/home/e2e/visual-regression.spec.ts` — NEW
- `experiments/home/e2e/a11y.spec.ts` — NEW  
- `experiments/home/e2e/visual-regression.spec.ts-snapshots/wall-default-1440-chromium-win32.png` — NEW
- `experiments/home/e2e/visual-regression.spec.ts-snapshots/wall-drawer-open-chromium-win32.png` — NEW
- `experiments/home/e2e/visual-regression.spec.ts-snapshots/wall-mobile-390-chromium-win32.png` — NEW
- `experiments/home/e2e/home.spec.ts` — MODIFIED (selector `[role=grid]` → `[role=group][aria-label]`)
- `experiments/home/src/main.ts` — MODIFIED (role="grid"→"group", role="student"→data-role, removed role="searchbox")
- `experiments/home/src/components/role-switch.ts` — MODIFIED (observedAttributes: 'role'→'data-role')
- `experiments/home/src/components/kit-drawer.ts` — MODIFIED (exp-item--planned: opacity removed; launch-link color; fade-in endpoint)
- `experiments/home/src/styles/home.css` — MODIFIED (legend contrast 0.35→0.65 opacity)

## Concerns

None blocking. The visual baselines are win32-only; if CI runs on Linux, visual regression tests will fail. This is expected and documented in the spec file header.
