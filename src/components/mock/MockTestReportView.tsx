import React, { useState } from 'react';
import {
  Award,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  BookOpen,
  Headphones,
  PenTool,
  Mic,
  ArrowRight,
  TrendingUp,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  BookmarkPlus,
  Compass,
  FileCheck2,
} from 'lucide-react';
import { MockResult, ModuleId } from '../../types';
import { useApp } from '../../context/AppContext';

interface MockTestReportViewProps {
  report: MockResult;
  onRetakeTest: () => void;
  onBackToDashboard: () => void;
}

export const MockTestReportView: React.FC<MockTestReportViewProps> = ({
  report,
  onRetakeTest,
  onBackToDashboard,
}) => {
  const { profile, setActiveModule, addMistake, awardXP } = useApp();
  const [activeReviewTab, setActiveReviewTab] = useState<'all' | 'listening' | 'reading' | 'writing' | 'speaking'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'incorrect' | 'correct'>('all');
  const [savedMistakesCount, setSavedMistakesCount] = useState<number>(0);
  const [hasSavedAllMistakes, setHasSavedAllMistakes] = useState(false);

  const getCEFRLevel = (band: number) => {
    if (band >= 8.5) return 'C2 Proficient';
    if (band >= 7.0) return 'C1 Advanced';
    if (band >= 5.5) return 'B2 Independent';
    if (band >= 4.0) return 'B1 Threshold';
    return 'A2 Waystage';
  };

  const targetBand = profile.targetBand || 7.5;
  const bandDiff = Number((report.overallBand - targetBand).toFixed(1));

  // Save all incorrect questions to unified Mistake Notebook
  const handleSaveAllMistakes = () => {
    let count = 0;
    const lMistakes = report.detailedReview?.listening?.filter((q) => !q.isCorrect) || [];
    const rMistakes = report.detailedReview?.reading?.filter((q) => !q.isCorrect) || [];

    lMistakes.forEach((q) => {
      const isPlural = (q.trapWarning || '').toLowerCase().includes('plural') || (q.trapWarning || '').toLowerCase().includes('số nhiều');
      addMistake({
        id: `mock_err_l_${Date.now()}_${q.number}`,
        errorText: `[Listening Q${q.number}] Đáp án bạn chọn: "${q.userAnswer || 'Chưa trả lời'}"`,
        correctedText: `Đáp án chuẩn: "${q.correctAnswer}"`,
        explanation: q.explanationVi,
        trapCategory: isPlural ? 'trap_listening_plural_spelling' : 'trap_distractor_numbers',
        trapCategoryTitleVi: isPlural
          ? 'Bẫy Số Ít / Số Nhiều & Chính Tả (Listening)'
          : 'Bẫy Đổi Ý & Từ Đánh Lạc Hướng (Listening Distractors)',
        trapBreakdownVi: q.trapWarning || 'Người nói thay đổi phương án hoặc dùng từ đánh lừa (distractor).',
        examinerTipVi: 'Chú ý các từ nối chuyển ý như: However, But, Actually, Wait a second.',
        questionContext: `Mock Test ${report.testCode || 'Cambridge'} - Listening Part Q${q.number}`,
        userAttemptAnswer: q.userAnswer || 'Bỏ trống',
        drillType: 'gap_fill',
        errorType: 'task_response',
        skill: 'listening',
        originModule: 'ielts_mock_test',
        srsStage: 0,
        intervalDays: 1,
        easeFactor: 2.4,
        repetitions: 0,
        nextReviewDate: new Date().toISOString(),
        reviewCount: 0,
        mastered: false,
        createdAt: new Date().toISOString(),
        tags: ['Mock Test', 'Listening', report.testCode || 'Cambridge'],
      });
      count++;
    });

    rMistakes.forEach((q) => {
      const isNG = (q.correctAnswer || '').toLowerCase().includes('not given') || (q.trapWarning || '').toLowerCase().includes('not given');
      addMistake({
        id: `mock_err_r_${Date.now()}_${q.number}`,
        errorText: `[Reading Q${q.number}] Đáp án bạn chọn: "${q.userAnswer || 'Chưa trả lời'}"`,
        correctedText: `Đáp án chuẩn: "${q.correctAnswer}"`,
        explanation: q.explanationVi,
        trapCategory: isNG ? 'trap_not_given' : 'trap_matching_headings',
        trapCategoryTitleVi: isNG
          ? 'Bẫy Not Given & False trong Reading'
          : 'Bẫy Trùng Keyword nhưng Sai Ý Chính (Matching Headings)',
        trapBreakdownVi: q.trapWarning || 'Bẫy paraphrase từ đồng nghĩa hoặc suy đoán thông tin ngoài bài đọc.',
        examinerTipVi: 'Đối chiếu chính xác từng từ trong bài đọc; không suy diễn kiến thức ngoài đời thực.',
        questionContext: `Mock Test ${report.testCode || 'Cambridge'} - Reading Passage Q${q.number}`,
        userAttemptAnswer: q.userAnswer || 'Bỏ trống',
        drillType: 'multiple_choice',
        errorType: 'task_response',
        skill: 'reading',
        originModule: 'ielts_mock_test',
        srsStage: 0,
        intervalDays: 1,
        easeFactor: 2.3,
        repetitions: 0,
        nextReviewDate: new Date().toISOString(),
        reviewCount: 0,
        mastered: false,
        createdAt: new Date().toISOString(),
        tags: ['Mock Test', 'Reading', report.testCode || 'Cambridge'],
      });
      count++;
    });

    setSavedMistakesCount(count);
    setHasSavedAllMistakes(true);
    awardXP(50, `Đã đồng bộ ${count} bẫy lỗi sai vào Sổ Tay Lỗi Sai Thông Minh`);
  };

  const handleNavigateRoadmapItem = (targetModule: ModuleId) => {
    setActiveModule(targetModule);
  };

  const allReviews = [
    ...(report.detailedReview?.listening?.map((r) => ({ ...r, skill: 'Listening' })) || []),
    ...(report.detailedReview?.reading?.map((r) => ({ ...r, skill: 'Reading' })) || []),
  ];

  const filteredReviews = allReviews.filter((r) => {
    if (activeReviewTab === 'listening' && r.skill !== 'Listening') return false;
    if (activeReviewTab === 'reading' && r.skill !== 'Reading') return false;
    if (filterStatus === 'incorrect' && r.isCorrect) return false;
    if (filterStatus === 'correct' && !r.isCorrect) return false;
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* 1. Official Test Report Form Header Card */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded-full text-xs font-mono font-bold tracking-wide">
                OFFICIAL TEST REPORT FORM (TRF)
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {report.testCode || 'CAM-MOCK'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {report.testTitle}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Thí sinh: <strong>{profile.name || 'IELTS Candidate'}</strong> • Ngày hoàn thành:{' '}
              {report.completedDate} • Thời gian làm bài: {report.timeSpentMinutes} phút
            </p>
          </div>

          {/* Large Overall Band Badge */}
          <div className="flex items-center gap-4 bg-slate-950/80 border border-slate-700 p-4 sm:p-5 rounded-2xl shadow-2xl shrink-0">
            <div className="text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Overall Band Score
              </span>
              <span className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-emerald-400 font-mono">
                {report.overallBand.toFixed(1)}
              </span>
              <span className="text-xs font-semibold text-emerald-400 block mt-0.5">
                {getCEFRLevel(report.overallBand)}
              </span>
            </div>

            <div className="border-l border-slate-800 pl-4 text-xs space-y-1">
              <div className="text-slate-400">
                Mục tiêu:{' '}
                <strong className="text-amber-400">Band {targetBand.toFixed(1)}</strong>
              </div>
              <div className="font-medium">
                {bandDiff >= 0 ? (
                  <span className="text-emerald-400 font-bold">
                    ✓ Đạt & vượt mục tiêu (+{bandDiff})
                  </span>
                ) : (
                  <span className="text-rose-400 font-bold">
                    Cách mục tiêu {Math.abs(bandDiff)} band
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 4 Skill Mini Breakdown Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
            <div className="p-2 bg-sky-500/20 text-sky-400 rounded-lg">
              <Headphones className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Listening</span>
              <span className="text-lg font-bold text-white font-mono">
                {report.listeningBand.toFixed(1)}
              </span>
              {report.listeningRawScore !== undefined && (
                <span className="text-[10px] text-slate-400 block">
                  {report.listeningRawScore}/40 câu đúng
                </span>
              )}
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Reading</span>
              <span className="text-lg font-bold text-white font-mono">
                {report.readingBand.toFixed(1)}
              </span>
              {report.readingRawScore !== undefined && (
                <span className="text-[10px] text-slate-400 block">
                  {report.readingRawScore}/40 câu đúng
                </span>
              )}
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
              <PenTool className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Writing</span>
              <span className="text-lg font-bold text-white font-mono">
                {report.writingBand.toFixed(1)}
              </span>
              {report.writingEvaluation && (
                <span className="text-[10px] text-slate-400 block">
                  T1: {report.writingEvaluation.task1Band.toFixed(1)} | T2:{' '}
                  {report.writingEvaluation.task2Band.toFixed(1)}
                </span>
              )}
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Speaking</span>
              <span className="text-lg font-bold text-white font-mono">
                {report.speakingBand.toFixed(1)}
              </span>
              <span className="text-[10px] text-purple-300 block">Gemini Live AI</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Personalized 7-Day Action Roadmap (AI Study Plan) */}
      {report.roadmap && (
        <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/60 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 rounded-lg">
                  <Compass className="w-5 h-5" />
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  Lộ trình 7 Ngày Bứt phá Kỹ năng Yếu nhất (Personalized Roadmap)
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                {report.roadmap.summaryAdviceVi}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button data-ux-flow="mock.exam"
                onClick={handleSaveAllMistakes}
                disabled={hasSavedAllMistakes}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  hasSavedAllMistakes
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
                }`}
              >
                <BookmarkPlus className="w-4 h-4" />
                <span>
                  {hasSavedAllMistakes
                    ? `Đã lưu ${savedMistakesCount} câu sai vào Sổ tay`
                    : 'Đồng bộ câu sai vào Sổ tay Lỗi sai'}
                </span>
              </button>
            </div>
          </div>

          {/* 7-Day Step Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
            {report.roadmap.dayByDayPlan.map((dayPlan) => (
              <div
                key={dayPlan.day}
                className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between hover:border-blue-400 dark:hover:border-blue-600 transition-all shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-mono font-bold text-xs flex items-center justify-center">
                      D{dayPlan.day}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        dayPlan.priority === 'high'
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                          : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                      }`}
                    >
                      {dayPlan.priority}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-2">
                    {dayPlan.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-3 leading-relaxed">
                    {dayPlan.description}
                  </p>
                </div>

                <button data-ux-flow="mock.exam"
                  onClick={() => handleNavigateRoadmapItem(dayPlan.targetModule)}
                  className="mt-3 w-full py-1.5 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-950/60 border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors"
                >
                  <span>{dayPlan.actionLabel}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Strengths & Weaknesses Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths */}
        <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl p-5 sm:p-6 shadow-sm">
          <h3 className="text-sm font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4" />
            Điểm mạnh nổi bật (Key Strengths)
          </h3>
          <ul className="space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
            {report.strengths?.map((st, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold shrink-0">•</span>
                <span>{st}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Weaknesses */}
        <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-5 sm:p-6 shadow-sm">
          <h3 className="text-sm font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4" />
            Lỗ hổng cần khắc phục (Areas for Growth)
          </h3>
          <ul className="space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
            {report.weaknesses?.map((wk, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-amber-500 font-bold shrink-0">•</span>
                <span>{wk}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 4. Writing & Speaking Detailed Criteria Feedback */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Writing Band Descriptors Breakdown */}
        {report.writingEvaluation && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PenTool className="w-4 h-4 text-amber-500" />
                Đánh giá Writing theo 4 Tiêu chí Band Descriptors
              </h3>
              <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                Band {report.writingBand.toFixed(1)}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 mb-1">
                  <span>Task Response (TR / TA)</span>
                  <span className="text-amber-600 dark:text-amber-400 font-mono">
                    Band {report.writingEvaluation.criteriaScores.taskResponse.band.toFixed(1)}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  {report.writingEvaluation.criteriaScores.taskResponse.feedback}
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 mb-1">
                  <span>Coherence & Cohesion (CC)</span>
                  <span className="text-amber-600 dark:text-amber-400 font-mono">
                    Band {report.writingEvaluation.criteriaScores.coherenceCohesion.band.toFixed(1)}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  {report.writingEvaluation.criteriaScores.coherenceCohesion.feedback}
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 mb-1">
                  <span>Lexical Resource (LR)</span>
                  <span className="text-amber-600 dark:text-amber-400 font-mono">
                    Band {report.writingEvaluation.criteriaScores.lexicalResource.band.toFixed(1)}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  {report.writingEvaluation.criteriaScores.lexicalResource.feedback}
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 mb-1">
                  <span>Grammatical Range & Accuracy (GRA)</span>
                  <span className="text-amber-600 dark:text-amber-400 font-mono">
                    Band {report.writingEvaluation.criteriaScores.grammaticalRangeAccuracy.band.toFixed(1)}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  {report.writingEvaluation.criteriaScores.grammaticalRangeAccuracy.feedback}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Speaking Band Descriptors Breakdown */}
        {report.speakingEvaluation && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Mic className="w-4 h-4 text-purple-500" />
                Đánh giá Speaking theo 4 Tiêu chí Khảo thí
              </h3>
              <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                Band {report.speakingBand.toFixed(1)}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 mb-1">
                  <span>Fluency & Coherence (FC)</span>
                  <span className="text-purple-600 dark:text-purple-400 font-mono">
                    Band {report.speakingEvaluation.criteriaScores.fluencyCoherence.band.toFixed(1)}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  {report.speakingEvaluation.criteriaScores.fluencyCoherence.feedback}
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 mb-1">
                  <span>Lexical Resource (LR)</span>
                  <span className="text-purple-600 dark:text-purple-400 font-mono">
                    Band {report.speakingEvaluation.criteriaScores.lexicalResource.band.toFixed(1)}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  {report.speakingEvaluation.criteriaScores.lexicalResource.feedback}
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 mb-1">
                  <span>Grammatical Range & Accuracy (GRA)</span>
                  <span className="text-purple-600 dark:text-purple-400 font-mono">
                    Band {report.speakingEvaluation.criteriaScores.grammaticalRangeAccuracy.band.toFixed(1)}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  {report.speakingEvaluation.criteriaScores.grammaticalRangeAccuracy.feedback}
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 mb-1">
                  <span>Pronunciation (PR)</span>
                  <span className="text-purple-600 dark:text-purple-400 font-mono">
                    Band {report.speakingEvaluation.criteriaScores.pronunciation.band.toFixed(1)}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  {report.speakingEvaluation.criteriaScores.pronunciation.feedback}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Detailed Question-by-Question Review (Listening & Reading) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Chi tiết Từng Câu Hỏi & Phân tích Đáp án (Question Review)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Xem lại câu trả lời của bạn, đối chiếu đáp án chuẩn và phân tích bẫy đề thi
            </p>
          </div>

          {/* Skill Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <button data-ux-flow="mock.exam"
              onClick={() => setActiveReviewTab('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                activeReviewTab === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Tất cả ({allReviews.length})
            </button>
            <button data-ux-flow="mock.exam"
              onClick={() => setActiveReviewTab('listening')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                activeReviewTab === 'listening'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Listening
            </button>
            <button data-ux-flow="mock.exam"
              onClick={() => setActiveReviewTab('reading')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                activeReviewTab === 'reading'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Reading
            </button>
          </div>
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-2 text-xs">
          <button data-ux-flow="mock.exam"
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1 rounded-lg border transition-colors ${
              filterStatus === 'all'
                ? 'bg-slate-800 text-white border-slate-700'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
            }`}
          >
            Tất cả kết quả
          </button>
          <button data-ux-flow="mock.exam"
            onClick={() => setFilterStatus('incorrect')}
            className={`px-3 py-1 rounded-lg border flex items-center gap-1 transition-colors ${
              filterStatus === 'incorrect'
                ? 'bg-rose-600 text-white border-rose-500'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Chỉ xem câu sai</span>
          </button>
          <button data-ux-flow="mock.exam"
            onClick={() => setFilterStatus('correct')}
            className={`px-3 py-1 rounded-lg border flex items-center gap-1 transition-colors ${
              filterStatus === 'correct'
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Chỉ xem câu đúng</span>
          </button>
        </div>

        {/* Question Review List */}
        <div className="space-y-3">
          {filteredReviews.map((rev, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-2xl border transition-all ${
                rev.isCorrect
                  ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60'
                  : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded-full text-xs font-mono font-bold flex items-center justify-center ${
                      rev.isCorrect
                        ? 'bg-emerald-600 text-white'
                        : 'bg-rose-600 text-white'
                    }`}
                  >
                    {rev.number}
                  </span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    [{rev.skill}]
                  </span>
                </div>

                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded ${
                    rev.isCorrect
                      ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  {rev.isCorrect ? 'ĐÚNG' : 'SAI'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-xs">
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px] font-medium uppercase">
                    Câu trả lời của bạn:
                  </span>
                  <span className={`font-mono font-bold mt-0.5 block ${rev.isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {rev.userAnswer || '(Bỏ trống)'}
                  </span>
                </div>

                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px] font-medium uppercase">
                    Đáp án chính xác:
                  </span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                    {rev.correctAnswer}{' '}
                    {rev.acceptableAnswers && rev.acceptableAnswers.length > 0 && (
                      <span className="text-slate-400 font-normal text-[11px]">
                        (Chấp nhận: {rev.acceptableAnswers.join(', ')})
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Explanation, Evidence & Trap Warning */}
              <div className="mt-3 text-xs space-y-1.5 text-slate-700 dark:text-slate-300 bg-white/60 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                {rev.evidenceText && (
                  <div className="p-2 bg-amber-500/10 border-l-2 border-amber-500 rounded text-amber-900 dark:text-amber-200 text-[11px] font-serif italic">
                    <span className="font-sans font-bold not-italic text-amber-600 dark:text-amber-400">Trích dẫn chứng cứ trong bài: </span>
                    "{rev.evidenceText}"
                  </div>
                )}
                <p>
                  <strong>Giải thích:</strong> {rev.explanationVi}
                </p>
                {rev.locationHint && (
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                    📍 <em>Vị trí trong bài:</em> {rev.locationHint}
                  </p>
                )}
                {rev.trapWarning && (
                  <p className="text-amber-600 dark:text-amber-400 text-[11px] font-medium">
                    ⚠️ <em>Cảnh báo bẫy:</em> {rev.trapWarning}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Footer Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <button data-ux-flow="mock.exam"
          onClick={onBackToDashboard}
          className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors"
        >
          Quay lại Danh sách Đề thi
        </button>

        <button data-ux-flow="mock.exam"
          onClick={onRetakeTest}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all active:scale-95"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Làm lại bài thi này</span>
        </button>
      </div>
    </div>
  );
};
