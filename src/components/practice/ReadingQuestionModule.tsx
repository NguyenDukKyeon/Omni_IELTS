import React, { useState } from 'react';
import {
  BookOpen,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Zap,
  Target,
  HelpCircle,
  Type,
  Highlighter,
  Search,
  Flag,
  ArrowRight,
  Eye,
  Check,
} from 'lucide-react';
import { ReadingQuestionType, ReadingPracticeExercise, TrapCategory, QuestionTrapAnalysisInput } from '../../types';
import { generateReadingPracticeApi } from '../../services/practiceService';
import { useApp } from '../../context/AppContext';
import { QuestionTrapDiagnosticModal } from './QuestionTrapDiagnosticModal';

const READING_TYPES: Array<{
  type: ReadingQuestionType;
  title: string;
  desc: string;
  badge: string;
}> = [
  {
    type: 'matching_headings',
    title: 'Matching Headings',
    desc: 'Chọn tiêu đề La Mã (i, ii, iii...) phù hợp nhất cho từng đoạn văn A, B, C...',
    badge: 'Dạng kinh điển',
  },
  {
    type: 'true_false_not_given',
    title: 'True / False / Not Given',
    desc: 'Xác minh tính đúng sai của thông tin sự thật (Facts) dựa trên bài đọc.',
    badge: 'Bẫy logic cao',
  },
  {
    type: 'yes_no_not_given',
    title: 'Yes / No / Not Given',
    desc: 'Đối chiếu quan điểm, lập luận và nhận định của tác giả (Claims/Opinions).',
    badge: 'Phân tích quan điểm',
  },
  {
    type: 'matching_information',
    title: 'Matching Information',
    desc: 'Tìm xem đoạn văn nào (A, B, C...) chứa thông tin được nêu trong câu hỏi.',
    badge: 'Kỹ năng Scanning',
  },
  {
    type: 'sentence_summary_completion',
    title: 'Sentence / Summary Completion',
    desc: 'Điền từ trực tiếp từ bài đọc vào câu tóm tắt hoặc chỗ trống có giới hạn từ.',
    badge: 'Bắt đúng từ gốc',
  },
  {
    type: 'matching_features',
    title: 'Matching Features',
    desc: 'Nối tên các nhà nghiên cứu, địa danh hoặc học thuyết với nhận định tương ứng.',
    badge: 'Phân loại đặc điểm',
  },
];

