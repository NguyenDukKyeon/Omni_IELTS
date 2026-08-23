import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { MediaSession } from '../../types';

export interface OriginalMediaPlayerHandle {
  playSegment: (start: number, end: number, rate?: number, loops?: number) => void;
  stop: () => void;
}

interface OriginalMediaPlayerProps {
  session: MediaSession;
  onPlaybackEnded?: () => void;
}

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export const OriginalMediaPlayer = forwardRef<OriginalMediaPlayerHandle, OriginalMediaPlayerProps>(
  ({ session, onPlaybackEnded }, ref) => {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const playerRef = useRef<any>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const timerRef = useRef<number | null>(null);

    const clearTimer = () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };

    useEffect(() => {
      if (!session.youtubeId || !hostRef.current) return;
      let cancelled = false;
      const createPlayer = () => {
        if (cancelled || !hostRef.current || !window.YT?.Player) return;
        playerRef.current?.destroy?.();
        playerRef.current = new window.YT.Player(hostRef.current, {
          videoId: session.youtubeId,
          playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
        });
      };
      if (window.YT?.Player) createPlayer();
      else {
        const existing = document.querySelector('script[data-omni-youtube-api]');
        if (!existing) {
          const script = document.createElement('script');
          script.src = 'https://www.youtube.com/iframe_api';
          script.dataset.omniYoutubeApi = 'true';
          document.head.appendChild(script);
        }
        const previous = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          previous?.();
          createPlayer();
        };
      }
      return () => {
        cancelled = true;
        clearTimer();
        playerRef.current?.destroy?.();
        playerRef.current = null;
      };
    }, [session.youtubeId]);

    useImperativeHandle(ref, () => ({
      playSegment(start, end, rate = 1, loops = 1) {
        clearTimer();
        let remaining = Math.max(1, loops);
        const play = () => {
          if (session.youtubeId && playerRef.current) {
            playerRef.current.setPlaybackRate?.(rate);
            playerRef.current.seekTo(start, true);
            playerRef.current.playVideo?.();
          } else if (audioRef.current) {
            audioRef.current.currentTime = start;
            audioRef.current.playbackRate = rate;
            void audioRef.current.play();
          }
          timerRef.current = window.setTimeout(() => {
            remaining -= 1;
            if (remaining > 0) play();
            else {
              playerRef.current?.pauseVideo?.();
              audioRef.current?.pause();
              onPlaybackEnded?.();
            }
          }, Math.max(250, ((end - start) / Math.max(rate, 0.25)) * 1000));
        };
        play();
      },
      stop() {
        clearTimer();
        playerRef.current?.pauseVideo?.();
        audioRef.current?.pause();
      },
    }), [session.youtubeId, onPlaybackEnded]);

    if (session.youtubeId) {
      return <div role="region" className="aspect-video w-full overflow-hidden rounded-2xl bg-black" ref={hostRef} aria-label="YouTube original lesson player" />;
    }
    if (!session.mediaUrl) {
      return (
        <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          Bài mẫu chỉ có transcript. Hãy nhập URL YouTube hoặc audio của bạn để luyện với âm thanh gốc.
        </div>
      );
    }
    return <audio ref={audioRef} controls src={session.mediaUrl} className="w-full" aria-label="Original lesson audio" />;
  },
);

OriginalMediaPlayer.displayName = 'OriginalMediaPlayer';
