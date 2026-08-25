import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

export const DETERMINISTIC_SCRIPTS = ['test', 'check:ux-contracts', 'lint', 'build', 'test:e2e'];
export const LIVE_CANARY_SCRIPTS = ['test:web-bridge:live', 'test:e2e:live'];
export const FULL_GATE_SCRIPTS = [...DETERMINISTIC_SCRIPTS, ...LIVE_CANARY_SCRIPTS];

export function resolveScriptsForArgs(args = process.argv.slice(2)) {
  let mode = 'deterministic';
  const modeFlag = args.find(arg => arg.startsWith('--mode='));
  if (modeFlag) {
    const specified = modeFlag.split('=')[1]?.trim();
    if (['deterministic', 'gate'].includes(specified)) {
      mode = 'deterministic';
    } else if (['live', 'canary'].includes(specified)) {
      mode = 'live';
    } else if (['full', 'all'].includes(specified)) {
      mode = 'full';
    } else {
      throw new Error(`Unknown gate mode: "${specified}". Valid modes are: deterministic, live, full.`);
    }
  } else if (args.includes('--canary') || args.includes('--live')) {
    mode = 'live';
  } else if (args.includes('--full') || args.includes('--all')) {
    mode = 'full';
  } else if (args.includes('--deterministic') || args.includes('--gate')) {
    mode = 'deterministic';
  }

  const scripts = mode === 'live'
    ? LIVE_CANARY_SCRIPTS
    : mode === 'full'
      ? FULL_GATE_SCRIPTS
      : DETERMINISTIC_SCRIPTS;

  return { mode, scripts };
}

export function runGate(args = process.argv.slice(2)) {
  const { mode, scripts } = resolveScriptsForArgs(args);

  const npmCli = process.env.npm_execpath;
  if (!npmCli) {
    console.error('npm_execpath is unavailable. Run this gate through `npm run check:beta` or `npm run check:canary:live`.');
    process.exit(1);
  }

  const childEnv = { ...process.env };
  if (childEnv.OMNI_CANARY_BASE_URL && !childEnv.PLAYWRIGHT_LIVE_BASE_URL) {
    childEnv.PLAYWRIGHT_LIVE_BASE_URL = childEnv.OMNI_CANARY_BASE_URL;
  }

  for (const script of scripts) {
    const result = spawnSync(process.execPath, [npmCli, 'run', script], {
      cwd: process.cwd(),
      shell: false,
      stdio: 'inherit',
      env: childEnv,
    });
    if (result.error) console.error(`Could not run npm script ${script}:`, result.error);
    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
  }

  if (mode === 'live') {
    console.log('Live provider canaries passed: private Web Bridge canary and live provider Playwright tests are clean.');
  } else if (mode === 'full') {
    console.log('Public beta full release gate passed: unit/API tests, UX contracts, TypeScript, production build, deterministic E2E, accessibility, and live provider canaries are clean.');
  } else {
    console.log('Public beta deterministic gate passed: unit/API tests, UX contracts, TypeScript, production build, deterministic E2E, and accessibility are clean.');
  }
}

const currentFilePath = fileURLToPath(import.meta.url);
const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFilePath);
if (isDirectExecution) {
  runGate();
}
