import { describe, expect, it } from 'vitest';
import { createImportJob, processImportJob } from '../sources/importJobMachine';
import { normalizeSourceError } from '../sources/sourceErrors';

describe('Import Job Machine', () => {
  it('transitions import job from queued to ready upon successful extraction', async () => {
    const job = createImportJob({
      id: 'job_1',
      userId: 'user_1',
      title: 'Macroeconomics',
      type: 'text',
      rawContent: 'Economic growth requires capital expenditure in clean tech.',
    });

    expect(job.state).toBe('queued');
    const updated = await processImportJob(job);
    expect(updated.state).toBe('ready');
    expect(updated.sourceRecord).toBeDefined();
    expect(updated.sourceRecord?.currentVersionId).toBeDefined();
  });

  it('keeps sibling jobs independent when one item is a YouTube handoff', async () => {
    const textJob = await processImportJob(
      createImportJob({
        id: 'job_text',
        userId: 'user_1',
        title: 'Essay',
        type: 'text',
        rawContent: 'Capital expenditure in clean tech remains the core claim.',
      }),
    );
    const ytJob = await processImportJob(
      createImportJob({
        id: 'job_yt',
        userId: 'user_1',
        title: 'Lecture',
        type: 'youtube',
        rawContent: 'https://youtube.com/watch?v=example',
      }),
    );
    expect(textJob.state).toBe('ready');
    expect(ytJob.state).toBe('handoff_required');
    expect(ytJob.sourceRecord?.processingState).toBe('handoff_required');
    expect(ytJob.sourceVersion).toBeUndefined();
  });

  it('normalizes provider errors into scrubbed learner-facing messages', () => {
    const rawError = new Error('HTTP 429: provider quota at internal/provider.ts:45');
    const normalized = normalizeSourceError(rawError);

    expect(normalized.code).toBe('QUOTA_EXCEEDED');
    expect(normalized.userMessageVi).toContain('Hạn ngạch');
    expect(normalized.userMessageVi).not.toContain('HTTP 429');
    expect(normalized.userMessageVi).not.toContain('internal/provider.ts');
    expect(normalized.retryable).toBe(true);
  });
});
