import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Gauge,
  Repeat,
  Radio,
  BookOpen,
  Send,
  Eye,
  EyeOff,
  AlertCircle,
  Flame,
} from 'lucide-react';
import { MediaSession, MediaTranscriptSegment } from '../../types';
import { useApp } from '../../context/AppContext';
import { XP_REWARDS } from '../../services/gamification';
import { diffWords, WordDiffToken } from '../../lib/wordDiff';
import { OriginalMediaPlayer, OriginalMediaPlayerHandle } from './OriginalMediaPlayer';

interface DictationStudioProps {
  session: MediaSession;
  activeSegmentIndex: number;
  onSelectSegmentIndex: (index: number) => void;
}

export const DictationStudio: React.FC<DictationStudioProps> = ({
  session,
  activeSegmentIndex,
  onSelectSegmentIndex,
}) => {
  const { awardXP, addMistake, openAITutorWithPrompt } = useApp();

  const segment: MediaTranscriptSegment | undefined =
    session.transcriptSegments[activeSegmentIndex];

  // Playback settings
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(0.9);
  const [loopCount, setLoopCount] = useState<number>(1);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  // Dictation input & state
  const [userInput, setUserInput] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [diffResults, setDiffResults] = useState<WordDiffToken[]>([]);
  const [accuracyScore, setAccuracyScore] = useState<number>(0);
  const [showHintFirstLetters, setShowHintFirstLetters] = useState<boolean>(false);
  const [showFullAnswer, setShowFullAnswer] = useState<boolean>(false);
  const [mistakeSaved, setMistakeSaved] = useState<boolean>(false);
  const originalPlayerRef = useRef<OriginalMediaPlayerHandle | null>(null);

  // Reset state on segment change
  useEffect(() => {
    setUserInput('');
    setIsSubmitted(false);
    setDiffResults([]);
    setAccuracyScore(0);
    setShowHintFirstLetters(false);
    setShowFullAnswer(false);
    setMistakeSaved(false);
    setIsPlayingAudio(false);
  }, [activeSegmentIndex, session.id]);

  // Clean play audio handler
  const handlePlayAudio = () => {
    if (!segment) return;
    setIsPlayingAudio(true);
    originalPlayerRef.current?.playSegment(segment.start, segment.end, playbackSpeed, loopCount);
  };

  // Compare user input against expected sentence
  const handleCheckDictation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || !segment) return;

    const comparison = diffWords(segment.text, userInput);
    const accuracy = comparison.accuracy;
    setAccuracyScore(accuracy);
    setDiffResults(comparison.tokens);
    setIsSubmitted(true);

    if (accuracy >= 85) {
      awardXP(XP_REWARDS.DICTATION_COMPLETED, `Chép chính tả xuất sắc (${accuracy}%)!`);
    } else {
      awardXP(Math.round(XP_REWARDS.DICTATION_COMPLETED / 2), 'Luyện tập chép chính tả');
    }
  };

  const handleSaveMistakeToNotebook = () => {
    if (!segment || mistakeSaved) return;

    addMistake({
      id: `m_dict_${Date.now()}`,
      errorText: userInput,
      correctedText: segment.text,
      explanation: `Lỗi sai chính tả / thiếu từ trong bài nghe chép "${session.title}". Nghĩa: ${segment.translation || ''}`,
      errorType: 'vocab',
      skill: 'listening',
      originModule: 'media',
      srsStage: 0,
      nextReviewDate: new Date().toISOString(),
      reviewCount: 0,
      mastered: false,
      createdAt: new Date().toISOString(),
      tags: ['Dictation', 'Listening', 'Spelling'],
    });

    setMistakeSaved(true);
    awardXP(XP_REWARDS.MISTAKE_REVIEWED, 'Đã lưu câu Dictation cần cải thiện vào Sổ Tay!');
  };

  const generateFirstLetterHints = (text: string) => {
    return text
      .split(/\s+/)
      .map((w) => {
        const clean = w.replace(/[^a-zA-Z0-9]/g, '');
        if (clean.length <= 1) return w;
        return clean[0] + '_'.repeat(Math.max(1, clean.length - 1));
      })
      .join(' ');
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
        onPlaybackEnded={() => setIsPlayingAudio(false)}
      />
      <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-sm space-y-6">
        {/* Top Header Controls */}
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
          </div>

          {/* Speed Selector */}
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
        </div>

        {/* Audio Player Card (Transcript Hidden) */}
        <div className="p-6 sm:p-8 rounded-3xl bg-stone-50/80 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-700/80 text-center space-y-4">
          <div className="flex justify-center">
            <button
              onClick={handlePlayAudio}
              className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-all cursor-pointer ${
                isPlayingAudio
                  ? 'bg-rose-500 hover:bg-rose-600 animate-pulse shadow-rose-500/30'
                  : 'bg-sky-500 hover:bg-sky-600 shadow-sky-500/30 hover:scale-105 active:scale-95'
              }`}
              title="Nghe âm thanh câu này"
            >
              <Volume2 className="w-8 h-8" />
            </button>
          </div>

          <div className="text-xs font-bold text-sky-600 dark:text-sky-400">
            {isPlayingAudio ? 'Đang phát âm thanh câu...' : 'Bấm để nghe câu tiếng Anh'}
          </div>

          <p className="text-xs text-stone-500 dark:text-stone-400 italic max-w-md mx-auto">
            Văn bản đang được ẩn để bạn rèn luyện phản xạ tai nghe chính xác từng từ.
          </p>

          {/* First Letter Hint */}
          {showHintFirstLetters && !isSubmitted && (
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200 font-mono">
              <span className="font-bold block mb-1">Gợi ý ký tự đầu:</span>
              {generateFirstLetterHints(segment.text)}
            </div>
          )}

          <div className="flex items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setShowHintFirstLetters(!showHintFirstLetters)}
              className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{showHintFirstLetters ? 'Ẩn gợi ý chữ cái' : 'Gợi ý chữ cái đầu'}</span>
            </button>
          </div>
        </div>

        {/* Dictation Input Form */}
        <form onSubmit={handleCheckDictation} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
              Gõ chính xác những gì bạn nghe được vào đây:
            </label>
            <textarea
              rows={3}
              required
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Type exactly what you hear..."
              className="w-full p-4 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-sm text-stone-900 dark:text-stone-100 font-serif leading-relaxed focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowFullAnswer(!showFullAnswer)}
              className="text-xs font-semibold text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 flex items-center gap-1 cursor-pointer"
            >
              {showFullAnswer ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showFullAnswer ? 'Ẩn đáp án' : 'Xem đáp án ngay'}</span>
            </button>

            <button
              type="submit"
              disabled={!userInput.trim()}
              className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white font-bold text-xs shadow-md shadow-sky-600/20 flex items-center gap-2 cursor-pointer transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kiểm Tra Chính Tả</span>
            </button>
          </div>
        </form>

        {/* Full Answer reveal if requested */}
        {showFullAnswer && (
          <div className="p-4 rounded-2xl bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 space-y-1.5 animate-fadeIn">
            <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400">
              Đáp án gốc đầy đủ:
            </span>
            <p className="text-sm font-serif font-bold text-stone-900 dark:text-stone-100">
              "{segment.text}"
            </p>
            {segment.translation && (
              <p className="text-xs text-stone-600 dark:text-stone-400 font-sans">
                {segment.translation}
              </p>
            )}
          </div>
        )}

        {/* DETAILED RESULTS BREAKDOWN */}
        {isSubmitted && (
          <div
            className={`p-6 rounded-3xl border space-y-5 animate-fadeIn ${
              accuracyScore >= 85
                ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
            }`}
          >
            {/* Header Score */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {accuracyScore >= 85 ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
                )}
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-stone-900 dark:text-stone-100">
                    {accuracyScore >= 85
                      ? 'Xuất Sắc! Nghe Chép Rất Chính Xác'
                      : 'Cần Luyện Thêm Một Chút!'}
                  </h4>
                  <p className="text-xs text-stone-600 dark:text-stone-400">
                    Độ khớp từ vựng: {accuracyScore}%
                  </p>
                </div>
              </div>

              <div className="text-2xl font-black text-stone-900 dark:text-stone-100">
                {accuracyScore}%
              </div>
            </div>

            {/* Word-by-word diff analysis */}
            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 space-y-2">
              <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 block">
                Phân tích đối chiếu từng từ:
              </span>
              <div className="flex flex-wrap gap-2 text-sm font-serif leading-loose">
                {diffResults.map((item, idx) => {
                  if (item.status === 'correct') {
                    return (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800"
                        title="Chính xác"
                      >
                        {item.expected}
                      </span>
                    );
                  }
                  if (item.status === 'incorrect') {
                    return (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-bold border border-rose-300 dark:border-rose-800"
                        title={`Bạn gõ: "${item.user}" -> Đáp án: "${item.expected}"`}
                      >
                        <span className="line-through opacity-70 mr-1">{item.user}</span>
                        <span>{item.expected}</span>
                      </span>
                    );
                  }
                  // missing
                  return (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-800"
                      title="Từ bị thiếu"
                    >
                      [{item.expected}]
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Actions for Incorrect */}
            {accuracyScore < 85 && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  onClick={handleSaveMistakeToNotebook}
                  disabled={mistakeSaved}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    mistakeSaved
                      ? 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300'
                      : 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{mistakeSaved ? 'Đã lưu vào Sổ Tay Lỗi Sai' : 'Lưu vào Sổ Tay Lỗi Sai'}</span>
                </button>

                <button
                  onClick={() =>
                    openAITutorWithPrompt(
                      `Hãy giải thích các hiện tượng nối âm (connected speech) hoặc từ vựng khiến tôi nghe nhầm trong câu: "${segment.text}"`
                    )
                  }
                  className="px-3 py-2 rounded-xl bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-xs font-bold flex items-center gap-1.5 hover:bg-sky-100 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Hỏi AI về mẹo nghe câu này</span>
                </button>
              </div>
            )}
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
            className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-30 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shadow-sky-600/20"
          >
            <span>Câu tiếp theo</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
