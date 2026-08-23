import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  Repeat,
  Gauge,
  HelpCircle,
  Award,
  ChevronRight,
  ChevronLeft,
  VolumeX,
  Radio,
  Share2,
  BookmarkPlus,
  Info,
} from 'lucide-react';
import { MediaSession, MediaTranscriptSegment, MediaShadowingEvaluation } from '../../types';
import { useApp } from '../../context/AppContext';
import { evaluateShadowingAttempt } from '../../services/mediaService';
import { XP_REWARDS } from '../../services/gamification';
import { OriginalMediaPlayer, OriginalMediaPlayerHandle } from './OriginalMediaPlayer';

interface ShadowingStudioProps {
  session: MediaSession;
  activeSegmentIndex: number;
  onSelectSegmentIndex: (index: number) => void;
}

export const ShadowingStudio: React.FC<ShadowingStudioProps> = ({
  session,
  activeSegmentIndex,
  onSelectSegmentIndex,
}) => {
  const { awardXP, addMistake, openAITutorWithPrompt } = useApp();

  const segment: MediaTranscriptSegment | undefined =
    session.transcriptSegments[activeSegmentIndex];

  // Playback settings
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [loopCount, setLoopCount] = useState<number>(1);
  const [currentLoop, setCurrentLoop] = useState<number>(0);
  const [isPlayingNative, setIsPlayingNative] = useState<boolean>(false);
  const [showTranslation, setShowTranslation] = useState<boolean>(true);

  // Recording states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [userAudioUrl, setUserAudioUrl] = useState<string | null>(null);
  const [userAudioBlob, setUserAudioBlob] = useState<Blob | null>(null);
  const [isPlayingUserAudio, setIsPlayingUserAudio] = useState<boolean>(false);

  // AI Evaluation states
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evaluation, setEvaluation] = useState<MediaShadowingEvaluation | null>(null);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);
  const userAudioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const recognizedTextRef = useRef<string>('');
  const originalPlayerRef = useRef<OriginalMediaPlayerHandle | null>(null);

  // Clean up on unmount or segment change
  useEffect(() => {
    setEvaluation(null);
    setUserAudioUrl(null);
    setUserAudioBlob(null);
    setIsRecording(false);
    setIsPlayingNative(false);
    setIsPlayingUserAudio(false);
    setRecordingSeconds(0);
    clearInterval(recordTimerRef.current);
  }, [activeSegmentIndex, session.id]);

  // Handle Play Native Sentence Audio
  const handlePlayNativeAudio = () => {
    if (!segment) return;
    setIsPlayingNative(true);
    setCurrentLoop(1);
    originalPlayerRef.current?.playSegment(segment.start, segment.end, playbackSpeed, loopCount);
  };

  const handleStopNativeAudio = () => {
    originalPlayerRef.current?.stop();
    setIsPlayingNative(false);
    setCurrentLoop(0);
  };

  // Start Real Voice Recording
  const startRecording = async () => {
    setEvaluation(null);
    setEvaluationError(null);
    setUserAudioUrl(null);
    setUserAudioBlob(null);
    recognizedTextRef.current = '';

    try {
      // Initialize SpeechRecognition if supported for transcript capture
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let text = '';
          for (let i = 0; i < event.results.length; i++) {
            text += event.results[i][0].transcript + ' ';
          }
          recognizedTextRef.current = text.trim();
        };

        recognition.start();
        speechRecognitionRef.current = recognition;
      }

      // Initialize MediaRecorder
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setUserAudioBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setUserAudioUrl(url);

        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());

        // Perform AI evaluation
        await handleEvaluateRecording(audioBlob, recognizedTextRef.current);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone permission denied or not supported:', err);
      setEvaluationError('Không truy cập được microphone. Điểm phát âm và ngữ điệu đang unavailable; hãy cấp quyền mic rồi thử lại.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {}
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else setEvaluationError('Không có audio thật để chấm.');

    setIsRecording(false);
    clearInterval(recordTimerRef.current);
  };

  // Perform AI Evaluation
  const handleEvaluateRecording = async (blob: Blob | null, userTranscript: string) => {
    if (!segment) return;
    setIsEvaluating(true);
    setEvaluationError(null);

    try {
      let base64Audio = '';
      if (blob) {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        await new Promise((resolve) => {
          reader.onloadend = () => {
            base64Audio = (reader.result as string) || '';
            resolve(null);
          };
        });
      }

      const evalResult = await evaluateShadowingAttempt({
        targetSentence: segment.text,
        userTranscript: userTranscript || segment.text,
        userAudioBase64: base64Audio,
        topicTitle: session.title,
      });

      setEvaluation(evalResult);

      // Award XP based on score
      if (evalResult.overallScore >= 80) {
        awardXP(XP_REWARDS.SHADOWING_SENTENCE + 10, 'Shadowing xuất sắc (Điểm > 80)!');
      } else {
        awardXP(XP_REWARDS.SHADOWING_SENTENCE, 'Hoàn thành lượt luyện Shadowing');
      }

      // If accuracy was low or words were swallowed, add a practice mistake entry
      if (evalResult.swallowedWords && evalResult.swallowedWords.length > 0) {
        addMistake({
          id: `m_shad_${Date.now()}`,
          errorText: `Nuốt âm/Lướt mất từ: ${evalResult.swallowedWords.join(', ')} trong câu "${segment.text.slice(0, 40)}..."`,
          correctedText: segment.text,
          explanation: evalResult.actionableAdvice || 'Luyện phát âm rõ âm cuối và trọng âm câu.',
          errorType: 'pronunciation',
          skill: 'speaking',
          originModule: 'media',
          srsStage: 0,
          nextReviewDate: new Date().toISOString(),
          reviewCount: 0,
          mastered: false,
          createdAt: new Date().toISOString(),
          tags: ['Shadowing', 'Pronunciation', 'Connected Speech'],
        });
      }
    } catch (err: any) {
      setEvaluationError(err.message || 'Không thể đánh giá giọng nói lúc này.');
    } finally {
      setIsEvaluating(false);
    }
  };

  // Play User Audio
  const handleTogglePlayUserAudio = () => {
    if (!userAudioUrl) return;
    if (isPlayingUserAudio) {
      userAudioPlayerRef.current?.pause();
      setIsPlayingUserAudio(false);
    } else {
      if (!userAudioPlayerRef.current) {
        userAudioPlayerRef.current = new Audio(userAudioUrl);
        userAudioPlayerRef.current.onended = () => setIsPlayingUserAudio(false);
      }
      userAudioPlayerRef.current.play();
      setIsPlayingUserAudio(true);
    }
  };

  const handleNext = () => {
    if (activeSegmentIndex < session.transcriptSegments.length - 1) {
      onSelectSegmentIndex(activeSegmentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (activeSegmentIndex > 0) {
      onSelectSegmentIndex(activeSegmentIndex - 1);
    }
  };

  if (!segment) {
    return (
      <div className="p-8 text-center bg-white dark:bg-stone-800 rounded-3xl border border-stone-200 dark:border-stone-700">
        <p className="text-xs text-stone-500">Chưa chọn câu để luyện tập.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <OriginalMediaPlayer
        ref={originalPlayerRef}
        session={session}
        onPlaybackEnded={() => {
          setIsPlayingNative(false);
          setCurrentLoop(0);
        }}
      />
      {/* Active Segment Studio Card */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-sm space-y-6">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-700 pb-4">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold text-xs flex items-center gap-1.5 border border-sky-200/60 dark:border-sky-800/60">
              <Radio className="w-3.5 h-3.5 text-sky-500 animate-pulse" />
              <span>
                Câu {activeSegmentIndex + 1} / {session.transcriptSegments.length}
              </span>
            </span>
            {segment.speaker && (
              <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-700 px-2 py-0.5 rounded-md">
                {segment.speaker}
              </span>
            )}
            <span className="text-[11px] text-stone-400">
              [{segment.start.toFixed(1)}s - {segment.end.toFixed(1)}s]
            </span>
          </div>

          {/* Speed & Loop Controls */}
          <div className="flex items-center gap-2">
            {/* Speed selector */}
            <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-900 p-1 rounded-xl border border-stone-200 dark:border-stone-700">
              <Gauge className="w-3.5 h-3.5 text-stone-400 ml-1.5" />
              {[0.75, 0.9, 1.0].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    playbackSpeed === spd
                      ? 'bg-white dark:bg-stone-700 text-sky-600 dark:text-sky-300 shadow-xs'
                      : 'text-stone-500 dark:text-stone-400 hover:text-stone-900'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            {/* Loop count selector */}
            <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-900 p-1 rounded-xl border border-stone-200 dark:border-stone-700">
              <Repeat className="w-3.5 h-3.5 text-stone-400 ml-1.5" />
              {[1, 2, 3].map((lp) => (
                <button
                  key={lp}
                  onClick={() => setLoopCount(lp)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    loopCount === lp
                      ? 'bg-white dark:bg-stone-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                      : 'text-stone-500 dark:text-stone-400 hover:text-stone-900'
                  }`}
                  title={`Lặp lại ${lp} lần`}
                >
                  {lp}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Big Sentence Display */}
        <div className="p-6 sm:p-8 rounded-3xl bg-stone-50/80 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-700/80 text-center space-y-4 relative overflow-hidden">
          {isPlayingNative && (
            <div className="absolute top-2 right-3 text-[10px] font-bold text-sky-600 dark:text-sky-400 animate-pulse flex items-center gap-1">
              <span>Đang phát (Vòng {currentLoop}/{loopCount})...</span>
            </div>
          )}

          {/* Play Native Button */}
          <div className="flex justify-center">
            {isPlayingNative ? (
              <button
                onClick={handleStopNativeAudio}
                className="w-16 h-16 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                title="Dừng phát âm"
              >
                <Pause className="w-7 h-7" />
              </button>
            ) : (
              <button
                onClick={handlePlayNativeAudio}
                className="w-16 h-16 rounded-full bg-sky-500 hover:bg-sky-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer group"
                title="Nghe phát âm chuẩn bản xứ"
              >
                <Volume2 className="w-8 h-8 group-hover:scale-110 transition-transform" />
              </button>
            )}
          </div>

          <div className="text-xs font-bold text-sky-600 dark:text-sky-400">
            {isPlayingNative ? 'Đang lắng nghe phát âm bản xứ...' : 'Bấm để nghe giọng chuẩn'}
          </div>

          {/* Sentence Text with word click */}
          <div className="max-w-2xl mx-auto space-y-3">
            <p className="text-lg sm:text-xl md:text-2xl font-bold font-serif text-stone-900 dark:text-stone-100 leading-relaxed">
              "{segment.text}"
            </p>

            {/* Translation toggle */}
            {showTranslation && segment.translation && (
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed font-sans max-w-xl mx-auto">
                {segment.translation}
              </p>
            )}

            <div className="pt-2 flex justify-center">
              <button
                onClick={() => setShowTranslation(!showTranslation)}
                className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 hover:text-sky-600 dark:hover:text-sky-400 underline cursor-pointer"
              >
                {showTranslation ? 'Ẩn nghĩa tiếng Việt' : 'Hiện nghĩa tiếng Việt'}
              </button>
            </div>
          </div>
        </div>

        {/* SHADOWING RECORDING ACTION */}
        <div className="p-6 rounded-3xl bg-gradient-to-b from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-stone-800 border border-indigo-100 dark:border-indigo-900/40 text-center space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
            Luyện Nói & Nhại Giọng (Shadowing Practice)
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {isRecording ? (
              <button
                onClick={stopRecording}
                className="px-8 py-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-lg shadow-rose-600/30 flex items-center gap-3 animate-pulse cursor-pointer transition-all"
              >
                <div className="w-3 h-3 rounded-full bg-white animate-ping" />
                <MicOff className="w-5 h-5" />
                <span>Dừng Thu Âm & Chấm Điểm AI ({recordingSeconds}s)</span>
              </button>
            ) : (
              <button
                onClick={startRecording}
                disabled={isEvaluating}
                className="px-8 py-4 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center gap-3 cursor-pointer hover:scale-102 active:scale-98 transition-all"
              >
                <Mic className="w-5 h-5" />
                <span>Bắt Đầu Nói Theo (Shadowing)</span>
              </button>
            )}

            {userAudioUrl && !isRecording && (
              <button
                onClick={handleTogglePlayUserAudio}
                className="px-5 py-3.5 rounded-full bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-200 text-xs font-bold flex items-center gap-2 border border-stone-200 dark:border-stone-600 cursor-pointer transition-all"
              >
                <Play className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>{isPlayingUserAudio ? 'Tạm Dừng Giọng Bạn' : 'Nghe Lại Giọng Bạn'}</span>
              </button>
            )}
          </div>

          <p className="text-[11px] text-stone-500 dark:text-stone-400 max-w-md mx-auto">
            Mẹo: Nghe trước 1-2 lần, sau đó bấm thu âm và nói đồng thời theo ngữ điệu, ngắt nghỉ đúng cụm nghĩa (chunking).
          </p>
        </div>

        {/* AI EVALUATION RESULT */}
        {isEvaluating && (
          <div className="p-6 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-center space-y-3 animate-fadeIn">
            <Sparkles className="w-6 h-6 text-amber-500 mx-auto animate-spin" />
            <div className="font-bold text-xs sm:text-sm text-amber-800 dark:text-amber-200">
              Gemini AI đang phân tích ngữ điệu, trọng âm câu và độ chính xác âm vị...
            </div>
          </div>
        )}

        {evaluationError && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{evaluationError}</span>
          </div>
        )}

        {evaluation && !isEvaluating && (
          <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-50/70 via-white to-sky-50/50 dark:from-emerald-950/30 dark:via-stone-800 dark:to-sky-950/20 border border-emerald-200/80 dark:border-emerald-800/80 space-y-5 animate-fadeIn">
            {/* Header & Overall Score */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 dark:border-emerald-900/40 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-black text-xl shadow-md shadow-emerald-500/20">
                  {evaluation.overallScore}
                </div>
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Đánh Giá Chi Tiết Từ Giám Khảo AI</span>
                  </h4>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {evaluation.overallScore >= 85
                      ? 'Xuất sắc! Ngữ điệu và nhịp điệu tương đồng cao với người bản xứ.'
                      : 'Khá tốt! Hãy chú ý các điểm nhấn trọng âm và âm đuôi bên dưới.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    openAITutorWithPrompt(
                      `Hãy giải thích chi tiết cách nói tự nhiên câu này và hướng dẫn sửa lỗi phát âm: "${segment.text}". Nhận xét hiện tại của AI: "${evaluation.feedbackVi}"`
                    )
                  }
                  className="px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-xs font-bold flex items-center gap-1.5 hover:bg-sky-100 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Hỏi sâu AI</span>
                </button>
              </div>
            </div>

            {/* Criteria Score Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-center">
                <div className="text-[11px] font-bold text-stone-500 dark:text-stone-400">
                  Độ Trôi Chảy (Fluency & Rhythm)
                </div>
                <div className="text-xl font-black text-sky-600 dark:text-sky-400 mt-1">
                  {evaluation.fluencyScore}/100
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-center">
                <div className="text-[11px] font-bold text-stone-500 dark:text-stone-400">
                  Ngữ Điệu & Trọng Âm (Intonation)
                </div>
                <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                  {evaluation.intonationScore}/100
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-center">
                <div className="text-[11px] font-bold text-stone-500 dark:text-stone-400">
                  Độ Chuẩn Âm (Accuracy)
                </div>
                <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {evaluation.accuracyScore}/100
                </div>
              </div>
            </div>

            {/* Detailed Feedback & Actionable Advice */}
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 space-y-2">
                <div className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-sky-500" />
                  <span>Nhận xét sư phạm:</span>
                </div>
                <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                  {evaluation.feedbackVi}
                </p>
              </div>

              {evaluation.actionableAdvice && (
                <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 space-y-1.5">
                  <div className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Mẹo cải thiện ngay cho lần nói tới:</span>
                  </div>
                  <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                    {evaluation.actionableAdvice}
                  </p>
                </div>
              )}

              {evaluation.swallowedWords && evaluation.swallowedWords.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/40 text-xs">
                  <span className="font-bold text-rose-900 dark:text-rose-200 block mb-1.5">
                    Các từ bị nuốt âm hoặc phát âm lướt mất âm:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {evaluation.swallowedWords.map((sw, swIdx) => (
                      <span
                        key={swIdx}
                        className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 font-serif font-bold text-xs"
                      >
                        {sw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="pt-4 border-t border-stone-100 dark:border-stone-700 flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={activeSegmentIndex === 0}
            className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 disabled:opacity-30 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Câu trước</span>
          </button>

          <span className="text-xs text-stone-400">
            {activeSegmentIndex + 1} / {session.transcriptSegments.length}
          </span>

          <button
            onClick={handleNext}
            disabled={activeSegmentIndex === session.transcriptSegments.length - 1}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shadow-indigo-600/20"
          >
            <span>Câu tiếp theo</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
