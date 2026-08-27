import { spawn } from 'node:child_process';
import { mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const LOG_DIR = path.join(tmpdir(), 'omni-ielts-livekit-stack');
mkdirSync(LOG_DIR, { recursive: true });

function trimSlash(value) {
  return value.replace(/\/$/, '');
}

function isLoopback(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^\[|\]$/g, '');
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
}

export function resolveSpeakingStackTarget(env = process.env) {
  const configured = (env.OMNI_CANARY_BASE_URL || env.PLAYWRIGHT_LIVE_BASE_URL || '').trim();
  const port = Number(env.PLAYWRIGHT_LIVE_PORT || env.PORT || 3200);
  const appBaseUrl = trimSlash(configured || `http://127.0.0.1:${port}`);
  const local = isLoopback(appBaseUrl);
  const redeemUrl = trimSlash(env.OMNI_AGENT_REDEEM_URL || `${appBaseUrl}/api/livekit/credentials/redeem`);
  const eventUrl = trimSlash(env.OMNI_AGENT_EVENT_URL || `${appBaseUrl}/api/livekit/session`);
  if (!redeemUrl.endsWith('/api/livekit/credentials/redeem')) {
    throw new Error(`OMNI_AGENT_REDEEM_URL must end with /api/livekit/credentials/redeem, got ${redeemUrl}`);
  }
  return {
    appBaseUrl,
    port: local ? Number(new URL(appBaseUrl).port || (appBaseUrl.startsWith('https:') ? 443 : port)) : Number(new URL(appBaseUrl).port || (appBaseUrl.startsWith('https:') ? 443 : 80)),
    local,
    redeemUrl,
    eventUrl,
  };
}

async function waitFor(predicate, timeoutMs, label, dump) {
  const deadline = Date.now() + timeoutMs;
  let lastError = '';
  while (Date.now() < deadline) {
    try {
      if (await predicate()) return;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (typeof dump === 'function') dump();
  throw new Error(`${label} did not become ready. Refusing to fake a pass. ${lastError}`.trim());
}

async function isHealthy(appBaseUrl) {
  const response = await fetch(`${appBaseUrl}/api/health`, { signal: AbortSignal.timeout(3000) }).catch(() => null);
  return Boolean(response?.ok);
}

function spawnLogged(command, args, env, logFile) {
  // Inherit file descriptors so the child survives after this helper exits.
  // Piped stdio would SIGPIPE the worker when the parent process ends.
  const fd = openSync(logFile, 'a');
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env,
    detached: true,
    stdio: ['ignore', fd, fd],
  });
  child.unref();
  writeFileSync(`${logFile}.pid`, String(child.pid || ''));
  return { child, logFile };
}

function spawnNpm(script, env, logFile) {
  const npmCli = env.npm_execpath;
  if (npmCli) return spawnLogged(process.execPath, [npmCli, 'run', script], env, logFile);
  return spawnLogged('npm', ['run', script], env, logFile);
}

function logContains(logFile, pattern) {
  try {
    return pattern.test(readFileSync(logFile, 'utf8'));
  } catch {
    return false;
  }
}

export async function ensureLivekitSpeakingStack(env = process.env) {
  const livekitUrl = env.LIVEKIT_URL?.trim();
  const apiKey = env.LIVEKIT_API_KEY?.trim();
  const apiSecret = env.LIVEKIT_API_SECRET?.trim();
  if (!livekitUrl || !apiKey || !apiSecret) {
    throw new Error('Cannot start the LiveKit speaking agent without LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET. Refusing to fake a pass.');
  }

  const target = resolveSpeakingStackTarget(env);
  const childEnv = {
    ...env,
    OMNI_CANARY_BASE_URL: target.appBaseUrl,
    OMNI_AGENT_REDEEM_URL: target.redeemUrl,
    OMNI_AGENT_EVENT_URL: target.eventUrl,
    PORT: String(target.local ? target.port : env.PORT || target.port),
    DISABLE_HMR: 'true',
  };

  if (target.local && !(await isHealthy(target.appBaseUrl))) {
    const appLog = path.join(LOG_DIR, 'omni-app.log');
    spawnNpm('dev', childEnv, appLog);
    await waitFor(() => isHealthy(target.appBaseUrl), 60_000, `Omni app at ${target.appBaseUrl}`, () => {
      try { process.stderr.write(readFileSync(appLog, 'utf8')); } catch { /* ignore */ }
    });
  } else if (target.local === false && !(await isHealthy(target.appBaseUrl))) {
    throw new Error(`Deployed canary app ${target.appBaseUrl} is not healthy. Refusing to fake a pass.`);
  }

  const agentLog = path.join(LOG_DIR, `livekit-agent-${process.pid}.log`);
  spawnNpm('livekit:agent', childEnv, agentLog);
  await waitFor(
    () => logContains(agentLog, /registered worker/i),
    45_000,
    'LiveKit agent worker registration',
    () => {
      try { process.stderr.write(readFileSync(agentLog, 'utf8')); } catch { /* ignore */ }
    },
  );

  if (env.GITHUB_ENV) {
    writeFileSync(env.GITHUB_ENV, [
      `OMNI_CANARY_BASE_URL=${target.appBaseUrl}`,
      `OMNI_AGENT_REDEEM_URL=${target.redeemUrl}`,
      `OMNI_AGENT_EVENT_URL=${target.eventUrl}`,
      `PLAYWRIGHT_LIVE_BASE_URL=${target.appBaseUrl}`,
    ].join('\n') + '\n', { flag: 'a' });
  }

  return target;
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]).endsWith('ensure-livekit-speaking-stack.mjs');
if (isDirect) {
  ensureLivekitSpeakingStack().then((target) => {
    console.log(JSON.stringify({
      status: 'ok',
      appBaseUrl: target.appBaseUrl,
      redeemUrl: target.redeemUrl,
      eventUrl: target.eventUrl,
      registeredWorker: true,
    }));
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
