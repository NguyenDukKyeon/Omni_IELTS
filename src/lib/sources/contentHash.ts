import { createHash } from 'node:crypto';

/** Server-only SHA-256 hex digest. Browser Sources modules must not import this file. */
export function computeContentHash(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}
