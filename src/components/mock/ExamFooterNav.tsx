import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Flag, Grid, Check, HelpCircle } from 'lucide-react';
import { ExamColorScheme } from '../../types';

interface ExamFooterNavProps {
  totalQuestions: number;
  currentQuestionNumber: number;
  onSelectQuestion: (number: number) => void;
  answeredMap: Record<number, boolean>;
  flaggedList: number[];
  onToggleFlag: (number: number) => void;
  sectionOffsets?: Array<{ sectionNumber: number; startQ: number; endQ: number; label: string }>;
  currentSectionIndex?: number;
  onSelectSection?: (index: number) => void;
  colorScheme?: ExamColorScheme;
}

export const ExamFooterNav: React.FC<ExamFooterNavProps> = ({
  totalQuestions,
  currentQuestionNumber,
  onSelectQuestion,
  answeredMap,
  flaggedList,
  onToggleFlag,
  sectionOffsets,
  currentSectionIndex = 0,
  onSelectSection,
  colorScheme = 'standard',
}) => {
  const [showReviewGrid, setShowReviewGrid] = useState(false);

  const isCurrentFlagged = flaggedList.includes(currentQuestionNumber);
  const answeredCount = Object.values(answeredMap).filter(Boolean).length;
  const flaggedCount = flaggedList.length;

  const handlePrev = () => {
    if (currentQuestionNumber > 1) {
      onSelectQuestion(currentQuestionNumber - 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionNumber < totalQuestions) {
      onSelectQuestion(currentQuestionNumber + 1);
    }
  };

  const footerBg =
    colorScheme === 'high_contrast'
      ? 'bg-black border-yellow-500 text-yellow-300'
      : colorScheme === 'inverted'
      ? 'bg-slate-100 border-slate-300 text-slate-800'
      : 'bg-slate-950 border-slate-800 text-slate-200';

  return (
    <>
      <footer className={`${footerBg} border-t px-4 py-2.5 flex items-center justify-between select-none sticky bottom-0 z-30 shadow-lg transition-colors`}>
        {/* Left: Section Navigator & Flag Toggle */}
        <div className="flex items-center gap-2">
          {sectionOffsets && sectionOffsets.length > 1 ? (
            <div className={`flex items-center gap-1 border p-1 rounded-lg ${colorScheme === 'high_contrast' ? 'bg-black border-yellow-500' : 'bg-slate-900 border-slate-800'}`}>
              {sectionOffsets.map((sec, idx) => (
                <button
                  key={sec.sectionNumber}
                  onClick={() => onSelectSection?.(idx)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                    currentSectionIndex === idx
                      ? colorScheme === 'high_contrast'
                        ? 'bg-yellow-400 text-black font-bold'
                        : 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sec.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-400 font-medium">
              Tiến độ: <span className="text-emerald-400 font-bold">{answeredCount}</span>/{totalQuestions} câu đã làm
            </div>
          )}

          {/* Flag question button */}
          <button
            onClick={() => onToggleFlag(currentQuestionNumber)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              isCurrentFlagged
                ? colorScheme === 'high_contrast'
                  ? 'bg-yellow-400 text-black border-yellow-300 font-bold'
                  : 'bg-amber-950/80 border-amber-500 text-amber-300 shadow-sm'
                : colorScheme === 'high_contrast'
                ? 'bg-black border-yellow-500/60 text-yellow-400'
                : 'bg-slate-900 border-slate-700/80 text-slate-400 hover:text-slate-200'
            }`}
            title="Đánh dấu câu hỏi này để xem lại sau (Review Flag)"
          >
            <Flag className={`w-3.5 h-3.5 ${isCurrentFlagged ? (colorScheme === 'high_contrast' ? 'fill-black text-black' : 'fill-amber-400 text-amber-400') : ''}`} />
            <span className="hidden sm:inline">Review Flag</span>
          </button>
        </div>

        {/* Center: Scrollable Question Number Buttons (1 to 40) */}
        <div className="hidden lg:flex items-center gap-1 overflow-x-auto max-w-xl px-2 py-1 scrollbar-thin">
          {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((qNum) => {
            const isAnswered = !!answeredMap[qNum];
            const isFlagged = flaggedList.includes(qNum);
            const isCurrent = qNum === currentQuestionNumber;

            return (
              <button
                key={qNum}
                onClick={() => onSelectQuestion(qNum)}
                className={`relative w-7 h-7 rounded text-xs font-mono font-bold transition-all flex items-center justify-center shrink-0 ${
                  isCurrent
                    ? colorScheme === 'high_contrast'
                      ? 'ring-2 ring-yellow-300 bg-yellow-400 text-black font-bold'
                      : 'ring-2 ring-blue-400 bg-blue-600 text-white shadow-sm'
                    : isAnswered
                    ? colorScheme === 'high_contrast'
                      ? 'bg-yellow-950/70 text-yellow-300 border border-yellow-500'
                      : 'bg-slate-800 text-slate-200 border border-slate-600 hover:border-slate-400'
                    : colorScheme === 'high_contrast'
                    ? 'bg-black text-yellow-600 border border-yellow-800/80'
                    : 'bg-slate-900 text-slate-500 border border-slate-800 hover:text-slate-300'
                }`}
              >
                {qNum}
                {isFlagged && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border border-slate-950" />
                )}
              </button>
            );
          })}
        </div>

        {/* Right: Review Overview Grid Button & Prev / Next Arrows */}
        <div className="flex items-center gap-2">
          {/* Review Grid Overview Modal Button */}
          <button
            onClick={() => setShowReviewGrid(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-semibold transition-colors ${
              colorScheme === 'high_contrast'
                ? 'bg-black border-yellow-500 text-yellow-300 hover:bg-yellow-950'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title="Xem bảng tổng quan 40 câu hỏi"
          >
            <Grid className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Tổng quan</span>
            <span className="text-[11px] text-slate-400">({answeredCount}/{totalQuestions})</span>
          </button>

          {/* Navigation Arrows */}
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              disabled={currentQuestionNumber <= 1}
              className={`p-1.5 rounded-lg border transition-colors disabled:opacity-40 ${
                colorScheme === 'high_contrast'
                  ? 'bg-black border-yellow-500 text-yellow-300'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
              }`}
              title="Câu trước (Phím mũi tên Trái)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold px-1 min-w-[36px] text-center">
              {currentQuestionNumber}/{totalQuestions}
            </span>
            <button
              onClick={handleNext}
              disabled={currentQuestionNumber >= totalQuestions}
              className={`p-1.5 rounded-lg border transition-colors disabled:opacity-40 ${
                colorScheme === 'high_contrast'
                  ? 'bg-black border-yellow-500 text-yellow-300'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
              }`}
              title="Câu kế tiếp (Phím mũi tên Phải)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </footer>

      {/* Full 40-Question Review Matrix Modal */}
      {showReviewGrid && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full p-6 text-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Grid className="w-5 h-5 text-blue-400" />
                  Bảng Điều hướng & Rà soát Toàn bộ Câu hỏi
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Đã làm {answeredCount}/{totalQuestions} câu • Đang gắn cờ {flaggedCount} câu
                </p>
              </div>
              <button
                onClick={() => setShowReviewGrid(false)}
                className="text-slate-400 hover:text-white text-base"
              >
                ✕
              </button>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 text-xs bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-slate-800 border border-slate-600 inline-block" />
                <span className="text-slate-300">Đã trả lời</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-slate-900 border border-slate-800 inline-block" />
                <span className="text-slate-400">Chưa làm</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-slate-800 border border-slate-600 relative inline-block">
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full" />
                </span>
                <span className="text-amber-300">Gắn cờ xem lại</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-blue-600 text-white font-bold inline-flex items-center justify-center text-[10px]">
                  1
                </span>
                <span className="text-blue-300">Đang chọn</span>
              </div>
            </div>

            {/* 40 Grid Matrix */}
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 max-h-[50vh] overflow-y-auto p-1">
              {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((qNum) => {
                const isAnswered = !!answeredMap[qNum];
                const isFlagged = flaggedList.includes(qNum);
                const isCurrent = qNum === currentQuestionNumber;

                return (
                  <button
                    key={qNum}
                    onClick={() => {
                      onSelectQuestion(qNum);
                      setShowReviewGrid(false);
                    }}
                    className={`relative p-2.5 rounded-lg text-xs font-mono font-bold flex flex-col items-center justify-center transition-all ${
                      isCurrent
                        ? 'ring-2 ring-blue-400 bg-blue-600 text-white shadow-md'
                        : isAnswered
                        ? 'bg-slate-800 text-slate-100 border border-slate-600 hover:border-slate-400'
                        : 'bg-slate-950 text-slate-500 border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span>Câu {qNum}</span>
                    <span className="text-[10px] font-normal text-slate-400 mt-0.5">
                      {isAnswered ? 'Đã làm' : 'Trống'}
                    </span>
                    {isFlagged && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-slate-900" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowReviewGrid(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Đóng bảng tổng quan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
