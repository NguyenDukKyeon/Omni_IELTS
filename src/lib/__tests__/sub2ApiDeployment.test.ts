import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(process.cwd());
const compose = fs.readFileSync(path.join(root, 'compose.sub2api-canary.yml'), 'utf8');
const envExample = fs.readFileSync(path.join(root, '.env.example'), 'utf8');

describe('Sub2API private canary deployment', () => {
  it('pins the patched image and keeps data services off host ports', () => {
    const serviceSection = compose.split(/\n  sub2api:\s*\n/)[1]?.split(/\n  sub2api-postgres:\s*\n/)[0] || '';
    expect(compose).toContain('weishaw/sub2api:0.1.179@sha256:bc449ed7c29acabc4f36fdc2fb5acd9d6a6326cc54465137ce34150bd4b860b8');
    expect(compose).toContain('127.0.0.1:${SUB2API_DASHBOARD_PORT:-8082}:8080');
    expect(compose).not.toMatch(/(?:5432|6379):(?:5432|6379)/);
    expect(compose).toContain('SECURITY_URL_ALLOWLIST_ENABLED: "true"');
    expect(compose).toContain('SECURITY_URL_ALLOWLIST_ALLOW_PRIVATE_HOSTS: "false"');
    expect(serviceSection).not.toMatch(/^\s+env_file:/m);
  });

  it('documents only empty secret placeholders and is not a public lane', () => {
    expect(envExample).toContain('SUB2API_ENABLED=false');
    expect(envExample).toContain('SUB2API_FALLBACK_MODE=canary');
    expect(envExample).toContain('SUB2API_POSTGRES_PASSWORD=');
    expect(envExample).not.toMatch(/SUB2API_(?:TEXT|GROUNDED)_API_KEY=\S+/);
  });
});
