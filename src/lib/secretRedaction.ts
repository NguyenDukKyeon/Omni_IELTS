const KEY_SHAPES = [
  /AIza[0-9A-Za-z_-]{8,}/g,
  /sk-[A-Za-z0-9_-]{8,}/g,
  /gemini[_-]?api[_-]?key["']?\s*[:=]\s*["']?[^"'\s,]+/gi,
  /x-gemini-api-key["']?\s*[:=]\s*["']?[^"'\s,]+/gi,
];

const REDACTED = '[redacted]';

export function collectSecretValues(...values: Array<string | null | undefined>): string[] {
  return values.map((value) => value?.trim()).filter((value): value is string => Boolean(value && value.length >= 8));
}

export function redactSecrets(value: unknown, extraSecrets: string[] = []): unknown {
  if (typeof value === 'string') return redactText(value, extraSecrets);
  if (Array.isArray(value)) return value.map((entry) => redactSecrets(entry, extraSecrets));
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (/api[_-]?key|gemini|secret|password|credential/i.test(key) && typeof entry === 'string') {
        if (extraSecrets.includes(entry) || /AIza|sk-/.test(entry) || entry.length >= 20) {
          output[key] = REDACTED;
          continue;
        }
      }
      output[key] = redactSecrets(entry, extraSecrets);
    }
    return output;
  }
  return value;
}

export function redactText(text: string, extraSecrets: string[] = []): string {
  let redacted = text;
  for (const secret of extraSecrets) {
    if (!secret) continue;
    redacted = redacted.split(secret).join(REDACTED);
  }
  for (const shape of KEY_SHAPES) {
    redacted = redacted.replace(shape, REDACTED);
  }
  return redacted;
}

export function assertNoSecretLeak(payload: unknown, secrets: string[], label = 'payload'): void {
  const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
  for (const secret of secrets) {
    if (secret && serialized.includes(secret)) {
      throw new Error(`${label} leaked a provider secret`);
    }
  }
  if (/AIza[0-9A-Za-z_-]{8,}/.test(serialized)) {
    throw new Error(`${label} leaked a Gemini-shaped key`);
  }
}

export function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) return redactText(error.message);
  return redactText(String(error));
}
