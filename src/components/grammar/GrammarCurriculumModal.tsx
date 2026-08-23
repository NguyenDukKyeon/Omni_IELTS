import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sliders,
  Check,
  Zap,
  ArrowRight,
  ShieldAlert,
  Lightbulb,
  FileCheck2,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { GrammarCurriculumResult, GrammarCurriculumExercise } from '../../types';
import { generateGrammarCurriculumLessonApi } from '../../services/practiceService';
import { useApp } from '../../context/AppContext';
import { XP_REWARDS } from '../../services/gamification';

interface GrammarCurriculumModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTopic?: string;
}

const POPULAR_GRAMMAR_TOPICS = [
  { id: 'conditional_sentences_type_2', label: 'Câu điều kiện Loại 2 (Unreal Present)' },
  { id: 'conditional_sentences_type_3', label: 'Câu điều kiện Loại 3 & Mixed Conditionals' },
  { id: 'inversion_structures', label: 'Đảo ngữ nâng cao (Negative & Limiting Inversion)' },
  { id: 'cleft_sentences', label: 'Câu chẻ nhấn mạnh (Cleft Sentences - It is / What...)' },
  { id: 'participle_clauses', label: 'Mệnh đề phân từ rút gọn (Participle Clauses)' },
  { id: 'nominalization', label: 'Danh từ hóa học thuật (Academic Nominalization)' },
  { id: 'passive_reporting_verbs', label: 'Bị động khách quan (It is acknowledged that...)' },
];

