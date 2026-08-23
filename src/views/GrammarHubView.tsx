import React, { useState, useMemo } from 'react';
import {
  FileCheck2,
  Zap,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Search,
  BookOpen,
  Filter,
  Check,
  Send,
  HelpCircle,
  Compass,
  ArrowUpRight,
  TrendingUp,
  BrainCircuit,
  MessageSquare,
  Award,
  ChevronRight,
  Flame,
  FileText,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GrammarTopic, GrammarExercise, GrammarDiagnosticResult } from '../types';
import { XP_REWARDS } from '../services/gamification';
import {
  generateGrammarExercisesApi,
  evaluateGrammarExerciseApi,
  diagnoseGrammarApi,
} from '../services/aiTutor';
import { GrammarCurriculumModal } from '../components/grammar/GrammarCurriculumModal';

type TabType = 'curriculum' | 'diagnostician';
type FilterType = 'all' | 'recommended' | 'band6' | 'band7' | 'band8';

export const GrammarHubView: React.FC = () => {
  const {
    grammarTopics,
    updateGrammarMastery,
    openAITutorWithPrompt,
    awardXP,
    addMistake,
    mistakes,
    profile,
    setIsMistakeNotebookOpen,
  } = useApp();

  const [activeTab, setActiveTab] = useState<TabType>('curriculum');
  const [selectedTopicId, setSelectedTopicId] = useState<string>(grammarTopics[0]?.id || 'grm_tenses');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCurriculumDesignerOpen, setIsCurriculumDesignerOpen] = useState<boolean>(false);

  // Exercise Drill State
  const [activeExerciseIndex, setActiveExerciseIndex] = useState<number>(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [textAnswerInput, setTextAnswerInput] = useState<string>('');
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState<boolean>(false);
  const [isAiEvaluating, setIsAiEvaluating] = useState<boolean>(false);
  const [evaluationResult, setEvaluationResult] = useState<{
    isCorrect: boolean;
    score: number;
    feedbackVi: string;
    whyExplanation: string;
    bandBoostTips?: string;
  } | null>(null);

  // Exercise Generation State
  const [isGeneratingDrills, setIsGeneratingDrills] = useState<boolean>(false);
  const [customTopicExercises, setCustomTopicExercises] = useState<Record<string, GrammarExercise[]>>({});

  // Diagnostician State
  const [diagnosticInputText, setDiagnosticInputText] = useState<string>('');
  const [isDiagnosing, setIsDiagnosing] = useState<boolean>(false);
  const [diagnosticResult, setDiagnosticResult] = useState<GrammarDiagnosticResult | null>(null);

  // Analyze Mistakes to prioritize topics
  const { topicMistakeCountMap, recommendedTopicIds } = useMemo(() => {
    const map: Record<string, number> = {};
    const recommended: string[] = [];

    grammarTopics.forEach((topic) => {
      // Check if any mistake in mistake notebook matches tags or content
      let count = 0;
      const topicTags = topic.relatedMistakeTags || [];
      const topicTitle = topic.title || '';

      mistakes.forEach((m) => {
        const mTags = m.tags || [];
        const hasMatchingTag = mTags.some((tag) =>
          topicTags.some(
            (rt) => rt.toLowerCase().includes(tag.toLowerCase()) || tag.toLowerCase().includes(rt.toLowerCase())
          )
        );
        const matchesCategory =
          (m.explanation || '').toLowerCase().includes(topicTitle.toLowerCase()) ||
          (m.errorText || '').toLowerCase().includes(topicTitle.toLowerCase());

        if (hasMatchingTag || matchesCategory) {
          count++;
        }
      });

      map[topic.id] = count;
      if (count > 0 || (topic.userMasteryPercent || 0) < 60) {
        recommended.push(topic.id);
      }
    });

    return { topicMistakeCountMap: map, recommendedTopicIds: recommended };
  }, [grammarTopics, mistakes]);

  // Selected topic object with dynamic exercises
  const selectedTopic = useMemo(() => {
    const base = grammarTopics.find((t) => t.id === selectedTopicId) || grammarTopics[0] || {
      id: 'grm_default',
      title: 'IELTS Grammar',
      titleVi: 'Ngữ pháp IELTS',
      category: 'advanced',
      categoryVi: 'Ngữ pháp Nâng Cao',
      level: 'Band 7.0+',
      bandImpact: 'Band 7.0',
      intuitiveIntro: '',
      sampleSentences: [],
      keyFormulas: [],
      commonPitfalls: [],
      exercises: [],
      relatedMistakeTags: [],
      userMasteryPercent: 60,
    };
    const generated = customTopicExercises[base.id] || [];
    return {
      ...base,
      sampleSentences: base.sampleSentences || [],
      keyFormulas: base.keyFormulas || [],
      commonPitfalls: base.commonPitfalls || [],
      exercises: [...(base.exercises || []), ...generated],
    };
  }, [grammarTopics, selectedTopicId, customTopicExercises]);

  const currentExercise = (selectedTopic.exercises && selectedTopic.exercises[activeExerciseIndex]) || (selectedTopic.exercises && selectedTopic.exercises[0]) || {
    id: 'empty_ex',
    type: 'multiple_choice',
    question: 'Hãy chọn câu trả lời đúng',
    correctAnswer: '',
    explanation: '',
  };

  // Filtered Topics List
  const filteredTopics = useMemo(() => {
    return grammarTopics.filter((t) => {
      const matchSearch =
        (t.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.titleVi || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.categoryVi || '').toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      if (activeFilter === 'recommended') {
        return (topicMistakeCountMap[t.id] || 0) > 0 || (t.userMasteryPercent || 0) < 65;
      }
      if (activeFilter === 'band6') return t.bandImpact === 'Band 6.0';
      if (activeFilter === 'band7') return t.bandImpact === 'Band 7.0';
      if (activeFilter === 'band8') return t.bandImpact === 'Band 8.0+';

      return true;
    });
  }, [grammarTopics, searchQuery, activeFilter, topicMistakeCountMap]);

  // Handle Answer Selection & Input Reset
  const handleSelectOption = (index: number) => {
    if (isAnswerSubmitted || isAiEvaluating) return;
    setSelectedOptionIndex(index);
  };

  const handleNextExercise = () => {
    setSelectedOptionIndex(null);
    setTextAnswerInput('');
    setIsAnswerSubmitted(false);
    setEvaluationResult(null);

    if (activeExerciseIndex < selectedTopic.exercises.length - 1) {
      setActiveExerciseIndex((prev) => prev + 1);
    } else {
      setActiveExerciseIndex(0);
    }
  };

  // Submit Answer to AI Engine
  const handleSubmitAnswer = async () => {
    if (!currentExercise || isAnswerSubmitted || isAiEvaluating) return;

    let answerToCheck = '';
    if (currentExercise.type === 'multiple_choice') {
      if (selectedOptionIndex === null || !currentExercise.options) return;
      answerToCheck = currentExercise.options[selectedOptionIndex] || '';
    } else {
      if (!textAnswerInput.trim()) return;
      answerToCheck = textAnswerInput.trim();
    }

    setIsAiEvaluating(true);

    try {
      // Evaluate submission with AI
      const evalData = await evaluateGrammarExerciseApi(
        currentExercise,
        answerToCheck,
        selectedTopic.title
      );

      setEvaluationResult(evalData);
      setIsAnswerSubmitted(true);

      const isCorrect = evalData.isCorrect;

      if (isCorrect) {
        awardXP(XP_REWARDS.GRAMMAR_EXERCISE, `Đúng bài tập ngữ pháp: ${selectedTopic.title}!`);
        const nextMastery = Math.min(100, (selectedTopic.userMasteryPercent || 60) + 5);
        updateGrammarMastery(selectedTopic.id, nextMastery);
      } else {
        // Automatic Two-Way sync to MistakeEntry
        addMistake({
          id: `mst_grm_${Date.now()}`,
          errorText: answerToCheck,
          correctedText: currentExercise.correctAnswer,
          explanation: evalData.whyExplanation || currentExercise.explanation,
          errorType: 'grammar',
          skill: 'grammar',
          originModule: 'grammar',
          srsStage: 0,
          nextReviewDate: new Date().toISOString(),
          reviewCount: 0,
          mastered: false,
          createdAt: new Date().toISOString(),
          tags: ['Grammar', selectedTopic.title, selectedTopic.categoryVi],
        });
      }
    } catch (err) {
      console.error('Answer eval error:', err);
      // Fallback local check
      const cleanUser = answerToCheck.trim().toLowerCase();
      const cleanCorrect = (currentExercise.correctAnswer || '').trim().toLowerCase();
      const matches = cleanUser === cleanCorrect;

      setEvaluationResult({
        isCorrect: matches,
        score: matches ? 100 : 0,
        feedbackVi: matches ? 'Chính xác!' : `Đáp án đúng: ${currentExercise.correctAnswer}`,
        whyExplanation: currentExercise.explanation,
        bandBoostTips: 'Hãy ghi nhớ cấu trúc này để đưa vào bài thi Writing/Speaking!',
      });
      setIsAnswerSubmitted(true);
    } finally {
      setIsAiEvaluating(false);
    }
  };

  // AI Generator: Generate more exercises
  const handleGenerateMoreExercises = async () => {
    setIsGeneratingDrills(true);
    try {
      const data = await generateGrammarExercisesApi(
        selectedTopic.id,
        selectedTopic.title,
        selectedTopic.titleVi,
        3,
        profile.targetBand,
        selectedTopic.categoryVi
      );

      if (data && data.exercises && data.exercises.length > 0) {
        setCustomTopicExercises((prev) => ({
          ...prev,
          [selectedTopic.id]: [...(prev[selectedTopic.id] || []), ...data.exercises],
        }));
        setActiveExerciseIndex(selectedTopic.exercises.length);
        setSelectedOptionIndex(null);
        setTextAnswerInput('');
        setIsAnswerSubmitted(false);
        setEvaluationResult(null);
        awardXP(10, `Sinh thêm ${data.exercises.length} bài tập AI ${selectedTopic.title}`);
      }
    } catch (err) {
      console.error('Failed to generate drills:', err);
    } finally {
      setIsGeneratingDrills(false);
    }
  };

  // Diagnose Free-Form Text
  const handleRunDiagnosis = async () => {
    if (!diagnosticInputText.trim() || isDiagnosing) return;
    setIsDiagnosing(true);
    try {
      const result = await diagnoseGrammarApi(diagnosticInputText, profile.targetBand);
      setDiagnosticResult(result);
      awardXP(25, 'Chẩn đoán ngữ pháp văn bản với AI');
    } catch (err) {
      console.error('Diagnosis error:', err);
    } finally {
      setIsDiagnosing(false);
    }
  };

  const currentTopicMistakes = topicMistakeCountMap[selectedTopic.id] || 0;

  return (
    <div id="grammar-module" className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header & Mode Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-stone-900 dark:text-stone-100 font-display">
                Ngữ Pháp Trọng Điểm IELTS (Grammar for Band 7.0 - 8.5+)
              </h1>
              <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 mt-0.5">
                Lộ trình ví dụ trước – thuật ngữ sau, phân tích lỗi sai thực tế và luyện tập AI không giới hạn.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* AI Grammar Curriculum Designer Trigger */}
          <button data-ux-flow="grammar.learning"
            onClick={() => setIsCurriculumDesignerOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>✨ AI Curriculum Designer (Soạn Bài Học)</span>
          </button>

          {/* Tab Switcher */}
          <div className="flex items-center p-1 rounded-2xl bg-stone-200/80 dark:bg-stone-800 border border-stone-300/80 dark:border-stone-700">
            <button data-ux-flow="grammar.learning"
              onClick={() => setActiveTab('curriculum')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'curriculum'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Lộ Trình Cấu Trúc ({grammarTopics.length})</span>
            </button>
            <button data-ux-flow="grammar.learning"
              onClick={() => setActiveTab('diagnostician')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'diagnostician'
                  ? 'bg-white dark:bg-stone-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <BrainCircuit className="w-3.5 h-3.5 text-emerald-500" />
              <span>Chẩn Đoán Đoạn Văn (AI Diagnostician)</span>
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'curriculum' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Topic Browser (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-4 shadow-sm">
              {/* Filter Pills */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5" />
                    <span>Bộ lọc bài học</span>
                  </span>
                  {recommendedTopicIds.length > 0 && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 flex items-center gap-1">
                      <Flame className="w-3 h-3 fill-amber-500 text-amber-500" />
                      <span>{recommendedTopicIds.length} bài nên học</span>
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button data-ux-flow="grammar.learning"
                    onClick={() => setActiveFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      activeFilter === 'all'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-stone-100 dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
                    }`}
                  >
                    Tất cả
                  </button>
                  <button data-ux-flow="grammar.learning"
                    onClick={() => setActiveFilter('recommended')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      activeFilter === 'recommended'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'bg-stone-100 dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
                    }`}
                  >
                    <Flame className="w-3 h-3" />
                    <span>Theo lỗi sai của bạn</span>
                  </button>
                  <button data-ux-flow="grammar.learning"
                    onClick={() => setActiveFilter('band7')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      activeFilter === 'band7'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-stone-100 dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
                    }`}
                  >
                    Band 7.0
                  </button>
                  <button data-ux-flow="grammar.learning"
                    onClick={() => setActiveFilter('band8')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      activeFilter === 'band8'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-stone-100 dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
                    }`}
                  >
                    Band 8.0+
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input data-ux-flow="grammar.learning"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm thì, đảo ngữ, câu chẻ..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Topics List */}
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {filteredTopics.map((topic) => {
                  const isSelected = selectedTopic.id === topic.id;
                  const mistakeCount = topicMistakeCountMap[topic.id] || 0;
                  const mastery = topic.userMasteryPercent || 60;

                  return (
                    <button data-ux-flow="grammar.learning"
                      key={topic.id}
                      onClick={() => {
                        setSelectedTopicId(topic.id);
                        setActiveExerciseIndex(0);
                        setSelectedOptionIndex(null);
                        setTextAnswerInput('');
                        setIsAnswerSubmitted(false);
                        setEvaluationResult(null);
                      }}
                      className={`w-full p-3 rounded-2xl text-left transition-all border flex flex-col gap-1.5 cursor-pointer relative ${
                        isSelected
                          ? 'bg-emerald-50/90 dark:bg-emerald-950/60 border-emerald-500 shadow-sm ring-1 ring-emerald-500/20'
                          : 'bg-stone-50 dark:bg-stone-900/40 border-stone-200/80 dark:border-stone-700/80 hover:border-stone-300 hover:bg-stone-100/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100 leading-snug">
                          {topic.title}
                        </span>
                        <span
                          className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded shrink-0 ${
                            topic.bandImpact === 'Band 8.0+'
                              ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                              : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200'
                          }`}
                        >
                          {topic.bandImpact}
                        </span>
                      </div>

                      <div className="text-[11px] text-stone-700 dark:text-stone-300 line-clamp-1">
                        {topic.titleVi}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-stone-700 dark:text-stone-300 pt-1 border-t border-stone-200/60 dark:border-stone-700/60">
                        <span className="font-mono">{topic.categoryVi}</span>
                        <div className="flex items-center gap-2">
                          {mistakeCount > 0 && (
                            <span className="flex items-center gap-0.5 font-bold text-rose-700 dark:text-rose-400">
                              <AlertCircle className="w-3 h-3" />
                              <span>{mistakeCount} lỗi</span>
                            </span>
                          )}
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {mastery}%
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Pedagogical Lesson & AI Drill Center (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Mistake Alert Banner if active mistakes exist */}
            {currentTopicMistakes > 0 && (
              <div className="p-4 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      🎯 Bạn đã mắc {currentTopicMistakes} lỗi liên quan đến cấu trúc này
                    </div>
                    <div className="text-[11px] text-amber-700 dark:text-amber-300">
                      Hệ thống tự động ưu tiên bài học này để giúp bạn bít lỗ hổng điểm số.
                    </div>
                  </div>
                </div>
                <button data-ux-flow="grammar.learning"
                  onClick={() => setIsMistakeNotebookOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-xs font-bold hover:bg-amber-200 shrink-0 cursor-pointer"
                >
                  Xem Sổ Tay Lỗi Sai
                </button>
              </div>
            )}

            {/* Theory Card: Example First -> Terminology Later */}
            <div className="p-5 sm:p-7 rounded-3xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100 dark:border-stone-700">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200">
                      {selectedTopic.bandImpact}
                    </span>
                    <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                      Cấp độ: {selectedTopic.level}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 font-display mt-1">
                    {selectedTopic.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 font-medium">
                    {selectedTopic.titleVi}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button data-ux-flow="grammar.learning"
                    onClick={() =>
                      openAITutorWithPrompt(
                        `Tôi muốn bạn giảng sâu về cấu trúc "${selectedTopic.title}" (${selectedTopic.titleVi}). Hãy đưa ra 3 ví dụ dùng trong bài thi IELTS Writing Task 2 đạt Band 8.0+.`
                      )
                    }
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 text-xs font-bold hover:bg-emerald-100 cursor-pointer shadow-sm"
                  >
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Hỏi AI về bài này</span>
                  </button>
                </div>
              </div>

              {/* 1. Intuitive Explanation (Example-First) */}
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-700/80 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                  <Compass className="w-4 h-4" />
                  <span>Trực Giác & Bối Cảnh Thực Tế (Không Dội Thuật Ngữ)</span>
                </div>
                <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
                  {selectedTopic.intuitiveIntro}
                </p>
              </div>

              {/* 2. Visual Before & After Comparison: Band 5.5-6.0 vs Band 7.5-8.5 */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 block">
                  So Sánh Trực Quan: Nâng Cấp Câu Lên Band 7.5+
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {selectedTopic.sampleSentences.map((sample, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-white dark:bg-stone-900/40 border border-stone-200 dark:border-stone-700 space-y-2.5"
                    >
                      <div className="text-[10px] font-bold px-2 py-0.5 rounded bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 w-fit">
                        {sample.targetContext || 'Writing Task 2'}
                      </div>

                      {/* Before */}
                      <div className="p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 text-xs">
                        <div className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase">
                          Band 5.5 - 6.0 (Câu cơ bản / vụng):
                        </div>
                        <div className="text-stone-700 dark:text-stone-300 mt-1 italic">
                          "{sample.before}"
                        </div>
                      </div>

                      {/* After */}
                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs">
                        <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase flex items-center justify-between">
                          <span>Band 7.5 - 8.5 (Học thuật & Sắc bén):</span>
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                        </div>
                        <div className="text-emerald-900 dark:text-emerald-200 font-serif font-bold mt-1">
                          "{sample.after}"
                        </div>
                      </div>

                      <p className="text-[11px] text-stone-700 dark:text-stone-300 italic pt-1">
                        💡 {sample.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Core Formula Box */}
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900/80 border border-stone-200 dark:border-stone-700 space-y-2">
                <span className="text-[11px] uppercase font-bold text-stone-700 dark:text-stone-300 block">
                  Công Thức & Cú Pháp Cốt Lõi:
                </span>
                <div className="space-y-1.5">
                  {selectedTopic.keyFormulas.map((form, fi) => (
                    <div
                      key={fi}
                      className="font-mono text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-start gap-2"
                    >
                      <span className="text-emerald-500">•</span>
                      <span>{form}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Common Pitfalls Box */}
              <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-400">
                  <AlertCircle className="w-4 h-4" />
                  <span>Bẫy Lỗi Sai Thường Gặp (Common Pitfalls Bị Trừ Điểm):</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-xs text-stone-700 dark:text-stone-300">
                  {selectedTopic.commonPitfalls.map((pitfall, pi) => (
                    <li key={pi}>{pitfall}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Interactive Multi-Format AI Drill Engine */}
            {currentExercise && (
              <div className="p-5 sm:p-7 rounded-3xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold border-b border-stone-100 dark:border-stone-700 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200">
                      <Zap className="w-3.5 h-3.5" />
                    </span>
                    <span className="uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                      Luyện Tập Tương Tác ({activeExerciseIndex + 1}/{selectedTopic.exercises.length})
                    </span>
                    <span className="text-stone-700 dark:text-stone-300 font-normal">
                      • Dạng: {currentExercise.type}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button data-ux-flow="grammar.learning"
                      onClick={handleGenerateMoreExercises}
                      disabled={isGeneratingDrills}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 text-xs font-bold cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingDrills ? 'animate-spin' : ''}`} />
                      <span>{isGeneratingDrills ? 'AI Đang Sinh Bài...' : '✨ AI Tạo Bài Tập Mới'}</span>
                    </button>
                    <span className="text-amber-600 dark:text-amber-400 font-extrabold">
                      +{XP_REWARDS.GRAMMAR_EXERCISE} XP
                    </span>
                  </div>
                </div>

                {/* Question & Prompt */}
                <div className="space-y-1.5">
                  <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">
                    {currentExercise.question}
                  </h3>
                  {currentExercise.promptVi && (
                    <p className="text-xs text-stone-700 dark:text-stone-300 italic">
                      👉 {currentExercise.promptVi}
                    </p>
                  )}
                </div>

                {/* Base Sentence / Mistake Sentence if transformation / correction */}
                {(currentExercise.baseSentenceToTransform || currentExercise.originalSentenceWithMistake) && (
                  <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 space-y-1 text-xs">
                    <span className="text-[10px] font-bold uppercase text-stone-700 dark:text-stone-300">
                      {currentExercise.type === 'error_correction' ? 'Câu có lỗi sai:' : 'Câu gốc cần chuyển đổi:'}
                    </span>
                    <div className="font-mono font-medium text-stone-800 dark:text-stone-200">
                      "{currentExercise.baseSentenceToTransform || currentExercise.originalSentenceWithMistake}"
                    </div>
                  </div>
                )}

                {/* 1. Multiple Choice Options */}
                {currentExercise.type === 'multiple_choice' && currentExercise.options && (
                  <div className="space-y-2">
                    {currentExercise.options.map((optText, optIndex) => {
                      const isSelected = selectedOptionIndex === optIndex;
                      const isCorrect = optIndex === currentExercise.correctIndex;

                      let optClass =
                        'bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-700 hover:border-emerald-400';
                      if (isAnswerSubmitted) {
                        if (isCorrect) {
                          optClass =
                            'bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold';
                        } else if (isSelected && !isCorrect) {
                          optClass =
                            'bg-rose-50 dark:bg-rose-950 border-rose-500 text-rose-900 dark:text-rose-200 font-semibold';
                        }
                      } else if (isSelected) {
                        optClass = 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 font-semibold';
                      }

                      return (
                        <button data-ux-flow="grammar.learning"
                          key={optIndex}
                          onClick={() => handleSelectOption(optIndex)}
                          className={`w-full p-3.5 rounded-2xl border text-left text-xs sm:text-sm transition-all flex items-center justify-between cursor-pointer ${optClass}`}
                        >
                          <span className="leading-relaxed">{optText}</span>
                          {isAnswerSubmitted && isCorrect && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          )}
                          {isAnswerSubmitted && isSelected && !isCorrect && (
                            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 2. Text Input for Gap-Fill, Sentence Transformation, Error Correction */}
                {currentExercise.type !== 'multiple_choice' && (
                  <div className="space-y-2">
                    <div className="relative">
                      <input data-ux-flow="grammar.learning"
                        type="text"
                        value={textAnswerInput}
                        onChange={(e) => setTextAnswerInput(e.target.value)}
                        disabled={isAnswerSubmitted || isAiEvaluating}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSubmitAnswer();
                        }}
                        placeholder={
                          currentExercise.type === 'gap_fill'
                            ? 'Nhập từ/cụm từ cần điền...'
                            : currentExercise.type === 'error_correction'
                            ? 'Nhập lại câu hoàn chỉnh sau khi đã sửa lỗi...'
                            : 'Nhập câu đã viết lại...'
                        }
                        className="w-full px-4 py-3 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs sm:text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                    {currentExercise.hint && (
                      <p className="text-[11px] text-stone-700 dark:text-stone-300 italic">
                        💡 Gợi ý: {currentExercise.hint}
                      </p>
                    )}
                  </div>
                )}

                {/* AI Evaluation & Feedback Box */}
                {isAnswerSubmitted && evaluationResult && (
                  <div
                    className={`p-4 sm:p-5 rounded-2xl border space-y-2.5 animate-fadeIn ${
                      evaluationResult.isCorrect
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                        : 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {evaluationResult.isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                      )}
                      <span
                        className={`text-xs font-bold ${
                          evaluationResult.isCorrect
                            ? 'text-emerald-900 dark:text-emerald-200'
                            : 'text-rose-900 dark:text-rose-200'
                        }`}
                      >
                        {evaluationResult.feedbackVi}
                      </span>
                    </div>

                    <div className="text-xs text-stone-700 dark:text-stone-300 space-y-1">
                      <div>
                        <strong>Giải thích TẠI SAO:</strong> {evaluationResult.whyExplanation}
                      </div>
                      {!evaluationResult.isCorrect && (
                        <div className="font-mono text-emerald-800 dark:text-emerald-300 mt-1">
                          <strong>Đáp án chuẩn:</strong> {currentExercise.correctAnswer}
                        </div>
                      )}
                      {evaluationResult.bandBoostTips && (
                        <div className="text-[11px] text-indigo-700 dark:text-indigo-300 italic pt-1">
                          🚀 <strong>Mẹo Band 8.0+:</strong> {evaluationResult.bandBoostTips}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-2">
                  <button data-ux-flow="grammar.learning"
                    onClick={() =>
                      openAITutorWithPrompt(
                        `Hãy giải thích cặn kẽ bài tập này cho tôi: "${currentExercise.question}" (Đáp án chuẩn: "${currentExercise.correctAnswer}"). Tại sao lại làm như vậy?`
                      )
                    }
                    className="flex items-center gap-1.5 text-xs font-bold text-stone-700 dark:text-stone-300 hover:text-emerald-600 cursor-pointer"
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span>Hỏi AI chi tiết về câu này</span>
                  </button>

                  <div className="flex gap-2">
                    {!isAnswerSubmitted ? (
                      <button data-ux-flow="grammar.learning"
                        onClick={handleSubmitAnswer}
                        disabled={
                          isAiEvaluating ||
                          (currentExercise.type === 'multiple_choice'
                            ? selectedOptionIndex === null
                            : !textAnswerInput.trim())
                        }
                        className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs shadow-md shadow-emerald-600/20 cursor-pointer"
                      >
                        {isAiEvaluating ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>AI Đang Chấm...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Kiểm Tra Đáp Án</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button data-ux-flow="grammar.learning"
                        onClick={handleNextExercise}
                        className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-stone-900 dark:bg-stone-100 hover:bg-black dark:hover:bg-white text-white dark:text-stone-900 font-bold text-xs shadow-md cursor-pointer"
                      >
                        <span>Câu Tiếp Theo</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Diagnostician Tab (Chẩn đoán Ngữ pháp AI) */
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-6 shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200">
                <BrainCircuit className="w-6 h-6" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 font-display">
                  Chẩn Đoán Ngữ Pháp & Nâng Cấp Câu (AI Grammar Diagnostician)
                </h2>
                <p className="text-xs text-stone-700 dark:text-stone-300">
                  Dán bất kỳ đoạn văn Writing Task 1/2 hoặc câu nói Speaking của bạn. AI sẽ quét toàn bộ lỗi ngữ pháp,
                  đề xuất phương án nâng cấp Band 8.5+ và tự động liên kết tới bài học trong hệ thống.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <textarea data-ux-flow="grammar.learning"
              rows={5}
              value={diagnosticInputText}
              onChange={(e) => setDiagnosticInputText(e.target.value)}
              placeholder="Dán đoạn văn Writing hoặc câu tiếng Anh của bạn tại đây (ví dụ: Although governments invest in renewable energy, but pollution is still high. The number of people who uses public transit are increasing...)"
              className="w-full p-4 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs sm:text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:border-emerald-500 font-mono leading-relaxed"
            />

            <div className="flex justify-end gap-3">
              <button data-ux-flow="grammar.learning"
                onClick={() =>
                  setDiagnosticInputText(
                    'Although governments invest in renewable energy, but fossil fuels remain dominant. The number of people who uses private cars are increasing rapidly. If authorities invested more in subways, cities will not suffer from pollution.'
                  )
                }
                className="px-3.5 py-2 rounded-xl bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-bold hover:bg-stone-200 cursor-pointer"
              >
                Dán Mẫu Thử Nghiệm
              </button>
              <button data-ux-flow="grammar.learning"
                onClick={handleRunDiagnosis}
                disabled={isDiagnosing || !diagnosticInputText.trim()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                {isDiagnosing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>AI Đang Phân Tích Chẩn Đoán...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Chẩn Đoán Toàn Diện</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Diagnostic Results */}
          {diagnosticResult && (
            <div className="space-y-6 pt-4 border-t border-stone-100 dark:border-stone-700 animate-fadeIn">
              {/* Overview Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
                  <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300">
                    Điểm Độ Chính Xác Ngữ Pháp
                  </div>
                  <div className="text-2xl font-black text-emerald-900 dark:text-emerald-100 mt-1 font-display">
                    {diagnosticResult.overallGrammarScore}/100
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-center">
                  <div className="text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-300">
                    Band Ước Lượng (GRA)
                  </div>
                  <div className="text-2xl font-black text-indigo-900 dark:text-indigo-100 mt-1 font-display">
                    Band {diagnosticResult.estimatedBand}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-center">
                  <div className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-300">
                    Số Lỗi Cần Khắc Phục
                  </div>
                  <div className="text-2xl font-black text-rose-900 dark:text-rose-100 mt-1 font-display">
                    {diagnosticResult.detectedErrors.length} lỗi
                  </div>
                </div>
              </div>

              {/* Detected Errors List */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                  <span>Chi Tiết Lỗi Sai Cần Bít Lỗ Hổng:</span>
                </h3>

                <div className="space-y-2">
                  {diagnosticResult.detectedErrors.map((err, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-rose-700 dark:text-rose-400">
                          {err.category} ({err.severity})
                        </span>
                        {err.relatedTopicId && (
                          <button data-ux-flow="grammar.learning"
                            onClick={() => {
                              setSelectedTopicId(err.relatedTopicId!);
                              setActiveTab('curriculum');
                            }}
                            className="text-[11px] font-bold text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>Học bài tương ứng</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="text-xs text-stone-700 dark:text-stone-300">
                        <span className="line-through text-rose-700 dark:text-rose-400 font-mono">
                          "{err.errorSubstring}"
                        </span>
                        {' ➔ '}
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                          "{err.correctedSubstring}"
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-700 dark:text-stone-300 italic">
                        💡 {err.explanationVi}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upgraded Sentences to Band 8.5+ */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Phiên Bản Viết Lại Nâng Cấp Band 8.0 - 8.5+:</span>
                </h3>

                <div className="space-y-2.5">
                  {diagnosticResult.upgradedSentences.map((upg, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-emerald-800 dark:text-emerald-300">
                          {upg.enhancementType}
                        </span>
                        {upg.relatedTopicId && (
                          <button data-ux-flow="grammar.learning"
                            onClick={() => {
                              setSelectedTopicId(upg.relatedTopicId!);
                              setActiveTab('curriculum');
                            }}
                            className="text-[11px] font-bold text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>Luyện cấu trúc này</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="text-xs text-stone-700 dark:text-stone-300 line-through italic">
                        "{upg.original}"
                      </div>
                      <div className="text-xs sm:text-sm font-serif font-bold text-emerald-900 dark:text-emerald-200">
                        "{upg.upgradedBand8}"
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Grammar Curriculum Designer Modal */}
      <GrammarCurriculumModal
        isOpen={isCurriculumDesignerOpen}
        onClose={() => setIsCurriculumDesignerOpen(false)}
        initialTopic={selectedTopicId || 'conditional_sentences_type_2'}
      />
    </div>
  );
};