const INITIAL_READING_EXERCISE: ReadingPracticeExercise = {
  id: 'read_init_headings_1',
  type: 'matching_headings',
  title: 'Urban Rewilding and Biodiversity Corridors',
  topic: 'Environment & Urban Planning',
  difficulty: 'Band 7.0-8.0',
  targetTimeMinutes: 12,
  instructionsVi:
    'Đọc bài đọc và chọn tiêu đề phù hợp nhất cho các đoạn văn A, B, C, D từ danh sách Headings.',
  passage: {
    title: 'Urban Rewilding and Biodiversity Corridors',
    paragraphs: [
      {
        label: 'A',
        text: 'The accelerating pace of global urbanization has traditionally resulted in severe ecological fragmentation, transforming continuous wilderness into isolated botanical pockets. In response, modern municipal planners are pioneering "urban rewilding"—a proactive conservation paradigm that reintroduces natural processes and native flora into metropolitan centers.',
      },
      {
        label: 'B',
        text: 'A foundational component of this strategy is the engineering of biodiversity corridors. These continuous strips of vegetated land, green bridges, and rooftop habitats connect disparate parks, enabling birds, pollinators, and small mammals to migrate safely without risking vehicular collisions.',
      },
      {
        label: 'C',
        text: 'Despite widespread ecological acclaim, municipal authorities frequently encounter fiscal resistance and public skepticism. Critics contend that allocating prime metropolitan real estate to uncontrolled vegetation exacerbates housing shortages and poses maintenance liabilities during severe wildfire seasons.',
      },
      {
        label: 'D',
        text: 'Nevertheless, comprehensive cost-benefit analyses reveal profound long-term socioeconomic dividends. Biodiverse urban canopies drastically mitigate the urban heat island effect, curb stormwater runoff, and reduce public healthcare expenditure associated with mental stress and respiratory ailments.',
      },
    ],
  },
  headingsList: [
    { id: 'i', text: 'The socioeconomic and public health advantages of green canopies' },
    { id: 'ii', text: 'Overcoming agricultural pesticides in rural areas' },
    { id: 'iii', text: 'Connecting fragmented habitats through strategic ecological strips' },
    { id: 'iv', text: 'A paradigm shift: Introducing wilderness into dense cityscapes' },
    { id: 'v', text: 'Financial reservations and urban planning objections' },
    { id: 'vi', text: 'The complete eradication of industrial vehicular pollution' },
  ],
  questions: [
    {
      id: 'rq_1',
      questionNumber: 1,
      statementOrQuestion: 'Paragraph A',
      correctAnswer: 'iv',
      explanationVi:
        'Đoạn A giới thiệu sự chuyển dịch từ đô thị hóa phân mảnh sang khái niệm "urban rewilding" (đưa tự nhiên vào đô thị) => Heading iv ("A paradigm shift...").',
      paragraphReference: 'Đoạn A',
      trapWarning:
        'Tránh nhầm với Heading vi vì bài chỉ nói đưa thiên nhiên vào chứ không hề "eradicate" hoàn toàn ô nhiễm.',
      relatedGrammarTopicId: 'nominalization',
      relatedVocab: ['fragmentation', 'paradigm'],
    },
    {
      id: 'rq_2',
      questionNumber: 2,
      statementOrQuestion: 'Paragraph B',
      correctAnswer: 'iii',
      explanationVi:
        'Đoạn B tập trung vào biodiversity corridors (các dải xanh kết nối các công viên bị chia cắt) => Heading iii ("Connecting fragmented habitats...").',
      paragraphReference: 'Đoạn B',
      trapWarning: 'Từ khóa "connect disparate parks" tương đương "Connecting fragmented habitats".',
      relatedGrammarTopicId: 'clauses',
      relatedVocab: ['disparate', 'biodiversity'],
    },
    {
      id: 'rq_3',
      questionNumber: 3,
      statementOrQuestion: 'Paragraph C',
      correctAnswer: 'v',
      explanationVi:
        'Đoạn C nêu lên các khó khăn về tài chính ("fiscal resistance") và sự hoài nghi của công chúng/chỉ trích ("critics contend...") => Heading v ("Financial reservations and urban planning objections").',
      paragraphReference: 'Đoạn C',
      trapWarning: 'Từ "fiscal resistance" = financial reservations.',
      relatedGrammarTopicId: 'passive',
      relatedVocab: ['fiscal', 'liabilities'],
    },
    {
      id: 'rq_4',
      questionNumber: 4,
      statementOrQuestion: 'Paragraph D',
      correctAnswer: 'i',
      explanationVi:
        'Đoạn D phân tích lợi ích kinh tế xã hội và sức khỏe cộng đồng (giảm nhiệt độ, giảm chi phí y tế) => Heading i ("The socioeconomic and public health advantages...").',
      paragraphReference: 'Đoạn D',
      trapWarning: 'Chú ý cụm "socioeconomic dividends" và "public healthcare expenditure".',
      relatedGrammarTopicId: 'inversion',
      relatedVocab: ['dividends', 'mitigate'],
    },
  ],
};

