import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import { MediaSession } from '../../types';
import { resolveMediaAudioUrl } from '../../lib/mediaArtifactStore';

export interface OriginalMediaPlayerHandle {
  playSegment: (start: number, end: number, rate?: number, loops?: number, waitMs?: number) => void;
  stop: () => void;
}

interface OriginalMediaPlayerProps {
  session: MediaSession;
  onPlaybackEnded?: () => void;
  onLoopChange?: (loop: number) => void;
}

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export const OriginalMediaPlayer = forwardRef<OriginalMediaPlayerHandle, OriginalMediaPlayerProps>(
  ({ session, onPlaybackEnded, onLoopChange }, ref) => {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const playerRef = useRef<any>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const waveformRef = useRef<HTMLDivElement | null>(null);
    const waveSurferRef = useRef<WaveSurfer | null>(null);
    const regionsRef = useRef<RegionsPlugin | null>(null);
    const timerRef = useRef<number | null>(null);
    const youtubeReadyRef = useRef(false);
    const pendingPlaybackRef = useRef<Parameters<OriginalMediaPlayerHandle['playSegment']> | null>(null);
    const playbackHandleRef = useRef<OriginalMediaPlayerHandle | null>(null);
    const [resolvedMediaUrl, setResolvedMediaUrl] = useState<string | null>(null);

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
        youtubeReadyRef.current = false;
        const player = new window.YT.Player(hostRef.current, {
          videoId: session.youtubeId,
          playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
          events: {
            onReady: (event: { target?: any } = {}) => {
              if (cancelled) return;
              playerRef.current = event.target ?? player;
              youtubeReadyRef.current = true;
              const pending = pendingPlaybackRef.current;
              pendingPlaybackRef.current = null;
              if (pending) playbackHandleRef.current?.playSegment(...pending);
            },
          },
        });
        playerRef.current = player;
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
        youtubeReadyRef.current = false;
        pendingPlaybackRef.current = null;
        playerRef.current?.destroy?.();
        playerRef.current = null;
      };
    }, [session.youtubeId]);

    useEffect(() => {
      if (session.youtubeId) return;
      let cancelled = false;
      let objectUrl: string | null = null;
      setResolvedMediaUrl(null);
      resolveMediaAudioUrl(session.mediaUrl)
        .then((url) => {
          if (cancelled) {
            if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
            return;
          }
          objectUrl = url;
          setResolvedMediaUrl(url);
        })
        .catch(() => !cancelled && setResolvedMediaUrl(null));
      return () => {
        cancelled = true;
        if (objectUrl?.startsWith('blob:')) URL.revokeObjectURL(objectUrl);
      };
    }, [session.mediaUrl, session.youtubeId]);

    useEffect(() => {
      if (session.youtubeId || !resolvedMediaUrl || !waveformRef.current || !audioRef.current) return;
      const regions = RegionsPlugin.create();
      const waveSurfer = WaveSurfer.create({
        container: waveformRef.current,
        media: audioRef.current,
        height: 72,
        waveColor: '#94a3b8',
        progressColor: '#0284c7',
        cursorColor: '#4f46e5',
        barWidth: 2,
        barGap: 2,
        barRadius: 2,
        normalize: true,
        dragToSeek: true,
        plugins: [regions],
      });
      waveSurferRef.current = waveSurfer;
      regionsRef.current = regions;

      const renderRegions = (activeStart?: number, activeEnd?: number) => {
        regions.clearRegions();
        session.transcriptSegments.forEach((segment, index) => {
          const active = segment.start === activeStart && segment.end === activeEnd;
          regions.addRegion({
            id: segment.id || `segment_${index + 1}`,
            start: segment.start,
            end: segment.end,
            drag: false,
            resize: false,
            color: active ? 'rgba(79, 70, 229, 0.28)' : 'rgba(14, 165, 233, 0.10)',
          });
        });
      };
      const unsubscribe = waveSurfer.on('ready', () => renderRegions());
      return () => {
        unsubscribe();
        regionsRef.current = null;
        waveSurferRef.current = null;
        waveSurfer.destroy();
      };
    }, [resolvedMediaUrl, session.transcriptSegments, session.youtubeId]);

    useImperativeHandle(ref, () => {
      const handle: OriginalMediaPlayerHandle = {
        playSegment(start, end, rate = 1, loops = 1, waitMs = 0) {
        if (session.youtubeId && !youtubeReadyRef.current) {
          pendingPlaybackRef.current = [start, end, rate, loops, waitMs];
          return;
        }
        clearTimer();
        let remaining = Math.max(1, loops);
        let currentLoop = 0;
        const play = () => {
          currentLoop += 1;
          onLoopChange?.(currentLoop);
          const expectedDurationMs = Math.max(250, ((end - start) / Math.max(rate, 0.25)) * 1000);
          const startedAt = performance.now();
          if (session.youtubeId && playerRef.current) {
            playerRef.current.setPlaybackRate?.(rate);
            playerRef.current.seekTo(start, true);
            playerRef.current.playVideo?.();
          } else if (waveSurferRef.current) {
            regionsRef.current?.clearRegions();
            session.transcriptSegments.forEach((segment, index) => {
              const active = segment.start === start && segment.end === end;
              regionsRef.current?.addRegion({
                id: segment.id || `segment_${index + 1}`,
                start: segment.start,
                end: segment.end,
                drag: false,
                resize: false,
                color: active ? 'rgba(79, 70, 229, 0.28)' : 'rgba(14, 165, 233, 0.10)',
              });
            });
            waveSurferRef.current.setPlaybackRate(rate, true);
            waveSurferRef.current.setTime(start);
            void waveSurferRef.current.play();
          } else if (audioRef.current) {
            audioRef.current.currentTime = start;
            audioRef.current.playbackRate = rate;
            void audioRef.current.play();
          }

          const completeLoop = () => {
            remaining -= 1;
            playerRef.current?.pauseVideo?.();
            waveSurferRef.current?.pause();
            audioRef.current?.pause();
            if (remaining > 0) {
              timerRef.current = window.setTimeout(play, Math.max(0, waitMs));
            }
            else {
              onLoopChange?.(0);
              onPlaybackEnded?.();
            }
          };

          const readCurrentTime = () => {
            if (session.youtubeId && typeof playerRef.current?.getCurrentTime === 'function') {
              return Number(playerRef.current.getCurrentTime());
            }
            if (waveSurferRef.current) return Number(waveSurferRef.current.getCurrentTime());
            return audioRef.current ? Number(audioRef.current.currentTime) : Number.NaN;
          };

          const pollUntilSegmentEnd = () => {
            const currentTime = readCurrentTime();
            const elapsedMs = performance.now() - startedAt;
            if ((Number.isFinite(currentTime) && currentTime >= end - 0.04)
              || elapsedMs >= expectedDurationMs + 2_000) {
              completeLoop();
              return;
            }
            timerRef.current = window.setTimeout(pollUntilSegmentEnd, 50);
          };

          if (Number.isFinite(readCurrentTime())) {
            timerRef.current = window.setTimeout(pollUntilSegmentEnd, 50);
          } else {
            timerRef.current = window.setTimeout(completeLoop, expectedDurationMs);
          }
        };
        play();
        },
        stop() {
          pendingPlaybackRef.current = null;
          clearTimer();
          playerRef.current?.pauseVideo?.();
          waveSurferRef.current?.pause();
          audioRef.current?.pause();
          onLoopChange?.(0);
        },
      };
      playbackHandleRef.current = handle;
      return handle;
    }, [session.youtubeId, session.transcriptSegments, onLoopChange, onPlaybackEnded]);

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
    if (!resolvedMediaUrl) {
      return <div role="status" className="rounded-2xl border border-stone-200 p-4 text-sm text-stone-500">Đang mở audio riêng tư...</div>;
    }
    return (
      <div className="space-y-2 rounded-2xl border border-stone-200 bg-white p-3 dark:border-stone-700 dark:bg-stone-900">
        <div
          ref={waveformRef}
          role="region"
          aria-label="Audio waveform with sentence regions"
          className="min-h-[72px] overflow-hidden rounded-xl bg-slate-50 dark:bg-slate-950"
        />
        <audio ref={audioRef} controls src={resolvedMediaUrl} className="w-full" aria-label="Original lesson audio" />
      </div>
    );
  },
);

OriginalMediaPlayer.displayName = 'OriginalMediaPlayer';
