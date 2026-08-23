import React, { useState, useEffect } from 'react';
import {
  PenTool,
  Clock,
  Sparkles,
  Award,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  RefreshCw,
  Zap,
  BookOpen,
  ArrowRight,
  FileText,
  Users,
  Lightbulb,
} from 'lucide-react';
import {
  WritingPracticeType,
  WritingPracticePrompt,
  WritingEvaluationResult,
  TrapCategory,
  MasterMentorPanelInput,
} from '../../types';
import {
  generateWritingPracticePromptApi,
  evaluateWritingPracticeApi,
} from '../../services/practiceService';
import { useApp } from '../../context/AppContext';
import { EssayBandUpgrader } from './EssayBandUpgrader';
import { MasterMentorPanelModal } from '../mentors/MasterMentorPanelModal';

const WRITING_TASK_TYPES: Array<{
  type: WritingPracticeType;
  category: string;
  title: string;
  words: number;
  time: number;
  desc: string;
}> = [
  {
    type: 'task1_academic',
    category: 'Bar Chart',
    title: 'Task 1 Academic: Biểu đồ Cột (Bar Chart)',
    words: 150,
    time: 20,
    desc: 'Mô tả, so sánh các số liệu và đặc điểm nổi bật trên biểu đồ cột.',
  },
  {
    type: 'task1_academic',
    category: 'Line Graph',
    title: 'Task 1 Academic: Đồ thị Đường (Line Graph)',
    words: 150,
    time: 20,
    desc: 'Phân tích xu hướng biến động (tăng, giảm, dao động, chạm đỉnh) qua thời gian.',
  },
  {
    type: 'task1_academic',
    category: 'Process Diagram',
    title: 'Task 1 Academic: Quy trình (Process / Cycle)',
    words: 150,
    time: 20,
    desc: 'Mô tả các giai đoạn từ nguyên liệu thô đến thành phẩm hoặc chu trình tự nhiên.',
  },
  {
    type: 'task1_academic',
    category: 'Map',
    title: 'Task 1 Academic: Bản đồ So sánh (Map Comparison)',
    words: 150,
    time: 20,
    desc: 'So sánh sự phát triển và thay đổi cơ sở hạ tầng giữa 2 thời kỳ.',
  },
  {
    type: 'task1_general',
    category: 'Formal Letter',
    title: 'Task 1 General: Thư Trang trọng (Formal Letter)',
    words: 150,
    time: 20,
    desc: 'Viết thư khiếu nại, xin việc hoặc yêu cầu thông tin gửi người có thẩm quyền.',
  },
  {
    type: 'task2_essay',
    category: 'Opinion Essay',
    title: 'Task 2: Agree or Disagree (Opinion)',
    words: 250,
    time: 40,
    desc: 'Trình bày lập trường rõ ràng và bảo vệ quan điểm với luận cứ thuyết phục.',
  },
  {
    type: 'task2_essay',
    category: 'Discussion Essay',
    title: 'Task 2: Discuss Both Views & Opinion',
    words: 250,
    time: 40,
    desc: 'Phân tích khách quan 2 luồng quan điểm đối lập trước khi nêu lập trường cá nhân.',
  },
  {
    type: 'task2_essay',
    category: 'Problem-Solution',
    title: 'Task 2: Causes & Solutions (Problems)',
    words: 250,
    time: 40,
    desc: 'Phân tích nguyên nhân cốt lõi và đề xuất giải pháp khả thi, mang tính hệ thống.',
  },
];

