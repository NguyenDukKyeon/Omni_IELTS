import React, { useState, useEffect } from 'react';
import {
  X,
  Target,
  Sparkles,
  BookOpen,
  Headphones,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sliders,
  Check,
  Zap,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  Layers,
  FileText,
  Volume2,
} from 'lucide-react';
import { ItemWriterPracticeResult, ItemWriterQuestionItem } from '../../types';
import { generateItemWriterPracticeApi, speakExaminerText } from '../../services/practiceService';
import { useApp } from '../../context/AppContext';
import { XP_REWARDS } from '../../services/gamification';

interface ItemWriterPracticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSkill?: 'reading' | 'listening';
  initialQuestionType?: string;
}

const QUESTION_TYPES = [
  { id: 'matching_headings', label: 'Matching Headings (Nối tiêu đề đoạn)', skill: 'reading' },
  { id: 'true_false_not_given', label: 'True / False / Not Given', skill: 'reading' },
  { id: 'multiple_choice', label: 'Multiple Choice (Trắc nghiệm)', skill: 'reading' },
  { id: 'sentence_completion', label: 'Sentence Completion (Điền từ hoàn thành câu)', skill: 'reading' },
  { id: 'summary_completion', label: 'Summary Completion (Điền khuyết đoạn tóm tắt)', skill: 'reading' },
  { id: 'matching_information', label: 'Matching Information (Nối thông tin chi tiết)', skill: 'reading' },
];

const TOPIC_DOMAINS = [
  { id: 'environment', label: 'Môi trường & Đô thị hóa (Environment & Urban)' },
  { id: 'technology', label: 'Trí tuệ nhân tạo & Công nghệ (AI & Tech)' },
  { id: 'education', label: 'Giáo dục & Tâm lý học (Education & Psychology)' },
  { id: 'health', label: 'Y tế & Dịch tễ học (Health & Epidemiology)' },
  { id: 'society', label: 'Xã hội học & Kinh tế (Sociology & Economy)' },
];

