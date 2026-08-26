import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Mic,
  RefreshCw,
  ShieldCheck,
  WifiOff,
} from 'lucide-react';
import { LiveKitRoom, RoomAudioRenderer, useRoomContext } from '@livekit/components-react';
import { RoomEvent } from 'livekit-client';
import { VoicePicker } from '../voice/VoicePicker';
import type { VoiceDescriptor } from '../../types';
import { pickCueCard } from '../../lib/speakingExamContent';
import {
  canTransitionSpeakingState,
  examPartFromState,
  transitionSpeakingState,
} from '../../lib/speakingStateMachine';
import type { SpeakingExamPart, SpeakingFallbackReason, SpeakingSessionState } from '../../lib/speakingRealtimeTypes';
import {
  nextQuestionIndexAfterAnswer,
  parseExamDataMessage,
  PART_2_PREP_SECONDS,
  PART_2_SPEAK_SECONDS,
  questionForPart,
  resolveGeminiLiveVoiceId,
} from '../../lib/speakingExamProtocol';
import {
  concatenateTurnAudio,
  blobToBase64,
  measuredDurationSeconds,
  measureSpeechSegmentsFromBlob,
  releaseMedia,
  type RecordedTurnAudio,
} from '../../lib/speakingAudio';
import {
  createLivekitSession,
  endLivekitSession,
  transitionLivekitSession,
} from '../../services/livekitService';
import { evaluateSpeakingLiveAudioApi, speakExaminerText } from '../../services/practiceService';
import { calculateSpeakingTelemetry } from '../../lib/speakingTelemetry';
import { useApp } from '../../context/AppContext';

const PART_LABELS: Record<string, string> = {
  part_1: 'Part 1 · Hỏi đáp ngắn',
  part_2_preparation: 'Part 2 · 1 phút chuẩn bị',
  part_2_speaking: 'Part 2 · Độc thoại tối đa 2 phút',
  part_3: 'Part 3 · Thảo luận sâu',
};

interface RoomProps {
  onBackToPractice?: () => void;
}

