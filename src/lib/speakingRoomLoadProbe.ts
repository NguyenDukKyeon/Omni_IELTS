export const SPEAKING_ROOM_RENDER_THROW_QUERY = 'omniSpeakingThrowAfterLoad';
export const SPEAKING_ROOM_RENDER_THROW_MESSAGE = 'SpeakingRealtimeRoom test: render failed after lazy load';

export function shouldThrowAfterSpeakingRoomLoad(search: string): boolean {
  return new URLSearchParams(search).get(SPEAKING_ROOM_RENDER_THROW_QUERY) === '1';
}
