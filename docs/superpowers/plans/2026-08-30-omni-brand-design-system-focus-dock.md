# OMNI Brand Design System and Focus Dock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the approved OMNI identity foundation and a responsive, accessible Focus Dock App Shell with seven-module navigation, one-primary-plus-two-alternative Daily Coach, context-sensitive Evidence Dock, mobile grouping, honest themes, and scoped UX Contract v2 proof.

**Architecture:** Preserve the React/Vite/Express modular monolith and the existing in-memory module router for this vertical slice. Add a pure shell domain model and an isolated AppShellContext, then compose small shell components around existing module views. Use compatibility facades for Header, Sidebar, BottomNav, and legacy knowledge routing so the visual migration does not become a whole-product rewrite.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Tailwind CSS 4, Lucide React, Vitest, Playwright, axe-core, Fontsource Onest Variable 5.3.0.

**Spec:** `docs/superpowers/specs/2026-08-30-omni-brand-ux-rebuild-design.md`

## Global Constraints

- Work on a new feature branch created from freshly fetched `origin/main`; never edit or merge directly on `main`.
- Preserve the seven canonical modules: Sources & Library, Vocabulary, Grammar & Strategy, Media Lab, IELTS Practice, IELTS Mock, Review & Progress.
- Dashboard and Daily Coach are recommendation/navigation surfaces, not an eighth module.
- Keep the approved name `OMNI`, descriptor `IELTS PREPARATION`, symbol-led seven-equal-node architecture, Vivid Vermilion direction, Deep Charcoal, Warm White, and humanist workhorse typography.
- The approved raster boards are composition references, not production logo files: `.impeccable/mocks/approved/omni-brand-foundation.png` and `.impeccable/mocks/approved/focus-dock-app-shell.png`.
- The final mark and wordmark must be deterministic vector assets. The wordmark SVG must contain paths, not a live font or embedded raster.
- Vivid Vermilion identity sample `#EE1D23` is not permitted as a white-text button background because its contrast is below 4.5:1. Use `#E31B23` or a darker semantic action token for white-text controls.
- No blue brand residue, Bento AI label, Ω logo, mascot, global XP/level/streak control, floating sparkle Tutor button, decorative search/notification control, or horizontal-scrolling eight-item mobile navigation remains in the migrated shell.
- Do not change learning evidence, mastery, grader, provider, source, media, Practice, or Mock domain logic in this plan.
- Keep `knowledge` as a hidden compatibility route for one release; do not show it as a canonical module. Add `review_progress` without deleting legacy callers.
- Every new shell control uses both a registered literal `data-ux-flow` and unique literal `data-ux-control`.
- No visible control may lack a real route, state, or data transition.
- Public error text never contains raw `Failed to fetch`, commands, filesystem paths, stack traces, secret-shaped values, or private learner content.
- Light, Dark, System, and High Contrast preserve meaning without colour-only status. Mock Exam may force shell visibility off but must not destroy the saved preference.
- Respect `prefers-reduced-motion`; animation cannot hide initial content or delay deterministic screenshots.
- Core shell journeys must work with keyboard only, at 200% zoom, on desktop Chromium and Pixel 7 mobile profiles.
- Deterministic completion requires `npm run check:product-docs`, `npm test`, `npm run check:ux-contracts`, `npm run lint`, `npm run build`, and targeted desktop/mobile Playwright.
- Workers commit and push their feature branch only. The coordinator reviews and merges after all required evidence passes.

---

## File and ownership map

| Path | Responsibility |
|---|---|
| `src/brand/omniBrand.ts` | Pure seven-node geometry, lockup names, brand constants |
| `src/assets/brand/omni-mark.svg` | Approved vector mark, no raster |
| `src/assets/brand/omni-wordmark.svg` | Approved custom path-only wordmark |
| `src/components/brand/OmniMark.tsx` | Accessible reusable symbol component |
| `src/components/brand/OmniLogo.tsx` | Horizontal/stacked/symbol-only lockups |
| `src/styles/tokens.css` | Primitive and semantic light/dark/high-contrast tokens |
| `src/lib/appShell.ts` | Canonical module registry, mobile groups, shell types, migration helpers |
| `src/context/AppShellContext.tsx` | Theme, nav collapse, Evidence Dock, mobile sheet, connectivity presentation |
| `src/components/shell/AppHeader.tsx` | Brand, Tutor, theme, connectivity, profile; only functional controls |
| `src/components/shell/ConnectivityStatus.tsx` | Online/offline/syncing/attention semantics |
| `src/components/shell/ThemeMenu.tsx` | System/Light/Dark/High Contrast selection |
| `src/components/shell/ModuleNavigation.tsx` | Desktop Dashboard + seven-module navigation |
| `src/components/shell/MobileNavigation.tsx` | Home/Learn/Practice/Review/More bottom destinations |
| `src/components/shell/MobileModuleSheet.tsx` | Functional Learn/Practice/More destination sheet |
| `src/components/shell/FocusDockLayout.tsx` | Responsive three-zone composition and focus/exam modes |
| `src/lib/dailyCoach.ts` | Pure one-primary-plus-two-alternative recommendation selection |
| `src/components/dashboard/DailyCoachCard.tsx` | Evidence-linked Daily Coach UI |
| `src/lib/evidenceDock.ts` | Pure module-sensitive dock model |
| `src/components/shell/EvidenceDock.tsx` | Dock presentation, collapse and actions |
| `src/views/ReviewProgressView.tsx` | Due review entry and honest missing-evidence summary |
| `src/views/GrammarStrategyView.tsx` | Compatibility tabs composing current Grammar and Knowledge views |
| `src/lib/uxFlowContracts.ts` | Existing flow contracts plus scoped control-level contracts |
| `scripts/check-ux-contracts.ts` | Incremental v2 gate for migrated shell scope |
| `e2e/app-shell-redesign.spec.ts` | Desktop/mobile shell, Daily Coach, Evidence Dock, theme and focus-mode proof |

## Task 1: Amend product contracts for approved Brand/UX deltas

**Owner:** Coordinator/documentation worker

**Files:**
- Modify: `docs/product/PRD.md:136-175, 249-290, 422-468, 655-716`
- Modify: `docs/product/CAPABILITY_REGISTRY.md:131, 257-274`
- Modify: `docs/product/TRACEABILITY_MATRIX.md:1-20`
- Modify: `src/lib/__tests__/productDocumentation.test.ts`
- Modify: `docs/product/README.md`

**Interfaces:**
- Consumes: approved Brand/UX SPEC and existing PRD/CAP stable IDs.
- Produces: unchanged stable-ID set with approved shell, one-source/one-output, Mock coverage, theme, BYOK, and consent wording.

- [ ] **Step 1: Write the failing product-contract test**

Append this test to `src/lib/__tests__/productDocumentation.test.ts`:

~~~ts
it('records the approved OMNI Brand and UX deltas without adding capability IDs', () => {
  const prd = readFileSync(resolve(root, 'docs/product/PRD.md'), 'utf8');
  const registry = readFileSync(resolve(root, 'docs/product/CAPABILITY_REGISTRY.md'), 'utf8');
  const matrix = readFileSync(resolve(root, 'docs/product/TRACEABILITY_MATRIX.md'), 'utf8');

  expect(prd).toContain('Focus Dock');
  expect(prd).toContain('Home`, `Learn`, `Practice`, `Review`, and `More');
  expect(prd).toContain('one SourceVersion or selected span');
  expect(prd).toContain('one destination artifact per job');
  expect(prd).toContain('authentic per-test mix');
  expect(prd).toContain('System`, `Light`, `Dark`, and High Contrast');
  expect(prd).toContain('encrypted account credential vault');
  expect(prd).toContain('explicit opt-in');
  expect(registry).toContain('one primary action and two alternatives');
  expect(matrix).toContain('Brand and UX Rebuild Design');
});
~~~

