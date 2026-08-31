import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const serverSource = readFileSync('server.ts', 'utf8');

function routeBody(source: string, route: string, nextRoute: string): string {
  const start = source.indexOf(route);
  const end = source.indexOf(nextRoute, start + 1);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('Sources central router boundary', () => {
  it('does not create or select a Gemini client inside the Sources grounded-chat handler', () => {
    const body = routeBody(
      serverSource,
      "app.post('/api/sources/grounded-chat'",
      "app.post('/api/sources/web-research'",
    );
    expect(body).not.toMatch(/getGeminiClient\s*\(/);
    expect(body).not.toMatch(/new GoogleGenAI/);
    expect(body).not.toMatch(/AI_TASK_PROFILES\.grounded/);
    expect(body).toMatch(/executeBalancedText\s*\(/);
  });

  it('owns executeBalancedText on the server/router layer with official Gemini then Groq fallback', () => {
    expect(serverSource).toMatch(/async function executeBalancedText\s*\(/);
    const start = serverSource.indexOf('async function executeBalancedText');
    const next = serverSource.indexOf('\nasync function ', start + 1);
    const fn = serverSource.slice(start, next === -1 ? start + 2500 : next);
    expect(fn).toMatch(/callOfficialProvidersResiliently/);
    expect(fn).toMatch(/getGeminiClient/);
    expect(fn).toMatch(/taskTier:\s*['"]balanced['"]/);
  });
});
