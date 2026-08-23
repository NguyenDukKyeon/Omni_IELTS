import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  BookmarkPlus,
  Check,
  RotateCcw,
  BookOpen,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  Zap,
  Target,
  FileText,
} from 'lucide-react';
import {
  QuestionTrapAnalysisInput,
  QuestionTrapAnalysisResult,
  TrapTypeIdentified,
  MistakeEntry,
} from '../../types';
import { analyzeQuestionDistractorTrapApi } from '../../services/practiceService';
import { useApp } from '../../context/AppContext';
import { XP_REWARDS } from '../../services/gamification';

interface QuestionTrapDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionData: QuestionTrapAnalysisInput | null;
}

const TRAP_TAXONOMY_META: Record<
  string,
  { label: string; tagColor: string; descriptionVi: string }
> = {
  'Trap 1': {
    label: 'Trap 1: False Contradiction vs. Absence (TFNG Confusion)',
    tagColor: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-200',
    descriptionVi:
      'Nhầm lẫn giữa thông tin trái ngược (False) và thông tin không được đề cập (Not Given).',
  },
  'Trap 2': {
    label: 'Trap 2: Overgeneralization (Extreme Words)',
    tagColor: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200',
    descriptionVi:
      'Câu hỏi dùng từ cực đoan (always, all, sole, never, only) trong khi bài đọc chỉ ở mức độ khả dĩ/thường xuyên.',
  },
  'Trap 3': {
    label: 'Trap 3: Temporal / Timeline Shift',
    tagColor: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-200',
    descriptionVi:
      'Tráo đổi mốc thời gian (quá khứ vs hiện tại vs dự đoán tương lai).',
  },
  'Trap 4': {
    label: 'Trap 4: Lexical Mirage (Same Words, Opposite Context)',
    tagColor: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-200',
    descriptionVi:
      'Sử dụng y hệt từ vựng trong bài đọc nhưng đặt trong ngữ cảnh phủ định hoặc hoán đổi chủ thể.',
  },
  'Trap 5': {
    label: 'Trap 5: Scope Shift (Broader vs Narrower Fact)',
    tagColor: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300',
    descriptionVi:
      'Câu hỏi khái quát phạm vi quá rộng hoặc thu hẹp sự thật cụ thể được nêu trong bài.',
  },
  'Trap 6': {
    label: 'Trap 6: Causality Reversal (Đảo Ngược Nhân - Quả)',
    tagColor: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-200',
    descriptionVi:
      'Đảo ngược chiều quan hệ nguyên nhân và hệ quả (A gây ra B bị đổi thành B gây ra A).',
  },
  Other: {
    label: 'Trap Other: Cơ Chế Bẫy Đặc Thù',
    tagColor: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200',
    descriptionVi:
      'Cơ chế gây nhiễu đặc thù không nằm trong 6 loại cơ bản.',
  },
};

