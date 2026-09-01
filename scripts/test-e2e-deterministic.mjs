import { spawnSync } from 'node:child_process';
import path from 'node:path';

const playwrightCli = path.resolve(process.cwd(), 'node_modules', '@playwright', 'test', 'cli.js');
const forwardedArgs = process.argv.slice(2);

function runPlaywright(label, args, environment) {
  console.log(`\n=== Deterministic E2E: ${label} ===`);
  const result = spawnSync(process.execPath, [playwrightCli, 'test', ...args], {
    cwd: process.cwd(),
    shell: false,
    stdio: 'inherit',
    env: { ...process.env, OMNI_DETERMINISTIC_E2E: 'true', ...environment },
  });
  if (result.error) {
    console.error(`Could not run deterministic E2E ${label}:`, result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// The first fresh server proves the one-release flag-OFF facade and legacy E2E.
runPlaywright('flag-off legacy suite', forwardedArgs, {
  OMNI_RUN_SOURCES_E2E: 'false',
  OMNI_SOURCES_LIBRARY_V2: 'false',
});

// The second fresh server executes every Sources case against the server-injected
// flag-ON runtime. No flag-off skip is accepted as Sources evidence.
runPlaywright('flag-on Sources suite', ['e2e/sources-library.spec.ts', ...forwardedArgs], {
  OMNI_RUN_SOURCES_E2E: 'true',
  OMNI_SOURCES_LIBRARY_V2: 'true',
});
