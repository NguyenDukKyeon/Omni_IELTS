# Realtime IELTS Speaking Room

Epic: LiveKit Cloud + LiveKit Agents Node, Gemini Live examiner, and an honest turn-based recording fallback.

This document is the product/engineering contract. Implementation must not fake realtime, transcripts, telemetry, or band scores.

## Goals

- Authenticated learners can open a cloud realtime speaking exam.
- Guests can still practice Speaking in **Thu âm từng lượt**. They cannot mint LiveKit rooms or tokens.
- Gemini BYOK never touches disk, room metadata, participant metadata, logs, analytics, or error payloads.
- Acoustic metrics are computed only from real audio / VAD timestamps. Missing audio ⇒ `unavailable`, never a default band/WPM/pause count.

## State machine

Canonical states:

```
idle
  → requesting_permission
  → connecting
  → part_1
  → part_2_preparation
  → part_2_speaking
  → part_3
  → finalizing
  → completed
```

Error / recovery states:

```
permission_denied
connection_lost
provider_unavailable
quota_exhausted
fallback_turn_based
failed
```

Allowed transitions are exhaustive in `src/lib/speakingStateMachine.ts`. Illegal transitions throw and are rejected by the API. Resume from `connection_lost` returns to the **current part**, not to `idle`.

Exam timing:

| Part | Behaviour |
| --- | --- |
| Part 1 | Short familiar-topic questions. Controlled barge-in. Examiner stops after one question and waits. |
| Part 2 preparation | Cue card, 60s notes, examiner silent. |
| Part 2 speaking | Up to 120s long turn. Examiner does not barge in. |
| Part 3 | Discussion questions grounded in the Part 2 topic. Controlled barge-in. |

The examiner never talks over the candidate indefinitely. Max examiner utterance is bounded; after speaking, the agent waits for the learner or a timeout.

## Boundary: frontend / backend / LiveKit agent

```
Browser (React + livekit-client)
  └─ POST /api/livekit/session   (TLS, Supabase Bearer, optional x-gemini-api-key)
Express (token mint, session store, one-time credential store)
  ├─ LiveKit Cloud room + participant token
  └─ Agent dispatch (job metadata = sessionId + credentialId, never the API key)
LiveKit Agent worker (Node)
  └─ POST /api/livekit/credentials/redeem  (internal secret, one-shot)
       └─ Gemini Live RealtimeModel (native audio)
```

- The browser never receives a Gemini key from the server and never writes one to `localStorage`.
- The client never self-issues a LiveKit token.
- Room / participant metadata contain `sessionId` only.
- Job metadata contains `{ sessionId, credentialId, voiceId, requestId }`.

### Frontend

- Requests microphone permission before connecting.
- Publishes **microphone only**. No webcam, no gesture scoring.
- Renders UX states: loading, connected, reconnecting, success, empty, permission denied, quota exhausted, provider unavailable, network failure, fallback, completed.
- Uses the shared `VoicePicker`. Realtime audio comes from Gemini Live. Turn-based uses validated Gemini TTS or browser voice fallback.

### Backend (Express)

- `POST /api/livekit/session` — auth required, rate-limited, max 1 concurrent session per user, TTL 20 minutes.
- `GET /api/livekit/session/:id` — owner-only status.
- `DELETE /api/livekit/session/:id` — end exam, destroy credential, delete room.
- `POST /api/livekit/session/:id/transition` — learner-owned state change; server is canonical.
- `POST /api/livekit/session/:id/agent-event` — agent-only, constant-time secret, generic 404 if unauthorized.
- `POST /api/livekit/session/:id/provider-cutoff` — learner-owned; destroys credential and enters `fallback_turn_based`.
- `POST /api/livekit/credentials/redeem` — agent-only, one-shot.
- `POST /api/speaking/analyze` — Zod-validated; identity from verified Bearer token (never `x-omni-user-id`); no audio ⇒ acoustic metrics `unavailable` and no invented band; consent false ⇒ no artifact write.

