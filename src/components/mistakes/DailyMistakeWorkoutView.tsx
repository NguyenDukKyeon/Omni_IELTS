import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCw,
  Volume2,
  HelpCircle,
  ArrowRight,
  Flame,
  Award,
  Zap,
  BookOpen,
  Filter,
  Check,
  X,
  Play,
  RotateCcw,
} from 'lucide-react';
import { MistakeEntry, TrapCategory } from '../../types';
import { ReviewRating, TRAP_CATEGORY_METAS } from '../../services/srsScheduler';
import { playTextToSpeech } from '../../services/aiTutor';
import { useApp } from '../../context/AppContext';
import { isAcceptedAnswer, selectDueMistakes } from '../../lib/mistakeDrill';

interface DailyMistakeWorkoutViewProps {
  mistakes: MistakeEntry[];
  initialTrapFilter?: TrapCategory | 'all';
  onCompleteSession: () => void;
  onBackToAnalytics: () => void;
}

export const DailyMistakeWorkoutView: React.FC<DailyMistakeWorkoutViewProps> = ({
  mistakes,
  initialTrapFilter = 'all',
  onCompleteSession,
  onBackToAnalytics,
}) => {
  const { reviewMistake, openAITutorWithPrompt, awardXP } = useApp();

  const [selectedTrapFilter, setSelectedTrapFilter] = useState<TrapCategory | 'all'>(
    initialTrapFilter
  );
  const [workoutLimit, setWorkoutLimit] = useState<number>(5);
  const [sessionStarted, setSessionStarted] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Card interaction state
  const [isAnswerRevealed, setIsAnswerRevealed] = useState<boolean>(false);
  const [userSelection, setUserSelection] = useState<string>('');
  const [typedAnswer, setTypedAnswer] = useState<string>('');
  const [isSelfCorrect, setIsSelfCorrect] = useState<boolean | null>(null);

  // Session stats
  const [reviewedCount, setReviewedCount] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [isSessionFinished, setIsSessionFinished] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  // Filter mistakes due or matching trap
  const eligibleMistakes = selectDueMistakes<MistakeEntry>(mistakes).filter((m) => {
    if (selectedTrapFilter !== 'all' && m.trapCategory !== selectedTrapFilter) return false;
    return true;
  });

  // Prioritize due items first, then unmastered, then all
  const sortedMistakes = [...eligibleMistakes].sort((a, b) => {
    if (!a.mastered && b.mastered) return -1;
    if (a.mastered && !b.mastered) return 1;
    return (a.srsStage || 0) - (b.srsStage || 0);
  });

  const workoutQueue = sortedMistakes.slice(0, workoutLimit);
  const currentMistake: MistakeEntry | undefined = workoutQueue[currentIndex];

  const handleStartWorkout = () => {
    if (workoutQueue.length === 0) return;
    setSessionStarted(true);
    setCurrentIndex(0);
    setIsAnswerRevealed(false);
    setUserSelection('');
    setTypedAnswer('');
    setIsSelfCorrect(null);
    setReviewedCount(0);
    setCorrectCount(0);
    setIsSessionFinished(false);
  };

  const handleRevealAnswer = () => {
    setIsAnswerRevealed(true);
  };

  const handleSelectOption = (opt: string) => {
    if (isAnswerRevealed) return;
    setUserSelection(opt);
    setIsAnswerRevealed(true);
    if (currentMistake && isAcceptedAnswer(opt, currentMistake.correctedText, currentMistake.acceptedAnswers)) {
      setIsSelfCorrect(true);
      setCorrectCount((prev) => prev + 1);
    } else {
      setIsSelfCorrect(false);
    }
  };

  const handleCheckTypedAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedAnswer.trim() || isAnswerRevealed) return;
    setIsAnswerRevealed(true);
    if (currentMistake && isAcceptedAnswer(typedAnswer, currentMistake.correctedText, currentMistake.acceptedAnswers)) {
      setIsSelfCorrect(true);
      setCorrectCount((prev) => prev + 1);
    } else {
      setIsSelfCorrect(false);
    }
  };

  const handleRateCard = (rating: ReviewRating) => {
    if (!currentMistake || !isAnswerRevealed) return;

    reviewMistake(currentMistake.id, rating);
    setReviewedCount((prev) => prev + 1);

    if (currentIndex < workoutQueue.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsAnswerRevealed(false);
      setUserSelection('');
      setTypedAnswer('');
      setIsSelfCorrect(null);
    } else {
      setIsSessionFinished(true);
      awardXP(50, 'Hoàn thành Daily Mistake Workout!');
    }
  };

  const handlePlayTTS = async (text: string) => {
    setIsPlayingAudio(true);
    try {
      await playTextToSpeech(text);
    } finally {
      setIsPlayingAudio(false);
    }
  };

  const handleAskAITutor = () => {
    if (!currentMistake) return;
    const prompt = `Em vừa luyện câu này trong Sổ Tay Lỗi Sai (Dạng: ${currentMistake.trapCategoryTitleVi || currentMistake.errorType}):
- Câu có lỗi: "${currentMistake.errorText}"
- Câu sửa chuẩn: "${currentMistake.correctedText}"
- Giải thích hiện tại: "${currentMistake.explanation}"
${currentMistake.trapBreakdownVi ? `- Phân tích bẫy: "${currentMistake.trapBreakdownVi}"` : ''}

Thầy AI có thể giải thích chi tiết hơn tại sao cách viết ban đầu lại bị trừ điểm và cung cấp thêm 2 ví dụ tương tự trong bài thi thật không?`;
    openAITutorWithPrompt(prompt);
  };

  // 1. CONFIGURATION SCREEN
  if (!sessionStarted || isSessionFinished) {
    if (isSessionFinished) {
      return (
        <div className="p-8 text-center space-y-6 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center border border-emerald-400/40">
            <Award className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold text-stone-900 dark:text-white">
              Xuất Sắc! Hoàn Thành Daily Workout
            </h3>
            <p className="text-xs text-stone-700 dark:text-stone-300">
              Bạn đã ôn luyện và cập nhật tiến trình Spaced Repetition (SM-2) cho{' '}
              <strong>{reviewedCount}</strong> câu bẫy lỗi sai.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
            <div className="p-3 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700">
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                +{reviewedCount * 15 + 50}
              </div>
              <div className="text-[10px] text-stone-700 dark:text-stone-300 font-bold uppercase">XP Thưởng</div>
            </div>
            <div className="p-3 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700">
              <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
                {workoutQueue.length}
              </div>
              <div className="text-[10px] text-stone-700 dark:text-stone-300 font-bold uppercase">Câu Đã Ôn</div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={handleStartWorkout}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Luyện thêm 1 hiệp</span>
            </button>
            <button
              onClick={onCompleteSession}
              className="px-5 py-2.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-bold rounded-xl transition-colors"
            >
              Quay lại Bản đồ lỗi
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 max-w-xl mx-auto py-2">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-xs font-bold">
            <Flame className="w-4 h-4" />
            <span>Thuật toán Lặp lại Ngắt quãng (SM-2 SRS)</span>
          </div>
          <h3 className="text-lg font-bold text-stone-900 dark:text-white">
            Daily Mistake Workout (Luyện Khắc Phục Bẫy)
          </h3>
          <p className="text-xs text-stone-700 dark:text-stone-300">
            Hệ thống tự động chọn lọc các bẫy bạn dễ mắc phải nhất để rèn phản xạ nhận diện
            và sửa đúng trước kỳ thi thật.
          </p>
        </div>

        {/* Filter Selection */}
        <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 space-y-4">
          <div>
            <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-2">
              🎯 Chọn Nhóm Bẫy Muốn Rèn Luyện:
            </label>
            <select
              value={selectedTrapFilter}
              onChange={(e) => setSelectedTrapFilter(e.target.value as any)}
              className="w-full text-xs p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              <option value="all">Tất cả các nhóm bẫy ({mistakes.length} câu)</option>
              {Object.entries(TRAP_CATEGORY_METAS).map(([key, meta]) => {
                const count = mistakes.filter((m) => m.trapCategory === key).length;
                return (
                  <option key={key} value={key}>
                    {meta.titleVi} ({count} câu)
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-2">
              ⚡ Số lượng câu cho phiên luyện tập:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { count: 5, label: '5 câu (3 phút)' },
                { count: 10, label: '10 câu (Tiêu chuẩn)' },
                { count: Math.min(20, sortedMistakes.length || 15), label: `Tối đa (${sortedMistakes.length} câu)` },
              ].map((item) => (
                <button
                  key={item.count}
                  type="button"
                  onClick={() => setWorkoutLimit(item.count)}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    workoutLimit === item.count
                      ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                      : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:border-amber-400'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Start Button */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={onBackToAnalytics}
            className="text-xs font-semibold text-stone-700 hover:text-stone-800 dark:hover:text-stone-200"
          >
            ← Quay lại Bản đồ Điểm yếu
          </button>

          <button
            id="start-workout-session-btn"
            onClick={handleStartWorkout}
            disabled={sortedMistakes.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
          >
            <Play className="w-4 h-4" />
            <span>Bắt đầu Luyện Tập ({Math.min(workoutLimit, sortedMistakes.length)} câu)</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. ACTIVE WORKOUT INTERFACE
  const trapMeta = currentMistake?.trapCategory
    ? TRAP_CATEGORY_METAS[currentMistake.trapCategory]
    : null;

  return (
    <div id="active-mistake-workout" className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-amber-600 dark:text-amber-400">
            Câu {currentIndex + 1} / {workoutQueue.length}
          </span>
          <span className="text-stone-700 dark:text-stone-300">•</span>
          <span className="text-stone-700 dark:text-stone-300 font-medium">
            Hộp SRS: {currentMistake?.srsStage ?? 0}/5
          </span>
        </div>

        <button
          onClick={() => setIsSessionFinished(true)}
          className="text-stone-700 hover:text-rose-500 dark:hover:text-rose-400 text-xs font-medium"
        >
          Dừng luyện tập
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-stone-100 dark:bg-stone-800 h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-gradient-to-r from-amber-500 to-orange-500 h-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / workoutQueue.length) * 100}%` }}
        />
      </div>

      {/* Trap Tag & Context */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {trapMeta && (
            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${trapMeta.badgeBg} ${trapMeta.badgeText}`}
            >
              {trapMeta.titleVi}
            </span>
          )}
          {currentMistake?.difficulty && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
              {currentMistake.difficulty}
            </span>
          )}
        </div>

        {currentMistake?.questionContext && (
          <span className="text-[11px] text-stone-700 dark:text-stone-300 italic truncate max-w-xs">
            📍 {currentMistake.questionContext}
          </span>
        )}
      </div>

      {/* Question Challenge Box */}
      <div className="p-5 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Đề bài / Câu có bẫy cần xử lý
          </span>

          <button
            onClick={() => handlePlayTTS(currentMistake?.errorText || '')}
            disabled={isPlayingAudio}
            className="p-1 text-stone-700 hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
            title="Nghe phát âm"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>

        <div className="text-sm sm:text-base font-semibold text-stone-900 dark:text-white leading-relaxed">
          {currentMistake?.errorText}
        </div>

        {/* User Attempt Record */}
        {currentMistake?.userAttemptAnswer && (
          <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg border border-rose-200/60 dark:border-rose-900/40 font-mono">
            ⚠️ Lỗi đã chọn trước đây: "{currentMistake.userAttemptAnswer}"
          </div>
        )}
      </div>

      {/* Interactive Answering Area (Before revealing) */}
      {!isAnswerRevealed && (
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900/80 border border-stone-200 dark:border-stone-800 space-y-3">
          {currentMistake?.options && currentMistake.options.length > 0 ? (
            <div className="space-y-2">
              <span className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                🎯 Thử thách: Chọn phương án chuẩn xác nhất:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {currentMistake.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectOption(opt)}
                    className="p-3 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-left text-xs font-medium text-stone-900 dark:text-white transition-all active:scale-98"
                  >
                    <span className="font-bold text-amber-600 dark:text-amber-400 mr-2">
                      {String.fromCharCode(65 + i)}.
                    </span>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ) : currentMistake?.drillType === 'gap_fill' ? (
            <form onSubmit={handleCheckTypedAnswer} className="space-y-2">
              <span className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                ✍️ Nhập từ hoặc dạng đúng (chú ý số ít/nhiều & chính tả):
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={typedAnswer}
                  onChange={(e) => setTypedAnswer(e.target.value)}
                  placeholder="Nhập đáp án chuẩn..."
                  className="flex-1 text-xs p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  Kiểm tra
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-2">
              <button
                onClick={handleRevealAnswer}
                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
              >
                Mở Mổ Xẻ Bẫy & Đáp Án Chuẩn
              </button>
            </div>
          )}
        </div>
      )}

      {/* REVEALED BREAKDOWN & SM-2 RATING */}
      {isAnswerRevealed && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Correct Answer Card */}
          <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Đáp Án Chuẩn Hóa Band 8.0+
              </span>

              <button
                onClick={() => handlePlayTTS(currentMistake?.correctedText || '')}
                disabled={isPlayingAudio}
                className="p-1 text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 transition-colors"
                title="Nghe câu chuẩn"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            <div className="text-sm sm:text-base font-bold text-emerald-900 dark:text-emerald-100">
              {currentMistake?.correctedText}
            </div>
          </div>

          {/* Deep Trap Breakdown & Examiner Tip */}
          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-2.5 text-xs text-stone-700 dark:text-stone-300">
            {currentMistake?.trapBreakdownVi && (
              <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-400/30 text-amber-900 dark:text-amber-200">
                <span className="font-bold block mb-1">🔍 Mổ xẻ bẫy đề thi:</span>
                <p className="leading-relaxed">{currentMistake.trapBreakdownVi}</p>
              </div>
            )}

            <div className="space-y-1">
              <span className="font-bold text-stone-900 dark:text-white block">
                📖 Giải thích chi tiết:
              </span>
              <p className="leading-relaxed">{currentMistake?.explanation}</p>
            </div>

            {currentMistake?.examinerTipVi && (
              <div className="pt-2 border-t border-stone-200 dark:border-stone-800 flex items-start gap-2 text-stone-700 dark:text-stone-300">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p>
                  <strong>Lời khuyên Giám khảo:</strong> {currentMistake.examinerTipVi}
                </p>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleAskAITutor}
                className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 hover:underline font-semibold"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Hỏi AI Tutor phân tích sâu hơn</span>
              </button>
            </div>
          </div>

          {/* SM-2 Rating Buttons */}
          <div className="p-4 rounded-2xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 space-y-2">
            <span className="text-[11px] font-bold text-stone-700 dark:text-stone-300 block text-center">
              Đánh giá mức độ ghi nhớ để thuật toán SM-2 xếp lịch ôn tiếp theo:
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                id="rate-srs-again-btn"
                onClick={() => handleRateCard('again')}
                className="p-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-sm transition-all active:scale-95 flex flex-col items-center justify-center gap-0.5"
              >
                <span>🔁 Làm Lại</span>
                <span className="text-[10px] font-normal opacity-90">Ôn lại 1 ngày</span>
              </button>

              <button
                id="rate-srs-hard-btn"
                onClick={() => handleRateCard('hard')}
                className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition-all active:scale-95 flex flex-col items-center justify-center gap-0.5"
              >
                <span>⚠️ Khó</span>
                <span className="text-[10px] font-normal opacity-90">Ôn sau 2-3 ngày</span>
              </button>

              <button
                id="rate-srs-good-btn"
                onClick={() => handleRateCard('good')}
                className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95 flex flex-col items-center justify-center gap-0.5"
              >
                <span>👍 Tốt</span>
                <span className="text-[10px] font-normal opacity-90">Ôn sau 7 ngày</span>
              </button>

              <button
                id="rate-srs-easy-btn"
                onClick={() => handleRateCard('easy')}
                className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95 flex flex-col items-center justify-center gap-0.5"
              >
                <span>🌟 Dễ</span>
                <span className="text-[10px] font-normal opacity-90">Làm chủ (14-30d)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
