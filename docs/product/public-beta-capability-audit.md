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

Omni IELTS enforces a two-tier quality gate contract:

1. **Deterministic Credential-Free Gate (`npm run check:beta` / `npm run check:gate`)**:
   - Executes unit/API regressions (`npm test`), UX contract AST checker (`npm run check:ux-contracts`), TypeScript typecheck (`npm run lint`), production client/server bundle (`npm run build`), and deterministic Playwright E2E (`npm run test:e2e`).
   - Hermetic and credential-free; runs on every pull request and push to `main` via `.github/workflows/public-beta-quality.yml`.
   - Confirms code correctness, UX state transitions, accessibility, and graceful fallback handling without requiring external secrets or claiming false provider health.

2. **Explicit Live Provider Canary Gate (`npm run check:canary:live` / `npm run check:live`)**:
   - Executes the live Playwright provider suite (`npm run test:e2e:live`) against the public product lanes: grounded Forecast, YouTube import, adaptive Vocabulary, and staged Mock assembly.
   - Requires the official/free-first provider credentials configured for those product lanes (for example `GEMINI_API_KEY`, `GROQ_API_KEY`, and search credentials).
   - Runs on scheduled and manual GitHub Actions workflows (`.github/workflows/live-provider-canary.yml`) or via explicit operator invocation.
   - Hard-fails clearly if secrets, quotas, or upstream providers are unavailable. Never produces fake success or silently passes.

   The authenticated private Web Bridge remains an opt-in local fallback and has its own strict canary (`npm run check:web-bridge:live`). It is not a public beta release dependency because it relies on a private browser session rather than the supported public provider contract.

3. **Full Release Gate (`npm run check:release` / `npm run check:release:full`)**:
   - Executes both the deterministic gate and the live provider canaries sequentially (`--mode=full`).
   - A release cannot be approved from deterministic evidence alone; `npm run check:release` enforces the complete release contract.

### Beta readiness and canary freshness rule

Beta release readiness strictly requires **both**:
1. A passing deterministic gate (`npm run check:beta`) on the release commit.
2. Concrete, fresh evidence of a successful Live Provider Canary run (`npm run check:canary:live`) that is **no older than 24 hours**.

#### Freshness evidence source
- Concrete evidence must be recorded as the GitHub Actions **Live Provider Canary** workflow run URL, conclusion (`success`), and execution timestamp for the exact release commit SHA, or an equivalently recorded operator execution log with matching timestamp and commit hash.
- Ordinary PR / push CI passing proves deterministic correctness only and explicitly does NOT claim or substitute for live provider health.
