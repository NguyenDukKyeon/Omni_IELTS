import { describe, expect, it } from 'vitest';
import {
  SPEAKING_ROOM_RENDER_THROW_QUERY,
  shouldThrowAfterSpeakingRoomLoad,
} from '../speakingRoomLoadProbe';

describe('speaking room load probe', () => {
  it('throws only when the explicit after-load query is set', () => {
    expect(shouldThrowAfterSpeakingRoomLoad('')).toBe(false);
    expect(shouldThrowAfterSpeakingRoomLoad('?foo=1')).toBe(false);
    expect(shouldThrowAfterSpeakingRoomLoad(`?${SPEAKING_ROOM_RENDER_THROW_QUERY}=0`)).toBe(false);
    expect(shouldThrowAfterSpeakingRoomLoad(`?${SPEAKING_ROOM_RENDER_THROW_QUERY}=1`)).toBe(true);
  });
});
