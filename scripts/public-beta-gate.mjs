import { spawnSync } from 'node:child_process';

const npmCli = process.env.npm_execpath;
if (!npmCli) {
  console.error('npm_execpath is unavailable. Run this gate through `npm run check:beta`.');
  process.exit(1);
}

for (const script of ['test', 'check:ux-contracts', 'lint', 'build', 'test:e2e', 'test:e2e:live']) {
  const result = spawnSync(process.execPath, [npmCli, 'run', script], {
    cwd: process.cwd(),
    shell: false,
    stdio: 'inherit',
  });
  if (result.error) console.error(`Could not run npm script ${script}:`, result.error);
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('Public beta gate passed: unit/API tests, UX contracts, TypeScript, production build, deterministic E2E, accessibility, and live provider canaries are clean.');
