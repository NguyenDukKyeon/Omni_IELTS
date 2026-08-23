import { describe, expect, it, vi } from 'vitest';
import { createInitialMockAttemptSnapshot, persistInitialMockAttempt } from '../mockAttemptPersistence';

const pkg = {
  id: 'mock_build_test',
  code: 'OMNI-TEST',
  title: 'Test mock',
} as any;

describe('mock attempt persistence', () => {
  it('creates a resumable snapshot without raw microphone audio', () => {
    const snapshot = createInitialMockAttemptSnapshot(pkg, 'speaking', 'attempt_fixed');

    expect(snapshot).toMatchObject({
      package: pkg,
      mockBuildId: 'mock_build_test',
      attemptId: 'attempt_fixed',
      currentSkill: 'speaking',
      currentQuestionNumber: 1,
    });
    expect(snapshot.speakingAnswers).not.toHaveProperty('audioBase64');
    expect(snapshot.speakingAnswers).not.toHaveProperty('audioParts');
  });

  it('writes the complete snapshot synchronously before returning it', () => {
    const storage = { setItem: vi.fn() };

    const snapshot = persistInitialMockAttempt(storage, pkg, 'listening', 'attempt_fixed');

    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(storage.setItem).toHaveBeenCalledWith('omni_active_mock_build', JSON.stringify(snapshot));
  });
});