export const ItemWriterPracticeModal: React.FC<ItemWriterPracticeModalProps> = ({
  isOpen,
  onClose,
  initialSkill = 'reading',
  initialQuestionType = 'matching_headings',
}) => {
  const { profile, mistakes, awardXP } = useApp();

  const [skill, setSkill] = useState<'reading' | 'listening'>(initialSkill);
  const [questionType, setQuestionType] = useState<string>(initialQuestionType);
  const [topicDomain, setTopicDomain] = useState<string>('environment');
  const [difficultyBand, setDifficultyBand] = useState<number>(profile.targetBand || 6.5);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ItemWriterPracticeResult | null>(null);

  // User interactive responses
  const [userHeadingMapping, setUserHeadingMapping] = useState<Record<string, string>>({});
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const activeS = (initialSkill as 'reading' | 'listening') || 'reading';
      setSkill(activeS);
      setQuestionType(initialQuestionType);
      handleGenerate(activeS, initialQuestionType, topicDomain, difficultyBand);
    } else {
      setResult(null);
      setErrorMessage(null);
      setShowResults(false);
      setUserAnswers({});
      setUserHeadingMapping({});
      window.speechSynthesis?.cancel();
    }
  }, [isOpen, initialSkill, initialQuestionType]);

  if (!isOpen) return null;

  // Learner profile context
  const weakestAxes: string[] = [];
  const recentMistakeTags = (Array.from(new Set(mistakes.flatMap((m) => m.tags || []))) as string[]).slice(0, 5);

  const handleGenerate = async (
    sOverride?: 'reading' | 'listening',
    qOverride?: string,
    tOverride?: string,
    bOverride?: number
  ) => {
    const activeSkill = sOverride || skill;
    const activeQ = qOverride || questionType;
    const activeTopic = tOverride || topicDomain;
    const activeBand = bOverride || difficultyBand;

    setIsLoading(true);
    setErrorMessage(null);
    setResult(null);
    setShowResults(false);
    setUserAnswers({});
    setUserHeadingMapping({});

    try {
      const data = await generateItemWriterPracticeApi({
        skill: activeSkill,
        questionType: activeQ,
        topicDomain: activeTopic,
        difficultyBand: activeBand,
        learnerProfile: {
          targetBand: activeBand,
          weakestAxes: weakestAxes.length > 0 ? weakestAxes : undefined,
          recentMistakeTags: recentMistakeTags.length > 0 ? recentMistakeTags : undefined,
        },
      });

      setResult(data);
      awardXP(XP_REWARDS.EXERCISE_COMPLETED, `Luyện tập dạng ${activeQ} với Cambridge Item Writer`);
    } catch (err: any) {
      console.error('Item Writer failed:', err);
      setErrorMessage(err?.message || 'Không thể tạo đề luyện tập từ gemini-3.1-pro.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="item-writer-practice-modal"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden my-4 sm:my-8 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 shadow-md border-b border-indigo-900/50">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-2xl shadow-inner shrink-0">
              🎯
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  Cambridge Item Writer (Sinh Đề Theo Dạng)
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-400/20 text-blue-200 border border-blue-300/30">
                  practice-generator-v1
                </span>
              </div>
              <p className="text-xs text-blue-200/90 mt-0.5">
                Sinh câu hỏi luyện tập mới theo từng dạng chuẩn Cambridge kết hợp trọng số cá nhân hóa
              </p>
            </div>
          </div>
          <button data-ux-flow="practice.skills"
            onClick={() => {
              window.speechSynthesis?.cancel();
              onClose();
            }}
            className="p-2 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-3.5">
          {/* Skill & Question Type Picker */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kỹ năng:
              </label>
              <div className="flex gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button data-ux-flow="practice.skills"
                  type="button"
                  onClick={() => {
                    setSkill('reading');
                    handleGenerate('reading', questionType, topicDomain, difficultyBand);
                  }}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                    skill === 'reading'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  📖 Reading
                </button>
                <button data-ux-flow="practice.skills"
                  type="button"
                  onClick={() => {
                    setSkill('listening');
                    handleGenerate('listening', questionType, topicDomain, difficultyBand);
                  }}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                    skill === 'listening'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  🎧 Listening
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Dạng câu hỏi IELTS:
              </label>
              <select data-ux-flow="practice.skills"
                value={questionType}
                onChange={(e) => {
                  setQuestionType(e.target.value);
                  handleGenerate(skill, e.target.value, topicDomain, difficultyBand);
                }}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100"
              >
                {QUESTION_TYPES.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Chủ đề học thuật:
              </label>
              <select data-ux-flow="practice.skills"
                value={topicDomain}
                onChange={(e) => {
                  setTopicDomain(e.target.value);
                  handleGenerate(skill, questionType, e.target.value, difficultyBand);
                }}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100"
              >
                {TOPIC_DOMAINS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Band & Learner Profile Ribbon */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/80 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
              <Sliders className="w-4 h-4 text-blue-600" />
              <span className="font-bold">Band mục tiêu:</span>
              <div className="flex gap-1">
                {[6.0, 6.5, 7.0, 7.5, 8.0].map((b) => (
                  <button data-ux-flow="practice.skills"
                    key={b}
                    type="button"
                    onClick={() => {
                      setDifficultyBand(b);
                      handleGenerate(skill, questionType, topicDomain, b);
                    }}
                    className={`px-2 py-0.5 rounded font-bold transition-all ${
                      difficultyBand === b
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <button data-ux-flow="practice.skills"
              type="button"
              onClick={() => handleGenerate()}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md transition-all text-xs"
            >
              {isLoading ? (
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{isLoading ? 'Đang tạo câu hỏi...' : 'Sinh Bài Mới (Item Writer)'}</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="m-5 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Lỗi sinh câu hỏi</p>
              <p className="mt-0.5 text-rose-700 dark:text-rose-300">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-2xl mx-auto animate-pulse">
              🎯
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              Cambridge Item Writer đang biên soạn bài luyện tập...
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Đang xây dựng đoạn đọc học thuật chuẩn IELTS và thiết kế các bẫy nhiễu (distractors) hợp lý bám sát tiêu chí Band {difficultyBand}.
            </p>
          </div>
        )}

        {/* Dynamic Quiz Arena */}
        {result && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
            {/* Passage Display */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>VĂN BẢN ĐỌC / SCRIPT HỌC THUẬT:</span>
                <span className="uppercase text-blue-600 font-mono">
                  {result.questionType} • Band {difficultyBand}
                </span>
              </div>

              {result.paragraphs && result.paragraphs.length > 0 ? (
                <div className="space-y-3 pt-1">
                  {result.paragraphs.map((p, pIdx) => (
                    <div
                      key={pIdx}
                      className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-serif"
                    >
                      {p}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-serif">
                  {result.passage}
                </p>
              )}
            </div>

            {/* CASE 1: MATCHING HEADINGS */}
            {result.questionType === 'matching_headings' && result.headingOptions && (
              <div className="space-y-5">
                <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 space-y-2 text-xs">
                  <span className="font-bold text-indigo-900 dark:text-indigo-200 block uppercase tracking-wider">
                    Danh Sách Tiêu Đề (List of Headings):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {result.headingOptions.map((h, hIdx) => (
                      <div
                        key={hIdx}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900 text-slate-800 dark:text-slate-200 font-semibold"
                      >
                        {h}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Paragraph Mapping Selector */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Chọn tiêu đề tương ứng cho từng đoạn văn:
                  </h4>

                  {(result.paragraphs || []).map((p, idx) => {
                    const pKey = String.fromCharCode(65 + idx); // A, B, C, D...
                    const selectedHeading = userHeadingMapping[pKey] || '';
                    const correctHeading = result.correctMapping?.[pKey];
                    const isCorrect =
                      selectedHeading &&
                      correctHeading &&
                      (selectedHeading.toLowerCase().startsWith(correctHeading.toLowerCase()) ||
                        selectedHeading.toLowerCase().includes(correctHeading.toLowerCase()));

                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-sm">
                            {pKey}
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            Đoạn văn {pKey}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-1 sm:max-w-md">
                          <select data-ux-flow="practice.skills"
                            value={selectedHeading}
                            onChange={(e) =>
                              setUserHeadingMapping((prev) => ({
                                ...prev,
                                [pKey]: e.target.value,
                              }))
                            }
                            className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white"
                          >
                            <option value="">-- Chọn tiêu đề phù hợp --</option>
                            {result.headingOptions?.map((opt, oIdx) => (
                              <option key={oIdx} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>

                          {showResults && (
                            <span
                              className={`text-xs font-bold whitespace-nowrap ${
                                isCorrect ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {isCorrect ? '✓ Đúng' : `Đáp án: ${correctHeading}`}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {showResults && result.explanationVi && (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                      <span className="font-bold text-emerald-600 block">
                        Giải Thích Chi Tiết Từng Đoạn:
                      </span>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                        {result.explanationVi}
                      </p>
                    </div>
                  )}

                  <button data-ux-flow="practice.skills"
                    type="button"
                    onClick={() => setShowResults(true)}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs shadow-md transition-all"
                  >
                    Kiểm Tra Đáp Án Matching Headings
                  </button>
                </div>
              </div>
            )}

            {/* CASE 2: TRUE / FALSE / NOT GIVEN */}
            {result.questionType === 'true_false_not_given' && result.questions && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Xác định nhận định là True, False hay Not Given:
                </h4>

                {result.questions.map((q, qIdx) => {
                  const statementText = q.statement || q.question || q.prompt || '';
                  const isCorrect =
                    userAnswers[qIdx]?.trim().toLowerCase() === q.answer.trim().toLowerCase();

                  return (
                    <div
                      key={qIdx}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                          Câu {qIdx + 1}
                        </span>
                        {showResults && (
                          <span
                            className={`text-xs font-bold ${
                              isCorrect ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {isCorrect ? '✓ Chính xác' : `Đáp án đúng: ${q.answer.toUpperCase()}`}
                          </span>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                        "{statementText}"
                      </p>

                      <div className="flex gap-2">
                        {['true', 'false', 'not_given'].map((opt) => (
                          <button data-ux-flow="practice.skills"
                            key={opt}
                            type="button"
                            onClick={() => setUserAnswers((prev) => ({ ...prev, [qIdx]: opt }))}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                              userAnswers[qIdx] === opt
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-blue-50'
                            }`}
                          >
                            {opt.replace('_', ' ')}
                          </button>
                        ))}
                      </div>

                      {showResults && q.explanationVi && (
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-300 italic border border-slate-200 dark:border-slate-800">
                          💡 <strong>Giải thích:</strong> {q.explanationVi}
                        </div>
                      )}
                    </div>
                  );
                })}

                <button data-ux-flow="practice.skills"
                  type="button"
                  onClick={() => setShowResults(true)}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs shadow-md transition-all"
                >
                  Kiểm Tra Đáp Án True / False / Not Given
                </button>
              </div>
            )}

            {/* CASE 3: MULTIPLE CHOICE / GAP FILL */}
            {result.questionType !== 'matching_headings' &&
              result.questionType !== 'true_false_not_given' &&
              result.questions && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Câu hỏi luyện tập ({result.questions.length} câu):
                  </h4>

                  {result.questions.map((q, qIdx) => {
                    const questionText = q.question || q.statement || q.prompt || '';
                    const isCorrect =
                      userAnswers[qIdx]?.trim().toLowerCase() === q.answer.trim().toLowerCase();

                    return (
                      <div
                        key={qIdx}
                        className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                            Câu {qIdx + 1}
                          </span>
                          {showResults && (
                            <span
                              className={`text-xs font-bold ${
                                isCorrect ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {isCorrect ? '✓ Chính xác' : `Đáp án đúng: ${q.answer}`}
                            </span>
                          )}
                        </div>

                        <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                          {questionText}
                        </p>

                        {q.options && q.options.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {q.options.map((opt, oIdx) => (
                              <button data-ux-flow="practice.skills"
                                key={oIdx}
                                type="button"
                                onClick={() =>
                                  setUserAnswers((prev) => ({ ...prev, [qIdx]: opt }))
                                }
                                className={`p-2.5 rounded-xl text-xs font-semibold text-left border transition-all ${
                                  userAnswers[qIdx] === opt
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-blue-50'
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <input data-ux-flow="practice.skills"
                            type="text"
                            value={userAnswers[qIdx] || ''}
                            onChange={(e) =>
                              setUserAnswers((prev) => ({
                                ...prev,
                                [qIdx]: e.target.value,
                              }))
                            }
                            placeholder="Nhập câu trả lời của bạn..."
                            className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                          />
                        )}

                        {showResults && q.explanationVi && (
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-300 italic border border-slate-200 dark:border-slate-800">
                            💡 <strong>Giải thích:</strong> {q.explanationVi}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <button data-ux-flow="practice.skills"
                    type="button"
                    onClick={() => setShowResults(true)}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs shadow-md transition-all"
                  >
                    Kiểm Tra Đáp Án & Giải Thích Chi Tiết
                  </button>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
};