- [ ] **Step 2: Run the test and verify RED**

Run:

~~~bash
npx vitest run src/lib/__tests__/productDocumentation.test.ts -t "approved OMNI Brand and UX deltas"
~~~

Expected: FAIL because PRD and registry do not yet contain the approved delta phrases.

- [ ] **Step 3: Update the product documents with exact approved behaviour**

Add these requirements without creating or renaming a `PRD-*`, `NFR-*`, `CAP-*`, `METRIC-*`, or `GUARD-*` definition:

~~~markdown
PRD-002 additions:
- Focus Dock on wide desktop: persistent seven-module navigation, task-first canvas, context-sensitive Evidence Dock.
- Mobile destinations are Home, Learn, Practice, Review and More; no horizontally scrolling module bar.
- Daily Coach presents one primary evidence-backed action and two alternatives, including manual module choice.
- System, Light, Dark and High Contrast are supported; Mock defaults to Light with accessibility override.

PRD-005 additions:
- Library-first is the default entry.
- Collections and explicitly selected-source grounded chat remain supported.
- Each artifact job consumes one SourceVersion or selected span and creates one destination draft.
- Success presents Open artifact and Create another output; it does not redirect automatically.

PRD-010 additions:
- MockBuild uses a shared blueprint and dependency-aware bounded parallel skill jobs.
- One mock uses an authentic supported task-type mix.
- Cross-test coverage records attempted, independent accuracy and last-seen state.
- A task type is advertised only after schema, renderer, validator, repair, fixture, accessibility and E2E support.

NFR-003 additions:
- System, Light, Dark and High Contrast themes preserve meaning.
- Core shell journeys support 200% zoom.

NFR-004 additions:
- BYOK defaults to an encrypted account vault and may be session-only.
- Transcript and telemetry persistence is explicit opt-in; raw microphone audio is not stored by default.
~~~

Update the matrix heading to `Status: Approved by Product Owner` and add the new Brand/UX SPEC link under the existing baseline link.

- [ ] **Step 4: Run product tests and gate**

Run:

~~~bash
npx vitest run src/lib/__tests__/productDocumentation.test.ts
npm run check:product-docs
~~~

Expected: all product-documentation tests pass; checker reports 5 documents and 99 stable IDs.

- [ ] **Step 5: Commit the product alignment**

~~~bash
git add docs/product src/lib/__tests__/productDocumentation.test.ts
git commit -m "docs: align product contracts with approved UX"
~~~

## Task 2: Finalise production brand assets and semantic tokens

**Owner:** Coordinator/design worker for visual asset approval; coding worker for integration

**Files:**
- Create: `src/brand/omniBrand.ts`
- Create: `src/assets/brand/omni-mark.svg`
- Create: `src/assets/brand/omni-wordmark.svg`
- Create: `src/components/brand/OmniMark.tsx`
- Create: `src/components/brand/OmniLogo.tsx`
- Create: `src/styles/tokens.css`
- Create: `src/lib/colorContrast.ts`
- Create: `src/lib/__tests__/brandContracts.test.ts`
- Modify: `src/main.tsx`
- Modify: `src/index.css`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: approved brand board and exact seven-equal-node rule.
- Produces:
  - `getOmniNodeCenters(): ReadonlyArray<{ x: number; y: number }>`
  - `contrastRatio(foreground: string, background: string): number`
  - `<OmniLogo variant="horizontal|stacked|symbol" />`
  - semantic CSS variables prefixed `--omni-`.

- [ ] **Step 1: Install the approved self-hosted font package**

Run:

~~~bash
npm install @fontsource-variable/onest@5.3.0
~~~

Expected: package and lockfile add an OFL-1.1 variable font dependency; no unrelated dependency changes.

- [ ] **Step 2: Write the failing brand-contract tests**

Create `src/lib/__tests__/brandContracts.test.ts`:

~~~ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../colorContrast';
import { getOmniNodeCenters, OMNI_BRAND } from '../../brand/omniBrand';

describe('OMNI brand contracts', () => {
  it('uses exactly seven equal nodes around one centre', () => {
    const nodes = getOmniNodeCenters();
    expect(nodes).toHaveLength(7);
    const radii = nodes.map(({ x, y }) =>
      Math.hypot(x - OMNI_BRAND.markCenter, y - OMNI_BRAND.markCenter),
    );
    expect(new Set(radii.map((value) => value.toFixed(4))).size).toBe(1);
  });

  it('uses an AA-safe red for white-text primary actions', () => {
    expect(contrastRatio('#E31B23', '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#EE1D23', '#FFFFFF')).toBeLessThan(4.5);
  });

  it('ships a path-only wordmark and no embedded raster', () => {
    const svg = readFileSync(
      resolve(process.cwd(), 'src/assets/brand/omni-wordmark.svg'),
      'utf8',
    );
    expect(svg).toContain('<path');
    expect(svg).not.toContain('<text');
    expect(svg).not.toMatch(/data:image\//);
  });
});
~~~

- [ ] **Step 3: Run the tests and verify RED**

Run:

~~~bash
npx vitest run src/lib/__tests__/brandContracts.test.ts
~~~

Expected: FAIL because brand geometry, contrast helper, and vector wordmark do not exist.

- [ ] **Step 4: Implement deterministic mark geometry and contrast helper**

Create `src/brand/omniBrand.ts`:

~~~ts
export const OMNI_BRAND = {
  name: 'OMNI',
  descriptor: 'IELTS PREPARATION',
  nodeCount: 7,
  markSize: 64,
  markCenter: 32,
  ringRadius: 22,
  nodeRadius: 4,
  startAngleDegrees: -90,
  colors: {
    vividVermilion: '#EE1D23',
    action: '#E31B23',
    actionHover: '#C9151E',
    darkAccent: '#FF5A57',
    deepCharcoal: '#121418',
    warmWhite: '#FAF7F2',
  },
} as const;

export function getOmniNodeCenters() {
  return Array.from({ length: OMNI_BRAND.nodeCount }, (_, index) => {
    const angle = (
      OMNI_BRAND.startAngleDegrees
      + index * (360 / OMNI_BRAND.nodeCount)
    ) * Math.PI / 180;
    return {
      x: OMNI_BRAND.markCenter + OMNI_BRAND.ringRadius * Math.cos(angle),
      y: OMNI_BRAND.markCenter + OMNI_BRAND.ringRadius * Math.sin(angle),
    };
  });
}
~~~

Create `src/lib/colorContrast.ts`:

~~~ts
function parseHex(color: string): [number, number, number] {
  const normalized = color.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(normalized)) {
    throw new Error('Expected a six-digit hexadecimal colour');
  }
  return [0, 2, 4].map((offset) =>
    Number.parseInt(normalized.slice(offset, offset + 2), 16) / 255,
  ) as [number, number, number];
}

function linearChannel(value: number) {
  return value <= 0.04045
    ? value / 12.92
    : Math.pow((value + 0.055) / 1.055, 2.4);
}

function relativeLuminance(color: string) {
  const [red, green, blue] = parseHex(color).map(linearChannel);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}
~~~

- [ ] **Step 5: Produce and visually approve the vector files**

Author `omni-mark.svg` from the constants above. The ring may sit behind the nodes; every node uses the same radius and fill. Export the custom OMNI lettering as outline paths to `omni-wordmark.svg`. Both files must:

