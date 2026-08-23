import React, { useState, useEffect } from 'react';
import {
  X,
  Scale,
  Award,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FileText,
  BookmarkPlus,
  ArrowRight,
  ShieldAlert,
  Sliders,
  Check,
  Zap,
  Info,
  BookOpen,
} from 'lucide-react';
import {
  FullGraderInput,
  FullGraderResult,
  StandardErrorObject,
  MistakeEntry,
} from '../../types';
import { evaluateFullGraderApi } from '../../services/practiceService';
import { useApp } from '../../context/AppContext';
import { XP_REWARDS } from '../../services/gamification';

interface FullGraderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTaskType?: 'writing_task1' | 'writing_task2' | 'speaking';
  initialPrompt?: string;
  initialSubmission?: string;
}

const PRESET_PROMPTS = {
  writing_task2: {
    prompt:
      'Some people think that universities should provide graduates with the knowledge and skills needed in the workplace. Others think that the true function of a university should be to give access to knowledge for its own sake, regardless of whether the course is useful to an employer. Discuss both views and give your opinion.',
    sampleSubmission:
      'In contemporary society, there is an ongoing debate regarding the principal mandate of tertiary institutions. While some proponents argue that academic curricula should be strictly vocational to enhance employability, others contend that higher education must champion holistic erudition and fundamental inquiry. This essay will examine both perspectives before articulating why a symbiotic synthesis of both paradigms is optimal.',
  },
  writing_task1: {
    prompt:
      'The chart below shows the percentage of households in different income brackets in a European country from 2010 to 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    sampleSubmission:
      'The bar chart delineates the proportion of households categorized across five distinct income brackets in an unspecified European nation over a ten-year duration spanning from 2010 to 2020. Overall, the middle-income demographic witnessed a moderate upward trajectory, whereas the lowest income tier exhibited a persistent decline across the surveyed period.',
  },
  speaking: {
    prompt:
      'Describe an environmental law or policy that you think is effective in your country. You should say: what it is, when it was introduced, how it works, and explain why you think it is effective.',
    sampleSubmission:
      'I would like to talk about the nationwide restriction on single-use plastics and non-biodegradable packaging enacted in my home country. Introduced roughly five years ago, this regulatory framework imposes a nominal environmental surcharge on retail plastic bags while incentivizing local supermarkets to adopt compostable alternatives. In my perspective, this legislation has been remarkably efficacious because it altered consumer behavior at the grassroots level.',
  },
};

