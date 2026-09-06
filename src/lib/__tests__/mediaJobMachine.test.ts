import { describe, it, expect } from 'vitest';
import { createMediaJobMachine } from '../media/mediaJobMachine';
import { createActor } from 'xstate';

describe('Media Ingestion State Machine (Task 3)', () => {
  it('progresses from queued to ready upon valid captions and validation pass', () => {
    const machine = createMediaJobMachine();
    const actor = createActor(machine).start();

    expect(actor.getSnapshot().value).toBe('queued');

    actor.send({ type: 'START_PROBING' });
    expect(actor.getSnapshot().value).toBe('probing');

    actor.send({ type: 'PROBE_YOUTUBE_SUCCESS' });
    expect(actor.getSnapshot().value).toBe('captions');

    actor.send({ type: 'CAPTIONS_FETCHED', segmentsCount: 25 });
    expect(actor.getSnapshot().value).toBe('normalizing');
    expect(actor.getSnapshot().context.segmentsCount).toBe(25);

    actor.send({ type: 'NORMALIZED' });
    expect(actor.getSnapshot().value).toBe('validating');

    actor.send({ type: 'VALIDATION_PASSED', coverageRatio: 0.95 });
    expect(actor.getSnapshot().value).toBe('ready');
    expect(actor.getSnapshot().context.transcriptState).toBe('ready');
    expect(actor.getSnapshot().context.coverageRatio).toBe(0.95);
    expect(actor.getSnapshot().status).toBe('done');
  });

  it('progresses from probing to ready for audio upload flow', () => {
    const machine = createMediaJobMachine();
    const actor = createActor(machine).start();

    actor.send({ type: 'START_PROBING' });
    actor.send({ type: 'PROBE_AUDIO_SUCCESS' });
    expect(actor.getSnapshot().value).toBe('transcribing');

    actor.send({ type: 'AUDIO_TRANSCRIBED', segmentsCount: 18 });
    expect(actor.getSnapshot().value).toBe('normalizing');

    actor.send({ type: 'NORMALIZED' });
    expect(actor.getSnapshot().value).toBe('validating');

    actor.send({ type: 'VALIDATION_PASSED', coverageRatio: 0.88 });
    expect(actor.getSnapshot().value).toBe('ready');
    expect(actor.getSnapshot().status).toBe('done');
  });

  it('transitions to degraded when YouTube has no captions while media remains playable', () => {
    const machine = createMediaJobMachine();
    const actor = createActor(machine).start();

    actor.send({ type: 'START_PROBING' });
    actor.send({ type: 'PROBE_YOUTUBE_SUCCESS' });
    actor.send({
      type: 'CAPTIONS_NOT_FOUND',
      message: 'Video này không có phụ đề tiếng Anh có sẵn.',
    });

    expect(actor.getSnapshot().value).toBe('degraded');
    expect(actor.getSnapshot().context.transcriptState).toBe('unavailable_transcript');
    expect(actor.getSnapshot().context.mediaPlayable).toBe(true);
    expect(actor.getSnapshot().context.failureMessage).toBe('Video này không có phụ đề tiếng Anh có sẵn.');
    expect(actor.getSnapshot().status).toBe('done');
  });

  it('transitions to degraded with coverage_insufficient when coverage < 65%', () => {
    const machine = createMediaJobMachine();
    const actor = createActor(machine).start();

    actor.send({ type: 'START_PROBING' });
    actor.send({ type: 'PROBE_YOUTUBE_SUCCESS' });
    actor.send({ type: 'CAPTIONS_FETCHED', segmentsCount: 5 });
    actor.send({ type: 'NORMALIZED' });
    actor.send({ type: 'VALIDATION_DEGRADED', issue: 'coverage_insufficient' });

    expect(actor.getSnapshot().value).toBe('degraded');
    expect(actor.getSnapshot().context.transcriptState).toBe('coverage_insufficient');
    expect(actor.getSnapshot().status).toBe('done');
  });

  it('transitions to needs_review when subtitle timestamps are malformed', () => {
    const machine = createMediaJobMachine();
    const actor = createActor(machine).start();

    actor.send({ type: 'START_PROBING' });
    actor.send({ type: 'PROBE_YOUTUBE_SUCCESS' });
    actor.send({ type: 'CAPTIONS_FETCHED', segmentsCount: 1 });
    actor.send({ type: 'NORMALIZED' });
    actor.send({
      type: 'VALIDATION_NEEDS_REVIEW',
      issue: 'SUBTITLE_PARSE_ERROR',
      message: 'Định dạng timestamp không hợp lệ.',
    });

    expect(actor.getSnapshot().value).toBe('needs_review');
    expect(actor.getSnapshot().context.transcriptState).toBe('needs_review');
    expect(actor.getSnapshot().status).toBe('done');
  });

  it('transitions to requires_original_audio when P03 audio handoff lacks playable artifact', () => {
    const machine = createMediaJobMachine();
    const actor = createActor(machine).start();

    actor.send({ type: 'START_PROBING' });
    actor.send({
      type: 'PROBE_AUDIO_REQUIRES_ORIGINAL',
      message: 'Yêu cầu tải lên tệp âm thanh gốc để tiếp tục bài học.',
    });

    expect(actor.getSnapshot().value).toBe('requires_original_audio');
    expect(actor.getSnapshot().context.failureMessage).toBe(
      'Yêu cầu tải lên tệp âm thanh gốc để tiếp tục bài học.'
    );
    expect(actor.getSnapshot().status).toBe('done');
  });

  it('transitions to failed on quota exhaustion or fatal network error', () => {
    const machine = createMediaJobMachine();
    const actor = createActor(machine).start();

    actor.send({ type: 'START_PROBING' });
    actor.send({ type: 'PROBE_AUDIO_SUCCESS' });
    actor.send({
      type: 'TRANSCRIPTION_FAILED',
      category: 'MEDIA_AI_QUOTA_EXHAUSTED',
      message: 'Hạn mức AI tạm thời hết. Vui lòng thử lại sau.',
    });

    expect(actor.getSnapshot().value).toBe('failed');
    expect(actor.getSnapshot().context.failureCategory).toBe('MEDIA_AI_QUOTA_EXHAUSTED');
    expect(actor.getSnapshot().status).toBe('done');
  });

  it('transitions to unavailable when external media resource is private or removed', () => {
    const machine = createMediaJobMachine();
    const actor = createActor(machine).start();

    actor.send({ type: 'START_PROBING' });
    actor.send({
      type: 'MEDIA_UNAVAILABLE',
      category: 'MEDIA_PRIVATE_OR_REMOVED',
      message: 'Nguồn video/audio không khả dụng hoặc đã bị gỡ bỏ.',
    });

    expect(actor.getSnapshot().value).toBe('unavailable');
    expect(actor.getSnapshot().context.failureCategory).toBe('MEDIA_PRIVATE_OR_REMOVED');
    expect(actor.getSnapshot().status).toBe('done');
  });
});