const INITIAL_WRITING_PROMPT: WritingPracticePrompt = {
  id: 'w_init_task2_1',
  type: 'task2_essay',
  category: 'Opinion Essay',
  title: 'Urban High-Density Living vs Environmental Sustainability',
  topic: 'Urban Planning & Housing',
  difficulty: 'Band 7.0-8.0',
  targetWords: 250,
  timeLimitMinutes: 40,
  promptStatement:
    'Some people believe that constructing high-rise residential towers is the only sustainable way to house growing metropolitan populations without destroying agricultural land. To what extent do you agree or disagree? Give reasons for your answer and include relevant examples from your knowledge. Write at least 250 words.',
  highBandVocabSuggestions: [
    {
      word: 'vertical urbanization',
      meaningVi: 'đô thị hóa theo chiều thẳng đứng (chung cư cao tầng)',
      contextUsage: 'Vertical urbanization serves as a potent antidote to reckless urban sprawl.',
    },
    {
      word: 'ecological footprint',
      meaningVi: 'dấu chân sinh thái / mức độ tiêu thụ tài nguyên',
      contextUsage: 'Compact residential clusters dramatically curtail an individual’s ecological footprint.',
    },
    {
      word: 'infrastructure strain',
      meaningVi: 'áp lực quá tải lên cơ sở hạ tầng',
      contextUsage: 'Overcrowded towers often impose acute infrastructure strain on local transport.',
    },
  ],
  sampleBand9Structure: {
    overviewOrThesis:
      'Partially agree: Vertical housing is essential to curb horizontal land loss, but requires decentralized zoning to prevent hyper-congestion.',
    body1Strategy:
      'Explain how high-density apartments preserve peripheral arable soils and maximize public transit energy efficiency.',
    body2Strategy:
      'Address critical drawbacks (infrastructure bottlenecks, psychological alienation) and necessity of mixed-use green development.',
  },
};

