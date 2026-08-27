import { describe, expect, it } from 'vitest';
import { resolveSpeakingStackTarget } from '../../../scripts/ensure-livekit-speaking-stack.mjs';

describe('livekit speaking stack target', () => {
  it('uses port 3200 and a matching redeem URL for the local live canary', () => {
    const target = resolveSpeakingStackTarget({});
    expect(target.appBaseUrl).toBe('http://127.0.0.1:3200');
    expect(target.redeemUrl).toBe('http://127.0.0.1:3200/api/livekit/credentials/redeem');
    expect(target.eventUrl).toBe('http://127.0.0.1:3200/api/livekit/session');
    expect(target.local).toBe(true);
  });

  it('redeems against a deployed app when OMNI_CANARY_BASE_URL is remote', () => {
    const target = resolveSpeakingStackTarget({
      OMNI_CANARY_BASE_URL: 'https://beta.example.com',
    });
    expect(target.local).toBe(false);
    expect(target.redeemUrl).toBe('https://beta.example.com/api/livekit/credentials/redeem');
  });

  it('keeps an explicit redeem URL when the app already runs on 3200', () => {
    const target = resolveSpeakingStackTarget({
      PLAYWRIGHT_LIVE_PORT: '3200',
      OMNI_AGENT_REDEEM_URL: 'http://127.0.0.1:3200/api/livekit/credentials/redeem',
    });
    expect(target.redeemUrl).toBe('http://127.0.0.1:3200/api/livekit/credentials/redeem');
  });
});