### LiveKit Agent

- Joins the dispatched room as `omni-ielts-examiner`.
- Redeems the one-time credential, constructs `google.beta.realtime.RealtimeModel`.
- Default model: `gemini-2.5-flash-native-audio-preview-12-2025` (override with `GEMINI_LIVE_MODEL`).
- Drives the exam via instructions + data-channel exam events.
- If Gemini Live or LiveKit is unavailable, Express marks the session `fallback_turn_based` and the UI says so explicitly.

## BYOK protection

1. Learner key travels only on TLS (`x-gemini-api-key` or JSON body field that is stripped before the response).
2. Server stores it in an in-memory one-time credential with TTL 60s.
3. Agent redeems **once**. The record is destroyed on redeem, expiry, session end, or process restart.
4. Forbidden sinks: database, `localStorage`, LiveKit room metadata, participant metadata, logs, analytics, error responses.
5. Tests assert redaction: a planted key never appears in `JSON.stringify(response)` or captured log lines.

Server-managed `GEMINI_API_KEY` may be used when the learner did not supply BYOK. It follows the same in-memory one-time handoff to the agent — it is still not written to metadata or logs.

## Fallback: Thu âm từng lượt

Triggered when:

- the learner is not signed in
- LiveKit env is missing
- Gemini Live / agent dispatch fails
- quota is exhausted
- the learner clicks **Chuyển sang thu âm từng lượt**

UI copy is explicit: this is **not** realtime. The learner reads the question, records, taps **Kết thúc câu trả lời**, then submits. Existing Silero VAD + `/api/speaking/analyze` are reused. No fake duplex audio.

## Telemetry and privacy

Deterministic metrics from transcript + VAD timestamps (`src/lib/speakingTelemetry.ts`):

- raw WPM
- articulation rate
- filler count / rate
- silent pauses
- long pauses
- speech ratio
- Part 1 / 2 / 3 trend

Gemini may **interpret** those numbers and comment on prosody from real audio. It must not invent WPM, pause counts, or pronunciation scores when audio is missing. Client and API both display `unavailable`.

Privacy:

- Raw microphone audio is **not** persisted.
- Transcript, telemetry, and feedback are stored only when the consent toggle is on.
- Revoking consent blocks new artifact writes immediately.
- No webcam, no pose/gesture scoring.

## Quota and session limits

| Limit | Default |
| --- | --- |
| Session TTL | 20 minutes |
| Concurrent sessions / user | 1 |
| Create-session rate | 5 / 10 minutes / user |
| Credential TTL | 60 seconds |
| Credential redeem | exactly once |

Quota / provider failures surface as `quota_exhausted` or `provider_unavailable` and offer fallback — they never silently continue as “realtime”.

## Acceptance tests

Unit / API:

- Part 1 → Part 2 → Part 3 transitions succeed; illegal transitions are rejected.
- Credential redeem is one-shot; expired credentials fail.
- API key never appears in logs or JSON responses.
- Rate limit and max concurrent sessions hold.
- No audio ⇒ acoustic metrics `unavailable`.
- Deterministic VAD fixture matches expected metrics within 0 error.
- `consent: false` ⇒ no transcript/telemetry artifact.
- Provider quota ⇒ `fallback_turn_based`.

Deterministic E2E (desktop + mobile):

- Open Speaking Room → grant mic → complete one turn.
- Deny mic → permission recovery UI.
- LiveKit unavailable → explicit turn-based fallback.
- Reconnect keeps the current part.
- Complete Part 1/2/3 → report.
- No uncaught `pageerror` / console error.
- Trace + screenshot around state transitions.

Live canary:

- Real LiveKit room/token.
- Agent asks at least one question.
- Client sends one audio turn; examiner responds.
- Intentional provider cut-off runs the fallback canary.
- Missing credentials/quota **fail the canary**. No fake pass.
