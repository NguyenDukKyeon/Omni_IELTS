import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ensureWebBridgeEnv } from '../../../scripts/setup-web-bridge-key.mjs';

const tempDirs: string[] = [];

afterEach(() => {
  for (const directory of tempDirs.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe('web bridge local setup', () => {
  it('adds a private key without changing existing provider secrets and stays idempotent', () => {
    const directory = mkdtempSync(join(tmpdir(), 'omni-web-bridge-'));
    tempDirs.push(directory);
    const envPath = join(directory, '.env');
    writeFileSync(envPath, 'GEMINI_API_KEY=existing-provider-secret\n', 'utf8');

    const first = ensureWebBridgeEnv(envPath);
    const firstContent = readFileSync(envPath, 'utf8');
    const second = ensureWebBridgeEnv(envPath);
    const secondContent = readFileSync(envPath, 'utf8');

    expect(first.createdKey).toBe(true);
    expect(second.createdKey).toBe(false);
    expect(firstContent).toBe(secondContent);
    expect(firstContent).toContain('GEMINI_API_KEY=existing-provider-secret');
    expect(firstContent).toMatch(/WEB_AI_BRIDGE_API_KEY=[a-f0-9]{64}/);
    expect(firstContent).toContain('WEB_AI_BRIDGE_ENABLED=true');
    expect(firstContent).toContain('WEB_AI_BRIDGE_KIND=gemini-web2api');
  });
});
