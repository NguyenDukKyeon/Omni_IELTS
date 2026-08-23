import { describe, expect, it } from 'vitest';
import { diffWords } from '../wordDiff';

describe('diffWords', () => {
  it('does not cascade every following word after one omission', () => {
    const result = diffWords('I really enjoy public transport', 'I enjoy public transport');
    expect(result.distance).toBe(1);
    expect(result.accuracy).toBe(80);
    expect(result.tokens.filter((token) => token.status === 'correct')).toHaveLength(4);
  });
});