- use `viewBox`, not fixed bitmap dimensions;
- contain no `<image>`, base64 payload, remote URL, filter, gradient, mask, or animation;
- include `role="img"` only at the React wrapper, not inside reusable decorative SVG;
- visually match `.impeccable/mocks/approved/omni-brand-foundation.png`;
- pass coordinator comparison at 24 px, 40 px, 160 px, light and dark backgrounds.

Run:

~~~bash
rg -n "<text|<image|data:image|linearGradient|radialGradient|filter|mask" src/assets/brand
~~~

Expected: no matches.

This task cannot be delegated as an unsupervised logo redesign. The coordinator records Product Owner approval of the vector comparison before Task 4 uses the assets.

- [ ] **Step 6: Implement reusable React lockups**

Create `OmniMark.tsx` using one ring and `getOmniNodeCenters()`. Create `OmniLogo.tsx` with:

~~~tsx
import wordmarkUrl from '../../assets/brand/omni-wordmark.svg';
import { OmniMark } from './OmniMark';

export interface OmniLogoProps {
  variant?: 'horizontal' | 'stacked' | 'symbol';
  className?: string;
  descriptor?: boolean;
  inverse?: boolean;
}

export function OmniLogo({
  variant = 'horizontal',
  className,
  descriptor = true,
  inverse = false,
}: OmniLogoProps) {
  const accessibleLabel = descriptor ? 'OMNI IELTS Preparation' : 'OMNI';
  if (variant === 'symbol') {
    return <OmniMark className={className} title={accessibleLabel} />;
  }

  return (
    <span
      className={className}
      data-variant={variant}
      data-inverse={inverse ? 'true' : 'false'}
      role="img"
      aria-label={accessibleLabel}
    >
      <OmniMark aria-hidden="true" />
      <img src={wordmarkUrl} alt="" aria-hidden="true" />
      {descriptor && <span aria-hidden="true">IELTS PREPARATION</span>}
    </span>
  );
}
~~~

`OmniMark` accepts `title?: string`; it emits a `<title>` only when supplied. Use `aria-hidden` for decorative instances and one accessible name for linked/home instances. Do not duplicate the brand name in the accessibility tree.

- [ ] **Step 7: Add semantic tokens and self-hosted font**

Import `@fontsource-variable/onest/wght.css` in `src/main.tsx`. Create `src/styles/tokens.css`:

~~~css
:root {
  --omni-font-sans: "Onest Variable", "Segoe UI", Arial, sans-serif;
  --omni-brand-500: #ee1d23;
  --omni-action-primary: #e31b23;
  --omni-action-primary-hover: #c9151e;
  --omni-accent-on-dark: #ff5a57;
  --omni-ground: #faf7f2;
  --omni-surface: #ffffff;
  --omni-text: #121418;
  --omni-text-muted: #475569;
  --omni-border: #dedbd6;
  --omni-focus: #8b0f17;
  --omni-radius-sm: 0.625rem;
  --omni-radius-md: 0.875rem;
  --omni-radius-lg: 1.125rem;
  --omni-shadow-raised: 0 8px 24px rgba(18, 20, 24, 0.08);
}

.dark {
  --omni-ground: #0c0e11;
  --omni-surface: #15181d;
  --omni-text: #faf7f2;
  --omni-text-muted: #c4c8cf;
  --omni-border: #30343a;
  --omni-focus: #ff7a76;
}

.high-contrast {
  --omni-ground: #000000;
  --omni-surface: #000000;
  --omni-text: #ffffff;
  --omni-text-muted: #ffffff;
  --omni-border: #ffffff;
  --omni-action-primary: #ffffff;
  --omni-focus: #ffff00;
}
~~~

Import tokens before the existing Tailwind layers in `src/index.css`. Set body font and background from semantic variables. Do not globally remap every legacy blue utility in this task; migrated shell components must use the semantic tokens.

- [ ] **Step 8: Run brand tests and build**

Run:

~~~bash
npx vitest run src/lib/__tests__/brandContracts.test.ts
npm run lint
npm run build
~~~

Expected: tests, typecheck and build pass; Onest is self-hosted; no font network request appears in the built HTML.

- [ ] **Step 9: Commit brand foundation**

~~~bash
git add package.json package-lock.json src/brand src/assets/brand src/components/brand src/styles src/index.css src/main.tsx src/lib/colorContrast.ts src/lib/__tests__/brandContracts.test.ts
git commit -m "feat: add OMNI brand foundation and semantic tokens"
~~~

## Task 3: Add the shell domain model and theme state

**Owner:** Coding worker

**Files:**
- Create: `src/lib/appShell.ts`
- Create: `src/context/AppShellContext.tsx`
- Create: `src/lib/__tests__/appShell.test.ts`
- Modify: `src/types.ts:1-11`
- Modify: `src/context/AppContext.tsx:85-126, 405-426, 740-755`
- Modify: `src/App.tsx:104-113`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: semantic tokens and existing `ModuleId`.
- Produces:
  - `CANONICAL_MODULES`
  - `MOBILE_DESTINATIONS`
  - `ThemePreference`
  - `resolveTheme(preference, systemDark)`
  - `migrateLegacyTheme(value)`
  - `useAppShell()`.

- [ ] **Step 1: Write failing pure shell tests**

Create `src/lib/__tests__/appShell.test.ts`:

~~~ts
import { describe, expect, it } from 'vitest';
import {
  CANONICAL_MODULES,
  MOBILE_DESTINATIONS,
  migrateLegacyTheme,
  resolveTheme,
} from '../appShell';

describe('app shell contracts', () => {
  it('exposes Dashboard plus exactly seven canonical modules', () => {
    expect(CANONICAL_MODULES.map(({ id }) => id)).toEqual([
      'sources',
      'vocabulary',
      'grammar',
      'media',
      'practice',
      'mock_test',
      'review_progress',
    ]);
  });

  it('uses five non-scrolling mobile destinations', () => {
    expect(MOBILE_DESTINATIONS.map(({ id }) => id)).toEqual([
      'home',
      'learn',
      'practice',
      'review',
      'more',
    ]);
  });

  it('resolves system and migrates the old boolean theme', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('high_contrast', false)).toBe('high_contrast');
    expect(migrateLegacyTheme('true')).toBe('dark');
    expect(migrateLegacyTheme('false')).toBe('light');
  });
});
~~~

- [ ] **Step 2: Run the test and verify RED**

~~~bash
npx vitest run src/lib/__tests__/appShell.test.ts
~~~

Expected: FAIL because `appShell.ts` does not exist.

- [ ] **Step 3: Implement canonical registries**

Create `src/lib/appShell.ts` with:

~~~ts
import type { ModuleId } from '../types';

export type ThemePreference = 'system' | 'light' | 'dark' | 'high_contrast';
export type ResolvedTheme = 'light' | 'dark' | 'high_contrast';
export type EvidenceDockState = 'open' | 'collapsed' | 'hidden';
export type MobileDestinationId = 'home' | 'learn' | 'practice' | 'review' | 'more';

export interface CanonicalModule {
  id: ModuleId;
  label: string;
  description: string;
  mobileGroup: 'learn' | 'practice' | 'review';
}

export const CANONICAL_MODULES: readonly CanonicalModule[] = [
  { id: 'sources', label: 'Sources & Library', description: 'Nguồn và xuất xứ', mobileGroup: 'learn' },
  { id: 'vocabulary', label: 'Vocabulary', description: 'Ôn tập thích ứng', mobileGroup: 'learn' },
  { id: 'grammar', label: 'Grammar & Strategy', description: 'Curriculum và chiến thuật', mobileGroup: 'learn' },
  { id: 'media', label: 'Media Lab', description: 'Nghe, chép và shadowing', mobileGroup: 'learn' },
  { id: 'practice', label: 'IELTS Practice', description: 'Bốn kỹ năng', mobileGroup: 'practice' },
  { id: 'mock_test', label: 'IELTS Mock', description: 'Mini và Full Mock', mobileGroup: 'practice' },
  { id: 'review_progress', label: 'Review & Progress', description: 'Ôn lỗi và bằng chứng', mobileGroup: 'review' },
] as const;

