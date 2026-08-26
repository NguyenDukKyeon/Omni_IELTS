import { describe, expect, it } from 'vitest';
import { signLiveHubItem, verifyLiveHubItemReceipt } from '../liveHubReceipt';

const secret = 'test-secret-that-is-not-shipped';
const item = {
  id: 'writing-source-1',
  title: 'Education funding',
  skill: 'writing_task2',
  promptStatement: 'University education should be free. Discuss both views.',
  evidenceType: 'verified_report',
  groundingSourceUrl: 'https://example.org/direct-report',
  citations: [{ claimId: 'writing-source-1', title: 'Direct report', url: 'https://example.org/direct-report' }],
};

describe('Live Hub server receipts', () => {
  it('accepts an unchanged server-issued item', () => {
    const sourceReceipt = signLiveHubItem(item, secret);
    expect(verifyLiveHubItemReceipt({ ...item, sourceReceipt }, secret)).toBe(true);
  });

  it.each([
    ['evidence type', { evidenceType: 'reported_recall' }],
    ['source URL', { groundingSourceUrl: 'https://attacker.example/forged' }],
    ['prompt', { promptStatement: 'A forged exam prompt' }],
    ['cue-card points', { cueCardPoints: ['A forged cue point'] }],
  ])('rejects a receipt after the client changes %s', (_label, mutation) => {
    const sourceItem = { ...item, cueCardPoints: ['Original cue point'] };
    const sourceReceipt = signLiveHubItem(sourceItem, secret);
    expect(verifyLiveHubItemReceipt({ ...sourceItem, ...mutation, sourceReceipt }, secret)).toBe(false);
  });

  it('rejects missing and malformed receipts', () => {
    expect(verifyLiveHubItemReceipt(item, secret)).toBe(false);
    expect(verifyLiveHubItemReceipt({ ...item, sourceReceipt: 'v1.invalid' }, secret)).toBe(false);
  });
});