export const SpeakingRealtimeRoom: React.FC<RoomProps> = ({ onBackToPractice }) => {
  const { awardXP } = useApp();
  const [state, setState] = useState<SpeakingSessionState>('idle');
  const [fallbackReason, setFallbackReason] = useState<SpeakingFallbackReason | null>(null);
  const [consentStorage, setConsentStorage] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('Sẵn sàng bắt đầu buổi thi Speaking.');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [question, setQuestion] = useState(questionForPart('part_1', 0));
  const [transcript, setTranscript] = useState('');
  const [turns, setTurns] = useState<Array<{
    part: string;
    question: string;
    answer: string;
    durationSeconds: number;
  }>>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [telemetryLabel, setTelemetryLabel] = useState('unavailable');
  const [prepSecondsLeft, setPrepSecondsLeft] = useState<number | null>(null);
  const [voiceId, setVoiceId] = useState(() => resolveGeminiLiveVoiceId(readStoredGeminiVoice()));
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordStartedAtRef = useRef(0);
  const chunksRef = useRef<Blob[]>([]);
  const turnAudioRef = useRef<RecordedTurnAudio[]>([]);
  const heldPartRef = useRef<SpeakingExamPart>('part_1');
  const cueCard = useMemo(() => pickCueCard(0), []);
  const onVoiceChange = useCallback((voice: VoiceDescriptor) => {
    setVoiceId(resolveGeminiLiveVoiceId(voice.provider === 'gemini' ? voice.id : undefined));
  }, []);

  const rememberPart = (part: SpeakingExamPart) => {
    heldPartRef.current = part;
  };

  const applyState = (next: SpeakingSessionState, message?: string) => {
    const part = examPartFromState(next);
    if (part) rememberPart(part);
    setState((current) => {
      if (current === next) return current;
      if (!canTransitionSpeakingState(current, next)) return current;
      return transitionSpeakingState(current, next);
    });
    if (message) setStatusMessage(message);
  };

  const persistTransition = async (
    next: SpeakingSessionState,
    extras?: { questionIndex?: number; question?: string },
  ) => {
    if (sessionId) {
      await transitionLivekitSession(sessionId, next, extras).catch(() => undefined);
    }
    applyState(next);
    if (typeof extras?.questionIndex === 'number') setQuestionIndex(extras.questionIndex);
    if (extras?.question) setQuestion(extras.question);
  };

  const enterFallback = (reason: SpeakingFallbackReason, message: string, resumePart = false) => {
    setFallbackReason(reason);
    setLivekitToken(null);
    setLivekitUrl(null);
    setConnected(false);
    setState((current) => {
      if (!canTransitionSpeakingState(current, 'fallback_turn_based') && current !== 'fallback_turn_based') {
        return current;
      }
      let next = current === 'fallback_turn_based'
        ? current
        : transitionSpeakingState(current, 'fallback_turn_based');
      if (resumePart && canTransitionSpeakingState(next, heldPartRef.current)) {
        next = transitionSpeakingState(next, heldPartRef.current);
      }
      return next;
    });
    setStatusMessage(message);
  };

  const requestMicrophone = async () => {
    applyState('requesting_permission', 'Đang xin quyền microphone…');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch {
      applyState('permission_denied', 'Trình duyệt từ chối microphone. Bạn có thể thử lại hoặc chuyển sang thu âm từng lượt.');
      return false;
    }
  };

  const startRealtime = async () => {
    setRecordingError(null);
    const allowed = await requestMicrophone();
    if (!allowed) return;
    applyState('connecting', 'Đang tạo phòng thi realtime…');
    const created = await createLivekitSession({
      consentStorage,
      voiceId,
    });
    if (created.status === 401) {
      enterFallback('unauthenticated', 'Bạn chưa đăng nhập nên không mở được cloud realtime. Đang dùng Thu âm từng lượt — đây không phải realtime.');
      return;
    }
    if (created.status === 429) {
      applyState('quota_exhausted', 'Bạn đang có phiên realtime khác hoặc đã hết lượt tạo phòng.');
      return;
    }
    if (created.status >= 500 && !created.session) {
      applyState('failed', 'Không tạo được phiên realtime.');
      return;
    }
    if (!created.session) {
      enterFallback('provider_unavailable', 'Không tạo được phiên realtime. Đã chuyển sang Thu âm từng lượt — đây không phải realtime.');
      return;
    }
    setSessionId(created.session.id);
    if (created.session.voiceId) setVoiceId(resolveGeminiLiveVoiceId(created.session.voiceId));
    if (created.fallbackReason === 'provider_unavailable' || created.session.state === 'provider_unavailable') {
      applyState('provider_unavailable', 'Gemini Live không khả dụng.');
      return;
    }
    if (created.session.state === 'fallback_turn_based' || created.fallbackReason || !created.token || !created.livekitUrl) {
      enterFallback(created.fallbackReason || 'livekit_unavailable', 'LiveKit hoặc Gemini Live không khả dụng. Đã chuyển sang Thu âm từng lượt — đây không phải realtime.');
      return;
    }
    setLivekitToken(created.token);
    setLivekitUrl(created.livekitUrl);
  };

  const startTurnBased = async () => {
    const allowed = await requestMicrophone();
    if (!allowed) return;
    enterFallback('learner_requested', 'Bạn đang ở chế độ Thu âm từng lượt. Đây không phải realtime. Xem câu hỏi, bấm thu, rồi kết thúc câu trả lời.');
    setQuestion(questionForPart('part_1', 0));
    setQuestionIndex(0);
  };

  const persistLost = useCallback(async () => {
    setState((current) => {
      if (!canTransitionSpeakingState(current, 'connection_lost')) return current;
      return transitionSpeakingState(current, 'connection_lost');
    });
    setStatusMessage('Mất kết nối. Part hiện tại vẫn được giữ.');
    if (sessionId) {
      await transitionLivekitSession(sessionId, 'connection_lost').catch(() => undefined);
    }
  }, [sessionId]);

  const reconnect = async () => {
    if (!sessionId) {
      enterFallback('connection_lost', 'Không reconnect được. Đã chuyển thu âm từng lượt, part hiện tại được giữ. Đây không phải realtime.', true);
      return;
    }
    applyState('connecting', 'Đang reconnect và giữ nguyên part hiện tại.');
    const resumed = await createLivekitSession({
      consentStorage,
      voiceId,
      resumeSessionId: sessionId,
    });
    if (resumed.token && resumed.livekitUrl && resumed.session) {
      setLivekitToken(resumed.token);
      setLivekitUrl(resumed.livekitUrl);
      const part = resumed.session.currentPart || heldPartRef.current;
      rememberPart(part);
      setQuestion(resumed.session.currentQuestion || questionForPart(part, resumed.session.questionIndex || 0));
      setQuestionIndex(resumed.session.questionIndex || 0);
      setStatusMessage('Đã nhận token mới. Đang trở lại part đang dở.');
      return;
    }
    enterFallback(
      resumed.fallbackReason || 'network_failed',
      'Reconnect thất bại. Đã chuyển thu âm từng lượt, part hiện tại được giữ. Đây không phải realtime.',
      true,
    );
  };

  const beginRecording = async () => {
    setRecordingError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      recordStartedAtRef.current = performance.now();
      setIsRecording(true);
    } catch {
      applyState('permission_denied', 'Không thu được microphone.');
    }
  };

  const stopRecorder = async (): Promise<RecordedTurnAudio | null> => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      releaseMedia(streamRef.current, recorder);
      streamRef.current = null;
      mediaRecorderRef.current = null;
      return null;
    }
    const endedAt = performance.now();
    const startedAt = recordStartedAtRef.current;
    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });
    releaseMedia(streamRef.current, recorder);
    streamRef.current = null;
    mediaRecorderRef.current = null;
    setIsRecording(false);
    const chunks = chunksRef.current;
    chunksRef.current = [];
    if (!chunks.length) return null;
    const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
    const measured = await measureSpeechSegmentsFromBlob(blob);
    const durationSeconds = measured.durationSeconds || measuredDurationSeconds(startedAt, endedAt);
    return {
      blob,
      mimeType: blob.type || 'audio/webm',
      durationSeconds,
      startedAtMs: startedAt,
      endedAtMs: endedAt,
      speechSegments: measured.speechSegments,
    };
  };

  const finalizeExam = async () => {
    const audioTurns = turnAudioRef.current;
    const combined = await concatenateTurnAudio(audioTurns);
    const totalDuration = turns.reduce((sum, turn) => sum + turn.durationSeconds, 0)
      + audioTurns.reduce((sum, turn) => sum + turn.durationSeconds, 0);
    if (!combined) {
      setTelemetryLabel('unavailable');
      applyState('completed', 'Buổi thi đã kết thúc. Các chỉ số acoustic đang unavailable vì không có audio thật.');
      if (sessionId) await endLivekitSession(sessionId).catch(() => undefined);
      return;
    }
    try {
      const base64 = await blobToBase64(combined.blob);
      const speechSegments = audioTurns.flatMap((turn, index) => {
        const offset = audioTurns.slice(0, index).reduce((sum, item) => sum + item.durationSeconds, 0);
        return (turn.speechSegments || []).map((segment) => ({
          start: segment.start + offset,
          end: segment.end + offset,
        }));
      });
      const report = await evaluateSpeakingLiveAudioApi({
        fullAudioBase64: base64,
        mimeType: combined.mimeType,
        conversationHistory: turns.map((turn, index) => ({
          turnIndex: index,
          part: turn.part,
          question: turn.question,
          userTranscript: turn.answer,
          durationSeconds: turn.durationSeconds,
        })),
        totalDurationSeconds: totalDuration,
        speechSegments: speechSegments.length ? speechSegments : null,
        consentStorage,
        sessionId: sessionId || undefined,
      });
      setTelemetryLabel(report.telemetry?.acousticStatus || 'measured');
      awardXP(80, 'Hoàn thành phòng thi Speaking');
    } catch {
      setTelemetryLabel(calculateSpeakingTelemetry({
        transcript: turns.map((turn) => turn.answer).join(' '),
        durationSeconds: totalDuration,
        speechSegments: null,
      }).acousticStatus);
    } finally {
      turnAudioRef.current = [];
    }
    applyState('completed', 'Đã có báo cáo Speaking.');
    if (sessionId) await endLivekitSession(sessionId).catch(() => undefined);
  };

  const endAnswer = async () => {
    const recorded = await stopRecorder();
    if (recorded) turnAudioRef.current.push(recorded);
    const answer = transcript.trim() || (recorded ? '[audio recorded]' : '');
    const durationSeconds = recorded?.durationSeconds ?? 0;
    if (!answer && !recorded) {
      setTelemetryLabel('unavailable');
      setRecordingError('Không có audio thật nên pronunciation, WPM và pause đang unavailable.');
    } else {
      setTelemetryLabel(recorded?.speechSegments?.length ? 'measured' : 'unavailable');
    }
    const currentPart = examPartFromState(state) || heldPartRef.current || 'part_1';
    setTurns((current) => [...current, {
      part: currentPart,
      question,
      answer,
      durationSeconds,
    }]);
    setTranscript('');

    const next = nextQuestionIndexAfterAnswer(currentPart, questionIndex);
    if (next.nextPart === 'finalizing') {
      await persistTransition('finalizing');
      setStatusMessage('Đang tổng hợp báo cáo…');
      await finalizeExam();
      return;
    }
    const nextQuestion = questionForPart(next.nextPart, next.nextIndex);
    setQuestion(nextQuestion);
    setQuestionIndex(next.nextIndex);
    rememberPart(next.nextPart);
    await persistTransition(next.nextPart, { questionIndex: next.nextIndex, question: nextQuestion });
    if (next.nextPart === 'part_2_preparation') {
      setPrepSecondsLeft(PART_2_PREP_SECONDS);
      setStatusMessage('Part 2: bạn có 1 phút ghi ý. Cue card đang hiện.');
    } else if (next.nextPart === 'part_2_speaking') {
      setPrepSecondsLeft(PART_2_SPEAK_SECONDS);
      setStatusMessage('Hãy nói tối đa 2 phút theo cue card. Giám khảo không ngắt lời.');
    } else {
      setPrepSecondsLeft(null);
      speakExaminerText(nextQuestion, 0.96, 'British');
    }
  };

  useEffect(() => {
    const onOffline = () => {
      void persistLost();
    };
    window.addEventListener('offline', onOffline);
    return () => window.removeEventListener('offline', onOffline);
  }, [persistLost]);

  useEffect(() => {
    if (prepSecondsLeft === null) return undefined;
    if (prepSecondsLeft <= 0) return undefined;
    const timer = window.setTimeout(() => setPrepSecondsLeft((value) => (value === null ? value : Math.max(0, value - 1))), 1000);
    return () => window.clearTimeout(timer);
  }, [prepSecondsLeft]);

  useEffect(() => () => {
    releaseMedia(streamRef.current, mediaRecorderRef.current);
    turnAudioRef.current = [];
  }, []);

  const showFallbackBanner = Boolean(fallbackReason)
    || state === 'fallback_turn_based';
  const showExam = ['part_1', 'part_2_preparation', 'part_2_speaking', 'part_3', 'fallback_turn_based'].includes(state);
  const examPart = examPartFromState(state) || heldPartRef.current;

  return (
    <div id="ai_speaking_realtime_room" data-ux-state={state} className="space-y-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="w-full sm:w-72">
            <VoicePicker
              useCase="examiner"
              compact
              onVoiceChange={onVoiceChange}
            />
          </div>
          <button data-ux-flow="practice.skills" type="button" onClick={onBackToPractice} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold dark:bg-slate-800">
            ← Thoát phòng thi
          </button>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <input
            data-ux-flow="speaking.realtime"
            data-ux-control="consent-storage"
            type="checkbox"
            checked={consentStorage}
            onChange={(event) => setConsentStorage(event.target.checked)}
          />
          Cho phép lưu transcript và telemetry (không lưu audio thô)
        </label>
      </div>

      {livekitToken && livekitUrl && state !== 'fallback_turn_based' && state !== 'idle' && (
        <LiveKitRoom
          token={livekitToken}
          serverUrl={livekitUrl}
          audio={true}
          video={false}
          connect={true}
          onConnected={() => {
            setConnected(true);
            const part = heldPartRef.current;
            setState((current) => {
              if (current === 'connecting' && canTransitionSpeakingState(current, part)) {
                return transitionSpeakingState(current, part);
              }
              if (current === 'connecting' && canTransitionSpeakingState(current, 'part_1')) {
                rememberPart('part_1');
                return transitionSpeakingState(current, 'part_1');
              }
              return current;
            });
            setStatusMessage('Đã kết nối giám khảo realtime.');
          }}
          onDisconnected={() => {
            setConnected(false);
            void persistLost();
          }}
          onError={() => {
            if (examPartFromState(state) || turns.length) {
              void persistLost();
              return;
            }
            enterFallback('network_failed', 'Không kết nối được LiveKit. Đã chuyển sang Thu âm từng lượt — đây không phải realtime.');
          }}
        >
          <RoomAudioRenderer />
          <ExamDataBridge
            onState={(nextState, index, nextQuestion) => {
              if (index !== undefined) setQuestionIndex(index);
              if (nextQuestion) setQuestion(nextQuestion);
              applyState(nextState);
            }}
          />
        </LiveKitRoom>
      )}

      {showFallbackBanner && (
        <div data-ux-state="fallback" className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          Đang chuyển sang <strong>Thu âm từng lượt</strong>. Đây không phải realtime. Xem câu hỏi, bấm thu, kết thúc câu trả lời rồi gửi.
        </div>
      )}

      {state === 'idle' && (
        <section data-ux-state="empty" className="rounded-3xl border border-indigo-900/40 bg-slate-950 p-8 text-white shadow-xl">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-300">Realtime IELTS Speaking Room</p>
          <h1 className="mt-2 text-3xl font-black">Phòng thi Speaking realtime với giám khảo Gemini Live</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-300">
            Cloud realtime chỉ mở sau khi bạn đăng nhập. Nếu LiveKit hoặc Gemini Live không sẵn sàng, Omni nói thẳng và chuyển sang thu âm từng lượt.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              data-ux-flow="speaking.realtime"
              data-ux-control="start-realtime-session"
              type="button"
              onClick={() => void startRealtime()}
              className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white"
            >
              <span className="inline-flex items-center gap-2"><Mic className="h-4 w-4" /> Bắt đầu phiên realtime</span>
            </button>
            <button
              data-ux-flow="speaking.realtime"
              data-ux-control="switch-to-turn-based"
              type="button"
              onClick={() => void startTurnBased()}
              className="rounded-2xl border border-slate-600 px-5 py-3 text-sm font-bold"
            >
              Thu âm từng lượt
            </button>
          </div>
        </section>
      )}

      {state === 'requesting_permission' && (
        <StatusCard state="loading" icon={<Mic className="h-5 w-5" />} title="Đang xin quyền microphone" body={statusMessage} />
      )}
      {state === 'connecting' && (
        <StatusCard state="loading" icon={<Activity className="h-5 w-5" />} title="Đang kết nối phòng thi" body={statusMessage} />
      )}
      {state === 'permission_denied' && (
        <StatusCard state="permission-denied" icon={<AlertTriangle className="h-5 w-5" />} title="Microphone bị từ chối" body={statusMessage}>
          <button data-ux-flow="speaking.realtime" data-ux-control="microphone-permission" type="button" onClick={() => void startTurnBased()} className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-900">
            Thử lại quyền microphone
          </button>
          <button data-ux-flow="speaking.realtime" data-ux-control="switch-to-turn-based-from-permission" type="button" onClick={() => void startTurnBased()} className="rounded-xl border px-4 py-2 text-sm font-bold">
            Chuyển sang thu âm từng lượt
          </button>
        </StatusCard>
      )}
      {state === 'quota_exhausted' && (
        <StatusCard state="quota-exhausted" icon={<AlertTriangle className="h-5 w-5" />} title="Hết lượt phiên realtime" body={statusMessage}>
          <button data-ux-flow="speaking.realtime" data-ux-control="switch-to-turn-based-from-quota" type="button" onClick={() => void startTurnBased()} className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-900">
            Chuyển sang thu âm từng lượt
          </button>
        </StatusCard>
      )}
      {state === 'provider_unavailable' && (
        <StatusCard state="provider-unavailable" icon={<WifiOff className="h-5 w-5" />} title="Gemini Live không khả dụng" body={statusMessage}>
          <button data-ux-flow="speaking.realtime" data-ux-control="retry-provider" type="button" onClick={() => void startRealtime()} className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-900">
            Thử lại nhà cung cấp
          </button>
          <button data-ux-flow="speaking.realtime" data-ux-control="switch-to-turn-based-from-provider" type="button" onClick={() => void startTurnBased()} className="rounded-xl border px-4 py-2 text-sm font-bold">
            Chuyển sang thu âm từng lượt
          </button>
        </StatusCard>
      )}
      {state === 'connection_lost' && (
        <StatusCard state="reconnecting" icon={<RefreshCw className="h-5 w-5" />} title="Mất kết nối — part hiện tại vẫn được giữ" body={statusMessage}>
          <button
            data-ux-flow="speaking.realtime"
            data-ux-control="reconnect"
            type="button"
            onClick={() => void reconnect()}
            className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-900"
          >
            Reconnect
          </button>
          <button
            data-ux-flow="speaking.realtime"
            data-ux-control="resume-interrupted-session"
            type="button"
            onClick={() => enterFallback('connection_lost', 'Tiếp tục part đang dở ở chế độ thu âm từng lượt. Đây không phải realtime.', true)}
            className="rounded-xl border px-4 py-2 text-sm font-bold"
          >
            Tiếp tục part đang dở
          </button>
        </StatusCard>
      )}

      {showExam && (
        <section data-ux-state={connected ? 'connected' : 'fallback'} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-500">{PART_LABELS[examPart]}</p>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
              <Clock className="h-3.5 w-3.5" /> {connected ? 'Realtime Gemini Live' : 'Thu âm từng lượt'}
              {prepSecondsLeft !== null ? ` · ${prepSecondsLeft}s` : ''}
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">{question}</h2>
          {examPart.startsWith('part_2') && (
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
              {cueCard.bulletPoints.map((point) => <li key={point}>{point}</li>)}
            </ul>
          )}
          <textarea
            data-ux-flow="speaking.realtime"
            aria-label="Transcript câu trả lời"
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
            className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            placeholder="Transcript sẽ hiện ở đây. Nếu nhận dạng giọng nói không có, bạn có thể gõ."
          />
          {recordingError && <p className="text-sm text-rose-700 dark:text-rose-300">{recordingError}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              data-ux-flow="speaking.realtime"
              data-ux-control="begin-recording"
              type="button"
              onClick={() => void beginRecording()}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white"
            >
              {isRecording ? 'Đang thu…' : 'Bắt đầu thu'}
            </button>
            <button
              data-ux-flow="speaking.realtime"
              data-ux-control="end-answer"
              type="button"
              onClick={() => void endAnswer()}
              className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white"
            >
              Kết thúc câu trả lời
            </button>
            <button
              data-ux-flow="speaking.realtime"
              data-ux-control="end-exam"
              type="button"
              onClick={() => void persistTransition('finalizing').then(() => finalizeExam())}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold"
            >
              Kết thúc buổi thi
            </button>
          </div>
        </section>
      )}

      {state === 'finalizing' && (
        <StatusCard state="loading" icon={<Activity className="h-5 w-5" />} title="Đang chấm bài" body="Chỉ phân tích pronunciation khi có audio thật." />
      )}

      {state === 'completed' && (
        <section data-ux-state="success" className="space-y-3 rounded-3xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900 dark:bg-emerald-950/30">
          <h2 className="flex items-center gap-2 text-xl font-black"><CheckCircle2 className="h-5 w-5 text-emerald-600" /> Báo cáo Speaking</h2>
          <p className="text-sm">Acoustic telemetry: <strong>{telemetryLabel}</strong></p>
          <p className="text-sm">Số lượt đã ghi: {turns.length}. Audio thô không được lưu.</p>
          <button
            data-ux-flow="speaking.realtime"
            data-ux-control="restart-exam"
            type="button"
            onClick={() => {
              setTurns([]);
              turnAudioRef.current = [];
              setState('idle');
              setFallbackReason(null);
              setSessionId(null);
            }}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"
          >
            Làm lại
          </button>
        </section>
      )}

      {state === 'failed' && (
        <StatusCard state="network-failure" icon={<AlertTriangle className="h-5 w-5" />} title="Buổi thi thất bại" body={statusMessage}>
          <button data-ux-flow="speaking.realtime" data-ux-control="retry-failed" type="button" onClick={() => void startRealtime()} className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-900">
            Thử lại
          </button>
        </StatusCard>
      )}

      <p className="flex items-center gap-2 text-[11px] text-slate-500">
        <ShieldCheck className="h-3.5 w-3.5" />
        Gemini BYOK chỉ đi qua TLS, không ghi localStorage, metadata phòng, hay log.
      </p>
    </div>
  );
};

