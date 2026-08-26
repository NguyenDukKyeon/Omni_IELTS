import { describe, expect, it } from 'vitest';
import { resolveLiveCanaryTarget } from '../liveCanaryConfig';

describe('live canary target resolution', () => {
  it('starts the managed server when a configured canary URL points at loopback', () => {
    expect(resolveLiveCanaryTarget({
      PLAYWRIGHT_LIVE_BASE_URL: 'http://127.0.0.1:3000/',
    })).toEqual({
      baseURL: 'http://127.0.0.1:3000',
      port: 3000,
      startsLocalServer: true,
    });
  });

  it('does not start a local server for a deployed canary URL', () => {
    expect(resolveLiveCanaryTarget({
      PLAYWRIGHT_LIVE_BASE_URL: 'https://beta.example.com/',
    })).toEqual({
      baseURL: 'https://beta.example.com',
      port: 443,
      startsLocalServer: false,
    });
  });

  it('uses the dedicated local port when no external URL is configured', () => {
    expect(resolveLiveCanaryTarget({ PLAYWRIGHT_LIVE_PORT: '3210' })).toEqual({
      baseURL: 'http://127.0.0.1:3210',
      port: 3210,
      startsLocalServer: true,
    });
  });
});
