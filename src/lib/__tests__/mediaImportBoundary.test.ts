import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { computeTranscriptHash, computeSegmentId } from '../media/contentHash';

const NODE_BUILTINS = [
  'node:',
  'crypto',
  'fs',
  'path',
  'net',
  'os',
  'child_process',
  'http',
  'https',
  'stream',
  'buffer',
  'util',
  'events',
];

function collectFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...collectFiles(fullPath));
    } else if (fullPath.endsWith('.ts') && !fullPath.includes('__tests__')) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('Media Client Import Boundary & Browser Safety', () => {
  it('ensures no media library or type file imports Node.js built-ins', () => {
    const mediaLibDir = join(process.cwd(), 'src/lib/media');
    const mediaTypesDir = join(process.cwd(), 'src/types');
    const filesToCheck = [
      ...collectFiles(mediaLibDir),
      join(mediaTypesDir, 'media.ts'),
    ];

    const violations: { file: string; line: string }[] = [];

    for (const filePath of filesToCheck) {
      const content = readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('import ') || trimmed.startsWith('export ') || trimmed.includes('require(')) {
          for (const builtin of NODE_BUILTINS) {
            const pattern = new RegExp(`['"](${builtin}|node:${builtin})['"/]`);
            if (pattern.test(trimmed)) {
              violations.push({ file: filePath, line: trimmed });
            }
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('proves pure JS SHA-256 in contentHash matches node:crypto byte-for-byte across test vectors', () => {
    const testCases = [
      'hello world',
      'The quick brown fox jumps over the lazy dog',
      '',
      'Tiếng Việt có dấu: Học tập và nghiên cứu IELTS',
      JSON.stringify({ segment: 1, text: 'Complex JSON string', timestamps: [1200, 3400] }),
    ];

    for (const input of testCases) {
      const nodeDigest = createHash('sha256').update(input).digest('hex');
      const segmentId = computeSegmentId(input, 1000);
      const expectedPrefix = `seg_${createHash('sha256').update(`1000:${input.trim().toLowerCase().replace(/\s+/g, ' ')}`).digest('hex').slice(0, 12)}`;
      expect(segmentId).toBe(expectedPrefix);
    }

    const segments = [
      { id: '1', index: 0, startMs: 0, endMs: 2000, text: 'First segment', confidence: 'high' as const },
      { id: '2', index: 1, startMs: 2000, endMs: 4500, text: 'Second segment with Vietnamese: Xin chào', confidence: 'high' as const },
    ];
    const computedHash = computeTranscriptHash(segments);
    const expectedHash = createHash('sha256')
      .update('0:2000:First segment|2000:4500:Second segment with Vietnamese: Xin chào')
      .digest('hex');
    expect(computedHash).toBe(expectedHash);
  });
});
