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
import { MockOrchestratorModal } from '../components/mock/MockOrchestratorModal';
import { XP_REWARDS } from '../services/gamification';
import { ForecastLiveHub } from '../components/forecast/ForecastLiveHub';
import { getGeminiRequestHeaders } from '../services/aiTutor';

type ExamPhase = 'idle' | 'in_progress' | 'evaluating' | 'report_view';

type ActiveMockSnapshot = {
  package: FullMockTestPackage;
  attemptId: string;
  currentSkill: MockExamSkill;
  currentQuestionNumber: number;
  activeSubIndex: number;
  timeRemainingSeconds: number;
  totalTimeSpentSeconds: number;
  listeningAnswers: Record<number, string>;
  readingAnswers: Record<number, string>;
  writingAnswers: { task1: string; task2: string };
  speakingAnswers: {
    part1Answers: Array<{ question: string; transcript: string }>;
    part2Transcript: string;
    part2Notes: string;
    part3Answers: Array<{ question: string; transcript: string }>;
  };
  flaggedListening: number[];
  flaggedReading: number[];
  savedAt: string;
};

function readActiveMockSnapshot(): ActiveMockSnapshot | null {
  try {
    const value = localStorage.getItem('omni_active_mock_build');
    if (!value) return null;
    const raw = JSON.parse(value);
    if (!raw?.package) return null;
    return {
      package: raw.package,
      attemptId: raw.attemptId || `attempt_${raw.package.id}_${Date.now()}`,
      currentSkill: raw.currentSkill || raw.startSkill || 'listening',
      currentQuestionNumber: raw.currentQuestionNumber || 1,
      activeSubIndex: raw.activeSubIndex || 0,
      timeRemainingSeconds: Number.isFinite(raw.timeRemainingSeconds) ? raw.timeRemainingSeconds : 2400,
      totalTimeSpentSeconds: raw.totalTimeSpentSeconds || 0,
      listeningAnswers: raw.listeningAnswers || {},
      readingAnswers: raw.readingAnswers || {},
      writingAnswers: raw.writingAnswers || { task1: '', task2: '' },
      speakingAnswers: raw.speakingAnswers || { part1Answers: [], part2Transcript: '', part2Notes: '', part3Answers: [] },
      flaggedListening: raw.flaggedListening || [],
      flaggedReading: raw.flaggedReading || [],
      savedAt: raw.savedAt || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export const MockTestView: React.FC = () => {
  const {
    mockResults,
    addMockResult,
    profile,
    updateProfile,
    awardXP,
    setIsExamModeActive,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'available' | 'live_hub' | 'progress' | 'history'>('available');
  const [isOrchestratorOpen, setIsOrchestratorOpen] = useState<boolean>(false);
  const [resumeSnapshot, setResumeSnapshot] = useState<ActiveMockSnapshot | null>(() => readActiveMockSnapshot());
  const [selectedTestPackage, setSelectedTestPackage] = useState<FullMockTestPackage>(CAM_19_TEST_01);
  const [mockAttemptId, setMockAttemptId] = useState<string>(() => `attempt_${Date.now()}`);
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
    audioBase64?: string;
    audioMimeType?: string;
    audioParts?: Array<{ dataUrl: string; mimeType: string }>;
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

  // Persist the package and typed answers, but never persist raw microphone audio.
  useEffect(() => {
    if (examPhase !== 'in_progress') return;
    const timer = window.setTimeout(() => {
      const snapshot: ActiveMockSnapshot = {
        package: selectedTestPackage,
        attemptId: mockAttemptId,
        currentSkill,
        currentQuestionNumber,
        activeSubIndex,
        timeRemainingSeconds,
        totalTimeSpentSeconds,
        listeningAnswers,
        readingAnswers,
        writingAnswers,
        speakingAnswers: {
          part1Answers: speakingAnswers.part1Answers,
          part2Transcript: speakingAnswers.part2Transcript,
          part2Notes: speakingAnswers.part2Notes,
          part3Answers: speakingAnswers.part3Answers,
        },
        flaggedListening,
        flaggedReading,
        savedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem('omni_active_mock_build', JSON.stringify(snapshot));
        setResumeSnapshot(snapshot);
      } catch (error) {
        console.warn('Không thể autosave mock attempt:', error);
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [examPhase, selectedTestPackage, mockAttemptId, currentSkill, currentQuestionNumber, activeSubIndex,
    timeRemainingSeconds, totalTimeSpentSeconds, listeningAnswers, readingAnswers, writingAnswers,
    speakingAnswers, flaggedListening, flaggedReading]);

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
    const nextAttemptId = `attempt_${testPkg.id}_${Date.now()}`;
    setSelectedTestPackage(testPkg);
    setMockAttemptId(nextAttemptId);
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

  const handleResumeExam = () => {
    const snapshot = readActiveMockSnapshot();
    if (!snapshot?.package || !snapshot.attemptId) return;
    setSelectedTestPackage(snapshot.package);
    setMockAttemptId(snapshot.attemptId);
    setCurrentSkill(snapshot.currentSkill);
    setCurrentQuestionNumber(snapshot.currentQuestionNumber || 1);
    setActiveSubIndex(snapshot.activeSubIndex || 0);
    setTimeRemainingSeconds(snapshot.timeRemainingSeconds);
    setTotalTimeSpentSeconds(snapshot.totalTimeSpentSeconds || 0);
    setListeningAnswers(snapshot.listeningAnswers || {});
    setReadingAnswers(snapshot.readingAnswers || {});
    setWritingAnswers(snapshot.writingAnswers || { task1: '', task2: '' });
    setSpeakingAnswers({
      ...(snapshot.speakingAnswers || { part1Answers: [], part2Transcript: '', part2Notes: '', part3Answers: [] }),
    });
    setFlaggedListening(snapshot.flaggedListening || []);
    setFlaggedReading(snapshot.flaggedReading || []);
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
        headers: getGeminiRequestHeaders(),
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
      localStorage.removeItem('omni_active_mock_build');
      setResumeSnapshot(null);
    } catch (err) {
      console.error('Error evaluating full mock test:', err);
      setEvaluatingStep('Không thể chấm bài lúc này. Bài làm vẫn được giữ; không có band giả nào được tạo.');
      setExamPhase('in_progress');
      window.alert('Hệ thống chấm điểm đang unavailable. Bài làm của bạn vẫn được giữ để thử nộp lại.');
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
                mockAttemptId={mockAttemptId}
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
                <span>Phòng Thi Thử IELTS-style (Full Mock Exam)</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                Mô phỏng định dạng thi trên máy tính với đủ 4 kỹ năng. Nội dung do Omni IELTS tạo để luyện tập, không phải đề thi IELTS chính thức.
              </p>
            </div>

            {/* Tab Navigation */}
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center gap-1 border border-slate-200 dark:border-slate-700 shrink-0 text-xs font-semibold">
              <button data-ux-flow="mock.exam"
                onClick={() => setActiveTab('available')}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${
                  activeTab === 'available'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Đề Thi Khả Dụng ({ALL_FULL_MOCK_TESTS.length})
              </button>
              <button data-ux-flow="mock.exam"
                onClick={() => setActiveTab('live_hub')}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${
                  activeTab === 'live_hub'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Live Hub
              </button>
              <button data-ux-flow="mock.exam"
                onClick={() => setActiveTab('progress')}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${
                  activeTab === 'progress'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Tiến Trình & Radar
              </button>
              <button data-ux-flow="mock.exam"
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
              {resumeSnapshot && (
                <div className="p-4 rounded-2xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-sm text-amber-950 dark:text-amber-100">Có bài thi đang làm dở</p>
                    <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                      {resumeSnapshot.package.title} • {resumeSnapshot.currentSkill} • lưu lúc {new Date(resumeSnapshot.savedAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  <button data-ux-flow="mock.exam"
                    type="button"
                    onClick={handleResumeExam}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-2 shrink-0"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Tiếp tục bài thi
                  </button>
                </div>
              )}
              {/* AI Mock Orchestrator Banner & Trigger */}
              <div className="p-6 rounded-3xl bg-gradient-to-r from-teal-950 via-slate-900 to-slate-900 border border-teal-800/40 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-teal-400/20 text-teal-300 font-mono font-bold text-[10px] uppercase border border-teal-300/30">
                      mock-assembler-v1
                    </span>
                    <span className="text-xs text-teal-300 font-bold">
                      Validated Full Mock Test Engine
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    Tự Động Lắp Ráp & Tổng Hợp Đề Thi Thử 4 Kỹ Năng
                  </h3>
                  <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                    Điều phối 40 câu Reading + 40 câu Listening + 2 Task Writing (đề mới không trùng lặp) + Speaking Interview kèm tổng hợp báo cáo Overall Band chuẩn xác.
                  </p>
                </div>

                <button data-ux-flow="mock.exam"
                  type="button"
                  onClick={() => setIsOrchestratorOpen(true)}
                  className="px-5 py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all cursor-pointer shrink-0"
                >
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span>🧭 Mở Mock Test Orchestrator</span>
                </button>
              </div>

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

                      <button data-ux-flow="mock.exam"
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

          {activeTab === 'live_hub' && (
            <ForecastLiveHub
              usageContext="mock"
              onSelectPromptForPractice={(item) => {
                sessionStorage.setItem('omni_pending_mock_source', JSON.stringify(item));
                setIsOrchestratorOpen(true);
              }}
            />
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

      {/* Mock Test Orchestrator Modal */}
      <MockOrchestratorModal
        isOpen={isOrchestratorOpen}
        onClose={() => setIsOrchestratorOpen(false)}
        onStartExam={(pkg) => handleStartExam(pkg, 'listening')}
      />
    </div>
  );
};