const ExamDataBridge: React.FC<{
  onState: (state: SpeakingSessionState, questionIndex?: number, question?: string) => void;
}> = ({ onState }) => {
  const room = useRoomContext();
  useEffect(() => {
    const handler = (payload: Uint8Array) => {
      const parsed = parseExamDataMessage(new TextDecoder().decode(payload));
      if (parsed?.type === 'exam_state') {
        onState(parsed.state, parsed.questionIndex, parsed.question);
      }
    };
    room.on(RoomEvent.DataReceived, handler);
    return () => {
      room.off(RoomEvent.DataReceived, handler);
    };
  }, [room, onState]);
  return null;
};

const StatusCard: React.FC<{
  state: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  children?: React.ReactNode;
}> = ({ state, icon, title, body, children }) => (
  <section data-ux-state={state} className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900">
    <h2 className="flex items-center gap-2 text-lg font-black">{icon} {title}</h2>
    <p className="text-sm text-slate-600 dark:text-slate-300">{body}</p>
    {children && <div className="flex flex-wrap gap-2">{children}</div>}
  </section>
);

function readStoredGeminiVoice(): string | undefined {
  if (typeof localStorage === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem('omni_voice_examiner');
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as VoiceDescriptor;
    return parsed.provider === 'gemini' ? parsed.id : undefined;
  } catch {
    return undefined;
  }
}