export const MOBILE_DESTINATIONS = [
  { id: 'home', label: 'Home' },
  { id: 'learn', label: 'Learn' },
  { id: 'practice', label: 'Practice' },
  { id: 'review', label: 'Review' },
  { id: 'more', label: 'More' },
] as const;
~~~

Add `review_progress` to `ModuleId`. Retain `knowledge` as a legacy compatibility member.

- [ ] **Step 4: Implement theme resolution and AppShellContext**

Use storage key `omni_theme_preference_v2`. On first load only, migrate `omni_ielts_dark_v1`. Subscribe to `matchMedia('(prefers-color-scheme: dark)')` only for System. Apply exactly one of `dark` or `high-contrast` to `document.documentElement`.

Implement the pure functions before the provider:

~~~ts
export function resolveTheme(
  preference: ThemePreference,
  systemDark: boolean,
): ResolvedTheme {
  if (preference === 'system') return systemDark ? 'dark' : 'light';
  return preference;
}

export function migrateLegacyTheme(value: string | null): ThemePreference {
  if (value === 'true') return 'dark';
  if (value === 'false') return 'light';
  return 'system';
}
~~~

The context value is:

~~~ts
interface AppShellContextValue {
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setThemePreference: (theme: ThemePreference) => void;
  navCollapsed: boolean;
  setNavCollapsed: (collapsed: boolean) => void;
  evidenceDock: EvidenceDockState;
  setEvidenceDock: (state: EvidenceDockState) => void;
  mobileDestination: MobileDestinationId | null;
  setMobileDestination: (destination: MobileDestinationId | null) => void;
  connectivity: 'online' | 'offline' | 'syncing' | 'needs_attention';
  setConnectivity: (state: 'online' | 'offline' | 'syncing' | 'needs_attention') => void;
}
~~~

Initial connectivity follows `navigator.onLine` and updates from window `online`/`offline` events. Future sync adapters may set `syncing` or `needs_attention` through the exposed setter. Do not move learner/profile data into this context.

Remove the old theme storage/effect from `AppContext.tsx`. Because `AppShellProvider` wraps `AppProvider`, expose the legacy compatibility API as:

~~~ts
const { resolvedTheme, setThemePreference } = useAppShell();
const darkMode = resolvedTheme === 'dark';
const toggleDarkMode = () => {
  setThemePreference(resolvedTheme === 'dark' ? 'light' : 'dark');
};
~~~

This keeps unmigrated module controls working without two providers competing over the root class.

- [ ] **Step 5: Wrap the application and verify GREEN**

Wrap `AppProvider` with `AppShellProvider` in `App.tsx`. Run:

~~~bash
npx vitest run src/lib/__tests__/appShell.test.ts
npm run lint
~~~

Expected: pass.

- [ ] **Step 6: Commit shell state**

~~~bash
git add src/lib/appShell.ts src/context/AppShellContext.tsx src/lib/__tests__/appShell.test.ts src/types.ts src/App.tsx src/index.css
git commit -m "feat: add responsive app shell state"
~~~

## Task 4: Build the desktop Focus Dock and functional header

**Owner:** Large coding task suitable for Grok

