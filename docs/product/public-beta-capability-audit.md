# Omni IELTS Public Beta Capability Audit

Audit date: 2026-08-23
Owner: Omni IELTS engineering
Release rule: any open P0/P1 blocks Public Beta.

## Rating model

Each journey is reviewed for: journey completion, correctness, reliability, learning value, accessibility, and performance. A CTA passes only when it owns a clear state transition and has executable evidence.

## Findings and disposition

| Area | Finding | Priority | Disposition and evidence |
|---|---|---:|---|
| Mock | Orchestrator CTA previously closed its modal without handing a validated package to the exam room. | P0 | Fixed. Staged `MockBuild` creates Listening, Reading, Writing and Speaking independently, validates each skill, finalizes exactly 40/40/2/3, then passes `fullPackage` to `MockTestView`. Validator regression coverage is in `src/lib/__tests__/mockPackageValidator.test.ts`. |
| Mock | Reload could lose an assembled test and answers. | P1 | Fixed. A private local attempt snapshot persists package, skill, timer, answers and flags; raw microphone audio is deliberately excluded. The dashboard exposes “Tiếp tục bài thi”. |
| Forecast | A failed live refresh could be presented as current real-exam data. | P0 | Fixed. Refresh returns unavailable/stale status rather than seeded “live” content. Items need claim-level source support before `verified_report`; uncertain items become forecast/derived practice. |
| Mock/Forecast | “Official” and “100% real exam” labels were used for bundled/generated content. | P0 | Fixed. Bundled and generated content is labelled IELTS-style/AI-generated and not official. Provenance is retained when a Live Hub item is converted. |
| Media | Rolling captions were truncated and merged into a small lesson. | P0 | Fixed. Pinned/checksummed yt-dlp prefers manual English then auto English, normalizes rolling VTT without the old text/sentence cap, and preserves full timestamps. Regression fixture covers long rolling captions. |
| Media | No-caption videos could lead to fabricated transcript fallback. | P0 | Fixed. Audio is downloaded only under 25 minutes/14 MB, transcribed from real inline audio, and deleted in `finally`; otherwise the endpoint returns unavailable. |
| Shadowing/Dictation | Practice could substitute synthetic speech for the original YouTube audio. | P1 | Fixed. Both modes share the timestamp-aware YouTube IFrame player. Dictation uses word-level edit distance; Shadowing refuses acoustic/pronunciation scores without recorded audio. |
| Speaking | WPM/pause/pronunciation defaults were displayed when audio telemetry was absent. | P0 | Fixed on the canonical route. Silero VAD segments feed deterministic server metrics; absent audio returns unavailable. Transcript-only scoring route is retired. |
| Reading | Text-anchored annotations could highlight the wrong duplicate phrase and disappear on reload. | P1 | Fixed. Anchors use attempt, passage, paragraph and offsets with overlap-safe rendering and autosave. Annotations are not included in grader payloads. |
| Mistakes | Substring matching accepted wrong answers and every item entered the daily queue. | P1 | Fixed. Due selection, canonical/accepted variants, archive at stage 5, relapse reopening, and exact answer matching have unit coverage. |
| Voice | The first browser voice was used everywhere while Gemini TTS was disconnected. | P1 | Fixed. Shared Browser/Gemini providers, all available system voices, the 30-voice Gemini catalog, use-case defaults, preview, private cache and browser fallback are exposed through one Voice Picker. |
| Data | Full private artifacts had no documented row ownership contract. | P1 | Fixed at schema level. Supabase migration enables owner RLS for snapshots and private artifacts; OAuth/BYOK/sync controls are in Profile. Deployment still needs the operator to apply the migration and configure public Supabase environment variables. |

## Required journey ownership

| Journey | Primary CTA owner | Expected state transition | Evidence |
|---|---|---|---|
| Dashboard → recommended action | `DashboardView` / app navigation | recommendation → target module | Browser smoke plus TypeScript build |
| Source/Live Hub → Practice | `ForecastLiveHub` | sourced item → derived practice with provenance | `/api/live-hub/items/:id/practice`; Forecast UI smoke |
| Source/Live Hub → Mock | `ForecastLiveHub` + `MockOrchestratorModal` | sourced item → staged MockBuild → ready package | staged API and mock validator tests |
| Vocabulary review | `VocabularySRSView` | due → answered → scheduled/mastered | existing SRS state plus no simulated pronunciation result |
| Grammar → Mistake Drill | Grammar modules + `AppContext` | detected error → active mistake → due drill | lifecycle regression tests |
| Media import | `YouTubeUrlInputModal` | URL → complete transcript version → studio | transcript normalizer regression and endpoint quality gates |
| Shadowing/Dictation | shared original player | segment → attempt → real score/progress | word diff tests and microphone-unavailable state |
| Mock exam | `MockTestView` | package → attempt → four skills → evaluation/report/history | staged validator, resume snapshot, browser smoke |
| Tutor research | `FloatingAITutor` | chat → explicit research → cited response → Idea Bank candidate | Zod response contract and claim-level grounding metadata |
| Profile/data | `LearnerProfileView` | OAuth/BYOK → private sync → session restore | RLS migration and settings UI smoke |

## Essential versus later work

- Essential learning capability: the P0/P1 fixes above, staged mock generation, provenance, full transcript import, deterministic mistake/voice telemetry, and truthful unavailable states.
- Quality improvement: richer transcript editing/version history, more Dictation exercise generators, and calibrated personal fluency ranges after collecting consented aggregate data.
- Post-beta: durable server-side MockBuild workers/queues, shared public forecast metadata moderation, and expanded automated cross-browser/device coverage.
- Reject: unofficial Edge TTS scraping, invented “real exam” frequency/date labels, transcript-only pronunciation bands, automatic Search on every tutor message, and any synthetic score presented as measured.

## Release verification

Run `npm run check:release` (the legacy alias `check:beta` runs the same gate). The gate now executes unit/API regressions, the UX contract checker, TypeScript, the production client/server bundle, deterministic Playwright flows on desktop/mobile, WCAG AA checks, and the live-provider canary.

Current UX inventory on `fix/ux-contracts-live-hub`: 645 native controls map to 18 owned contracts. The TypeScript AST checker rejects unregistered controls, unknown flow IDs, missing executable evidence, decorative buttons/links, and editable forms/fields without a handler or submit transition. Deterministic E2E keeps trace and screenshot evidence and rejects unexpected `pageerror`/console errors.

Release status on 2026-08-23: deterministic gates pass, but the real Gemini Search Grounding canary is blocked by `quota_exhausted`. This branch must remain unmerged until `npm run test:e2e:live` passes with a valid key/quota. A quota failure remains a truthful Vietnamese unavailable state and never produces seeded or fabricated live content.