export const WritingQuestionModule: React.FC = () => {
  const { addMistake, awardXP, openAITutorWithPrompt, profile } = useApp();

  const [selectedTask, setSelectedTask] = useState<typeof WRITING_TASK_TYPES[0]>(
    WRITING_TASK_TYPES[5] // Default Task 2 Opinion
  );
  const [prompt, setPrompt] = useState<WritingPracticePrompt>(INITIAL_WRITING_PROMPT);
  const [essayText, setEssayText] = useState<string>('');
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [evaluation, setEvaluation] = useState<WritingEvaluationResult | null>(null);
  const [writingSubModule, setWritingSubModule] = useState<'mock_practice' | 'band_upgrader'>('band_upgrader');
  const [mentorModalOpen, setMentorModalOpen] = useState<boolean>(false);
  const [mentorInput, setMentorInput] = useState<MasterMentorPanelInput | null>(null);

  // Timer State
  const [secondsRemaining, setSecondsRemaining] = useState<number>(40 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, secondsRemaining]);

  // Listen for real exam forecast prompts
  useEffect(() => {
    const handleLoadPrompt = (data: any) => {
      if (!data) return;
      const isTask1 = data.taskType === 'task1_academic' || data.taskType === 'task1_general';
      const targetTask = WRITING_TASK_TYPES.find((t) => t.type === data.taskType) || (isTask1 ? WRITING_TASK_TYPES[0] : WRITING_TASK_TYPES[5]);
      setSelectedTask(targetTask);
      setPrompt({
        id: data.id || `custom_forecast_${Date.now()}`,
        type: data.taskType || 'task2_essay',
        category: data.category || 'Opinion Essay',
        title: data.title || 'Đề thi thật IELTS Real Exam',
        topic: 'IELTS Real Exam Forecast 2026',
        difficulty: 'Band 7.0-8.0',
        targetWords: isTask1 ? 150 : 250,
        timeLimitMinutes: isTask1 ? 20 : 40,
        promptStatement: data.promptStatement || '',
        highBandVocabSuggestions: [],
        sampleBand9Structure: {
          overviewOrThesis: 'Xác định rõ ràng lập trường / xu hướng tổng quan trong đề thi thật.',
          body1Strategy: 'Phát triển luận điểm 1 theo công thức PEEL với dẫn chứng sắc bén.',
          body2Strategy: 'Phát triển luận điểm 2, phản biện hoặc mở rộng hàm ý vĩ mô.',
        },
      });
      setEvaluation(null);
      setEssayText('');
      setSecondsRemaining((isTask1 ? 20 : 40) * 60);
      setIsTimerRunning(true);
    };

    // Check on mount
    const saved = sessionStorage.getItem('omni_pending_writing_prompt');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        handleLoadPrompt(parsed);
        sessionStorage.removeItem('omni_pending_writing_prompt');
      } catch (e) {
        console.warn(e);
      }
    }

    const listener = (e: any) => {
      if (e.detail) {
        handleLoadPrompt(e.detail);
      }
    };

    window.addEventListener('omni_load_writing_prompt', listener);
    return () => window.removeEventListener('omni_load_writing_prompt', listener);
  }, []);


  const wordCount = essayText.trim() ? essayText.trim().split(/\s+/).length : 0;
  const isUnderWordCount = wordCount < prompt.targetWords;

  const handleGenerateNewPrompt = async (task = selectedTask) => {
    setIsGenerating(true);
    setEvaluation(null);
    setEssayText('');
    setIsTimerRunning(false);
    setSecondsRemaining(task.time * 60);

    try {
      const newPrompt = await generateWritingPracticePromptApi(
        task.type,
        task.category,
        undefined,
        'Band 7.0-8.0'
      );
      setPrompt(newPrompt);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectTask = (task: typeof WRITING_TASK_TYPES[0]) => {
    setSelectedTask(task);
    handleGenerateNewPrompt(task);
  };

  const handleEvaluate = async () => {
    if (!essayText.trim() || wordCount < 30 || isEvaluating) return;

    setIsEvaluating(true);
    setEvaluation(null);

    try {
      const result = await evaluateWritingPracticeApi(
        prompt.promptStatement,
        essayText,
        `${prompt.type} - ${prompt.category}`,
        profile.targetBand || 7.5
      );

      setEvaluation(result);

      // Đổ tất cả các lỗi chi tiết vào MistakeNotebook với phân loại bẫy chuẩn Cambridge
      if (result.detailedMistakes && result.detailedMistakes.length > 0) {
        result.detailedMistakes.forEach((m) => {
          const isTask1 = prompt.type === 'task_1';
          let trapCat: TrapCategory = 'trap_task1_tenses';

          if (isTask1 && (m.category === 'grammar' || m.ruleExplanationVi.toLowerCase().includes('quá khứ') || m.ruleExplanationVi.toLowerCase().includes('thì'))) {
            trapCat = 'trap_task1_tenses';
          } else if (m.category === 'cohesion') {
            trapCat = 'trap_cohesion_flow';
          } else if (m.category === 'vocab') {
            trapCat = 'trap_lexical_context';
          } else if (m.category === 'task_response') {
            trapCat = 'trap_task1_tenses';
          }

          const trapTitle =
            trapCat === 'trap_task1_tenses'
              ? 'Bẫy Chia Sai Thì Quá Khứ & Số Liệu (Writing Task 1)'
              : trapCat === 'trap_cohesion_flow'
              ? 'Lỗi Dùng Sai Từ Nối & Mạch Lạc Giả (Cohesion)'
              : trapCat === 'trap_lexical_context'
              ? 'Lỗi Dịch Nghĩa & Dùng Sai Collocation Học Thuật'
              : 'Lỗi Cấu Trúc Ngữ Pháp & Mệnh Đề Phức';

          const examinerTip =
            trapCat === 'trap_task1_tenses'
              ? 'Kiểm tra năm của biểu đồ: Nếu là năm trong quá khứ (ví dụ: 1990-2020), 100% động từ mô tả xu hướng phải ở thì Quá khứ đơn (Past Simple).'
              : trapCat === 'trap_cohesion_flow'
              ? 'Hạn chế lạm dụng máy móc các từ nối ở đầu mỗi câu (Furthermore, Moreover, In addition). Ưu tiên liên kết tự nhiên bằng từ thay thế (this, these trends).'
              : 'Dùng từ vựng tự nhiên đúng ngữ cảnh thay vì cố gắng nhét từ "đao to búa lớn" (big words) sai ngữ cảnh.';

          addMistake({
            id: `mistake_w_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            errorText: `"${m.originalSegment}"`,
            correctedText: `"${m.suggestedRewrite}"`,
            explanation: `${m.ruleExplanationVi}`,
            trapCategory: trapCat,
            trapCategoryTitleVi: trapTitle,
            trapBreakdownVi: m.ruleExplanationVi,
            examinerTipVi: examinerTip,
            questionContext: `IELTS Writing ${prompt.category}: "${prompt.promptStatement.slice(0, 70)}..."`,
            userAttemptAnswer: m.originalSegment,
            drillType: 'correction',
            errorType: m.category,
            skill: 'writing',
            originModule: 'ielts_practice_writing',
            srsStage: 0,
            intervalDays: 1,
            easeFactor: 2.5,
            repetitions: 0,
            nextReviewDate: new Date().toISOString(),
            reviewCount: 0,
            mastered: false,
            createdAt: new Date().toISOString(),
            tags: ['Writing Error', m.category, prompt.category, trapCat],
            suggestedGrammarTopicId: m.suggestedReviewTopic,
            difficulty: `Band ${result.overallBand || 6.5}`,
          });
        });
      }

      awardXP(100, `Hoàn thành bài viết IELTS ${prompt.category} (Band ${result.overallBand})`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsEvaluating(false);
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div id="ielts_writing_module" className="space-y-6">
      {/* Top Module Sub-navigation Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white dark:bg-slate-800 p-2 sm:p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-2">
          <button data-ux-flow="practice.skills"
            onClick={() => setWritingSubModule('band_upgrader')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all ${
              writingSubModule === 'band_upgrader'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>Nâng Cấp Bài Viết Từng Bước (Band 5.5 ➔ 7.0 ➔ 8.5+)</span>
          </button>

          <button data-ux-flow="practice.skills"
            onClick={() => setWritingSubModule('mock_practice')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all ${
              writingSubModule === 'mock_practice'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <PenTool className="w-4 h-4" />
            <span>Luyện Viết & Chấm Điểm Cambridge (Task 1 & 2)</span>
          </button>
        </div>
      </div>

      {writingSubModule === 'band_upgrader' ? (
        <EssayBandUpgrader
          initialPrompt={prompt.promptStatement}
          initialEssay={essayText}
          initialTaskType={prompt.type}
        />
      ) : (
        <div className="space-y-6">
          {/* 1. Selector bar: Task 1 Academic / General & Task 2 Essays */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PenTool className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Luyện từng dạng đề IELTS Writing (Task 1 & Task 2)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Soạn bài trực tiếp trong app — Giám khảo AI chấm chuẩn theo đúng 4 tiêu chí chính thức của Cambridge.
            </p>
          </div>

          <button data-ux-flow="practice.skills"
            onClick={() => handleGenerateNewPrompt(selectedTask)}
            disabled={isGenerating}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
          >
            {isGenerating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {isGenerating ? 'Đang tạo đề AI...' : 'Tạo đề AI mới'}
          </button>
        </div>

        {/* Task Selection Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-2.5">
          {WRITING_TASK_TYPES.map((task, idx) => {
            const isSelected =
              selectedTask.category === task.category && selectedTask.type === task.type;
            return (
              <button data-ux-flow="practice.skills"
                key={idx}
                onClick={() => handleSelectTask(task)}
                className={`text-left p-3 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 font-semibold shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold truncate">{task.category}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                    {task.desc}
                  </p>
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  <span>≥ {task.words} từ</span>
                  <span>{task.time} phút</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Workspace: Prompt Card & Interactive Chart (if Task 1) + Rich Textarea */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Prompt Statement + Academic Chart + Vocab Hints */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                {prompt.category} • {prompt.difficulty}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Yêu cầu: ≥ {prompt.targetWords} từ
              </span>
            </div>

            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug">
                {prompt.title}
              </h3>
              <p className="mt-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                {prompt.promptStatement}
              </p>
            </div>

            {/* Academic Chart Viewer (Task 1) */}
            {prompt.academicChartData && (
              <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-indigo-400">
                  <span className="flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4" /> Dữ liệu biểu đồ Task 1
                  </span>
                </div>

                {/* SVG Visual Representation for Bar or Line */}
                <div className="h-44 w-full flex items-end justify-between gap-3 pt-6 pb-2 px-2 border-b border-slate-800">
                  {prompt.academicChartData.labels.map((label, lIdx) => (
                    <div key={label} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex items-end justify-center gap-1 h-28">
                        {prompt.academicChartData?.datasets.map((ds, dIdx) => {
                          const val = ds.data[lIdx] || 20;
                          const heightPercent = Math.min(100, Math.max(10, val * 1.5));
                          return (
                            <div
                              key={dIdx}
                              style={{ height: `${heightPercent}%` }}
                              className={`w-3.5 rounded-t transition-all ${
                                dIdx === 0
                                  ? 'bg-indigo-500'
                                  : dIdx === 1
                                  ? 'bg-emerald-500'
                                  : 'bg-amber-500'
                              }`}
                              title={`${ds.label}: ${val}${ds.unit || ''}`}
                            />
                          );
                        })}
                      </div>
                      <span className="text-[10px] text-slate-400 truncate max-w-[50px]">
                        {label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300">
                  {prompt.academicChartData.datasets.map((ds, dIdx) => (
                    <div key={dIdx} className="flex items-center gap-1.5">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          dIdx === 0
                            ? 'bg-indigo-500'
                            : dIdx === 1
                            ? 'bg-emerald-500'
                            : 'bg-amber-500'
                        }`}
                      />
                      <span>{ds.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* High-Band Vocab Suggestions */}
            {prompt.highBandVocabSuggestions && prompt.highBandVocabSuggestions.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Từ vựng C1/C2 gợi ý cho đề này:
                </div>
                <div className="space-y-2">
                  {prompt.highBandVocabSuggestions.map((v, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <strong className="text-indigo-700 dark:text-indigo-300 font-bold">
                          {v.word}
                        </strong>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {v.meaningVi}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 italic mt-1">
                        "{v.contextUsage}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sample Outline Structure */}
            {prompt.sampleBand9Structure && (
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                <strong className="text-slate-900 dark:text-white font-bold block mb-1">
                  📐 Khung dàn ý Band 9.0:
                </strong>
                <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                  <strong>Overview / Thesis:</strong> {prompt.sampleBand9Structure.overviewOrThesis}
                </p>
                <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                  <strong>Body 1:</strong> {prompt.sampleBand9Structure.body1Strategy}
                </p>
                <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                  <strong>Body 2:</strong> {prompt.sampleBand9Structure.body2Strategy}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: In-app Writing Workspace & AI Evaluation Results */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            {/* Top Toolbar: Word Counter & Timer */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <span
                    className={`px-2.5 py-1 rounded-lg ${
                      isUnderWordCount
                        ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300'
                        : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300'
                    }`}
                  >
                    {wordCount} / {prompt.targetWords} từ
                  </span>
                </div>
                {isUnderWordCount && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Chưa đủ độ dài tối thiểu
                  </span>
                )}
              </div>

              {/* Timer Controls */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-xs font-mono font-bold bg-slate-100 dark:bg-slate-700/60 px-3 py-1.5 rounded-lg text-slate-700 dark:text-slate-200">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{formatTimer(secondsRemaining)}</span>
                </div>
                <button data-ux-flow="practice.skills"
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                >
                  {isTimerRunning ? 'Tạm dừng' : 'Bắt đầu đếm giờ'}
                </button>
              </div>
            </div>

            {/* Writing Textarea */}
            <div>
              <textarea data-ux-flow="practice.skills"
                value={essayText}
                onChange={(e) => setEssayText(e.target.value)}
                placeholder="Bắt đầu viết bài luận IELTS của bạn tại đây... (Mẹo: Mở bài bằng cách paraphrase đề bài, sau đó nêu quan điểm rõ ràng)."
                rows={14}
                className="w-full p-4 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 text-sm leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-y font-serif"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button data-ux-flow="practice.skills"
                type="button"
                onClick={() => {
                  setMentorInput({
                    contentOrEssay: essayText,
                    taskType: prompt.title || 'Writing Task 2',
                    taskPrompt: prompt.promptStatement,
                    targetBand: profile.targetBand || 7.5,
                  });
                  setMentorModalOpen(true);
                }}
                disabled={wordCount < 15}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/80 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-300 dark:border-slate-600 transition-all disabled:opacity-50"
              >
                <span>🏛️ Tham Vấn Hội Đồng Mentor Panel (3 Personas)</span>
              </button>

              <button data-ux-flow="practice.skills"
                onClick={handleEvaluate}
                disabled={isEvaluating || wordCount < 20}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                {isEvaluating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {isEvaluating ? 'Giám khảo AI đang chấm...' : 'Chấm điểm 4 tiêu chí IELTS'}
              </button>
            </div>
          </div>

          {/* 3. Official 4-Criteria Evaluation Dashboard Result */}
          {evaluation && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border-2 border-indigo-500/40 shadow-xl space-y-6">
              {/* Overall Band Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white shadow-md">
                <div>
                  <span className="text-xs uppercase tracking-wider text-indigo-300 font-bold">
                    Kết quả chấm thi IELTS Writing chính thức
                  </span>
                  <h3 className="text-xl font-black text-white mt-1">
                    Ước tính: Band {evaluation.overallBand.toFixed(1)}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Độ dài bài: {evaluation.wordCount} từ • Đánh giá theo Cambridge Band Descriptors
                  </p>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-indigo-600/40 border-2 border-indigo-400 flex items-center justify-center text-2xl font-black text-white shadow-inner flex-shrink-0">
                  {evaluation.overallBand.toFixed(1)}
                </div>
              </div>

              {/* 4 Criteria Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Task Response / Task Achievement */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Task Response (TR / TA)
                    </span>
                    <span className="text-xs font-black px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                      Band {evaluation.criteriaScores.taskResponse.band.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {evaluation.criteriaScores.taskResponse.feedback}
                  </p>
                </div>

                {/* 2. Coherence & Cohesion */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Coherence & Cohesion (CC)
                    </span>
                    <span className="text-xs font-black px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                      Band {evaluation.criteriaScores.coherenceCohesion.band.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {evaluation.criteriaScores.coherenceCohesion.feedback}
                  </p>
                </div>

                {/* 3. Lexical Resource */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Lexical Resource (LR)
                    </span>
                    <span className="text-xs font-black px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                      Band {evaluation.criteriaScores.lexicalResource.band.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {evaluation.criteriaScores.lexicalResource.feedback}
                  </p>
                </div>

                {/* 4. Grammatical Range & Accuracy */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Grammatical Range & Accuracy (GRA)
                    </span>
                    <span className="text-xs font-black px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                      Band {evaluation.criteriaScores.grammaticalRangeAccuracy.band.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {evaluation.criteriaScores.grammaticalRangeAccuracy.feedback}
                  </p>
                </div>
              </div>

              {/* Detailed Detected Mistakes & Link to Review */}
              {evaluation.detailedMistakes && evaluation.detailedMistakes.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Các lỗi sai phát hiện & Đã lưu vào Mistake Notebook:
                  </h4>
                  <div className="space-y-2.5">
                    {evaluation.detailedMistakes.map((m, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 text-xs space-y-2"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <span className="font-semibold text-rose-700 dark:text-rose-300 line-through">
                            "{m.originalSegment}"
                          </span>
                          <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                            ➔ "{m.suggestedRewrite}"
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                          <strong>Giải thích:</strong> {m.ruleExplanationVi}
                        </p>
                        {m.suggestedReviewTopic && (
                          <div className="pt-1 flex items-center gap-2">
                            <button data-ux-flow="practice.skills"
                              onClick={() =>
                                openAITutorWithPrompt(
                                  `Hãy giảng chi tiết về chủ đề ngữ pháp "${m.suggestedReviewTopic}" và cách tránh lỗi sai: "${m.originalSegment}".`
                                )
                              }
                              className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                            >
                              <Zap className="w-3 h-3" /> Ôn lại ngữ pháp "{m.suggestedReviewTopic}" cùng AI Tutor
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sentence-by-sentence Band 8.0+ Upgrades */}
              {evaluation.sentenceUpgrades && evaluation.sentenceUpgrades.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <Award className="w-4 h-4" /> Nâng cấp câu lên Band 8.0+:
                  </h4>
                  <div className="space-y-2.5">
                    {evaluation.sentenceUpgrades.map((u, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 text-xs space-y-1.5"
                      >
                        <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                          <strong>Câu gốc:</strong> "{u.original}"
                        </p>
                        <p className="text-indigo-900 dark:text-indigo-200 font-bold">
                          <strong>Band 8.0+:</strong> "{u.band8Rewrite}"
                        </p>
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                          Kỹ thuật: {u.techniqueUsed}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sample Band 9.0 Response */}
              {evaluation.sampleExaminerResponseBand9 && (
                <div className="p-4 rounded-xl bg-slate-900 text-white text-xs space-y-2 border border-slate-800">
                  <span className="font-bold text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Đoạn văn mẫu Band 9.0 tham khảo:
                  </span>
                  <p className="leading-relaxed text-slate-200 italic font-serif">
                    "{evaluation.sampleExaminerResponseBand9}"
                  </p>
                </div>
              )}

              {/* Direct Link to Master Mentor Panel */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-3 border border-indigo-700/60 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center text-xl shrink-0">
                    🏛️
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                      IELTS Master Mentor Panel (3 Personas)
                    </h4>
                    <p className="text-xs text-indigo-200 mt-0.5">
                      Dr. Vance (🔴 Critical Flaws) • Coach Mia (💡 PEEL Scaffolding) • Prof. Arthur (✨ C1/C2 Collocations)
                    </p>
                  </div>
                </div>
                <button data-ux-flow="practice.skills"
                  onClick={() => {
                    setMentorInput({
                      contentOrEssay: essayText,
                      taskType: prompt.title || 'Writing Task 2',
                      taskPrompt: prompt.promptStatement,
                      targetBand: profile.targetBand || 7.5,
                    });
                    setMentorModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shadow-md transition-all shrink-0"
                >
                  <span>Mở Bảng Cố Vấn 3 Chuyên Gia</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Direct Link to Band Upgrader */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex items-center justify-between gap-3 border border-indigo-700/60 shadow-md">
                <div>
                  <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                    Muốn biến bài viết này thành tuyệt tác Band 8.5+?
                  </h4>
                  <p className="text-xs text-indigo-200 mt-0.5">
                    Chuyển sang phân hệ Nâng Cấp Từng Bước để xem bản Diff 3 cột & bộ Collocations C1/C2.
                  </p>
                </div>
                <button data-ux-flow="practice.skills"
                  onClick={() => setWritingSubModule('band_upgrader')}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shadow-md transition-all"
                >
                  <span>Mở AI Band Upgrader</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
        </div>
      )}

      {/* Master Mentor Panel Modal */}
      <MasterMentorPanelModal
        isOpen={mentorModalOpen}
        onClose={() => setMentorModalOpen(false)}
        initialInput={mentorInput}
      />
    </div>
  );
};