**Files:**
- Create: `src/components/shell/AppHeader.tsx`
- Create: `src/components/shell/ConnectivityStatus.tsx`
- Create: `src/components/shell/ThemeMenu.tsx`
- Create: `src/components/shell/ModuleNavigation.tsx`
- Create: `src/components/shell/FocusDockLayout.tsx`
- Create: `src/views/ReviewProgressView.tsx`
- Create: `src/views/GrammarStrategyView.tsx`
- Modify: `src/components/Header.tsx`
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/App.tsx:29-113`
- Create: `e2e/app-shell-redesign.spec.ts`

**Interfaces:**
- Consumes: `OmniLogo`, `CANONICAL_MODULES`, `useApp()`, `useAppShell()`.
- Produces: functional desktop shell slots `navigation`, `main`, `evidence`, plus focus/exam mode.

- [ ] **Step 1: Write the failing desktop E2E**

Create the first test in `e2e/app-shell-redesign.spec.ts`:

~~~ts
import { expect, test } from './fixtures';

test('Focus Dock exposes Dashboard and seven canonical modules without legacy gamification', async ({ page }) => {
  await page.goto('/');
  const navigation = page.getByRole('navigation', { name: 'Điều hướng học tập' });

  await expect(navigation.getByRole('button', { name: 'Dashboard' })).toBeVisible();
  for (const label of [
    'Sources & Library',
    'Vocabulary',
    'Grammar & Strategy',
    'Media Lab',
    'IELTS Practice',
    'IELTS Mock',
    'Review & Progress',
  ]) {
    await expect(navigation.getByRole('button', { name: new RegExp(label) })).toBeVisible();
  }

  await expect(page.getByText('Bento AI')).toHaveCount(0);
  await expect(page.getByText(/Lv\./)).toHaveCount(0);
  await expect(page.getByTitle(/Chuỗi học tập/)).toHaveCount(0);
  await expect(page.locator('#main-viewport-content')).toBeVisible();

  await navigation.getByRole('button', { name: /Review & Progress/ }).click();
  await expect(page.getByRole('heading', { name: 'Ôn lỗi đến hạn' })).toBeVisible();

  await navigation.getByRole('button', { name: /Grammar & Strategy/ }).click();
  await expect(page.getByRole('tab', { name: 'Grammar' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'IELTS Strategy' })).toBeVisible();
});
~~~

- [ ] **Step 2: Run targeted desktop E2E and verify RED**

~~~bash
npx playwright test e2e/app-shell-redesign.spec.ts --project=chromium-desktop
~~~

Expected: FAIL because the current header contains Bento AI/XP/streak and navigation lacks Review & Progress.

- [ ] **Step 3: Implement AppHeader**

The header contains only:

- OMNI home control;
- connectivity state text when non-online;
- functional Tutor control calling `setIsAITutorOpen(true)`;
- functional four-option theme menu;
- functional Profile control.

Do not render search or notification controls until they have real product contracts. Use:

~~~tsx
<header id="app-header" className="omni-shell-header">
  <OmniLogo variant="horizontal" />
  <div className="omni-shell-header__actions">
    <ConnectivityStatus />
    <button data-ux-flow="tutor.chat" data-ux-control="shell.header.open-tutor">
      AI Tutor
    </button>
    <ThemeMenu />
    <button data-ux-flow="app.navigation" data-ux-control="shell.header.open-profile">
      Hồ sơ
    </button>
  </div>
</header>
~~~

All menus restore focus to their trigger on close and close on Escape.

`ConnectivityStatus` accepts the connectivity union from AppShellContext and renders nothing for `online`; other states use text plus icon. `ThemeMenu` accepts the current preference and calls `setThemePreference` from four menu items with unique control IDs `shell.theme.system`, `shell.theme.light`, `shell.theme.dark`, and `shell.theme.high-contrast`.

- [ ] **Step 4: Implement ModuleNavigation**

Render Dashboard once and map `CANONICAL_MODULES`. Use actual buttons because routing is state-based. Each module gets a unique control ID:

~~~text
shell.nav.dashboard
shell.nav.sources
shell.nav.vocabulary
shell.nav.grammar
shell.nav.media
shell.nav.practice
shell.nav.mock
shell.nav.review
shell.nav.collapse
~~~

Do not display `knowledge`. The Grammar & Strategy route composes the existing Grammar and Knowledge views through the compatibility facade in Step 5.

- [ ] **Step 5: Implement functional Review and Grammar/Strategy compatibility entries**

Create `ReviewProgressView.tsx` with:

- heading `Ôn lỗi đến hạn`;
- due queue count from `getDueMistakes`;
- primary CTA opening the existing Mistake Notebook workout;
- recent Practice/Mock history links;
- per-skill state `Chưa đủ bằng chứng` unless an attempt already carries explicit evidence metadata;
- no overall band derived from `profile.skillBands`.

Add the `review_progress` case to `App.tsx`. This keeps every canonical navigation control functional before the full Review domain migration.

Create `GrammarStrategyView.tsx` with functional `Grammar` and `IELTS Strategy` tabs. Render `GrammarHubView` in the first tab and `KnowledgeBaseView` in the second. Use `role="tablist"`, unique tab control IDs, `aria-selected`, `aria-controls`, and one `role="tabpanel"` for the active view. Update the `grammar` case in `App.tsx` to render this facade. Keep the `knowledge` case only for direct legacy restoration.

- [ ] **Step 6: Implement FocusDockLayout and compatibility facades**

`FocusDockLayout` accepts:

~~~ts
interface FocusDockLayoutProps {
  navigation: React.ReactNode;
  children: React.ReactNode;
  evidence: React.ReactNode;
  examMode: boolean;
  focusMode?: boolean;
}
~~~

Wide layout uses CSS grid `auto minmax(0, 1fr) auto`. At content-fit width, collapse Evidence Dock before reducing central canvas below its minimum. Exam mode returns a single full-viewport child.

Replace `Header.tsx` and `Sidebar.tsx` bodies with named re-exports for one release:

~~~ts
export { AppHeader as Header } from './shell/AppHeader';
export { ModuleNavigation as Sidebar } from './shell/ModuleNavigation';
~~~

Update `App.tsx` to use the new layout while preserving every existing modal and module view.

- [ ] **Step 7: Run desktop E2E, lint and build**

~~~bash
npx playwright test e2e/app-shell-redesign.spec.ts --project=chromium-desktop
npm run lint
npm run build
~~~

Expected: pass. Build may report the pre-existing large-chunk warning but must exit zero and must not add a new eager provider SDK.

- [ ] **Step 8: Commit desktop shell**

~~~bash
git add src/components/shell src/components/Header.tsx src/components/Sidebar.tsx src/views/ReviewProgressView.tsx src/views/GrammarStrategyView.tsx src/App.tsx e2e/app-shell-redesign.spec.ts
git commit -m "feat: build OMNI Focus Dock shell"
~~~

## Task 5: Replace NextActionBanner with evidence-linked Daily Coach

**Owner:** Coding worker

**Files:**
- Create: `src/lib/dailyCoach.ts`
- Create: `src/lib/__tests__/dailyCoach.test.ts`
- Create: `src/components/dashboard/DailyCoachCard.tsx`
- Modify: `src/components/NextActionBanner.tsx`
- Modify: `src/views/DashboardView.tsx`
- Modify: `src/App.tsx`
- Modify: `e2e/dashboard.spec.ts`
- Modify: `e2e/app-shell-redesign.spec.ts`

**Interfaces:**
- Consumes: due vocab/mistake selectors, profile diagnostic state, unfinished attempts.
- Produces: `buildDailyCoachModel(input): DailyCoachModel` with one primary and exactly two alternatives.

- [ ] **Step 1: Write failing Daily Coach unit tests**

Create:

~~~ts
import { describe, expect, it } from 'vitest';
import { buildDailyCoachModel } from '../dailyCoach';

describe('Daily Coach', () => {
  it('returns one primary and two alternatives including manual module choice', () => {
    const model = buildDailyCoachModel({
      diagnosticComplete: true,
      dueMistakeIds: ['mistake-1', 'mistake-2'],
      dueVocabIds: ['vocab-1'],
      unfinishedPracticeId: 'practice-1',
    });

    expect(model.primary.destination).toBe('review_progress');
    expect(model.primary.evidenceRefs).toEqual(['mistake:mistake-1', 'mistake:mistake-2']);
    expect(model.alternatives).toHaveLength(2);
    expect(model.alternatives.some(({ kind }) => kind === 'manual_module')).toBe(true);
  });

  it('requests evidence instead of inventing progress when diagnostic is incomplete', () => {
    const model = buildDailyCoachModel({
      diagnosticComplete: false,
      dueMistakeIds: [],
      dueVocabIds: [],
    });
    expect(model.primary.kind).toBe('diagnostic');
    expect(model.primary.confidence).toBe('low');
    expect(model.primary.evidenceRefs).toEqual([]);
  });
});
~~~

- [ ] **Step 2: Run and verify RED**

~~~bash
npx vitest run src/lib/__tests__/dailyCoach.test.ts
~~~

Expected: FAIL because the pure engine does not exist.

- [ ] **Step 3: Implement the pure recommendation model**

Define:

~~~ts
export interface DailyCoachInput {
  diagnosticComplete: boolean;
  dueMistakeIds: string[];
  dueVocabIds: string[];
  unfinishedPracticeId?: string;
}

export interface DailyCoachAction {
  id: string;
  kind: 'diagnostic' | 'due_mistake' | 'due_vocab' | 'resume' | 'baseline' | 'manual_module';
  title: string;
  reason: string;
  destination: ModuleId;
  command: 'open_module' | 'open_diagnostic';
  evidenceRefs: string[];
  estimatedMinutes?: number;
  confidence: 'low' | 'medium' | 'high';
}

export interface DailyCoachModel {
  primary: DailyCoachAction;
  alternatives: readonly [DailyCoachAction, DailyCoachAction];
}

export function buildDailyCoachModel(input: DailyCoachInput): DailyCoachModel {
  const manual: DailyCoachAction = {
    id: 'manual-module',
    kind: 'manual_module',
    title: 'Tự chọn module',
    reason: 'Bạn luôn có thể chọn nội dung phù hợp với kế hoạch của mình.',
    destination: 'dashboard',
    command: 'open_module',
    evidenceRefs: [],
    confidence: 'high',
  };
  const diagnostic: DailyCoachAction = {
    id: 'resume-diagnostic',
    kind: 'diagnostic',
    title: 'Tạo bằng chứng đầu vào',
    reason: 'Omni chưa có đủ dữ liệu để đề xuất một kỹ năng cụ thể.',
    destination: 'profile',
    command: 'open_diagnostic',
    evidenceRefs: [],
    confidence: 'low',
  };
  const dueMistakes: DailyCoachAction | null = input.dueMistakeIds.length ? {
    id: 'review-due-mistakes',
    kind: 'due_mistake',
    title: 'Ôn lỗi đến hạn',
    reason: 'Các lỗi này đã đến lịch ôn và có liên kết tới bài làm gốc.',
    destination: 'review_progress',
    command: 'open_module',
    evidenceRefs: input.dueMistakeIds.map((id) => 'mistake:' + id),
    estimatedMinutes: 10,
    confidence: 'high',
  } : null;
  const dueVocab: DailyCoachAction | null = input.dueVocabIds.length ? {
    id: 'review-due-vocab',
    kind: 'due_vocab',
    title: 'Ôn từ đến hạn',
    reason: 'FSRS đã chọn những mục gần ngưỡng quên.',
    destination: 'vocabulary',
    command: 'open_module',
    evidenceRefs: input.dueVocabIds.map((id) => 'vocab:' + id),
    estimatedMinutes: 8,
    confidence: 'high',
  } : null;
  const resume: DailyCoachAction | null = input.unfinishedPracticeId ? {
    id: 'resume-practice',
    kind: 'resume',
    title: 'Tiếp tục bài đang làm',
    reason: 'Một attempt chưa hoàn tất đã được lưu.',
    destination: 'practice',
    command: 'open_module',
    evidenceRefs: ['attempt:' + input.unfinishedPracticeId],
    confidence: 'high',
  } : null;
  const baseline: DailyCoachAction = {
    id: 'independent-baseline',
    kind: 'baseline',
    title: 'Làm một bài Independent ngắn',
    reason: 'Một bài mới sẽ tạo bằng chứng độc lập cho đề xuất tiếp theo.',
    destination: 'practice',
    command: 'open_module',
    evidenceRefs: [],
    estimatedMinutes: 15,
    confidence: 'medium',
  };

  const ordered = [dueMistakes, dueVocab, resume, baseline].filter(
    (action): action is DailyCoachAction => action !== null,
  );
  const primary = input.diagnosticComplete ? ordered[0]! : diagnostic;
  const secondary = ordered.find(({ id }) => id !== primary.id) ?? baseline;
  return { primary, alternatives: [secondary, manual] };
}
~~~

Selection order is diagnostic missing → due/relapsed mistakes → due vocabulary → unfinished Independent Practice → manual Practice baseline. Alternatives are the best unused valid action plus manual module choice. Never use target/current band, XP, streak, time-in-app, answer reveal, or Tutor output as evidence.

- [ ] **Step 4: Implement the DailyCoachCard**

The component shows:

- one dominant title, reason, evidence drawer trigger, duration and CTA;
- two lower-salience alternatives;
- manual module selection opening the existing navigation on desktop or Learn/Practice sheet on mobile;
- honest low-confidence copy when evidence is missing.

Map `open_diagnostic` directly to the existing diagnostic modal state. Map `open_module` to `setActiveModule(destination)`. A primary diagnostic action must not merely open Profile and force the learner to search for the test.

Use unique IDs:

~~~text
dashboard.coach.primary
dashboard.coach.alternative-1
dashboard.coach.alternative-2
dashboard.coach.open-evidence
~~~

Replace `NextActionBanner.tsx` with a compatibility re-export.

Remove the global `<NextActionBanner />` from `App.tsx`; Daily Coach belongs only to Dashboard. Refactor `DashboardView.tsx` so its first and dominant section is `DailyCoachCard`, followed by bounded recent/due evidence that does not duplicate the right dock. Remove from Dashboard:

- current/target band claims without evidence freshness;
- XP, level, streak and reward-first panels;
- Speed Drill Arena promotion;
- duplicate seven-module launcher on desktop;
- blue gradient promotion surfaces;
- any button that lacks a destination or state transition.

Keep existing data and modal behaviour available through canonical destinations rather than deleting domain logic.

- [ ] **Step 5: Update and run Dashboard E2E**

Replace the old assertion that always expects vocabulary with deterministic seeded evidence matching the fixture. Assert the primary transition, two alternatives, evidence reason, and manual module choice.

Run:

~~~bash
npx vitest run src/lib/__tests__/dailyCoach.test.ts
npx playwright test e2e/dashboard.spec.ts e2e/app-shell-redesign.spec.ts --project=chromium-desktop
~~~

Expected: pass.

- [ ] **Step 6: Commit Daily Coach**

~~~bash
git add src/lib/dailyCoach.ts src/lib/__tests__/dailyCoach.test.ts src/components/dashboard src/components/NextActionBanner.tsx src/App.tsx e2e
git commit -m "feat: add evidence-linked Daily Coach"
~~~

## Task 6: Add the context-sensitive Evidence Dock

**Owner:** Coding worker

**Files:**
- Create: `src/lib/evidenceDock.ts`
- Create: `src/lib/__tests__/evidenceDock.test.ts`
- Create: `src/components/shell/EvidenceDock.tsx`
- Modify: `src/App.tsx`
- Modify: `e2e/app-shell-redesign.spec.ts`

**Interfaces:**
- Consumes: active module, due mistake/vocab IDs, sources/jobs, media sessions, attempts, Mock results.
- Produces: `buildEvidenceDockModel(input): EvidenceDockModel`.

- [ ] **Step 1: Write failing module-sensitive tests**

~~~ts
import { describe, expect, it } from 'vitest';
import { buildEvidenceDockModel } from '../evidenceDock';

describe('Evidence Dock', () => {
  it('keeps system-wide due work first and changes contextual content by module', () => {
    const vocabulary = buildEvidenceDockModel({
      activeModule: 'vocabulary',
      dueMistakeCount: 2,
      dueVocabCount: 6,
      recentEvidence: [],
    });
    const media = buildEvidenceDockModel({
      activeModule: 'media',
      dueMistakeCount: 2,
      dueVocabCount: 6,
      currentMediaTitle: 'Urban planning',
      recentEvidence: [],
    });

    expect(vocabulary.sections[0].id).toBe('system-due');
    expect(vocabulary.sections.some(({ id }) => id === 'vocabulary-context')).toBe(true);
    expect(media.sections.some(({ id }) => id === 'media-context')).toBe(true);
  });

  it('returns hidden during an active Mock exam', () => {
    expect(buildEvidenceDockModel({
      activeModule: 'mock_test',
      examMode: true,
      dueMistakeCount: 0,
      dueVocabCount: 0,
      recentEvidence: [],
    }).visibility).toBe('hidden');
  });
});
~~~

- [ ] **Step 2: Run and verify RED**

~~~bash
npx vitest run src/lib/__tests__/evidenceDock.test.ts
~~~

Expected: FAIL because the model does not exist.

- [ ] **Step 3: Implement the pure dock model**

Define:

~~~ts
export interface EvidenceDockInput {
  activeModule: ModuleId;
  examMode?: boolean;
  dueMistakeCount: number;
  dueVocabCount: number;
  currentMediaTitle?: string;
  recentEvidence: Array<{ id: string; label: string; destination?: ModuleId }>;
}

export interface EvidenceDockItem {
  id: string;
  label: string;
  detail: string;
  status: 'due' | 'recent' | 'unfinished' | 'missing' | 'unavailable';
  destination?: ModuleId;
}

export interface EvidenceDockSection {
  id: string;
  title: string;
  items: EvidenceDockItem[];
}

export interface EvidenceDockModel {
  visibility: 'open' | 'collapsed' | 'hidden';
  sections: EvidenceDockSection[];
}

export function buildEvidenceDockModel(input: EvidenceDockInput): EvidenceDockModel {
  if (input.examMode && input.activeModule === 'mock_test') {
    return { visibility: 'hidden', sections: [] };
  }

  const dueCandidates: Array<EvidenceDockItem | null> = [
    input.dueMistakeCount > 0 ? {
      id: 'due-mistakes',
      label: input.dueMistakeCount + ' lỗi đến hạn',
      detail: 'Mở Review & Progress để luyện lại',
      status: 'due',
      destination: 'review_progress',
    } : null,
    input.dueVocabCount > 0 ? {
      id: 'due-vocab',
      label: input.dueVocabCount + ' từ đến hạn',
      detail: 'Ôn theo lịch FSRS',
      status: 'due',
      destination: 'vocabulary',
    } : null,
  ];
  const dueItems = dueCandidates.filter(
    (item): item is EvidenceDockItem => item !== null,
  );

  const contextId = input.activeModule === 'vocabulary'
    ? 'vocabulary-context'
    : input.activeModule === 'media'
      ? 'media-context'
      : input.activeModule + '-context';
  const contextItems: EvidenceDockItem[] = input.activeModule === 'media'
    && input.currentMediaTitle
    ? [{
        id: 'current-media',
        label: input.currentMediaTitle,
        detail: 'Tiếp tục từ segment đã lưu',
        status: 'unfinished',
        destination: 'media',
      }]
    : [{
        id: 'missing-context-evidence',
        label: 'Chưa đủ bằng chứng',
        detail: 'Hoàn thành một hoạt động độc lập để cập nhật.',
        status: 'missing',
        destination: input.activeModule,
      }];

  return {
    visibility: 'open',
    sections: [
      { id: 'system-due', title: 'Đến hạn', items: dueItems },
      { id: contextId, title: 'Trong module này', items: contextItems },
      {
        id: 'recent-evidence',
        title: 'Bằng chứng gần đây',
        items: input.recentEvidence.map((item) => ({
          ...item,
          detail: 'Mở attempt đã lưu',
          status: 'recent' as const,
        })),
      },
    ],
  };
}
~~~

Never manufacture scores. When the current module has no valid evidence, use one `missing` item with a data-collection action.

- [ ] **Step 4: Implement EvidenceDock presentation**

Use semantic `aside aria-label="Bằng chứng và việc đến hạn"`. Support collapse/expand, Escape, focus restoration, persisted preference, and module-specific headings. Unique IDs:

~~~text
shell.evidence.collapse
shell.evidence.expand
shell.evidence.open-due-review
shell.evidence.resume-latest
shell.evidence.open-context
~~~

- [ ] **Step 5: Add E2E for module switching and Mock hiding**

Add assertions that Vocabulary and Media change contextual section text, collapse survives reload, and entering the existing Mock exam hides the dock.

Run:

~~~bash
npx vitest run src/lib/__tests__/evidenceDock.test.ts
npx playwright test e2e/app-shell-redesign.spec.ts --project=chromium-desktop
~~~

Expected: pass.

- [ ] **Step 6: Commit Evidence Dock**

~~~bash
git add src/lib/evidenceDock.ts src/lib/__tests__/evidenceDock.test.ts src/components/shell/EvidenceDock.tsx src/App.tsx e2e/app-shell-redesign.spec.ts
git commit -m "feat: add module-sensitive Evidence Dock"
~~~

## Task 7: Add mobile grouping and Review & Progress entry

**Owner:** Large coding task suitable for Grok

**Files:**
- Create: `src/components/shell/MobileNavigation.tsx`
- Create: `src/components/shell/MobileModuleSheet.tsx`
- Modify: `src/components/BottomNav.tsx`
- Modify: `src/App.tsx`
- Modify: `e2e/app-navigation.spec.ts`
- Modify: `e2e/accessibility.spec.ts`
- Modify: `e2e/app-shell-redesign.spec.ts`

**Interfaces:**
- Consumes: `MOBILE_DESTINATIONS`, `CANONICAL_MODULES`, existing functional `review_progress` view.
- Produces: five mobile destinations and a modal/sheet module directory.

- [ ] **Step 1: Write failing mobile E2E**

~~~ts
test('mobile navigation groups seven modules into five destinations', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Điều hướng di động' });
  await expect(nav.getByRole('button')).toHaveCount(5);

  await nav.getByRole('button', { name: 'Learn' }).click();
  for (const label of ['Sources & Library', 'Vocabulary', 'Grammar & Strategy', 'Media Lab']) {
    await expect(page.getByRole('dialog').getByRole('button', { name: new RegExp(label) })).toBeVisible();
  }

  await page.keyboard.press('Escape');
  await nav.getByRole('button', { name: 'Review' }).click();
  await expect(page.getByRole('heading', { name: 'Ôn lỗi đến hạn' })).toBeVisible();
});
~~~

- [ ] **Step 2: Run and verify RED**

~~~bash
npx playwright test e2e/app-shell-redesign.spec.ts --project=chromium-mobile
~~~

Expected: FAIL because the current mobile bar exposes eight scrolling modules.

- [ ] **Step 3: Implement mobile navigation and sheets**

Behaviour:

- Home navigates directly to Dashboard.
- Learn opens a focus-trapped sheet listing four Learn modules.
- Practice opens a focus-trapped sheet listing IELTS Practice and IELTS Mock.
- Review navigates directly to Review & Progress.
- More opens functional Tutor, Profile, Voice Library entry, Privacy entry and Theme entry. If a destination is not yet implemented, do not render it as a button in this plan.
- Sheet closes after navigation, on Escape, and on explicit Close; focus returns to the initiating bottom-nav button.
- The bar never scrolls horizontally at 360 px.

Compatibility facade:

~~~ts
export { MobileNavigation as BottomNav } from './shell/MobileNavigation';
~~~

- [ ] **Step 4: Update navigation and accessibility fixtures**

Replace visible `knowledge` navigation expectations with `review_progress`. Keep a direct compatibility test proving `knowledge` can still render when invoked programmatically, but it is absent from canonical navigation.

- [ ] **Step 5: Run mobile/desktop navigation tests**

~~~bash
npx playwright test e2e/app-shell-redesign.spec.ts e2e/app-navigation.spec.ts --project=chromium-desktop
npx playwright test e2e/app-shell-redesign.spec.ts e2e/app-navigation.spec.ts --project=chromium-mobile
npx playwright test e2e/accessibility.spec.ts
~~~

Expected: pass with no page errors.

- [ ] **Step 6: Commit mobile grouping**

~~~bash
git add src/components/shell src/components/BottomNav.tsx src/App.tsx e2e
git commit -m "feat: group mobile navigation around learner jobs"
~~~

## Task 8: Introduce scoped UX Contract v2 proof for the migrated shell

**Owner:** Coding/quality worker

**Files:**
- Modify: `src/lib/uxFlowContracts.ts`
- Modify: `scripts/check-ux-contracts.ts`
- Modify: `src/lib/__tests__/uxFlowContracts.test.ts`
- Modify: all new shell/dashboard components from Tasks 4–7
- Modify: `e2e/app-shell-redesign.spec.ts`

**Interfaces:**
- Consumes: literal shell `data-ux-control` IDs and executable E2E.
- Produces:
  - `UxControlContract`
  - `UX_CONTROL_CONTRACTS`
  - scoped checker enforcing control-level proof on `app-shell-v2`.

- [ ] **Step 1: Write failing control-contract tests**

Add:

~~~ts
import {
  auditMigratedControlScope,
  validateUxControlContracts,
  type UxControlContract,
} from '../uxFlowContracts';

const control: UxControlContract = {
  id: 'shell.nav.sources',
  flowId: 'app.navigation',
  owner: 'AppShell',
  preconditions: ['shell visible'],
  action: 'activate Sources',
  beforeState: 'dashboard',
  afterState: 'sources',
  sideEffects: ['set active module'],
  failureCategories: ['route_unavailable'],
  recoveryActions: ['return to dashboard'],
  evidence: ['e2e/app-shell-redesign.spec.ts'],
};

it('requires unique control contracts and executable evidence', () => {
  expect(validateUxControlContracts([control, control])).toEqual(
    expect.arrayContaining([expect.stringContaining('Duplicate control id')]),
  );
});

it('requires data-ux-control inside a migrated v2 scope', () => {
  const issues = auditMigratedControlScope(
    '<nav data-ux-scope="app-shell-v2"><button data-ux-flow="app.navigation" onClick={() => go()}>Go</button></nav>',
    'src/components/shell/Test.tsx',
    [control],
  );
  expect(issues).toEqual([expect.stringContaining('missing data-ux-control')]);
});
~~~

- [ ] **Step 2: Run and verify RED**

~~~bash
npx vitest run src/lib/__tests__/uxFlowContracts.test.ts
~~~

Expected: FAIL because v2 types and audit do not exist.

- [ ] **Step 3: Add the v2 contract schema and registry**

~~~ts
export interface UxControlContract {
  id: string;
  flowId: string;
  owner: string;
  preconditions: string[];
  action: string;
  beforeState: string;
  afterState: string;
  sideEffects: string[];
  failureCategories: string[];
  recoveryActions: string[];
  evidence: string[];
}
~~~

Register every migrated shell control. The checker validates unique ID, registered flow, non-empty transition fields, existing evidence file, and evidence-file mention of the control ID.

- [ ] **Step 4: Add incremental scope enforcement**

`auditMigratedControlScope` walks JSX descendants of an element carrying literal `data-ux-scope="app-shell-v2"`. Every native interactive descendant must use literal, unique, registered `data-ux-control` and existing `data-ux-flow`. Existing non-migrated modules remain on flow-level contracts until their own plan marks them v2; this is the explicit strangler boundary, not a silent exemption.

Update `check-ux-contracts.ts` to print both counts:

~~~text
UX contract gate passed: N native controls mapped to M flow contracts; X migrated app-shell controls mapped to Y control contracts.
~~~

- [ ] **Step 5: Add control IDs to E2E assertions**

E2E must activate every registered shell control at least once or reference it in a table-driven assertion. Cover nav, header, theme, Daily Coach, Evidence Dock, mobile sheets, Review, collapse and recovery.

- [ ] **Step 6: Run unit and UX gates**

~~~bash
npx vitest run src/lib/__tests__/uxFlowContracts.test.ts
npm run check:ux-contracts
~~~

Expected: pass; existing legacy flow count remains covered and migrated shell controls report zero omissions.

- [ ] **Step 7: Commit UX Proof v2**

~~~bash
git add src/lib/uxFlowContracts.ts src/lib/__tests__/uxFlowContracts.test.ts scripts/check-ux-contracts.ts src/components e2e/app-shell-redesign.spec.ts
git commit -m "test: prove Focus Dock control transitions"
~~~

## Task 9: Close accessibility, responsive, visual and release gates

**Owner:** Coordinator plus quality worker

**Files:**
- Modify: `e2e/app-shell-redesign.spec.ts`
- Modify: `e2e/accessibility.spec.ts`
- Modify: `playwright.config.ts`
- Create: `e2e/__screenshots__/app-shell-redesign.spec.ts/focus-dock-desktop.png`
- Create: `e2e/__screenshots__/app-shell-redesign.spec.ts/focus-dock-mobile.png`
- Create: `.impeccable/review/focus-dock-desktop.png`
- Create: `.impeccable/review/focus-dock-mobile.png`
- Create: `.impeccable/review/focus-dock-comparison.png`
- Modify: `docs/product/public-beta-capability-audit.md`

**Interfaces:**
- Consumes: completed shell, approved comp, all shell UX control contracts.
- Produces: deterministic desktop/mobile visual baselines, accessibility evidence, final shell audit update.

Configure a platform-stable snapshot location in `playwright.config.ts`:

~~~ts
snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
~~~

Use distinct `focus-dock-desktop.png` and `focus-dock-mobile.png` names so the two projects never overwrite one another. Generate baselines in the same pinned CI Chromium environment used for future comparisons; local Windows captures remain review artifacts under `.impeccable/review`.

- [ ] **Step 1: Add failing accessibility and theme scenarios**

Add tests for:

- keyboard-only traversal through header, navigation, Daily Coach, dock and mobile sheet;
- Escape and focus restoration for all shell menus/sheets;
- 200% zoom at 1280 px without hidden controls or horizontal document overflow;
- `prefers-reduced-motion: reduce`;
- System→Dark media-query update;
- Light/Dark/High Contrast semantic state;
- offline connectivity text without toast spam;
- Evidence Dock state not encoded only by red;
- Mock Exam hides shell and exit restores it.

Use:

~~~ts
const documentOverflow = await page.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
);
expect(documentOverflow).toBe(false);
~~~

- [ ] **Step 2: Run targeted scenarios and verify any failures are real**

~~~bash
npx playwright test e2e/app-shell-redesign.spec.ts e2e/accessibility.spec.ts
~~~

Expected before fixes: any remaining focus, contrast, overflow or theme issue fails with a specific assertion. Do not update screenshots over a failing functional state.

- [ ] **Step 3: Fix all material issues in one batch**

Apply semantic markup, focus-visible styling, inert/background management for sheets, overflow fixes, touch targets, reduced-motion rules, and theme-specific colour corrections. Do not add decorative animation during this pass.

- [ ] **Step 4: Capture and compare approved composition**

Capture desktop and mobile from the document top with animations disabled. Open both generated captures and the approved Focus Dock comp. Create `focus-dock-comparison.png` showing approved reference, desktop build and mobile build at legible sizes. Check:

- identity scale and seven-node clarity;
- left nav width and central-canvas dominance;
- Evidence Dock hierarchy;
- one-primary-plus-two-alternative Daily Coach;
- mobile five-destination bar;
- no cropped text, bad radius, misaligned icon, overflow, unreadable muted text, or fake control.

Only after coordinator visual approval, generate Playwright baselines:

~~~ts
test('Focus Dock visual baseline', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const name = testInfo.project.name === 'chromium-mobile'
    ? 'focus-dock-mobile.png'
    : 'focus-dock-desktop.png';
  await expect(page).toHaveScreenshot(name, {
    animations: 'disabled',
    fullPage: true,
    maxDiffPixelRatio: 0.01,
  });
});
~~~

~~~bash
npx playwright test e2e/app-shell-redesign.spec.ts --update-snapshots
npx playwright test e2e/app-shell-redesign.spec.ts
~~~

- [ ] **Step 5: Run the full deterministic release gate**

Run:

~~~bash
npm run check:product-docs
npm test
npm run check:ux-contracts
npm run lint
npm run build
npx playwright test e2e/app-shell-redesign.spec.ts e2e/app-navigation.spec.ts e2e/dashboard.spec.ts e2e/accessibility.spec.ts
npm run check:beta
git diff --check
~~~

Expected: every command exits zero. Live-provider canaries are not required for this shell-only branch and must not be reported as passing.

- [ ] **Step 6: Update capability audit truthfully**

Record the shell capability as deterministic-verified only. Include:

- exact commit SHA;
- desktop/mobile E2E count;
- theme/accessibility results;
- UX v2 control count;
- build result and any non-blocking bundle warning;
- explicit statement that module internals and provider canaries are outside this plan.

- [ ] **Step 7: Commit final proof**

~~~bash
git add e2e .impeccable/review docs/product/public-beta-capability-audit.md
git commit -m "test: verify OMNI Focus Dock across devices"
~~~

- [ ] **Step 8: Push for coordinator review without merging**

~~~bash
git status --short
git log --oneline origin/main..HEAD
git push -u origin HEAD
~~~

Expected: clean worktree, feature branch pushed, no force-push, no merge. Final report lists branch, commits, changed files, exact gate outputs, screenshot paths, known risks, and whether live canaries were run.

## Plan self-review

- Spec coverage for the first vertical slice: product deltas, brand, typography, semantic tokens, Focus Dock, Daily Coach, Evidence Dock, mobile grouping, Review entry, themes, accessibility and UX proof are assigned to Tasks 1–9.
- Explicitly deferred to separately named program plans: Sources internals, Media Learning Room, Practice engines, Mock generation/exam internals, Vocabulary/Grammar internals, Tutor/Voice/BYOK backend, privacy storage, offline data adapters and whole-product release.
- Type consistency: `ThemePreference`, `EvidenceDockState`, `DailyCoachModel`, `EvidenceDockModel`, `UxControlContract`, canonical module IDs and control IDs have one definition each.
- No step permits fake data, a decorative control, raw error output, a public private-bridge dependency, an unvalidated logo asset, or a merge by the implementation worker.
