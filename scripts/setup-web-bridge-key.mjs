import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function upsert(lines, name, value, preserveNonEmpty = false) {
  const prefix = `${name}=`;
  const index = lines.findIndex((line) => line.startsWith(prefix));
  if (index < 0) {
    lines.push(`${prefix}${value}`);
    return true;
  }
  const existing = lines[index].slice(prefix.length).trim();
  if (preserveNonEmpty && existing) return false;
  const replacement = `${prefix}${value}`;
  if (lines[index] === replacement) return false;
  lines[index] = replacement;
  return true;
}

export function ensureWebBridgeEnv(envPath = resolve(process.cwd(), '.env')) {
  if (!existsSync(envPath)) throw new Error(`Missing environment file: ${envPath}`);
  const original = readFileSync(envPath, 'utf8');
  const newline = original.includes('\r\n') ? '\r\n' : '\n';
  const lines = original.replace(/\r\n/g, '\n').split('\n');
  if (lines.at(-1) === '') lines.pop();

  const keyLine = lines.find((line) => line.startsWith('WEB_AI_BRIDGE_API_KEY='));
  const hasKey = Boolean(keyLine?.slice(keyLine.indexOf('=') + 1).trim());
  const localKey = hasKey ? '' : randomBytes(32).toString('hex');
  let changed = false;
  changed = upsert(lines, 'WEB_AI_BRIDGE_ENABLED', 'true') || changed;
  changed = upsert(lines, 'WEB_AI_BRIDGE_KIND', 'gemini-web2api', true) || changed;
  changed = upsert(lines, 'WEB_AI_BRIDGE_BASE_URL', 'http://gemini-web2api:8081/v1', true) || changed;
  changed = upsert(lines, 'WEB_AI_BRIDGE_API_KEY', localKey, true) || changed;
  changed = upsert(lines, 'WEB_AI_BRIDGE_MODEL', 'gemini-3.6-flash', true) || changed;

  if (changed) writeFileSync(envPath, `${lines.join(newline)}${newline}`, 'utf8');
  return { createdKey: !hasKey, changed };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = ensureWebBridgeEnv();
  console.log(result.changed
    ? 'Private Web Bridge environment configured without exposing credentials.'
    : 'Private Web Bridge environment was already configured.');
}
