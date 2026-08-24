import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('private Gemini Web bridge deployment', () => {
  it('pins the upstream source and stays behind an opt-in Docker profile', () => {
    const compose = readFileSync(resolve(root, 'compose.media.yml'), 'utf8');
    const section = compose.split(/\n  gemini-web2api:\s*\n/)[1]?.split(/\n  [a-zA-Z0-9_-]+:\s*\n/)[0] || '';

    expect(section).toContain('private-web-bridge');
    expect(section).toContain('GEMINI_WEB2API_COMMIT: 2bb988bfcbb82a7fab5d2c99aa5560ff40d64f7e');
    expect(section).not.toMatch(/^\s+ports:/m);
    expect(section).not.toMatch(/^\s+env_file:/m);
    expect(section).toContain('WEB_AI_BRIDGE_API_KEY');
    expect(section).toContain('/v1/models');
  });

  it('uses anonymous temporary chats without request logging', () => {
    const entrypoint = readFileSync(resolve(root, 'infra/gemini-web2api/entrypoint.py'), 'utf8');

    expect(entrypoint).toContain('"cookie_file": None');
    expect(entrypoint).toContain('"temporary_chats": True');
    expect(entrypoint).toContain('"log_requests": False');
    expect(entrypoint).not.toMatch(/print\([^)]*(?:key|cookie)/i);
  });
});
