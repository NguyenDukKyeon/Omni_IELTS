import { describe, expect, it } from 'vitest';
import {
  createSerialExecutor,
  executeWithPreferredWebBridge,
  getConfiguredWebBridgeSessionStatus,
  isGeminiAuthenticatedUi,
  resolveWebBridgeSessionStatusForTier,
  selectGeminiSessionCookies,
  shouldPreferWebBridgeForTier,
} from '../webBridgeSession';

describe('Gemini Web Pro local session', () => {
  it('keeps only the Gemini authentication cookie allowlist', () => {
    const selected = selectGeminiSessionCookies([
      { name: 'SAPISID', value: 'sapisid-secret', domain: '.google.com', expires: 4_000_000_000 },
      { name: '__Secure-1PSID', value: 'session-secret', domain: '.google.com', expires: 4_000_000_000 },
      { name: '__Secure-1PSIDCC', value: 'session-cc-secret', domain: '.google.com', expires: 4_000_000_000 },
      { name: '__Secure-3PSID', value: 'third-party-session-secret', domain: '.google.com', expires: 4_000_000_000 },
      { name: 'SIDCC', value: 'sidcc-secret', domain: '.google.com', expires: 4_000_000_000 },
      { name: 'NID', value: 'nid-secret', domain: '.google.com', expires: 4_000_000_000 },
      { name: '_ga', value: 'analytics', domain: '.google.com', expires: 4_000_000_000 },
      { name: 'PREF', value: 'not-needed', domain: '.youtube.com', expires: 4_000_000_000 },
      { name: 'SAPISID', value: 'wrong-domain', domain: '.example.com', expires: 4_000_000_000 },
    ]);

    expect(selected.sapisid).toBe('sapisid-secret');
    expect(selected.cookie).toContain('SAPISID=sapisid-secret');
    expect(selected.cookie).toContain('__Secure-1PSID=session-secret');
    expect(selected.cookie).toContain('__Secure-1PSIDCC=session-cc-secret');
    expect(selected.cookie).toContain('__Secure-3PSID=third-party-session-secret');
    expect(selected.cookie).toContain('SIDCC=sidcc-secret');
    expect(selected.cookie).toContain('NID=nid-secret');
    expect(selected.cookie).not.toContain('PREF');
    expect(selected.cookie).not.toContain('_ga');
    expect(selected.cookie).not.toContain('wrong-domain');
  });

  it('fails closed when SAPISID or the secure session cookie is missing', () => {
    expect(() => selectGeminiSessionCookies([
      { name: '__Secure-1PSID', value: 'session-secret', domain: '.google.com', expires: 4_000_000_000 },
    ])).toThrow(/SAPISID/);
    expect(() => selectGeminiSessionCookies([
      { name: 'SAPISID', value: 'sapisid-secret', domain: '.google.com', expires: 4_000_000_000 },
    ])).toThrow(/secure session/i);
  });

  it('rejects a generic Google cookie session while Gemini still shows Sign in', () => {
    expect(isGeminiAuthenticatedUi({
      visibleActions: ['Sign in', 'Settings'],
      ariaLabels: ['Enter a prompt for Gemini'],
    })).toBe(false);
    expect(isGeminiAuthenticatedUi({
      visibleActions: ['Settings'],
      ariaLabels: ['Google Account', 'Enter a prompt for Gemini'],
    })).toBe(true);
  });

  it('routes only deep text work to an authenticated preferred bridge', () => {
    const input = { enabled: true, priority: 'prefer_deep', sessionStatus: 'authenticated' } as const;

    expect(shouldPreferWebBridgeForTier('deep', input)).toBe(true);
    for (const tier of ['instant', 'balanced', 'grounded', 'audio_eval', 'tts'] as const) {
      expect(shouldPreferWebBridgeForTier(tier, input)).toBe(false);
    }
    expect(shouldPreferWebBridgeForTier('deep', { ...input, sessionStatus: 'expired' })).toBe(false);
    expect(shouldPreferWebBridgeForTier('deep', { ...input, enabled: false })).toBe(false);
  });

  it('reports login_required instead of claiming anonymous readiness', () => {
    expect(getConfiguredWebBridgeSessionStatus({
      WEB_AI_BRIDGE_ENABLED: 'true',
      WEB_AI_BRIDGE_COOKIE_HOST_PATH: '',
    }, false)).toBe('login_required');
    expect(getConfiguredWebBridgeSessionStatus({
      WEB_AI_BRIDGE_ENABLED: 'false',
    }, false)).toBe('disabled');
    expect(getConfiguredWebBridgeSessionStatus({
      WEB_AI_BRIDGE_ENABLED: 'true',
      WEB_AI_BRIDGE_COOKIE_HOST_PATH: 'C:/private/session.json',
    }, true)).toBe('unavailable');
  });

  it('serializes bridge requests with concurrency one', async () => {
    const execute = createSerialExecutor();
    let active = 0;
    let peak = 0;
    const task = async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active -= 1;
    };

    await Promise.all([execute(task), execute(task), execute(task)]);
    expect(peak).toBe(1);
  });

  it('runs authenticated Web Pro before the official lane for deep work', async () => {
    const order: string[] = [];
    const result = await executeWithPreferredWebBridge({
      tier: 'deep',
      enabled: true,
      priority: 'prefer_deep',
      sessionStatus: 'authenticated',
      webBridge: async () => { order.push('web'); return 'pro'; },
      official: async () => { order.push('official'); return 'api'; },
    });

    expect(result).toEqual({ value: 'pro', lane: 'web_bridge' });
    expect(order).toEqual(['web']);
  });

  it('bootstraps an unavailable configured session through an authenticated health probe', async () => {
    let probes = 0;
    const sessionStatus = await resolveWebBridgeSessionStatusForTier({
      tier: 'deep',
      enabled: true,
      priority: 'prefer_deep',
      sessionStatus: 'unavailable',
      probe: async () => {
        probes += 1;
        return true;
      },
    });

    expect(sessionStatus).toBe('authenticated');
    expect(probes).toBe(1);
  });

  it('does not probe Web Pro for non-deep work or a login-required session', async () => {
    let probes = 0;
    const probe = async () => {
      probes += 1;
      return true;
    };

    expect(await resolveWebBridgeSessionStatusForTier({
      tier: 'balanced',
      enabled: true,
      priority: 'prefer_deep',
      sessionStatus: 'unavailable',
      probe,
    })).toBe('unavailable');
    expect(await resolveWebBridgeSessionStatusForTier({
      tier: 'deep',
      enabled: true,
      priority: 'prefer_deep',
      sessionStatus: 'login_required',
      probe,
    })).toBe('login_required');
    expect(probes).toBe(0);
  });

  it('falls from an unavailable deep Web Pro lane to the official providers', async () => {
    const order: string[] = [];
    const result = await executeWithPreferredWebBridge({
      tier: 'deep',
      enabled: true,
      priority: 'prefer_deep',
      sessionStatus: 'authenticated',
      webBridge: async () => { order.push('web'); throw new Error('auth expired'); },
      official: async () => { order.push('official'); return 'api'; },
    });

    expect(result.value).toBe('api');
    expect(result.lane).toBe('official');
    expect(result.webBridgeFailure).toBeInstanceOf(Error);
    expect(order).toEqual(['web', 'official']);
  });

  it('never touches Web Pro for non-deep tiers', async () => {
    const order: string[] = [];
    const result = await executeWithPreferredWebBridge({
      tier: 'balanced',
      enabled: true,
      priority: 'prefer_deep',
      sessionStatus: 'authenticated',
      webBridge: async () => { order.push('web'); return 'pro'; },
      official: async () => { order.push('official'); return 'api'; },
    });

    expect(result).toEqual({ value: 'api', lane: 'official' });
    expect(order).toEqual(['official']);
  });
});
