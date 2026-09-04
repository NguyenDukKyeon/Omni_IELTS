import { describe, expect, it } from 'vitest';
import { normalizeSourceError } from '../sources/sourceErrors';

const SECRETS = [
  ['AIzaSyA1234567890abcdefghijklmnopqrstu', 'AIza'],
  ['gsk_live_abcdefghijklmnopqrstuvwxyz012345', 'gsk_'],
  ['Bearer ya29.a0AfH6SMB-secret-token', 'Bearer'],
  ['Authorization: Bearer abcdef', 'Bearer'],
  ['api_key=sk-proj-secretvalue', 'sk-proj'],
  ['x-api-key: 1234567890abcdef', 'api-key'],
  ['HTTP 429: provider quota at internal/provider.ts:45', 'HTTP 429'],
  ['Command failed: /tmp/omni-yt-dlp --print-json', '/tmp/'],
  ['see src/lib/internal/provider.ts:12', 'internal/provider.ts'],
] as const;

describe('P03 source error scrubbing', () => {
  it.each(SECRETS)('rebuilds learner copy and drops secret-shaped %s', (raw, leaked) => {
    const fromMessage = normalizeSourceError(new Error(raw));
    const fromUntrustedFields = normalizeSourceError({
      code: raw,
      message: raw,
      userMessageVi: raw,
      suggestedActionVi: raw,
      diagnosticId: raw,
    });

    for (const normalized of [fromMessage, fromUntrustedFields]) {
      const serialized = JSON.stringify(normalized);
      expect(normalized.userMessageVi).not.toContain(leaked);
      expect(normalized.suggestedActionVi).not.toContain(leaked);
      expect(String(normalized.code)).not.toContain(leaked);
      expect(normalized.diagnosticId).not.toContain(leaked);
      expect(serialized).not.toContain(leaked);
      expect(serialized).not.toMatch(/AIza|gsk_|ya29\.|sk-proj|HTTP 429|\/tmp\/|internal\/provider\.ts/);
    }
  });

  it('does not reuse untrusted suggestedActionVi', () => {
    const normalized = normalizeSourceError({
      code: 'QUOTA_EXCEEDED',
      message: 'quota',
      suggestedActionVi: 'Retry with AIzaSyA1234567890abcdefghijklmnopqrstu',
    });
    expect(normalized.code).toBe('QUOTA_EXCEEDED');
    expect(normalized.userMessageVi).toContain('Hạn ngạch');
    expect(normalized.suggestedActionVi).not.toContain('AIza');
    expect(normalized.suggestedActionVi).toBe('Đợi rồi bấm thử lại. Không cần gửi lại tệp.');
  });
});