export const ReadingQuestionModule: React.FC = () => {
  const { addMistake, awardXP, openAITutorWithPrompt } = useApp();

  const [selectedType, setSelectedType] = useState<ReadingQuestionType>('matching_headings');
  const [exercise, setExercise] = useState<ReadingPracticeExercise>(INITIAL_READING_EXERCISE);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [selectedTopic, setSelectedTopic] = useState<string>('Scientific Innovation & Ecology');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('Band 7.0-8.0');
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const [isHighlighterActive, setIsHighlighterActive] = useState<boolean>(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const [diagnosticModalOpen, setDiagnosticModalOpen] = useState<boolean>(false);
  const [selectedQuestionForTrap, setSelectedQuestionForTrap] = useState<QuestionTrapAnalysisInput | null>(null);

  const handleGenerateNew = async (typeToGen: ReadingQuestionType = selectedType) => {
    setIsGenerating(true);
    setIsSubmitted(false);
    setUserAnswers({});
    setFlaggedQuestions({});
    try {
      const newEx = await generateReadingPracticeApi(typeToGen, selectedTopic, selectedDifficulty);
      setExercise(newEx);
      setSelectedType(newEx.type);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectType = (t: ReadingQuestionType) => {
    setSelectedType(t);
    handleGenerateNew(t);
  };

  const handleAnswerChange = (qId: string, value: string) => {
    if (isSubmitted) return;
    setUserAnswers((prev) => ({ ...prev, [qId]: value }));
  };

  const toggleFlagQuestion = (qId: string) => {
    setFlaggedQuestions((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  const handleSubmit = () => {
    if (isSubmitted) return;
    setIsSubmitted(true);

    let correctCount = 0;
    exercise.questions.forEach((q) => {
      const userAns = (userAnswers[q.id] || '').trim().toLowerCase();
      const correct = q.correctAnswer.trim().toLowerCase();
      const isCorrect = userAns === correct;

      if (isCorrect) {
        correctCount++;
      } else {
        const isNotGivenTrap =
          exercise.type === 'true_false_not_given' || exercise.type === 'yes_no_not_given';
        const isHeadingTrap = exercise.type === 'matching_headings';
        const trapCat: TrapCategory = isHeadingTrap
          ? 'trap_matching_headings'
          : isNotGivenTrap
          ? 'trap_not_given'
          : 'trap_not_given';

        const trapBreakdown = isHeadingTrap
          ? 'Bẫy trùng keyword nhưng không phải ý chính đoạn văn (Main Idea).'
          : isNotGivenTrap
          ? 'Bẫy suy đoán logic cá nhân ngoài đời thay vì bám sát 100% bằng chứng đoạn văn.'
          : 'Bẫy paraphrase từ đồng nghĩa và giới hạn phạm vi thông tin.';

        addMistake({
          id: `mistake_read_${Date.now()}_${q.id}`,
          errorText: `[${exercise.title} - Q${q.questionNumber}] "${q.statementOrQuestion}"`,
          correctedText: `Đáp án chuẩn: "${q.correctAnswer}" (Bạn đã chọn: "${userAnswers[q.id] || 'Bỏ trống'}")`,
          explanation: `${q.explanationVi} (${q.paragraphReference || ''})`,
          trapCategory: trapCat,
          trapCategoryTitleVi: isHeadingTrap
            ? 'Bẫy Trùng Keyword nhưng Sai Ý Chính (Matching Headings)'
            : 'Bẫy Not Given & False trong Reading',
          trapBreakdownVi: trapBreakdown,
          examinerTipVi:
            'Đọc kỹ câu hỏi, gạch chân từ khóa chỉ phạm vi (all, always, only) và đối chiếu chính xác từng từ trong bài đọc.',
          questionContext: `Reading Passage: "${exercise.title}" (Q${q.questionNumber})`,
          userAttemptAnswer: userAnswers[q.id] || 'Chưa trả lời',
          options: q.options || (isNotGivenTrap ? ['TRUE', 'FALSE', 'NOT GIVEN'] : []),
          drillType: 'multiple_choice',
          errorType: 'task_response',
          skill: 'reading',
          originModule: 'ielts_practice_reading',
          srsStage: 0,
          intervalDays: 1,
          easeFactor: 2.3,
          repetitions: 0,
          nextReviewDate: new Date().toISOString(),
          reviewCount: 0,
          mastered: false,
          createdAt: new Date().toISOString(),
          tags: ['Reading Trap', exercise.type, ...(q.relatedVocab || [])],
          suggestedGrammarTopicId: q.relatedGrammarTopicId,
          difficulty: 'Band 7.0-8.0',
        });
      }
    });

    if (correctCount === exercise.questions.length) {
      awardXP(60, 'Hoàn thành xuất sắc bài tập IELTS Reading!');
    } else {
      awardXP(30, 'Luyện tập IELTS Reading');
    }
  };

  const answeredCount = exercise.questions.filter((q) => Boolean(userAnswers[q.id]?.trim())).length;
  const correctCount = exercise.questions.filter(
    (q) => (userAnswers[q.id] || '').trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()
  ).length;
  const scorePercent = Math.round((correctCount / exercise.questions.length) * 100);

  const fontSizeClass =
    fontSize === 'sm' ? 'text-xs' : fontSize === 'lg' ? 'text-base' : 'text-sm';

  return (
    <div id="ielts_reading_module" className="space-y-6">
      {/* 1. Question Type Selector (IZONE Practice Style) */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800/40">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Luyện Từng Dạng Bài IELTS Reading
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Đề thi sinh theo chuẩn Cambridge IELTS — tập trung nhận diện và hóa giải bẫy đề thi.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              data-ux-flow="practice.skills"
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="text-xs px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Scientific Innovation & Ecology">🌿 Environment & Ecology</option>
              <option value="Artificial Intelligence & Technology">🤖 AI & Future Tech</option>
              <option value="History, Archaeology & Civilizations">🏛️ History & Archaeology</option>
              <option value="Psychology, Linguistics & Education">🧠 Psychology & Education</option>
              <option value="Economics, Global Trade & Energy">⚡ Economics & Energy</option>
            </select>

            <select
              data-ux-flow="practice.skills"
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="text-xs px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Band 5.5-6.5">Band 5.5 - 6.5 (Standard)</option>
              <option value="Band 7.0-8.0">Band 7.0 - 8.0 (Academic)</option>
              <option value="Band 8.5+">Band 8.5+ (Mastery)</option>
            </select>

            <button
              data-ux-flow="practice.skills"
              onClick={() => handleGenerateNew(selectedType)}
              disabled={isGenerating}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {isGenerating ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{isGenerating ? 'Đang tạo đề AI...' : 'Tạo bài mới'}</span>
            </button>
          </div>
        </div>

        {/* Question Types Chips Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {READING_TYPES.map((t) => {
            const isSelected = selectedType === t.type;
            return (
              <button
                data-ux-flow="practice.skills"
                key={t.type}
                onClick={() => handleSelectType(t.type)}
                className={`text-left p-3 rounded-2xl border transition-all text-xs flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 font-semibold shadow-sm ring-1 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div>
                  <div className="font-bold truncate text-slate-900 dark:text-white mb-0.5">{t.title}</div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {t.desc}
                  </p>
                </div>
                <span className="mt-2.5 inline-block px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300 w-fit">
                  {t.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Computer-Delivered Split-Screen Workspace (Passage Left, Questions Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Academic Reading Passage with Toolbar */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col space-y-4">
          {/* Top Passage Toolbar (Font sizing, Highlighter, Timing) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {exercise.difficulty}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {exercise.topic}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                {exercise.passage.title}
              </h2>
            </div>

            {/* Toolbar Action Controls */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-100 dark:bg-slate-700/60 rounded-xl p-0.5 text-xs font-semibold">
                <button
                  data-ux-flow="practice.skills"
                  type="button"
                  title="Cỡ chữ nhỏ"
                  onClick={() => setFontSize('sm')}
                  className={`px-2 py-1 rounded-lg transition-all ${fontSize === 'sm' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-bold' : 'text-slate-500'}`}
                >
                  A-
                </button>
                <button
                  data-ux-flow="practice.skills"
                  type="button"
                  title="Cỡ chữ chuẩn"
                  onClick={() => setFontSize('base')}
                  className={`px-2 py-1 rounded-lg transition-all ${fontSize === 'base' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-bold' : 'text-slate-500'}`}
                >
                  A
                </button>
                <button
                  data-ux-flow="practice.skills"
                  type="button"
                  title="Cỡ chữ lớn"
                  onClick={() => setFontSize('lg')}
                  className={`px-2 py-1 rounded-lg transition-all ${fontSize === 'lg' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-bold' : 'text-slate-500'}`}
                >
                  A+
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-2.5 py-1.5 rounded-xl font-medium">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>{exercise.targetTimeMinutes}p</span>
              </div>
            </div>
          </div>

          {/* Instructions Alert */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Chiến thuật làm dạng {exercise.type.replace(/_/g, ' ').toUpperCase()}:</strong>{' '}
              {exercise.instructionsVi}
            </div>
          </div>

          {/* Passage Paragraphs */}
          <div className={`space-y-4 leading-relaxed text-slate-800 dark:text-slate-200 ${fontSizeClass}`}>
            {exercise.passage.paragraphs.map((para) => (
              <div
                key={para.label}
                className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800"
              >
                <span className="w-7 h-7 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
                  {para.label}
                </span>
                <p className="flex-1 select-text">{para.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Questions & Dynamic Interactive Inputs */}
        <div className="lg:col-span-5 space-y-4">
          {/* Headings List (if Matching Headings) */}
          {exercise.headingsList && exercise.headingsList.length > 0 && (
            <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-sm border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Danh sách Tiêu đề (List of Headings)
              </h4>
              <div className="space-y-2">
                {exercise.headingsList.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-start gap-2.5 text-xs text-slate-200 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60"
                  >
                    <span className="font-bold text-amber-400 min-w-[22px] uppercase">{h.id}.</span>
                    <span className="leading-snug">{h.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Features List (if Matching Features) */}
          {exercise.featuresList && (
            <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-sm border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Danh sách {exercise.featuresList.categoryName}
              </h4>
              <div className="space-y-1.5">
                {exercise.featuresList.items.map((feat) => (
                  <div
                    key={feat.id}
                    className="flex items-center gap-2 text-xs text-slate-200 bg-slate-800 p-2 rounded-xl"
                  >
                    <span className="font-bold text-emerald-400 w-5 h-5 rounded bg-slate-700 flex items-center justify-center">
                      {feat.id}
                    </span>
                    <span>{feat.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Question Items Card */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Câu hỏi luyện tập ({exercise.questions.length} câu)
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Đã làm {answeredCount}/{exercise.questions.length} câu
                </p>
              </div>

              {isSubmitted && (
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full border ${
                    scorePercent >= 80
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                  }`}
                >
                  Đúng {correctCount}/{exercise.questions.length} ({scorePercent}%)
                </span>
              )}
            </div>

            {/* Questions List */}
            <div className="space-y-4">
              {exercise.questions.map((q, idx) => {
                const userVal = userAnswers[q.id] || '';
                const isCorrect =
                  isSubmitted &&
                  userVal.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
                const isWrong = isSubmitted && !isCorrect;
                const isFlagged = Boolean(flaggedQuestions[q.id]);

                return (
                  <div
                    key={q.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isSubmitted
                        ? isCorrect
                          ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20'
                          : 'border-rose-300 bg-rose-50/50 dark:border-rose-800 dark:bg-rose-950/20'
                        : userVal
                        ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-lg bg-emerald-100/70 dark:bg-emerald-950/50">
                          Câu {q.questionNumber || idx + 1}:
                        </span>
                        <button
                          data-ux-flow="practice.skills"
                          type="button"
                          title={isFlagged ? 'Bỏ đánh dấu xem lại' : 'Đánh dấu cần xem lại'}
                          onClick={() => toggleFlagQuestion(q.id)}
                          className={`text-xs p-1 rounded transition-colors ${
                            isFlagged ? 'text-amber-500 font-bold' : 'text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          <Flag className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {isSubmitted && (
                        <span className="flex items-center gap-1 text-xs font-semibold">
                          {isCorrect ? (
                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Chính xác
                            </span>
                          ) : (
                            <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                              <XCircle className="w-4 h-4" /> Chưa đúng
                            </span>
                          )}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-800 dark:text-slate-200 font-semibold mb-3">
                      {q.statementOrQuestion}
                    </p>

                    {/* Input Controls according to Question Type */}
                    {exercise.type === 'matching_headings' && exercise.headingsList ? (
                      <div className="space-y-1">
                        <select
                          data-ux-flow="practice.skills"
                          disabled={isSubmitted}
                          value={userVal}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 font-medium"
                        >
                          <option value="">-- Chọn Heading thích hợp --</option>
                          {exercise.headingsList.map((h) => (
                            <option key={h.id} value={h.id}>
                              {h.id.toUpperCase()}: {h.text}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : exercise.type === 'true_false_not_given' ? (
                      <div className="flex items-center gap-2">
                        {['TRUE', 'FALSE', 'NOT GIVEN'].map((opt) => (
                          <button
                            data-ux-flow="practice.skills"
                            key={opt}
                            disabled={isSubmitted}
                            onClick={() => handleAnswerChange(q.id, opt)}
                            className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              userVal === opt
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    ) : exercise.type === 'yes_no_not_given' ? (
                      <div className="flex items-center gap-2">
                        {['YES', 'NO', 'NOT GIVEN'].map((opt) => (
                          <button
                            data-ux-flow="practice.skills"
                            key={opt}
                            disabled={isSubmitted}
                            onClick={() => handleAnswerChange(q.id, opt)}
                            className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              userVal === opt
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    ) : exercise.type === 'matching_information' ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        {exercise.passage.paragraphs.map((p) => (
                          <button
                            data-ux-flow="practice.skills"
                            key={p.label}
                            disabled={isSubmitted}
                            onClick={() => handleAnswerChange(q.id, p.label)}
                            className={`w-10 h-9 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              userVal === p.label
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div>
                        <input
                          data-ux-flow="practice.skills"
                          type="text"
                          disabled={isSubmitted}
                          placeholder="Nhập câu trả lời từ bài đọc..."
                          value={userVal}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 font-medium"
                        />
                      </div>
                    )}

                    {/* Explanations & Traps after submission */}
                    {isSubmitted && (
                      <div className="mt-3.5 pt-3.5 border-t border-slate-200 dark:border-slate-700 text-xs space-y-2">
                        <div className="text-slate-700 dark:text-slate-300">
                          <strong className="text-emerald-600 dark:text-emerald-400">
                            Đáp án chuẩn:
                          </strong>{' '}
                          <span className="font-bold uppercase">{q.correctAnswer}</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                          <strong>Giải thích:</strong> {q.explanationVi}
                        </p>
                        {q.trapWarning && (
                          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <span>
                              <strong>Bẫy cần nhớ:</strong> {q.trapWarning}
                            </span>
                          </div>
                        )}
                        {q.relatedGrammarTopicId && (
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              data-ux-flow="practice.skills"
                              onClick={() =>
                                openAITutorWithPrompt(
                                  `Hãy giải thích kỹ về bẫy dạng bài Reading này liên quan đến chủ đề ngữ pháp "${q.relatedGrammarTopicId}" và cách nhận diện từ khóa trong bài "${exercise.title}".`
                                )
                              }
                              className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                            >
                              <Zap className="w-3 h-3" /> Ôn lại ngữ pháp / bẫy này với AI Tutor
                            </button>
                          </div>
                        )}

                        {/* Interactive Trap Classification AI Trigger */}
                        <div className="pt-2">
                          <button
                            data-ux-flow="practice.skills"
                            type="button"
                            onClick={() => {
                              const snippet = q.paragraphReference
                                ? `Đoạn ${q.paragraphReference}: ${
                                    exercise.passage.paragraphs.find(
                                      (p) =>
                                        p.label === q.paragraphReference ||
                                        q.paragraphReference?.includes(p.label)
                                    )?.text?.slice(0, 200) ||
                                    exercise.passage.paragraphs[0]?.text?.slice(0, 200) ||
                                    ''
                                  }`
                                : exercise.passage.paragraphs[0]?.text?.slice(0, 200) || '';

                              setSelectedQuestionForTrap({
                                questionNumber: q.questionNumber || idx + 1,
                                questionType: exercise.type,
                                questionStatement: q.statementOrQuestion,
                                passageSnippet: snippet,
                                userAnswer: userVal || 'Chưa chọn',
                                correctAnswer: q.correctAnswer,
                                targetBand: 7.5,
                              });
                              setDiagnosticModalOpen(true);
                            }}
                            className="w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                          >
                            <Target className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Bóc Tách Bẫy Câu Này (Trap Diagnostics AI)</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Question Navigator Palette (Computer-Delivered IELTS style) */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-semibold text-slate-500 mr-1">Bảng câu hỏi:</span>
                {exercise.questions.map((q, idx) => {
                  const userVal = userAnswers[q.id] || '';
                  const isCorrect =
                    isSubmitted &&
                    userVal.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
                  const isWrong = isSubmitted && !isCorrect;
                  const isAnswered = Boolean(userVal);
                  const isFlagged = Boolean(flaggedQuestions[q.id]);

                  return (
                    <div
                      key={q.id}
                      className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center border transition-all relative ${
                        isSubmitted
                          ? isCorrect
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-rose-600 text-white border-rose-600'
                          : isAnswered
                          ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      <span>{q.questionNumber || idx + 1}</span>
                      {isFlagged && !isSubmitted && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 ring-1 ring-white" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Action buttons */}
              <div>
                {!isSubmitted ? (
                  <button
                    data-ux-flow="practice.skills"
                    onClick={handleSubmit}
                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Nộp bài & Chấm điểm
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      data-ux-flow="practice.skills"
                      onClick={() => handleGenerateNew(selectedType)}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" /> Sinh đề tiếp
                    </button>
                    <button
                      data-ux-flow="practice.skills"
                      onClick={() => {
                        setIsSubmitted(false);
                        setUserAnswers({});
                        setFlaggedQuestions({});
                      }}
                      className="px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                    >
                      Làm lại
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trap Diagnostics Modal */}
      <QuestionTrapDiagnosticModal
        isOpen={diagnosticModalOpen}
        onClose={() => setDiagnosticModalOpen(false)}
        questionData={selectedQuestionForTrap}
      />
    </div>
  );
};

