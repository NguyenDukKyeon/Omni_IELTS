# Focus Dock visual QA

## Target and captures

- Source target: `.impeccable/mocks/approved/focus-dock-app-shell.png` and the Product Owner's supplied dashboard crops.
- Desktop capture: `.impeccable/review/focus-dock-desktop-1440.png` at 1440 × 900.
- Mobile capture: `.impeccable/review/focus-dock-mobile.png` at the Pixel 7 project viewport.
- Comparison artifact: `.impeccable/review/focus-dock-comparison.png`.

## Checked composition

- Desktop preserves the Focus Dock hierarchy: compact left rail, bounded task canvas, and three independent right-rail cards for due work, recent evidence, and resumable learning.
- The Daily Coach plan uses white task rows separated by hairlines, rather than nested grey cards. Its deadline footer is a distinct cool surface.
- Mobile preserves header controls, a compact focus card, a real due-work summary immediately after it, and the five-destination navigation bar.
- Regional surfaces are intentionally distinct: cool outer ground, white main canvas, near-white navigation and evidence dock, and a pale red due state.

## Truthfulness checks

- The priority meter is derived from actual due work (`6 / 10`) rather than a fabricated skill percentage.
- The current evidence state says `Chưa đủ bằng chứng` when no valid independent or mock evidence exists.
- The resumable Media card is shown only from an actual unfinished Media session.

## Intentional source differences

- The source mock's sample Band score, percentage, recent-attempt timestamps, and device bezel are not reproduced as product facts or app-owned UI.
- Actual learner state determines the Daily Coach title and counts; this capture therefore shows due mistake review rather than a fabricated Reading attempt.

## Result

final result: passed

The rendered composition, regional colour system, responsive order, controls, and truthful learner-state substitutions meet the approved Focus Dock direction. Deterministic desktop/mobile E2E and accessibility coverage passed in `npm run check:beta`.