export const FullGraderModal: React.FC<FullGraderModalProps> = ({
  isOpen,
  onClose,
  initialTaskType = 'writing_task2',
  initialPrompt = '',
  initialSubmission = '',
}) => {
  const { profile, mistakes, addMistake, awardXP } = useApp();

  const [taskType, setTaskType] = useState<'writing_task1' | 'writing_task2' | 'speaking'>(
    initialTaskType
  );
  const [prompt, setPrompt] = useState<string>(
    initialPrompt || PRESET_PROMPTS[initialTaskType].prompt
  );
  const [submission, setSubmission] = useState<string>(
    initialSubmission || PRESET_PROMPTS[initialTaskType].sampleSubmission
  );

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<FullGraderResult | null>(null);
  const [savedErrors, setSavedErrors] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      setTaskType(initialTaskType);
      setPrompt(initialPrompt || PRESET_PROMPTS[initialTaskType].prompt);
      setSubmission(initialSubmission || PRESET_PROMPTS[initialTaskType].sampleSubmission);
      setResult(null);
      setErrorMessage(null);
      setSavedErrors({});
    } else {
      setResult(null);
      setErrorMessage(null);
      setSavedErrors({});
    }
  }, [isOpen, initialTaskType, initialPrompt, initialSubmission]);

  if (!isOpen) return null;

  const wordCount = submission.trim().split(/\s+/).filter(Boolean).length;

  const handleEvaluate = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setResult(null);
    setSavedErrors({});

    try {
      const weakestAxes = profile.estimatedBandRange ? ['lexicalResource', 'coherence'] : [];
      const recentMistakeTags = Array.from(new Set(mistakes.flatMap((m) => m.tags || []))).slice(0, 5);

      const data = await evaluateFullGraderApi({
        taskType,
        prompt,
        submission,
        learnerProfile: {
          targetBand: profile.targetBand || 7.0,
          weakestAxes: weakestAxes.length > 0 ? weakestAxes : undefined,
          recentMistakeTags: recentMistakeTags.length > 0 ? recentMistakeTags : undefined,
        },
      });

      setResult(data);
      if (!data.insufficientData) {
        awardXP(
          XP_REWARDS.ESSAY_EVALUATION,
          `Chấm toàn bài ${taskType} với Cambridge Examiner 4 tiêu chí`
        );
      }
    } catch (err: any) {
      console.error('Full Grader failed:', err);
      setErrorMessage(err?.message || 'Không thể chấm bài từ gemini-3.1-pro.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveErrorToNotebook = (err: StandardErrorObject, idx: number) => {
    const newEntry: MistakeEntry = {
      id: `mistake_grader_${Date.now()}_${idx}`,
      skill: taskType.startsWith('writing') ? 'writing' : 'speaking',
      subType: err.errorTag,
      originalText: err.originalText,
      correctedText: err.correctedText,
      explanation: err.explanationVi,
      tags: [err.errorTag, err.severity],
      severity: err.severity,
      dateAdded: new Date().toISOString(),
      srsReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      srsStage: 0,
    };

    addMistake(newEntry);
    setSavedErrors((prev) => ({ ...prev, [idx]: true }));
  };

  const isWriting = taskType.startsWith('writing');

  return (
    <div
      id="full-grader-modal"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden my-4 sm:my-8 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white flex items-center justify-between shrink-0 shadow-md border-b border-indigo-900/50">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-2xl shadow-inner shrink-0">
              ⚖️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  IELTS Examiner 4-Criteria Full Grader
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-400/20 text-indigo-200 border border-indigo-300/30">
                  full-grader-v1
                </span>
              </div>
              <p className="text-xs text-indigo-200/90 mt-0.5">
                Chấm bài thi độc lập 4 tiêu chí chuẩn Cambridge, kiểm tra tính hợp lệ & chống thiên vị
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

        {/* Input Configuration Bar */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Task Type Switcher */}
            <div className="flex gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => {
                  setTaskType('writing_task2');
                  setPrompt(PRESET_PROMPTS.writing_task2.prompt);
                  setSubmission(PRESET_PROMPTS.writing_task2.sampleSubmission);
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  taskType === 'writing_task2'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Writing Task 2 (Essay)
              </button>
              <button
                type="button"
                onClick={() => {
                  setTaskType('writing_task1');
                  setPrompt(PRESET_PROMPTS.writing_task1.prompt);
                  setSubmission(PRESET_PROMPTS.writing_task1.sampleSubmission);
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  taskType === 'writing_task1'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Writing Task 1 (Report)
              </button>
              <button
                type="button"
                onClick={() => {
                  setTaskType('speaking');
                  setPrompt(PRESET_PROMPTS.speaking.prompt);
                  setSubmission(PRESET_PROMPTS.speaking.sampleSubmission);
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  taskType === 'speaking'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Speaking Interview Mock
              </button>
            </div>

            <div className="text-xs text-slate-500 font-mono">
              Độ dài: <strong className="text-slate-900 dark:text-white">{wordCount}</strong> từ
            </div>
          </div>

          {/* Prompt Statement Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Đề bài (Prompt / Cue Card):
            </label>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Nhập đề bài Writing hoặc câu hỏi Speaking..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Submission Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Bài nộp của thí sinh (Submission):
            </label>
            <textarea
              rows={5}
              value={submission}
              onChange={(e) => setSubmission(e.target.value)}
              placeholder="Dán toàn bộ bài luận hoặc nội dung bài nói vào đây..."
              className="w-full p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-white leading-relaxed focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleEvaluate}
              disabled={isLoading || !submission.trim()}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer"
            >
              {isLoading ? (
                <RotateCcw className="w-4 h-4 animate-spin" />
              ) : (
                <Scale className="w-4 h-4" />
              )}
              <span>{isLoading ? 'Examiner đang chấm 4 tiêu chí...' : 'Chấm Bài 4 Tiêu Chí (Examiner)'}</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="m-5 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Lỗi chấm bài thi</p>
              <p className="mt-0.5 text-rose-700 dark:text-rose-300">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center text-2xl mx-auto animate-pulse">
              ⚖️
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              Examiner đang đối chiếu 4 tiêu chí độc lập...
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Đánh giá Task Response / Coherence / Lexical / Grammar không thiên vị và tính điểm tổng Overall Band theo quy tắc làm tròn Cambridge.
            </p>
          </div>
        )}

        {/* Results Body */}
        {result && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
            {/* Insufficient Data Check */}
            {result.insufficientData ? (
              <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <span>Không Đủ Dữ Liệu Để Chấm Điểm (Input Validity Check)</span>
                </div>
                <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                  {result.insufficientDataReasonVi ||
                    'Bài nộp quá ngắn hoặc không chứa nội dung hoàn chỉnh để đánh giá theo 4 tiêu chí chuẩn Cambridge. Hệ thống từ chối đoán mò band số để đảm bảo tính chuẩn xác.'}
                </p>
              </div>
            ) : (
              <>
                {/* Overall Score Banner */}
                <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-900 via-blue-950 to-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-5 shadow-lg border border-indigo-800/50">
                  <div className="space-y-1 text-center sm:text-left">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                      Kết Quả Đánh Giá Tổng Thể (Overall Band):
                    </span>
                    <div className="flex items-baseline justify-center sm:justify-start gap-2">
                      <span className="text-4xl sm:text-5xl font-black text-amber-300">
                        {result.overallBand.toFixed(1)}
                      </span>
                      <span className="text-xs text-indigo-200 font-medium">
                        / 9.0 (Làm tròn chuẩn Cambridge)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1 max-w-md">
                      {result.disclaimerVi}
                    </p>
                  </div>

                  <div className="px-4 py-2 rounded-2xl bg-white/10 border border-white/20 text-center shrink-0">
                    <span className="text-[10px] uppercase font-bold text-indigo-200 block">
                      Quy chuẩn
                    </span>
                    <span className="text-xs font-black text-white">
                      4 Tiêu Chí Độc Lập
                    </span>
                  </div>
                </div>

                {/* 4 Independent Criteria Cards */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Điểm Số & Nhận Xét Từng Tiêu Chí:
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Criterion 1: TR or FC */}
                    {isWriting ? (
                      result.criteria.taskResponse && (
                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              Task Response / Task Achievement
                            </span>
                            <span className="px-2.5 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs">
                              Band {result.criteria.taskResponse.band.toFixed(1)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            {result.criteria.taskResponse.feedbackVi}
                          </p>
                        </div>
                      )
                    ) : (
                      result.criteria.fluencyAndCoherence && (
                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              Fluency & Coherence
                            </span>
                            <span className="px-2.5 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs">
                              Band {result.criteria.fluencyAndCoherence.band.toFixed(1)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            {result.criteria.fluencyAndCoherence.feedbackVi}
                          </p>
                        </div>
                      )
                    )}

                    {/* Criterion 2: CC or LR */}
                    {isWriting ? (
                      result.criteria.coherenceAndCohesion && (
                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              Coherence & Cohesion
                            </span>
                            <span className="px-2.5 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs">
                              Band {result.criteria.coherenceAndCohesion.band.toFixed(1)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            {result.criteria.coherenceAndCohesion.feedbackVi}
                          </p>
                        </div>
                      )
                    ) : (
                      result.criteria.pronunciation && (
                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              Pronunciation
                            </span>
                            <span className="px-2.5 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs">
                              Band {result.criteria.pronunciation.band.toFixed(1)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            {result.criteria.pronunciation.feedbackVi}
                          </p>
                        </div>
                      )
                    )}

                    {/* Criterion 3: Lexical Resource */}
                    {result.criteria.lexicalResource && (
                      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            Lexical Resource
                          </span>
                          <span className="px-2.5 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs">
                            Band {result.criteria.lexicalResource.band.toFixed(1)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {result.criteria.lexicalResource.feedbackVi}
                        </p>
                      </div>
                    )}

                    {/* Criterion 4: Grammatical Range & Accuracy */}
                    {result.criteria.grammaticalRangeAndAccuracy && (
                      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            Grammatical Range & Accuracy
                          </span>
                          <span className="px-2.5 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs">
                            Band {result.criteria.grammaticalRangeAndAccuracy.band.toFixed(1)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {result.criteria.grammaticalRangeAndAccuracy.feedbackVi}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Inline Annotations */}
                {result.inlineAnnotations && result.inlineAnnotations.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Ghi Chú Trực Tiếp Vào Câu (Inline Annotations):
                    </h4>

                    <div className="space-y-2.5">
                      {result.inlineAnnotations.map((anno, aIdx) => (
                        <div
                          key={aIdx}
                          className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs space-y-1"
                        >
                          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold">
                            <Info className="w-3.5 h-3.5" />
                            <span>{anno.location}</span>
                          </div>
                          <p className="text-slate-800 dark:text-slate-200 font-medium">
                            {anno.issue}
                          </p>
                          <p className="text-emerald-700 dark:text-emerald-300 text-[11px]">
                            💡 Gợi ý sửa: {anno.suggestionVi}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Detected Errors & 1-Click Flashcard Integration */}
                {result.detectedErrors && result.detectedErrors.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Chi Tiết Lỗi Cần Khắc Phục & Nạp Sổ Tay ({result.detectedErrors.length} lỗi):
                    </h4>

                    <div className="space-y-3">
                      {result.detectedErrors.map((err, errIdx) => {
                        const isSaved = savedErrors[errIdx];
                        return (
                          <div
                            key={errIdx}
                            className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2 shadow-xs"
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                              <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-mono font-bold text-[10px] uppercase">
                                {err.errorTag}
                              </span>

                              <button
                                type="button"
                                onClick={() => handleSaveErrorToNotebook(err, errIdx)}
                                disabled={isSaved}
                                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer ${
                                  isSaved
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-indigo-50'
                                }`}
                              >
                                {isSaved ? <Check className="w-3 h-3" /> : <BookmarkPlus className="w-3 h-3" />}
                                <span>{isSaved ? 'Đã Lưu Sổ Tay' : 'Lưu Sổ Tay & SRS'}</span>
                              </button>
                            </div>

                            <div className="space-y-1 text-xs">
                              <p className="text-rose-600 line-through font-serif">
                                {err.originalText}
                              </p>
                              <p className="text-emerald-600 font-serif font-bold">
                                {err.correctedText}
                              </p>
                              <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                                {err.explanationVi}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
