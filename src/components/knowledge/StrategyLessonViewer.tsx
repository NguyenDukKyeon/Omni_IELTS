import React, { useState } from 'react';
import {
  BookOpen,
  Headphones,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Clock,
  Zap,
  ArrowRight,
  RotateCcw,
  Check,
  X,
  HelpCircle,
  Award,
  ChevronRight,
  Lightbulb,
} from 'lucide-react';
import { SKILL_STRATEGY_TOPICS } from '../../data/ieltsKnowledgeData';
import { SkillStrategyTopic, StrategyQuizQuestion } from '../../types';
import { InLessonAIInquirer } from './InLessonAIInquirer';
import { useApp } from '../../context/AppContext';

export const StrategyLessonViewer: React.FC = () => {
  const { awardXP } = useApp();
  const [selectedSkillFilter, setSelectedSkillFilter] = useState<'all' | 'listening' | 'reading' | 'writing' | 'speaking'>('all');
  const [activeTopicId, setActiveTopicId] = useState<string>(SKILL_STRATEGY_TOPICS[0].id);

  // Quiz State for Active Topic
  const [userQuizAnswers, setUserQuizAnswers] = useState<Record<string, number>>({});
  const [showQuizResults, setShowQuizResults] = useState<Record<string, boolean>>({});
  const [quizScore, setQuizScore] = useState<number | null>(null);

  const filteredTopics = SKILL_STRATEGY_TOPICS.filter((t) => {
    if (selectedSkillFilter === 'all') return true;
    return t.skill === selectedSkillFilter;
  });

  const activeTopic =
    SKILL_STRATEGY_TOPICS.find((t) => t.id === activeTopicId) || SKILL_STRATEGY_TOPICS[0];

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    if (showQuizResults[questionId]) return; // locked after submission
    setUserQuizAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmitQuestionQuiz = (q: StrategyQuizQuestion) => {
    setShowQuizResults((prev) => ({ ...prev, [q.id]: true }));
    const isCorrect = userQuizAnswers[q.id] === q.correctIndex;
    if (isCorrect) {
      awardXP(10, `Đạt chuẩn câu hỏi chiến thuật: ${q.question.slice(0, 30)}...`);
    }
  };

  const handleResetQuiz = () => {
    setUserQuizAnswers({});
    setShowQuizResults({});
    setQuizScore(null);
  };

  const getSkillIcon = (skill: string) => {
    switch (skill) {
      case 'listening':
        return <Headphones className="w-4 h-4 text-sky-500" />;
      case 'reading':
        return <BookOpen className="w-4 h-4 text-emerald-500" />;
      case 'writing':
        return <FileText className="w-4 h-4 text-amber-500" />;
      case 'speaking':
        return <Sparkles className="w-4 h-4 text-purple-500" />;
      default:
        return <Zap className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div id="strategy-lesson-viewer" className="space-y-8 animate-fadeIn">
      {/* Skill Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <button data-ux-flow="knowledge.learn"
          onClick={() => setSelectedSkillFilter('all')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            selectedSkillFilter === 'all'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          Tất cả kỹ năng ({SKILL_STRATEGY_TOPICS.length})
        </button>
        <button data-ux-flow="knowledge.learn"
          onClick={() => setSelectedSkillFilter('reading')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
            selectedSkillFilter === 'reading'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-emerald-500" /> Reading
        </button>
        <button data-ux-flow="knowledge.learn"
          onClick={() => setSelectedSkillFilter('listening')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
            selectedSkillFilter === 'listening'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Headphones className="w-3.5 h-3.5 text-sky-500" /> Listening
        </button>
        <button data-ux-flow="knowledge.learn"
          onClick={() => setSelectedSkillFilter('writing')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
            selectedSkillFilter === 'writing'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-amber-500" /> Writing
        </button>
        <button data-ux-flow="knowledge.learn"
          onClick={() => setSelectedSkillFilter('speaking')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
            selectedSkillFilter === 'speaking'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-500" /> Speaking
        </button>
      </div>

      {/* Main Grid: Topic Catalog & Detailed Reader Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Topic Selector List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
            Danh Mục Chiến Thuật Chuyên Biệt
          </div>

          <div
            role="region"
            aria-label="Danh mục chiến thuật IELTS"
            tabIndex={0}
            className="space-y-2.5 max-h-[700px] overflow-y-auto pr-1 custom-scrollbar"
          >
            {filteredTopics.map((topic) => {
              const isActive = topic.id === activeTopic.id;
              return (
                <div
                  key={topic.id}
                  onClick={() => {
                    setActiveTopicId(topic.id);
                    handleResetQuiz();
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer text-left space-y-2 relative ${
                    isActive
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 dark:border-blue-500 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      {getSkillIcon(topic.skill)}
                      <span>{topic.categoryTitleVi}</span>
                    </span>

                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {topic.readTimeMinutes}m
                    </span>
                  </div>

                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                    {topic.title}
                  </h3>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {topic.subtitle}
                  </p>

                  <div className="pt-1 flex items-center justify-between text-[10px]">
                    <span className="text-blue-800 dark:text-blue-300 font-semibold">
                      {topic.difficultyLevel}
                    </span>
                    <span className="text-slate-400 flex items-center gap-0.5">
                      {topic.strategyQuiz.length} Quiz kiểm tra <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Detailed Reader & Strategy Application Pane (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-7">
            {/* Header */}
            <div className="space-y-3 border-b border-slate-100 dark:border-slate-800 pb-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  {getSkillIcon(activeTopic.skill)}
                  <span>{activeTopic.categoryTitleVi}</span>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
                  {activeTopic.difficultyLevel}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs flex items-center gap-1 font-mono">
                  <Clock className="w-3.5 h-3.5" /> {activeTopic.readTimeMinutes} phút đọc & áp dụng
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                {activeTopic.title}
              </h1>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">
                "{activeTopic.subtitle}"
              </p>
            </div>

            {/* 1. Core Principles (Những nguyên tắc bất biến) */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span>Nguyên Lý Bất Biến Của Dạng Bài</span>
              </h4>

              <div className="grid grid-cols-1 gap-2.5">
                {activeTopic.corePrinciples.map((principle, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-xs text-slate-800 dark:text-slate-200 leading-relaxed flex items-start gap-2.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <span>{principle}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Step-by-Step Method (Phương pháp giải quyết từng bước) */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-500" />
                <span>Quy Trình Xử Lý Chuẩn Mực Từng Bước</span>
              </h4>

              <div className="space-y-3">
                {activeTopic.stepByStepMethod.map((step) => (
                  <div
                    key={step.stepNumber}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                        {step.stepNumber}
                      </span>
                      <strong className="text-xs sm:text-sm text-slate-900 dark:text-white font-bold">
                        {step.stepTitle}
                      </strong>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pl-8">
                      {step.actionVi}
                    </p>
                    {step.exampleOrCaveat && (
                      <div className="ml-8 p-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/60 text-[11px] text-blue-900 dark:text-blue-300">
                        <strong>Lưu ý quan trọng:</strong> {step.exampleOrCaveat}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Pro Tactics & Trap Alerts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pro Tactics */}
              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/50 space-y-2.5">
                <h5 className="text-xs font-extrabold uppercase tracking-wider text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-emerald-600" />
                  <span>Bí Quyết Ghi Điểm Tuyệt Đối</span>
                </h5>
                <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {activeTopic.proTactics.map((tactic, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                      <span>{tactic}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Trap Alerts */}
              <div className="p-4 sm:p-5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-900/50 space-y-2.5">
                <h5 className="text-xs font-extrabold uppercase tracking-wider text-rose-900 dark:text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Báo Động Đỏ: Bẫy Phổ Biến</span>
                </h5>
                <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {activeTopic.trapAlerts.map((trap, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-rose-600 dark:text-rose-400 font-bold">•</span>
                      <span>{trap}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 4. Practical Application Markdown */}
            {activeTopic.practicalApplicationMarkdown && (
              <div className="p-5 rounded-2xl bg-slate-900 text-slate-100 dark:bg-slate-950 border border-slate-800 space-y-3">
                <div className="text-xs font-extrabold uppercase tracking-wider text-blue-400 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span>Case Study & Ứng Dụng Thực Tế</span>
                </div>
                <div className="text-xs leading-relaxed text-slate-300 space-y-2 whitespace-pre-line font-mono">
                  {activeTopic.practicalApplicationMarkdown}
                </div>
              </div>
            )}

            {/* 5. Embedded In-Lesson AI Inquirer */}
            <InLessonAIInquirer
              contextTopicTitle={activeTopic.title}
              contextSkill={activeTopic.categoryTitleVi}
            />

            {/* 6. End-of-Topic Strategy Quiz Engine (Kiểm tra hiểu cách áp dụng) */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <span>Quiz Ứng Dụng: Kiểm Tra Mức Độ Nắm Bắt Chiến Thuật</span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Không phải bài test tiếng Anh, đây là bài kiểm tra bạn đã nắm vững cách áp dụng chiến thuật hay chưa.
                  </p>
                </div>

                <button data-ux-flow="knowledge.learn"
                  onClick={handleResetQuiz}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Làm lại Quiz
                </button>
              </div>

              <div className="space-y-6">
                {activeTopic.strategyQuiz.map((quizQ, qIdx) => {
                  const isAnswered = userQuizAnswers[quizQ.id] !== undefined;
                  const isSubmitted = showQuizResults[quizQ.id];
                  const selectedOpt = userQuizAnswers[quizQ.id];
                  const isCorrect = selectedOpt === quizQ.correctIndex;

                  return (
                    <div
                      key={quizQ.id}
                      className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-4"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          Q{qIdx + 1}
                        </span>
                        <div className="space-y-1.5">
                          {quizQ.scenario && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 italic bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                              <strong>Tình huống:</strong> "{quizQ.scenario}"
                            </p>
                          )}
                          <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                            {quizQ.question}
                          </h5>
                        </div>
                      </div>

                      {/* Options */}
                      <div className="space-y-2 pl-8">
                        {quizQ.options.map((opt, optIdx) => {
                          const isOptionSelected = selectedOpt === optIdx;
                          const isOptionCorrect = optIdx === quizQ.correctIndex;

                          let optionStyle =
                            'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-400';

                          if (isSubmitted) {
                            if (isOptionCorrect) {
                              optionStyle =
                                'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold';
                            } else if (isOptionSelected && !isOptionCorrect) {
                              optionStyle =
                                'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-900 dark:text-rose-200 line-through';
                            } else {
                              optionStyle =
                                'bg-white/40 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/50 text-slate-400';
                            }
                          } else if (isOptionSelected) {
                            optionStyle =
                              'bg-blue-50 dark:bg-blue-950/60 border-blue-600 text-blue-900 dark:text-blue-200 font-semibold shadow-xs';
                          }

                          return (
                            <button data-ux-flow="knowledge.learn"
                              key={optIdx}
                              onClick={() => handleSelectOption(quizQ.id, optIdx)}
                              disabled={isSubmitted}
                              className={`w-full p-3 rounded-xl border text-xs text-left transition-all flex items-start gap-2.5 cursor-pointer ${optionStyle}`}
                            >
                              <span className="shrink-0 font-bold font-mono">
                                {String.fromCharCode(65 + optIdx)}.
                              </span>
                              <span className="leading-relaxed">{opt.replace(/^[A-D]\.\s*/, '')}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Submit / Feedback Button */}
                      {!isSubmitted && (
                        <div className="pl-8 pt-1">
                          <button data-ux-flow="knowledge.learn"
                            onClick={() => handleSubmitQuestionQuiz(quizQ)}
                            disabled={!isAnswered}
                            className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-500 disabled:opacity-40 transition-all cursor-pointer shadow-xs"
                          >
                            Kiểm Tra Đáp Án
                          </button>
                        </div>
                      )}

                      {/* Result Box */}
                      {isSubmitted && (
                        <div
                          className={`ml-8 p-4 rounded-2xl text-xs space-y-2 border ${
                            isCorrect
                              ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                              : 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 font-bold">
                            {isCorrect ? (
                              <>
                                <Check className="w-4 h-4 text-emerald-600" />
                                <span>Chính xác tuyệt đối! (+10 XP)</span>
                              </>
                            ) : (
                              <>
                                <X className="w-4 h-4 text-rose-600" />
                                <span>Chưa chính xác! Hãy xem giải thích của Giám khảo bên dưới:</span>
                              </>
                            )}
                          </div>

                          <p className="leading-relaxed text-slate-700 dark:text-slate-300">
                            <strong>Lý do:</strong> {quizQ.explanationVi}
                          </p>

                          <div className="pt-1.5 border-t border-slate-200/80 dark:border-slate-800 font-medium text-[11px] text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                            <span>
                              <strong>Bài học cốt lõi:</strong> {quizQ.keyTakeaway}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