export const QuestionTrapDiagnosticModal: React.FC<QuestionTrapDiagnosticModalProps> = ({
  isOpen,
  onClose,
  questionData,
}) => {
  const { addMistake, awardXP } = useApp();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<QuestionTrapAnalysisResult | null>(null);
  const [isSavedToNotebook, setIsSavedToNotebook] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && questionData) {
      handleAnalyzeTrap();
    } else {
      setResult(null);
      setErrorMessage(null);
      setIsSavedToNotebook(false);
    }
  }, [isOpen, questionData]);

  if (!isOpen || !questionData) return null;

  const handleAnalyzeTrap = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await analyzeQuestionDistractorTrapApi(questionData);
      setResult(data);
      awardXP(XP_REWARDS.EXERCISE_COMPLETED, 'Bóc tách bẫy câu hỏi Reading & Listening');
    } catch (err: any) {
      console.error('Trap analysis error:', err);
      setErrorMessage(
        err?.message ||
          'Không thể kết nối với mô hình gemini-3.1-pro để phân tích bẫy câu hỏi.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveMistakeToNotebook = () => {
    if (!result || !questionData) return;

    const trapMeta = TRAP_TAXONOMY_META[result.trapTypeIdentified] || TRAP_TAXONOMY_META.Other;
    const entry: MistakeEntry = {
      id: `trap_${Date.now()}`,
      errorText: `Câu ${result.questionNumber} (${result.questionType}): Bạn chọn "${result.userAnswer}"`,
      correctedText: `Đáp án đúng: "${result.correctAnswer}" [${trapMeta.label}]`,
      explanation: `${result.distractorMechanismVi} (Lời khuyên: ${result.examinerAdviceVi})`,
      errorType: 'reading_distractor' as any,
      skill: 'reading',
      originModule: 'ielts_practice_reading',
      srsStage: 0,
      nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      reviewCount: 0,
      mastered: false,
      createdAt: new Date().toISOString(),
      tags: ['Trap Taxonomy', result.trapTypeIdentified, result.questionType],
    };

    addMistake(entry);
    setIsSavedToNotebook(true);
  };

  const currentTrapMeta =
    result && result.trapTypeIdentified
      ? TRAP_TAXONOMY_META[result.trapTypeIdentified] || TRAP_TAXONOMY_META.Other
      : null;

  return (
    <div
      id="question-trap-diagnostic-modal"
      className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden my-4 sm:my-8 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              <Target className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                  IELTS Distractor & Trap Diagnostics
                </h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-300/30">
                  gemini-3.1-pro
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Bóc tách cơ chế bẫy câu hỏi: Phân loại 6 bẫy kinh điển + Trích xuất Paraphrase Mapping
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {/* Question Summary Bar */}
          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 space-y-2 text-xs">
            <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 font-bold uppercase tracking-wider text-[11px]">
              <span>
                Câu {questionData.questionNumber} • Dạng bài: {questionData.questionType}
              </span>
              <span>Target Band {questionData.targetBand || 7.5}</span>
            </div>
            <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 leading-relaxed">
              "{questionData.questionStatement}"
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <div>
                <span className="text-stone-500 font-medium">Bạn đã chọn: </span>
                <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold">
                  {questionData.userAnswer}
                </span>
              </div>
              <div>
                <span className="text-stone-500 font-medium">Đáp án chuẩn: </span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                  {questionData.correctAnswer}
                </span>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs sm:text-sm flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Lỗi chẩn đoán bẫy câu hỏi</p>
                <p className="mt-0.5 text-rose-700 dark:text-rose-300">{errorMessage}</p>
                <button
                  onClick={handleAnalyzeTrap}
                  className="mt-2 text-xs font-bold text-rose-700 underline"
                >
                  Thử lại ➔
                </button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="p-8 text-center space-y-3">
              <RotateCcw className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400 mx-auto" />
              <p className="text-xs font-bold text-stone-700 dark:text-stone-300">
                Chuyên gia Khảo thí đang đối chiếu Paraphrase & Phân loại bẫy...
              </p>
            </div>
          )}

          {/* Results State */}
          {result && (
            <div className="space-y-5 animate-fadeIn">
              {/* Trap Identified Banner */}
              <div
                className={`p-5 rounded-2xl border ${
                  currentTrapMeta?.tagColor || 'bg-slate-100 text-slate-800 border-slate-300'
                } space-y-2`}
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full bg-white/80 dark:bg-black/30 font-black text-xs uppercase tracking-wider">
                    {result.trapTypeIdentified}
                  </span>
                  <span className="text-xs font-bold">
                    {currentTrapMeta?.label || result.trapTypeIdentified}
                  </span>
                </div>

                <p className="text-xs sm:text-sm font-medium leading-relaxed">
                  {result.trapDescriptionIfOther || currentTrapMeta?.descriptionVi}
                </p>
              </div>

              {/* Minimum Passage Snippet Citation */}
              <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/80 space-y-2">
                <div className="flex items-center gap-1.5 text-indigo-900 dark:text-indigo-200 text-xs font-bold">
                  <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Dẫn chứng ngắn gọn trong bài đọc (Minimum Citation Evidence):</span>
                </div>
                <p className="text-xs sm:text-sm font-serif italic text-indigo-950 dark:text-indigo-100 pl-3 border-l-2 border-indigo-500 leading-relaxed">
                  "{questionData.passageSnippet}"
                </p>
              </div>

              {/* Paraphrase Mapping Table */}
              {result.paraphraseMapping && result.paraphraseMapping.length > 0 && (
                <div className="p-4 rounded-2xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-3">
                  <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100 text-xs font-bold">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Bộ Cặp Từ Khóa Paraphrase Mapping:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {result.paraphraseMapping.map((pair, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-750 text-xs flex items-center justify-between gap-2"
                      >
                        <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                          "{pair.questionKeyword}"
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          "{pair.passageEquivalent}"
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Distractor Mechanism & Advice */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-2">
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Cơ Chế Bẫy Tâm Lý (Distractor Mechanism):</span>
                  </span>
                  <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                    {result.distractorMechanismVi}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-2">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-4 h-4" />
                    <span>Chiến Lược Khảo Thí (Examiner Advice):</span>
                  </span>
                  <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                    {result.examinerAdviceVi}
                  </p>
                </div>
              </div>

              {/* 1-Click Save to Mistake Notebook */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleSaveMistakeToNotebook}
                  disabled={isSavedToNotebook}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                    isSavedToNotebook
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20'
                  }`}
                >
                  {isSavedToNotebook ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Đã lưu bẫy này vào Sổ tay Lỗi sai</span>
                    </>
                  ) : (
                    <>
                      <BookmarkPlus className="w-4 h-4" />
                      <span>Lưu bẫy & Paraphrase vào Sổ tay Lỗi sai</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-bold hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
