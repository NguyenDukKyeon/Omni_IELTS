import { describe, expect, it } from 'vitest';
import {
  buildYtDlpRuntimeArgs,
  classifyMediaImportFailure,
  consumeFixedWindowQuota,
  parseYtDlpMetadata,
  segmentUntimedTranscript,
  validateTranscriptCoverage,
} from '../mediaImport';

describe('media import reliability helpers', () => {
  it('uses an absolute Node runtime and EJS without dumping full metadata', () => {
    const args = buildYtDlpRuntimeArgs({
      nodePath: 'C:\\Program Files\\nodejs\\node.exe',
      pluginDir: 'C:\\plugins',
      potProviderUrl: 'http://127.0.0.1:4416',
    });

    expect(args).toContain('node:C:\\Program Files\\nodejs\\node.exe');
    expect(args).toContain('ejs:github');
    expect(args).not.toContain('--print-json');
    expect(args.join(' ')).toContain('youtubepot-bgutilhttp:base_url=http://127.0.0.1:4416');
  });

  it('parses only the three small metadata fields', () => {
    expect(parseYtDlpMetadata('"Lesson title"\n"Channel name"\n660\n')).toEqual({
      title: 'Lesson title',
      channel: 'Channel name',
      duration: 660,
    });
  });

  it('accepts a complete 11-minute transcript and rejects truncated coverage', () => {
    const complete = Array.from({ length: 220 }, (_, index) => ({
      start: index * 3,
      end: (index + 1) * 3,
      text: `Sentence ${index + 1}.`,
    }));
    expect(validateTranscriptCoverage(complete, 660)).toMatchObject({ valid: true, coverage: 1 });
    expect(validateTranscriptCoverage(complete.slice(0, 12), 660)).toMatchObject({
      valid: false,
      issue: 'coverage_insufficient',
    });
  });

  it('never exposes raw yt-dlp commands, temp paths or stderr to the UI', () => {
    const failure = classifyMediaImportFailure(new Error(
      'Command failed: /tmp/omni-yt-dlp --print-json Sign in to confirm you’re not a bot',
    ));

    expect(failure).toMatchObject({
      category: 'provider_blocked',
      code: 'YOUTUBE_PROVIDER_BLOCKED',
      recoveryAction: 'upload_source',
    });
    expect(JSON.stringify(failure)).not.toContain('/tmp/');
    expect(JSON.stringify(failure)).not.toContain('Command failed');
    expect(JSON.stringify(failure)).not.toContain('--print-json');
  });

  it('turns a pasted transcript into deterministic sentence practice segments', () => {
    expect(segmentUntimedTranscript('First sentence. Second sentence!')).toEqual([
      { start: 0, end: 4, text: 'First sentence.' },
      { start: 4, end: 8, text: 'Second sentence!' },
    ]);
  });

  it('limits import job creation and prunes expired client windows', () => {
    const windows = new Map();
    const now = Date.parse('2026-08-24T00:00:00Z');

    expect(consumeFixedWindowQuota(windows, 'client-a', now, 2, 60_000)).toEqual({
      allowed: true,
      retryAfterSeconds: 0,
    });
    expect(consumeFixedWindowQuota(windows, 'client-a', now + 1_000, 2, 60_000).allowed).toBe(true);
    expect(consumeFixedWindowQuota(windows, 'client-a', now + 2_000, 2, 60_000)).toEqual({
      allowed: false,
      retryAfterSeconds: 58,
    });

    expect(consumeFixedWindowQuota(windows, 'client-b', now + 61_000, 2, 60_000).allowed).toBe(true);
    expect(windows.has('client-a')).toBe(false);
  });
});
