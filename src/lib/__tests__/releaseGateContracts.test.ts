import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DETERMINISTIC_SCRIPTS,
  FULL_GATE_SCRIPTS,
  LIVE_CANARY_SCRIPTS,
  resolveScriptsForArgs,
} from '../../../scripts/public-beta-gate.mjs';

const root = process.cwd();

describe('public beta release gate and CI contracts', () => {
  describe('gate script mode resolution', () => {
    it('defaults to deterministic credential-free scripts when no args provided', () => {
      const { mode, scripts } = resolveScriptsForArgs([]);
      expect(mode).toBe('deterministic');
      expect(scripts).toEqual(DETERMINISTIC_SCRIPTS);
      expect(scripts).toEqual(['test', 'check:ux-contracts', 'lint', 'build', 'test:e2e']);
      expect(scripts).not.toContain('test:web-bridge:live');
      expect(scripts).not.toContain('test:e2e:live');
    });

    it('resolves deterministic mode via flags', () => {
      expect(resolveScriptsForArgs(['--mode=deterministic']).mode).toBe('deterministic');
      expect(resolveScriptsForArgs(['--mode=gate']).mode).toBe('deterministic');
      expect(resolveScriptsForArgs(['--deterministic']).mode).toBe('deterministic');
      expect(resolveScriptsForArgs(['--gate']).mode).toBe('deterministic');
      expect(resolveScriptsForArgs(['--deterministic']).scripts).toEqual(DETERMINISTIC_SCRIPTS);
    });

    it('resolves explicit live canary scripts only when requested', () => {
      const viaModeFlag = resolveScriptsForArgs(['--mode=live']);
      expect(viaModeFlag.mode).toBe('live');
      expect(viaModeFlag.scripts).toEqual(LIVE_CANARY_SCRIPTS);
      expect(viaModeFlag.scripts).toEqual(['test:e2e:live']);
      expect(viaModeFlag.scripts).not.toContain('test:web-bridge:live');

      expect(resolveScriptsForArgs(['--mode=canary']).mode).toBe('live');
      expect(resolveScriptsForArgs(['--live']).mode).toBe('live');
      expect(resolveScriptsForArgs(['--canary']).mode).toBe('live');
      expect(resolveScriptsForArgs(['--canary']).scripts).toEqual(LIVE_CANARY_SCRIPTS);
    });

    it('resolves full release gate scripts when requested', () => {
      const full = resolveScriptsForArgs(['--mode=full']);
      expect(full.mode).toBe('full');
      expect(full.scripts).toEqual(FULL_GATE_SCRIPTS);
      expect(full.scripts).toEqual([
        'test',
        'check:ux-contracts',
        'lint',
        'build',
        'test:e2e',
        'test:e2e:live',
      ]);

      expect(resolveScriptsForArgs(['--all']).mode).toBe('full');
      expect(resolveScriptsForArgs(['--full']).mode).toBe('full');
    });

    it('throws a descriptive error on unknown gate modes', () => {
      expect(() => resolveScriptsForArgs(['--mode=invalid'])).toThrow(/Unknown gate mode: "invalid"/);
    });
  });

  describe('package.json scripts contract', () => {
    const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
    const scripts = packageJson.scripts;

    it('defines deterministic check:beta and check:gate commands', () => {
      expect(scripts['check:beta']).toContain('public-beta-gate.mjs');
      expect(scripts['check:beta']).toContain('--mode=deterministic');
      expect(scripts['check:gate']).toContain('public-beta-gate.mjs');
      expect(scripts['check:gate']).toContain('--mode=deterministic');
    });

    it('defines explicit live canary check commands', () => {
      expect(scripts['check:canary:live']).toContain('public-beta-gate.mjs');
      expect(scripts['check:canary:live']).toContain('--mode=live');
      expect(scripts['check:live']).toContain('public-beta-gate.mjs');
      expect(scripts['check:live']).toContain('--mode=live');
    });

    it('defines full release check command for check:release and check:release:full', () => {
      expect(scripts['check:release']).toContain('public-beta-gate.mjs');
      expect(scripts['check:release']).toContain('--mode=full');
      expect(scripts['check:release:full']).toContain('public-beta-gate.mjs');
      expect(scripts['check:release:full']).toContain('--mode=full');
    });

    it('preserves granular live test targets', () => {
      expect(scripts['test:web-bridge:live']).toBe('node scripts/web-bridge-live-canary.mjs');
      expect(scripts['check:web-bridge:live']).toBe('npm run test:web-bridge:live');
      expect(scripts['test:e2e:live']).toBe('playwright test --config=playwright.live.config.ts');
      expect(scripts['test:e2e']).toBe('playwright test');
    });
  });

  describe('CI workflow contracts', () => {
    it('runs deterministic gate on PR and push without provider secrets', () => {
      const qualityWorkflow = readFileSync(resolve(root, '.github/workflows/public-beta-quality.yml'), 'utf8');

      expect(qualityWorkflow).toContain('pull_request:');
      expect(qualityWorkflow).toContain('push:');
      expect(qualityWorkflow).toContain('npm run check:beta');
      expect(qualityWorkflow).not.toMatch(/GEMINI_API_KEY/);
      expect(qualityWorkflow).not.toMatch(/WEB_AI_BRIDGE_API_KEY/);
      expect(qualityWorkflow).not.toMatch(/check:canary:live/);
    });

    it('runs live canary on scheduled/manual triggers with configured secrets', () => {
      const canaryWorkflow = readFileSync(resolve(root, '.github/workflows/live-provider-canary.yml'), 'utf8');

      expect(canaryWorkflow).toContain('workflow_dispatch:');
      expect(canaryWorkflow).toContain('schedule:');
      expect(canaryWorkflow).toContain('npm run check:canary:live');
      expect(canaryWorkflow).toContain('GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}');
      expect(canaryWorkflow).toContain('GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}');
      expect(canaryWorkflow).toContain('BRAVE_SEARCH_API_KEY: ${{ secrets.BRAVE_SEARCH_API_KEY }}');
      expect(canaryWorkflow).toContain('docker compose -f compose.media.yml up -d bgutil-provider');
      expect(canaryWorkflow).toContain('curl --fail --silent http://127.0.0.1:4416/ping');
      expect(canaryWorkflow).toContain('YT_DLP_POT_PROVIDER_URL: http://127.0.0.1:4416');
      expect(canaryWorkflow).not.toContain('WEB_AI_BRIDGE_ENABLED');
      expect(canaryWorkflow).not.toContain('WEB_AI_BRIDGE_API_KEY');
    });
  });

  describe('live canary truthfulness contract', () => {
    it('hard-fails when Web Bridge credentials are not configured', () => {
      const canaryCode = readFileSync(resolve(root, 'scripts/web-bridge-live-canary.mjs'), 'utf8');

      expect(canaryCode).toContain("const enabled = process.env.WEB_AI_BRIDGE_ENABLED === 'true'");
      expect(canaryCode).toContain('const bridgeKey = process.env.WEB_AI_BRIDGE_API_KEY?.trim()');
      expect(canaryCode).toContain('if (!enabled || !bridgeKey)');
      expect(canaryCode).toContain('throw new Error(');
      expect(canaryCode).not.toContain('return { status: "ok" }');
    });
  });

  describe('staged Mock provider fallback contract', () => {
    it('does not block Groq/NVIDIA/OpenRouter fallback when Gemini is absent', () => {
      const server = readFileSync(resolve(root, 'server.ts'), 'utf8');
      const generateRoute = server.slice(
        server.indexOf("app.post('/api/mock/builds/:id/skills/:skill/generate'"),
        server.indexOf("app.post('/api/mock/builds/:id/retry'"),
      );
      const retryRoute = server.slice(
        server.indexOf("app.post('/api/mock/builds/:id/retry'"),
        server.indexOf("app.post('/api/mock/builds/:id/finalize'"),
      );

      expect(generateRoute).not.toContain("if (!ai) return res.status(503)");
      expect(retryRoute).not.toContain("if (!ai) return res.status(503)");
      expect(server).toContain('async function generateMockSkill(ai: GoogleGenAI | null');
    });
  });
});
