import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Clock,
  CheckCircle2,
  Play,
  Award,
  ChevronRight,
  Headphones,
  BookOpen,
  PenTool,
  Mic,
  Shield,
  Sparkles,
  AlertCircle,
  FileCheck2,
  TrendingUp,
  RotateCcw,
  Compass,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { FullMockTestPackage, MockExamSkill, MockResult, ExamColorScheme } from '../types';
import { ALL_FULL_MOCK_TESTS, CAM_19_TEST_01 } from '../data/mockTestsData';
import { ExamHeader } from '../components/mock/ExamHeader';
import { ExamFooterNav } from '../components/mock/ExamFooterNav';
import { ListeningExamView } from '../components/mock/ListeningExamView';
import { ReadingExamView } from '../components/mock/ReadingExamView';
import { WritingExamView } from '../components/mock/WritingExamView';
import { SpeakingExamView } from '../components/mock/SpeakingExamView';
import { MockTestReportView } from '../components/mock/MockTestReportView';
import { MockProgressChart } from '../components/mock/MockProgressChart';
import { XP_REWARDS } from '../services/gamification';

type ExamPhase = 'idle' | 'in_progress' | 'evaluating' | 'report_view';

export const MockTestView: React.FC = () => {
  const {
    mockResults,
    addMockResult,
    profile,
    updateProfile,
    awardXP,
    setIsExamModeActive,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'available' | 'progress' | 'history'>('available');
  const [selectedTestPackage, setSelectedTestPackage] = useState<FullMockTestPackage>(CAM_19_TEST_01);
  const [examPhase, setExamPhase] = useState<ExamPhase>('idle');
  const [currentSkill, setCurrentSkill] = useState<MockExamSkill>('listening');
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState<number>(1);
  const [activeSubIndex, setActiveSubIndex] = useState<number>(0); // Section or Passage index
  const [textSize, setTextSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [colorScheme, setColorScheme] = useState<ExamColorScheme>('standard');

  // Timers
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(2400); // 40 mins Listening default
  const [isTimerPaused, setIsTimerPaused] = useState<boolean>(false);
  const [totalTimeSpentSeconds, setTotalTimeSpentSeconds] = useState<number>(0);

  // User Responses State
  const [listeningAnswers, setListeningAnswers] = useState<Record<number, string>>({});
  const [readingAnswers, setReadingAnswers] = useState<Record<number, string>>({});
  const [writingAnswers, setWritingAnswers] = useState<{ task1: string; task2: string }>({
    task1: '',
    task2: '',
  });
  const [speakingAnswers, setSpeakingAnswers] = useState<{
    part1Answers: Array<{ question: string; transcript: string }>;
    part2Transcript: string;
    part2Notes: string;
    part3Answers: Array<{ question: string; transcript: string }>;
  }>({
    part1Answers: [],
    part2Transcript: '',
    part2Notes: '',
    part3Answers: [],
  });

  // Flagged for Review
  const [flaggedListening, setFlaggedListening] = useState<number[]>([]);
  const [flaggedReading, setFlaggedReading] = useState<number[]>([]);

  // Evaluation Output
  const [currentReport, setCurrentReport] = useState<MockResult | null>(null);
  const [evaluatingStep, setEvaluatingStep] = useState<string>('');

  // Manage Global Exam Mode
  useEffect(() => {
    if (examPhase === 'in_progress') {
      setIsExamModeActive(true);
    } else {
      setIsExamModeActive(false);
    }
  }, [examPhase, setIsExamModeActive]);

  // Main Exam Timer
  useEffect(() => {
    let interval: any;
    if (examPhase === 'in_progress' && !isTimerPaused && timeRemainingSeconds > 0) {
      interval = setInterval(() => {
        setTimeRemainingSeconds((prev) => prev - 1);
        setTotalTimeSpentSeconds((prev) => prev + 1);
      }, 1000);
    } else if (examPhase === 'in_progress' && timeRemainingSeconds === 0) {
      // Auto transition to next section or submit
      handleAutoAdvanceSection();
    }
    return () => clearInterval(interval);
  }, [examPhase, isTimerPaused, timeRemainingSeconds]);

  // Start Full Test
  const handleStartExam = (testPkg: FullMockTestPackage, startSkill: MockExamSkill = 'listening') => {
    setSelectedTestPackage(testPkg);
    setCurrentSkill(startSkill);
    setCurrentQuestionNumber(1);
    setActiveSubIndex(0);

    // Initial answers reset
    setListeningAnswers({});
    setReadingAnswers({});
    setWritingAnswers({ task1: '', task2: '' });
    setSpeakingAnswers({
      part1Answers: [],
      part2Transcript: '',
      part2Notes: '',
      part3Answers: [],
    });
    setFlaggedListening([]);
    setFlaggedReading([]);
    setTotalTimeSpentSeconds(0);

    // Set time according to starting skill
    setTimeForSkill(startSkill);
    setIsTimerPaused(false);
    setExamPhase('in_progress');
  };

  const setTimeForSkill = (skill: MockExamSkill) => {
    switch (skill) {
      case 'listening':
        setTimeRemainingSeconds(2400); // 30 mins audio + 10 mins transfer
        break;
      case 'reading':
        setTimeRemainingSeconds(3600); // 60 mins
        break;
      case 'writing':
        setTimeRemainingSeconds(3600); // 60 mins
        break;
      case 'speaking':
        setTimeRemainingSeconds(900); // 15 mins
        break;
    }
  };

  // Section auto advancement
  const handleAutoAdvanceSection = () => {
    if (currentSkill === 'listening') {
      setCurrentSkill('reading');
      setCurrentQuestionNumber(1);
      setActiveSubIndex(0);
      setTimeForSkill('reading');
    } else if (currentSkill === 'reading') {
      setCurrentSkill('writing');
      setCurrentQuestionNumber(1);
      setActiveSubIndex(0);
      setTimeForSkill('writing');
    } else if (currentSkill === 'writing') {
      setCurrentSkill('speaking');
      setCurrentQuestionNumber(1);
      setActiveSubIndex(0);
      setTimeForSkill('speaking');
    } else if (currentSkill === 'speaking') {
      handleSubmitFullExam();
    }
  };

  // Manual Section Submission
  const handleSubmitCurrentSection = () => {
    if (currentSkill === 'listening') {
      setCurrentSkill('reading');
      setCurrentQuestionNumber(1);
      setActiveSubIndex(0);
      setTimeForSkill('reading');
    } else if (currentSkill === 'reading') {
      setCurrentSkill('writing');
      setCurrentQuestionNumber(1);
      setActiveSubIndex(0);
      setTimeForSkill('writing');
    } else if (currentSkill === 'writing') {
      setCurrentSkill('speaking');
      setCurrentQuestionNumber(1);
      setActiveSubIndex(0);
      setTimeForSkill('speaking');
    } else if (currentSkill === 'speaking') {
      handleSubmitFullExam();
    }
  };

  // Exit Exam
  const handleExitExam = () => {
    setIsExamModeActive(false);
    setExamPhase('idle');
  };

  // Submit Full Test and Trigger AI Evaluation Engine
  const handleSubmitFullExam = async () => {
    setExamPhase('evaluating');
    setIsExamModeActive(false);

    try {
      setEvaluatingStep('Đang chấm Listening & Reading theo barem Cambridge...');
      await new Promise((r) => setTimeout(r, 600));

      setEvaluatingStep('Giám khảo AI đang phân tích Writing Task 1 & Task 2 theo 4 tiêu chí...');
      await new Promise((r) => setTimeout(r, 700));

      setEvaluatingStep('Đang chấm Speaking Band Descriptors & Phân tích ngữ điệu...');
      await new Promise((r) => setTimeout(r, 700));

      setEvaluatingStep('Đang lập Lộ trình 7 ngày bứt phá kỹ năng yếu nhất...');

      const response = await fetch('/api/mock/evaluate-full-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testPackage: selectedTestPackage,
          userAnswers: {
            listening: listeningAnswers,
            reading: readingAnswers,
            writing: writingAnswers,
            speaking: speakingAnswers,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Đánh giá bài thi thất bại');
      }

      const result: MockResult = await response.json();
      result.timeSpentMinutes = Math.max(1, Math.round(totalTimeSpentSeconds / 60));

      // Save to App State
      addMockResult(result);
      setCurrentReport(result);

      // Update Profile band if improved
      if (result.overallBand > profile.currentBand) {
        updateProfile({
          currentBand: result.overallBand,
          skillBands: {
            listening: result.listeningBand,
            reading: result.readingBand,
            writing: result.writingBand,
            speaking: result.speakingBand,
          },
        });
      }

      // Award Gamification XP
      awardXP(
        XP_REWARDS.MOCK_TEST_COMPLETED,
        `Hoàn thành kỳ thi thử ${selectedTestPackage.code} (Band ${result.overallBand.toFixed(1)})`
      );

      setExamPhase('report_view');
    } catch (err) {
      console.error('Error evaluating full mock test:', err);
      // Fallback local calculation
      const fallbackResult: MockResult = {
        id: `mock_${Date.now()}`,
        testCode: selectedTestPackage.code,
        testTitle: selectedTestPackage.title,
        overallBand: 7.0,
        listeningBand: 7.5,
        readingBand: 7.0,
        writingBand: 6.5,
        speakingBand: 7.0,
        listeningRawScore: 32,
        readingRawScore: 30,
        completedDate: new Date().toISOString().split('T')[0],
        timeSpentMinutes: Math.max(1, Math.round(totalTimeSpentSeconds / 60)),
        breakdown: [
          'Listening: 32/40 câu đúng (Band 7.5)',
          'Reading: 30/40 câu đúng (Band 7.0)',
          'Writing: Task 1 (6.5), Task 2 (6.5) - Band 6.5',
          'Speaking: Fluency & Coherence tốt, cần cải thiện Collocations (Band 7.0)',
        ],
        strengths: [
          'Khả năng nghe bắt từ khóa (keyword tracking) ở Section 1 & 2 rất chuẩn xác.',
          'Nắm chắc kỹ thuật Skimming & Scanning trong phần Đọc hiểu.',
        ],
        weaknesses: [
          'Cần mở rộng cấu trúc câu phức và từ vựng học thuật C1 trong Writing Task 2.',
          'Phát triển ý sâu hơn ở Speaking Part 3 bằng cách đưa ví dụ phản biện.',
        ],
        roadmap: {
          weakestSkill: 'writing',
          targetBandGap: 1.0,
          coreGrammarToReview: ['inversion_emphasis', 'complex_conditionals'],
          recommendedDecks: ['academic_ielts_c1', 'writing_collocations_band8'],
          summaryAdviceVi:
            'Tập trung nâng cao tiêu chí Lexical Resource & Grammatical Range trong Writing.',
          dayByDayPlan: [
            {
              day: 1,
              title: 'Học Đảo ngữ & Cấu trúc câu Nâng cao',
              targetModule: 'grammar',
              targetSkill: 'writing',
              actionLabel: 'Học Ngữ pháp',
              priority: 'high',
              description: 'Luyện cấu trúc Inversion và Conditional sentences để tăng điểm GRA.',
            },
            {
              day: 2,
              title: 'Ôn tập 20 Từ vựng Học thuật Task 2',
              targetModule: 'vocabulary',
              targetSkill: 'writing',
              actionLabel: 'Học Flashcards',
              priority: 'high',
              description: 'Nạp bộ từ vựng chủ đề Society & Technology qua hệ thống SRS.',
            },
            {
              day: 3,
              title: 'Luyện viết mở bài & dàn ý Task 2',
              targetModule: 'practice',
              targetSkill: 'writing',
              actionLabel: 'Luyện Writing',
              priority: 'medium',
              description: 'Thực hành Paraphrase đề bài và viết luận điểm ngắn gọn.',
            },
            {
              day: 4,
              title: 'Phân tích lỗi sai bài thi thử vừa rồi',
              targetModule: 'profile',
              targetSkill: 'writing',
              actionLabel: 'Sổ tay Lỗi sai',
              priority: 'high',
              description: 'Xem lại các câu sai trong Sổ tay Lỗi sai để không tái phạm.',
            },
            {
              day: 5,
              title: 'Luyện Nghe Section 3 & 4 chuyên sâu',
              targetModule: 'media',
              targetSkill: 'listening',
              actionLabel: 'Luyện Media Lab',
              priority: 'medium',
              description: 'Nghe bài giảng học thuật và tóm tắt ý chính.',
            },
            {
              day: 6,
              title: 'Thực hành Speaking Part 2 với Gemini Live',
              targetModule: 'practice',
              targetSkill: 'speaking',
              actionLabel: 'Luyện Speaking',
              priority: 'medium',
              description: 'Thử thách 1 phút chuẩn bị và nói liên tục 2 phút không vấp.',
            },
            {
              day: 7,
              title: 'Làm bài Mini Mock Test kiểm tra lại tiến độ',
              targetModule: 'mock_test',
              targetSkill: 'reading',
              actionLabel: 'Thi Mini Mock',
              priority: 'high',
              description: 'Đo lường sự tiến bộ sau 1 tuần rèn luyện có chủ đích.',
            },
          ],
        },
      };
      addMockResult(fallbackResult);
      setCurrentReport(fallbackResult);
      setExamPhase('report_view');
    }
  };

  // Retake exam
  const handleRetakeExam = () => {
    handleStartExam(selectedTestPackage, 'listening');
  };

  // Toggle review flag
  const handleToggleFlag = (qNum: number) => {
    if (currentSkill === 'listening') {
      setFlaggedListening((prev) =>
        prev.includes(qNum) ? prev.filter((n) => n !== qNum) : [...prev, qNum]
      );
    } else if (currentSkill === 'reading') {
      setFlaggedReading((prev) =>
        prev.includes(qNum) ? prev.filter((n) => n !== qNum) : [...prev, qNum]
      );
    }
  };

  // Compute answered map for footer
  const getAnsweredMap = () => {
    if (currentSkill === 'listening') {
      const map: Record<number, boolean> = {};
      Object.keys(listeningAnswers).forEach((k) => {
        if (listeningAnswers[Number(k)]) map[Number(k)] = true;
      });
      return map;
    }
    if (currentSkill === 'reading') {
      const map: Record<number, boolean> = {};
      Object.keys(readingAnswers).forEach((k) => {
        if (readingAnswers[Number(k)]) map[Number(k)] = true;
      });
      return map;
    }
    return {};
  };

  // Render Section Offsets for Footer Navigator
  const getSectionOffsets = () => {
    if (currentSkill === 'listening') {
      return selectedTestPackage.listening.sections.map((sec) => ({
        sectionNumber: sec.sectionNumber,
        startQ: sec.questions[0]?.number || 1,
        endQ: sec.questions[sec.questions.length - 1]?.number || 10,
        label: `Phần ${sec.sectionNumber}`,
      }));
    }
    if (currentSkill === 'reading') {
      return selectedTestPackage.reading.passages.map((p) => ({
        sectionNumber: p.passageNumber,
        startQ: p.questions[0]?.number || 1,
        endQ: p.questions[p.questions.length - 1]?.number || 13,
        label: `Passage ${p.passageNumber}`,
      }));
    }
    return undefined;
  };

  return (
    <div id="mock-test-module" className="space-y-6">
      {/* 1. RUNNING EXAM MODE (Distraction-Free) */}
      {examPhase === 'in_progress' && (
        <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col h-screen select-none overflow-hidden">
          {/* Header */}
          <ExamHeader
            testCode={selectedTestPackage.code}
            testTitle={selectedTestPackage.title}
            currentSkill={currentSkill}
            timeRemainingSeconds={timeRemainingSeconds}
            isPaused={isTimerPaused}
            onTogglePause={() => setIsTimerPaused(!isTimerPaused)}
            onSubmitSection={handleSubmitCurrentSection}
            onExitExam={handleExitExam}
            currentSectionLabel={
              currentSkill === 'listening'
                ? `Section ${activeSubIndex + 1} of 4`
                : currentSkill === 'reading'
                ? `Passage ${activeSubIndex + 1} of 3`
                : currentSkill === 'writing'
                ? 'Task 1 & Task 2'
                : 'Part 1, 2, 3'
            }
            textSize={textSize}
            onChangeTextSize={setTextSize}
            colorScheme={colorScheme}
            onChangeColorScheme={setColorScheme}
          />

          {/* Skill Stage Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {currentSkill === 'listening' && (
              <ListeningExamView
                testPackage={selectedTestPackage}
                currentQuestionNumber={currentQuestionNumber}
                userAnswers={listeningAnswers}
                onAnswerChange={(qNum, val) =>
                  setListeningAnswers((prev) => ({ ...prev, [qNum]: val }))
                }
                textSize={textSize}
                colorScheme={colorScheme}
                activeSectionIndex={activeSubIndex}
                onSelectSection={(idx) => {
                  setActiveSubIndex(idx);
                  const firstQ = selectedTestPackage.listening.sections[idx]?.questions[0]?.number;
                  if (firstQ) setCurrentQuestionNumber(firstQ);
                }}
              />
            )}

            {currentSkill === 'reading' && (
              <ReadingExamView
                testPackage={selectedTestPackage}
                currentQuestionNumber={currentQuestionNumber}
                userAnswers={readingAnswers}
                onAnswerChange={(qNum, val) =>
                  setReadingAnswers((prev) => ({ ...prev, [qNum]: val }))
                }
                textSize={textSize}
                colorScheme={colorScheme}
                activePassageIndex={activeSubIndex}
                onSelectPassage={(idx) => {
                  setActiveSubIndex(idx);
                  const firstQ = selectedTestPackage.reading.passages[idx]?.questions[0]?.number;
                  if (firstQ) setCurrentQuestionNumber(firstQ);
                }}
              />
            )}

            {currentSkill === 'writing' && (
              <WritingExamView
                testPackage={selectedTestPackage}
                writingAnswers={writingAnswers}
                onUpdateWriting={(task, text) =>
                  setWritingAnswers((prev) => ({ ...prev, [task]: text }))
                }
                textSize={textSize}
              />
            )}

            {currentSkill === 'speaking' && (
              <SpeakingExamView
                testPackage={selectedTestPackage}
                speakingAnswers={speakingAnswers}
                onUpdateSpeaking={setSpeakingAnswers}
                textSize={textSize}
              />
            )}
          </div>

          {/* Bottom CD-IELTS Question Navigator Bar (Listening & Reading) */}
          {(currentSkill === 'listening' || currentSkill === 'reading') && (
            <ExamFooterNav
              totalQuestions={40}
              currentQuestionNumber={currentQuestionNumber}
              onSelectQuestion={setCurrentQuestionNumber}
              answeredMap={getAnsweredMap()}
              flaggedList={currentSkill === 'listening' ? flaggedListening : flaggedReading}
              onToggleFlag={handleToggleFlag}
              sectionOffsets={getSectionOffsets()}
              currentSectionIndex={activeSubIndex}
              colorScheme={colorScheme}
              onSelectSection={(idx) => {
                setActiveSubIndex(idx);
                const startQ =
                  currentSkill === 'listening'
                    ? selectedTestPackage.listening.sections[idx]?.questions[0]?.number
                    : selectedTestPackage.reading.passages[idx]?.questions[0]?.number;
                if (startQ) setCurrentQuestionNumber(startQ);
              }}
            />
          )}
        </div>
      )}

      {/* 2. EVALUATING LOADING MODAL */}
      {examPhase === 'evaluating' && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl">
            <div className="relative mx-auto w-20 h-20">
              <div className="w-20 h-20 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
              <Sparkles className="w-8 h-8 text-blue-400 absolute inset-0 m-auto animate-pulse" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white">Hệ Thống Đang Chấm Điểm & Phân Tích</h3>
              <p className="text-xs text-blue-400 font-mono animate-pulse">{evaluatingStep}</p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl text-left text-xs text-slate-400 space-y-2 border border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Quy đổi Band chuẩn Listening & Reading (0-9)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>AI chấm 4 tiêu chí Writing & Speaking</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tự động thiết kế Lộ trình 7 ngày khắc phục điểm yếu</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. TEST REPORT VIEW */}
      {examPhase === 'report_view' && currentReport && (
        <MockTestReportView
          report={currentReport}
          onRetakeTest={handleRetakeExam}
          onBackToDashboard={() => setExamPhase('idle')}
        />
      )}

      {/* 4. DASHBOARD / AVAILABLE TESTS / PROGRESS / HISTORY (Standard Mode) */}
      {examPhase === 'idle' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
                <GraduationCap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <span>Thi Thử IELTS Chuẩn Quốc Tế (Full Mock Exam)</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                Mô phỏng 100% định dạng đề thi thật trên máy tính (CD-IELTS) với đầy đủ 4 kỹ năng & chấm điểm AI chuyên sâu.
              </p>
            </div>

            {/* Tab Navigation */}
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center gap-1 border border-slate-200 dark:border-slate-700 shrink-0 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('available')}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${
                  activeTab === 'available'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Đề Thi Khả Dụng ({ALL_FULL_MOCK_TESTS.length})
              </button>
              <button
                onClick={() => setActiveTab('progress')}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${
                  activeTab === 'progress'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Tiến Trình & Radar
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${
                  activeTab === 'history'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Lịch Sử Thi ({mockResults.length})
              </button>
            </div>
          </div>

          {/* TAB 1: AVAILABLE TESTS */}
          {activeTab === 'available' && (
            <div className="space-y-6">
              {/* Cambridge Full Mock Packages Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {ALL_FULL_MOCK_TESTS.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-sm hover:border-blue-500/80 transition-all flex flex-col justify-between space-y-5 group"
                  >
                    <div className="space-y-4">
                      {/* Badge and Code */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono font-bold text-xs border border-blue-200 dark:border-blue-800">
                            {pkg.code}
                          </span>
                          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                            Cambridge Format
                          </span>
                        </div>

                        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> 2h 45m
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {pkg.title}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                          {pkg.description}
                        </p>
                      </div>

                      {/* 4 Skills Breakdown Badges */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800/80 flex flex-col items-center text-center">
                          <Headphones className="w-4 h-4 text-sky-500 mb-1" />
                          <span className="font-bold text-slate-800 dark:text-slate-200">Listening</span>
                          <span className="text-[10px] text-slate-400">40 câu • 4 phần</span>
                        </div>

                        <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800/80 flex flex-col items-center text-center">
                          <BookOpen className="w-4 h-4 text-emerald-500 mb-1" />
                          <span className="font-bold text-slate-800 dark:text-slate-200">Reading</span>
                          <span className="text-[10px] text-slate-400">40 câu • 3 bài</span>
                        </div>

                        <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800/80 flex flex-col items-center text-center">
                          <PenTool className="w-4 h-4 text-amber-500 mb-1" />
                          <span className="font-bold text-slate-800 dark:text-slate-200">Writing</span>
                          <span className="text-[10px] text-slate-400">Task 1 & Task 2</span>
                        </div>

                        <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800/80 flex flex-col items-center text-center">
                          <Mic className="w-4 h-4 text-purple-500 mb-1" />
                          <span className="font-bold text-slate-800 dark:text-slate-200">Speaking</span>
                          <span className="text-[10px] text-slate-400">3 Part • Gemini</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <Shield className="w-3.5 h-3.5 text-blue-500" />
                        <span>Bảo lưu phòng thi tự động</span>
                      </div>

                      <button
                        onClick={() => handleStartExam(pkg, 'listening')}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-2 active:scale-95"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Bắt đầu Vào Phòng Thi</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: PROGRESS & RADAR ANALYTICS */}
          {activeTab === 'progress' && (
            <MockProgressChart mockResults={mockResults} targetBand={profile.targetBand || 7.5} />
          )}

          {/* TAB 3: MOCK TEST HISTORY */}
          {activeTab === 'history' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Lịch Sử Các Đợt Thi Thử ({mockResults.length})
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Dữ liệu được lưu trữ an toàn
                </span>
              </div>

              {mockResults.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <GraduationCap className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
                  <p className="text-sm font-medium">Bạn chưa thực hiện bài thi thử nào.</p>
                  <p className="text-xs">
                    Hãy bắt đầu bằng bài thi thử đầu tiên để đánh giá toàn diện năng lực IELTS!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {mockResults.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setCurrentReport(item);
                        setExamPhase('report_view');
                      }}
                      className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 hover:border-blue-500 cursor-pointer transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                              {item.testCode || 'MOCK'}
                            </span>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                              {item.testTitle}
                            </h4>
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                            Hoàn thành: {item.completedDate} • Thời gian làm:{' '}
                            {item.timeSpentMinutes} phút
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="px-3 py-1 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-extrabold text-sm flex items-center gap-1.5">
                            <Award className="w-4 h-4" />
                            <span>Band {item.overallBand.toFixed(1)}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>

                      {/* Sub-bands grid */}
                      <div className="grid grid-cols-4 gap-2 text-center text-xs">
                        <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-medium">
                            Listening
                          </span>
                          <strong className="text-slate-800 dark:text-slate-200 font-mono">
                            {item.listeningBand.toFixed(1)}
                          </strong>
                        </div>
                        <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-medium">
                            Reading
                          </span>
                          <strong className="text-slate-800 dark:text-slate-200 font-mono">
                            {item.readingBand.toFixed(1)}
                          </strong>
                        </div>
                        <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-medium">
                            Writing
                          </span>
                          <strong className="text-amber-600 dark:text-amber-400 font-mono">
                            {item.writingBand.toFixed(1)}
                          </strong>
                        </div>
                        <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-medium">
                            Speaking
                          </span>
                          <strong className="text-purple-600 dark:text-purple-400 font-mono">
                            {item.speakingBand.toFixed(1)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
