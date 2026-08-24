import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('private Gemini Web bridge deployment', () => {
  it('pins the maintained authenticated upstream and stays behind an opt-in Docker profile', () => {
    const compose = readFileSync(resolve(root, 'compose.media.yml'), 'utf8');
    const section = compose.split(/\n  gemini-web2api:\s*\n/)[1]?.split(/\n  [a-zA-Z0-9_-]+:\s*\n/)[0] || '';

    expect(section).toContain('private-web-bridge');
    expect(section).toContain('GEMINI_WEBAPI_COMMIT: 955746dad14dae37c18bd766f34c8cd397ad50d4');
    expect(section).not.toMatch(/^\s+ports:/m);
    expect(section).not.toMatch(/^\s+env_file:/m);
    expect(section).toContain('WEB_AI_BRIDGE_API_KEY');
    expect(section).toContain('/v1/models');
  });

  it('requires an authenticated cookie file and prefers Flash Extended before Pro Extended', () => {
    const entrypoint = readFileSync(resolve(root, 'infra/gemini-web2api/entrypoint.py'), 'utf8');

    expect(entrypoint).toContain('GeminiClient');
    expect(entrypoint).toContain('"/run/secrets/gemini-cookie.json"');
    expect(entrypoint).toContain('"__Secure-1PSID"');
    expect(entrypoint).toContain('"__Secure-1PSIDTS"');
    expect(entrypoint).toContain('PRIMARY_MODEL = os.environ.get("WEB_AI_BRIDGE_PRIMARY_MODEL", "gemini-flash")');
    expect(entrypoint).toContain('FALLBACK_MODEL = os.environ.get("WEB_AI_BRIDGE_FALLBACK_MODEL", "gemini-pro")');
    expect(entrypoint).toContain('def has_available_model(client: GeminiClient) -> bool:');
    expect(entrypoint).toContain('asyncio.timeout(MODEL_ATTEMPT_TIMEOUT_SEC)');
    expect(entrypoint).toContain('extended_thinking=request.reasoning_effort == "high"');
    expect(entrypoint).not.toContain('"cookie_file": None');
    expect(entrypoint).toContain('temporary=True');
    expect(entrypoint).toContain('logger.remove()');
    expect(entrypoint).not.toMatch(/print\([^)]*(?:key|cookie)/i);
  });

  it('mounts the session file read-only without passing cookie content through environment variables', () => {
    const compose = readFileSync(resolve(root, 'compose.media.yml'), 'utf8');
    const section = compose.split(/\n  gemini-web2api:\s*\n/)[1]?.split(/\n  [a-zA-Z0-9_-]+:\s*\n/)[0] || '';

    expect(section).toContain('source: ${WEB_AI_BRIDGE_COOKIE_HOST_PATH');
    expect(section).toContain('target: /run/secrets/gemini-cookie.json');
    expect(section).toContain('read_only: true');
    expect(section).not.toMatch(/WEB_AI_BRIDGE_COOKIE(?:=|:)/);
  });

  it('requires live generation evidence from the authenticated Flash-first extended-thinking chain', () => {
    const canary = readFileSync(resolve(root, 'scripts/web-bridge-live-canary.mjs'), 'utf8');
    const server = readFileSync(resolve(root, 'server.ts'), 'utf8');
    const releaseGate = readFileSync(resolve(root, 'scripts/public-beta-gate.mjs'), 'utf8');

    expect(canary).toContain("const publicModel = process.env.WEB_AI_BRIDGE_MODEL?.trim() || 'gemini-3.1-pro'");
    expect(canary).toContain("payload.sessionStatus !== 'authenticated'");
    expect(canary).toContain('payload.model !== publicModel');
    expect(canary).toContain("payload.thinkingMode !== 'extended'");
    expect(canary).toContain("payload.attemptedModels?.[0] !== 'gemini-flash'");
    expect(canary).toContain("!['gemini-flash', 'gemini-pro'].includes(payload.resolvedModel)");
    expect(server).toContain("sessionStatus: 'authenticated'");
    expect(server).toContain("resolvedModel: result.bridgeMetadata.resolvedModel");
    expect(releaseGate).toContain("'test:web-bridge:live'");
  });

  it('ships the AGPL source notice required by the maintained bridge dependency', () => {
    const notice = readFileSync(resolve(root, 'infra/gemini-web2api/NOTICE.md'), 'utf8');
    const dockerfile = readFileSync(resolve(root, 'infra/gemini-web2api/Dockerfile'), 'utf8');

    expect(notice).toContain('HanaokaYuzu/Gemini-API');
    expect(notice).toContain('AGPL-3.0');
    expect(dockerfile).toContain('COPY --from=source /source/LICENSE');
  });

  it('does not send grounded forecast synthesis to Gemini Web', () => {
    const server = readFileSync(resolve(root, 'server.ts'), 'utf8');
    const forecastSynthesis = server.split('const synthesizeEvidence = async')[1]
      ?.split('const providerAttempts =')[0] || '';

    expect(forecastSynthesis).not.toContain('getHealthyWebBridgeClient');
    expect(forecastSynthesis).toContain("taskTier: 'balanced'");
  });

  it('keeps the dedicated Chrome profile accessible to the current Windows user', () => {
    const broker = readFileSync(resolve(root, 'scripts/web-bridge-session.ts'), 'utf8');

    expect(broker).toContain('await restrictToCurrentUser(paths.profile)');
    expect(broker).toContain("upsert(lines, 'WEB_AI_BRIDGE_MODEL', 'gemini-3.1-pro', true)");
    expect(broker).not.toContain('await browser.close()');
  });

  it('cancels stalled Web generations before they can retain the single-flight lock', () => {
    const compose = readFileSync(resolve(root, 'compose.media.yml'), 'utf8');
    const entrypoint = readFileSync(resolve(root, 'infra/gemini-web2api/entrypoint.py'), 'utf8');
    const canary = readFileSync(resolve(root, 'scripts/web-bridge-live-canary.mjs'), 'utf8');

    expect(compose).toContain('WEB_AI_BRIDGE_REQUEST_TIMEOUT_SEC');
    expect(entrypoint).toContain('asyncio.timeout(REQUEST_TIMEOUT_SEC)');
    expect(entrypoint).toContain('detail="provider_timeout"');
    expect(canary).toContain('AbortSignal.timeout');
  });

  it('bounds the complete official fallback chain after a deep Web failure', () => {
    const server = readFileSync(resolve(root, 'server.ts'), 'utf8');

    expect(server).toContain('const directFallbackBudgetMs = officialLaneBudgetMs || profile.timeoutMs');
    expect(server).toContain('totalTimeoutMs: directFallbackBudgetMs');
  });

  it('runs every live canary against the same explicitly selected app instance', () => {
    const releaseGate = readFileSync(resolve(root, 'scripts/public-beta-gate.mjs'), 'utf8');
    const liveConfig = readFileSync(resolve(root, 'playwright.live.config.ts'), 'utf8');

    expect(releaseGate).toContain("import dotenv from 'dotenv'");
    expect(releaseGate).toContain('dotenv.config({ quiet: true })');
    expect(releaseGate).toContain('PLAYWRIGHT_LIVE_BASE_URL');
    expect(releaseGate).toContain('OMNI_CANARY_BASE_URL');
    expect(liveConfig).toContain('process.env.PLAYWRIGHT_LIVE_BASE_URL');
    expect(liveConfig).toContain('webServer: externalLiveBaseUrl ? undefined');
  });
});