export const GrammarCurriculumModal: React.FC<GrammarCurriculumModalProps> = ({
  isOpen,
  onClose,
  initialTopic = 'conditional_sentences_type_2',
}) => {
  const { profile, mistakes, awardXP } = useApp();

  const [topicInput, setTopicInput] = useState<string>(initialTopic);
  const [exerciseCount, setExerciseCount] = useState<number>(5);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<GrammarCurriculumResult | null>(null);

  // Exercise responses
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const topic = initialTopic || POPULAR_GRAMMAR_TOPICS[0].id;
      setTopicInput(topic);
      handleGenerate(topic, 5);
    } else {
      setResult(null);
      setErrorMessage(null);
      setShowResults(false);
      setUserAnswers({});
    }
  }, [isOpen, initialTopic]);

  if (!isOpen) return null;

  // Learner profile context
  const weakestAxes = profile.estimatedBandRange ? ['lexicalResource', 'coherence'] : [];
  const recentMistakeTags = Array.from(new Set(mistakes.flatMap((m) => m.tags || []))).slice(0, 5);

  const handleGenerate = async (topicOverride?: string, countOverride?: number) => {
    const targetTopic = topicOverride || topicInput;
    const targetCount = countOverride || exerciseCount;

    if (!targetTopic.trim()) {
      setErrorMessage('Vui lòng nhập hoặc chọn chủ điểm ngữ pháp cần học.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setResult(null);
    setShowResults(false);
    setUserAnswers({});

    try {
      const data = await generateGrammarCurriculumLessonApi({
        grammarTopic: targetTopic.trim(),
        exerciseCount: targetCount,
        learnerProfile: {
          targetBand: profile.targetBand || 7.0,
          weakestAxes: weakestAxes.length > 0 ? weakestAxes : undefined,
          recentMistakeTags: recentMistakeTags.length > 0 ? recentMistakeTags : undefined,
        },
      });

      setResult(data);
      awardXP(XP_REWARDS.GRAMMAR_PRACTICE, 'Thiết kế bài học ngữ pháp chuyên sâu với AI Curriculum Designer');
    } catch (err: any) {
      console.error('Grammar Curriculum Designer failed:', err);
      setErrorMessage(err?.message || 'Không thể tạo bài học ngữ pháp từ gemini-3.1-pro.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="grammar-curriculum-modal"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden my-4 sm:my-8 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-800 via-teal-950 to-slate-900 text-white flex items-center justify-between shrink-0 shadow-md border-b border-emerald-900/50">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/30 border border-emerald-400/40 flex items-center justify-center text-2xl shadow-inner shrink-0">
              📐
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  IELTS Grammar Curriculum Designer
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-300/30">
                  grammar-lesson-v1
                </span>
              </div>
              <p className="text-xs text-emerald-200/90 mt-0.5">
                Thiết kế bài học ngữ pháp giải thích qua ví dụ trước + kho bài tập luyện không giới hạn
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

        {/* Learner Profile Context Banner */}
        <div className="px-5 py-2.5 bg-emerald-50/80 dark:bg-emerald-950/60 border-b border-emerald-200 dark:border-emerald-900/50 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200">
            <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-bold">Trọng số người học:</span>
            <span>Mục tiêu Band {profile.targetBand || 7.0}</span>
            {recentMistakeTags.length > 0 && (
              <span className="text-[11px] text-slate-500">
                • Tránh lặp lại lỗi: {recentMistakeTags.join(', ')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-slate-500">Số câu bài tập:</span>
            {[3, 5, 8].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setExerciseCount(c);
                  handleGenerate(topicInput, c);
                }}
                className={`px-2 py-0.5 rounded font-bold transition-all ${
                  exerciseCount === c
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {c} câu
              </button>
            ))}
          </div>
        </div>

        {/* Input & Topic Chips */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Chủ điểm ngữ pháp (Nhập tùy ý hoặc chọn nhanh):
            </span>
          </div>

          <input
            type="text"
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            placeholder="Ví dụ: conditional_sentences_type_2, inversion, cleft_sentences..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />

          {/* Quick pick chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {POPULAR_GRAMMAR_TOPICS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTopicInput(t.id);
                  handleGenerate(t.id, exerciseCount);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                  topicInput === t.id
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-emerald-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => handleGenerate()}
              disabled={isLoading || !topicInput.trim()}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all"
            >
              {isLoading ? (
                <RotateCcw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>{isLoading ? 'AI đang thiết kế bài học...' : 'Soạn Bài Học & Bài Tập Mới'}</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="m-5 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Lỗi thiết kế bài học</p>
              <p className="mt-0.5 text-rose-700 dark:text-rose-300">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-2xl mx-auto animate-pulse">
              📐
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              AI Grammar Curriculum Designer đang xây dựng bài học...
            </p>
            <p className="text-xs text-slate-500">
              Đang tối ưu giải thích trực quan qua ví dụ và tạo {exerciseCount} bài tập bám sát điểm yếu người học.
            </p>
          </div>
        )}

        {/* Output */}
        {result && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
            {/* Topic Header & Visual Explanation */}
            <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white border border-emerald-800/60 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider">
                  Chủ Điểm Ngữ Pháp IELTS:
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white/10 text-xs font-mono">
                  {result.promptVersion}
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white">{result.topic}</h3>

              {/* Example Sentences First Rule */}
              <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 space-y-2">
                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
                  💡 Ví dụ thực tế trực quan (Quan sát trước khi học cấu trúc):
                </span>
                <div className="space-y-1.5">
                  {result.exampleSentences.map((ex, idx) => (
                    <p key={idx} className="text-xs sm:text-sm font-serif italic text-slate-100">
                      • "{ex}"
                    </p>
                  ))}
                </div>
              </div>

              {/* Explanation Vi */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-emerald-900/50 space-y-1 text-xs text-slate-200 leading-relaxed">
                <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block">
                  📖 Bản chất & Nguyên tắc áp dụng trong IELTS:
                </span>
                <p>{result.explanationVi}</p>
              </div>
            </div>

            {/* Practice Exercises */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-emerald-600" />
                  <span>Bài Tập Thực Hành ({result.exercises.length} câu):</span>
                </h4>
                {showResults && (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    Đã hoàn thành kiểm tra
                  </span>
                )}
              </div>

              <div className="space-y-3.5">
                {result.exercises.map((ex, idx) => {
                  const userAnswer = userAnswers[idx] || '';
                  const isCorrect =
                    userAnswer.trim().toLowerCase() === ex.answer.trim().toLowerCase();

                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3 shadow-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold uppercase">
                          Câu {idx + 1} • {ex.type}
                        </span>
                        {showResults && (
                          <span
                            className={`text-xs font-bold ${
                              isCorrect ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {isCorrect ? '✓ Chính xác' : '✗ Chưa đúng'}
                          </span>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">
                        {ex.question}
                      </p>

                      {/* Options or text input */}
                      {ex.options && ex.options.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {ex.options.map((opt, oIdx) => (
                            <button
                              key={oIdx}
                              type="button"
                              onClick={() => setUserAnswers((prev) => ({ ...prev, [idx]: opt }))}
                              className={`p-2.5 rounded-xl text-xs font-semibold text-left border transition-all ${
                                userAnswers[idx] === opt
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-emerald-50'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={userAnswers[idx] || ''}
                          onChange={(e) =>
                            setUserAnswers((prev) => ({ ...prev, [idx]: e.target.value }))
                          }
                          placeholder="Điền đáp án chính xác..."
                          className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                        />
                      )}

                      {/* Explanation WHY answer is correct */}
                      {showResults && (
                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 text-xs space-y-1.5 border border-slate-200 dark:border-slate-700">
                          <p className="text-emerald-600 dark:text-emerald-400 font-bold">
                            Đáp án: {ex.answer}
                          </p>
                          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                            💡 <strong>Giải thích chi tiết:</strong> {ex.explanationVi}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Check answers button */}
              <button
                type="button"
                onClick={() => setShowResults(true)}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs shadow-md transition-all"
              >
                Kiểm Tra & Xem Giải Thích Chi Tiết
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
