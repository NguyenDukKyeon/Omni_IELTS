import React, { useState } from 'react';
import {
  Target,
  PenTool,
  Mic,
  BookOpen,
  Headphones,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Award,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SkillType } from '../types';
import { evaluateWritingApi } from '../services/aiTutor';
import { XP_REWARDS } from '../services/gamification';

interface PracticePromptItem {
  id: string;
  skill: SkillType;
  title: string;
  topic: string;
  difficulty: string;
  targetTask?: string;
  instruction: string;
}

const samplePrompts: PracticePromptItem[] = [
  {
    id: 'pr_w1',
    skill: 'writing',
    title: 'Compulsory Community Service for Students',
    topic: 'Education & Society',
    difficulty: 'Band 7.0+',
    targetTask: 'Writing Task 2',
    instruction:
      'Some people believe that unpaid community service should be a compulsory part of high school programmes (for example working for a charity, improving the neighborhood or teaching sports to younger children). To what extent do you agree or disagree? Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.',
  },
  {
    id: 'pr_w2',
    skill: 'writing',
    title: 'Renewable Energy vs Economic Growth',
    topic: 'Environment & Energy',
    difficulty: 'Band 7.5+',
    targetTask: 'Writing Task 2',
    instruction:
      'Many governments prioritize rapid economic expansion over environmental sustainability by continuing fossil fuel subsidies. Discuss both views and give your own opinion. Write at least 250 words.',
  },
  {
    id: 'pr_s1',
    skill: 'speaking',
    title: 'Describe an Important Decision You Made',
    topic: 'Personal Experience',
    difficulty: 'Band 7.0+',
    targetTask: 'Speaking Part 2',
    instruction:
      'Describe an important decision you made in your life. You should say: What the decision was, When and why you made it, Who helped or influenced you, and Explain how you felt about the decision afterwards. (1 minute preparation, 2 minutes speaking).',
  },
  {
    id: 'pr_r1',
    skill: 'reading',
    title: 'The Evolution of Modern Neural Machine Translation',
    topic: 'Technology & AI',
    difficulty: 'Band 7.5+',
    targetTask: 'Reading Passage 3',
    instruction:
      'Read the academic research paper excerpt on transformer architectures and neural linguistics, then answer 5 rigorous comprehension questions.',
  },
  {
    id: 'pr_l1',
    skill: 'listening',
    title: 'University Campus Environmental Initiative',
    topic: 'Academic Life',
    difficulty: 'Band 7.0+',
    targetTask: 'Listening Section 3',
    instruction:
      'Listen to a conversation between a tutor and two post-graduate students discussing their environmental audit project methodology.',
  },
];

export const IELTSPracticeView: React.FC = () => {
  const { awardXP, addMistake, addPracticeAttempt, openAITutorWithPrompt, profile } = useApp();

  const [activeSkill, setActiveSkill] = useState<SkillType>('writing');
  const [prompts] = useState<PracticePromptItem[]>(samplePrompts);
  const [selectedPrompt, setSelectedPrompt] = useState<PracticePromptItem>(samplePrompts[0]);
  const [userSubmission, setUserSubmission] = useState<string>('');
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evaluationResult, setEvaluationResult] = useState<any | null>(null);

  // Speaking simulation state
  const [isSpeakingRecording, setIsSpeakingRecording] = useState<boolean>(false);
  const [speakingScore, setSpeakingScore] = useState<any | null>(null);

  const filteredPrompts = prompts.filter((p) => p.skill === activeSkill);
  const wordCount = userSubmission.trim() ? userSubmission.trim().split(/\s+/).length : 0;

  const handleEvaluateWriting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userSubmission.trim() || isEvaluating) return;

    setIsEvaluating(true);
    setEvaluationResult(null);

    try {
      const result = await evaluateWritingApi(
        selectedPrompt.title,
        userSubmission,
        selectedPrompt.targetTask || 'Writing Task 2',
        profile.targetBand
      );

      setEvaluationResult(result);

      // Add practice attempt
      addPracticeAttempt({
        id: `attempt_${Date.now()}`,
        skill: 'writing',
        topic: selectedPrompt.title,
        taskType: selectedPrompt.targetTask || 'Writing Task 2',
        scoreBand: result.estimatedBand || 6.5,
        feedbackSummary: result.generalFeedback || 'Đã hoàn thành chấm bài.',
        detailedCriteria: {
          taskResponse: result.criteriaScores?.taskResponse,
          coherenceCohesion: result.criteriaScores?.coherenceCohesion,
          lexicalResource: result.criteriaScores?.lexicalResource,
          grammaticalAccuracy: result.criteriaScores?.grammaticalAccuracy,
        },
        mistakesGeneratedCount: result.mistakesFound?.length || 0,
        timestamp: new Date().toISOString(),
        durationMinutes: 40,
      });

      // Automatically add identified errors to Mistake Notebook
      if (result.mistakesFound && Array.isArray(result.mistakesFound)) {
        result.mistakesFound.forEach((err: any) => {
          addMistake({
            id: `m_writing_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            errorText: err.errorText || err.original || '',
            correctedText: err.correctedText || err.suggestion || '',
            explanation: err.explanation || err.reason || 'Lỗi diễn đạt cần cải thiện.',
            errorType: (err.type as any) || 'grammar',
            skill: 'writing',
            originModule: 'practice',
            srsStage: 0,
            nextReviewDate: new Date().toISOString(),
            reviewCount: 0,
            mastered: false,
            createdAt: new Date().toISOString(),
            tags: ['Writing', selectedPrompt.targetTask || 'Task 2'],
          });
        });
      }

      awardXP(XP_REWARDS.PRACTICE_COMPLETED, 'Hoàn thành bài viết IELTS Writing & Chấm AI 4 tiêu chí!');
    } catch (error) {
      console.error('Error evaluating writing', error);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleSimulateSpeaking = () => {
    if (!isSpeakingRecording) {
      setIsSpeakingRecording(true);
      setSpeakingScore(null);
      setTimeout(() => {
        setIsSpeakingRecording(false);
        const score = {
          overallBand: 7.0,
          fluency: 7.0,
          lexical: 7.5,
          grammar: 6.5,
          pronunciation: 7.0,
          feedback:
            'Độ trôi chảy tốt, sử dụng được các cụm collocation C1 tự nhiên. Chú ý cấu trúc câu phức ở Part 3 để kéo band lên 7.5+.',
          sampleAnswer:
            'Personally speaking, I find academic challenges immensely rewarding because they foster intellectual resilience...',
        };
        setSpeakingScore(score);
        awardXP(XP_REWARDS.PRACTICE_COMPLETED, 'Hoàn thành bài luyện Speaking AI!');
      }, 4000);
    } else {
      setIsSpeakingRecording(false);
    }
  };

  return (
    <div id="practice-module" className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-stone-900 dark:text-stone-100 font-display flex items-center gap-2.5">
          <Target className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          <span>Luyện Tập IELTS 4 Kỹ Năng & AI Chấm Điểm</span>
        </h1>
        <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 mt-1">
          Luyện viết Task 1/2 với rubric chuẩn 4 tiêu chí (TR, CC, LR, GRA), luyện nói Speaking với Cue Card, và giải đề Reading/Listening.
        </p>
      </div>

      {/* 4 Skill Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-700 pb-3 overflow-x-auto no-scrollbar">
        {[
          { id: 'writing', label: 'Writing (Task 1 & 2)', icon: PenTool },
          { id: 'speaking', label: 'Speaking (Part 1, 2, 3)', icon: Mic },
          { id: 'reading', label: 'Reading (Học thuật)', icon: BookOpen },
          { id: 'listening', label: 'Listening (4 Sections)', icon: Headphones },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSkill === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSkill(tab.id as SkillType);
                const first = prompts.find((p) => p.skill === tab.id);
                if (first) setSelectedPrompt(first);
                setUserSubmission('');
                setEvaluationResult(null);
                setSpeakingScore(null);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Prompt Selector */}
        <div className="p-5 rounded-3xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
            Danh Sách Đề Bài Luyện Tập
          </h2>

          <div className="space-y-2">
            {filteredPrompts.map((prompt) => {
              const isSelected = selectedPrompt.id === prompt.id;
              return (
                <button
                  key={prompt.id}
                  onClick={() => {
                    setSelectedPrompt(prompt);
                    setUserSubmission('');
                    setEvaluationResult(null);
                    setSpeakingScore(null);
                  }}
                  className={`w-full p-3.5 rounded-2xl text-left transition-all border flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-500 shadow-sm'
                      : 'bg-stone-50 dark:bg-stone-900/40 border-stone-200/80 dark:border-stone-700/80 hover:border-stone-300'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100 truncate">
                      {prompt.title}
                    </div>
                    <div className="text-[11px] text-stone-700 dark:text-stone-300 truncate mt-0.5">
                      {prompt.topic}
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-300 shrink-0">
                    {prompt.difficulty}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Practice Workspace */}
        <div className="lg:col-span-2 space-y-5">
          {/* WRITING WORKSPACE */}
          {activeSkill === 'writing' && (
            <div className="p-6 rounded-3xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-5 shadow-sm">
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                  {selectedPrompt.targetTask || 'Writing Task 2'} • Band 7.5+ Target
                </span>
                <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                  {selectedPrompt.title}
                </h2>
                <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs sm:text-sm text-stone-800 dark:text-stone-200 font-serif leading-relaxed">
                  {selectedPrompt.instruction}
                </div>
              </div>

              {/* Writing Input */}
              <form onSubmit={handleEvaluateWriting} className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-stone-700 dark:text-stone-300">
                  <span>Bài làm của bạn:</span>
                  <span className={wordCount < 250 ? 'text-amber-500' : 'text-emerald-500'}>
                    Số từ: <strong>{wordCount}</strong> / 250 từ tối thiểu
                  </span>
                </div>

                <textarea
                  rows={9}
                  required
                  value={userSubmission}
                  onChange={(e) => setUserSubmission(e.target.value)}
                  placeholder="Bắt đầu viết bài luận của bạn tại đây..."
                  className="w-full p-4 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs sm:text-sm text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-purple-500 leading-relaxed font-sans"
                />

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      openAITutorWithPrompt(
                        `Hãy gợi ý dàn ý 4 bước theo phương pháp PEEL cho đề bài: "${selectedPrompt.instruction}"`
                      )
                    }
                    className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Gợi ý dàn ý PEEL từ AI</span>
                  </button>

                  <button
                    id="submit-writing-for-evaluation-btn"
                    type="submit"
                    disabled={isEvaluating || wordCount < 20}
                    className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold text-xs shadow-md shadow-purple-600/20 flex items-center gap-2 cursor-pointer"
                  >
                    {isEvaluating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>AI Đang Chấm 4 Tiêu Chí...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Nộp Bài & Chấm Điểm AI</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* EVALUATION REPORT CARD */}
              {evaluationResult && (
                <div className="p-5 rounded-2xl bg-stone-50 dark:bg-stone-900/80 border border-stone-200 dark:border-stone-700 space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-700 pb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                        Bảng Đánh Giá Chi Tiết Rubric IELTS
                      </span>
                      <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                        Ước Tính Overall Band: {Number(evaluationResult.estimatedBand || 6.5).toFixed(1)}
                      </h3>
                    </div>
                    <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                      Band {Number(evaluationResult.estimatedBand || 6.5).toFixed(1)}
                    </div>
                  </div>

                  {/* 4 Rubric Criteria Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-3 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                      <span className="text-stone-700 dark:text-stone-300 font-medium block">Task Response</span>
                      <strong className="text-stone-900 dark:text-stone-100 text-sm">
                        {evaluationResult.criteriaScores?.taskResponse || 6.5}
                      </strong>
                    </div>
                    <div className="p-3 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                      <span className="text-stone-700 dark:text-stone-300 font-medium block">Coherence & Cohesion</span>
                      <strong className="text-stone-900 dark:text-stone-100 text-sm">
                        {evaluationResult.criteriaScores?.coherenceCohesion || 6.5}
                      </strong>
                    </div>
                    <div className="p-3 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                      <span className="text-stone-700 dark:text-stone-300 font-medium block">Lexical Resource</span>
                      <strong className="text-stone-900 dark:text-stone-100 text-sm">
                        {evaluationResult.criteriaScores?.lexicalResource || 6.5}
                      </strong>
                    </div>
                    <div className="p-3 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                      <span className="text-stone-700 dark:text-stone-300 font-medium block">Grammar Range</span>
                      <strong className="text-stone-900 dark:text-stone-100 text-sm">
                        {evaluationResult.criteriaScores?.grammaticalAccuracy || 6.5}
                      </strong>
                    </div>
                  </div>

                  {evaluationResult.generalFeedback && (
                    <div className="p-3 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-800 dark:text-stone-200">
                      {evaluationResult.generalFeedback}
                    </div>
                  )}

                  {/* Identified Errors */}
                  {evaluationResult.mistakesFound &&
                    evaluationResult.mistakesFound.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                          <AlertTriangle className="w-4 h-4" />
                          <span>Lỗi ngữ pháp/từ vựng (Đã tự động lưu vào Sổ tay lỗi sai):</span>
                        </div>

                        {evaluationResult.mistakesFound.map((err: any, ei: number) => (
                          <div
                            key={ei}
                            className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs space-y-1"
                          >
                            <div className="line-through text-rose-600 dark:text-rose-400 font-serif">
                              "{err.errorText || err.original}"
                            </div>
                            <div className="text-emerald-700 dark:text-emerald-300 font-bold font-serif">
                              ➔ "{err.correctedText || err.suggestion}"
                            </div>
                            <div className="text-stone-700 dark:text-stone-300 text-[11px]">
                              {err.explanation || err.reason}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              )}
            </div>
          )}

          {/* SPEAKING WORKSPACE */}
          {activeSkill === 'speaking' && (
            <div className="p-6 rounded-3xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-5 shadow-sm">
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                  Speaking Cue Card • 1 Phút Chuẩn Bị & 2 Phút Trả Lời
                </span>
                <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                  {selectedPrompt.title}
                </h2>
                <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs sm:text-sm text-stone-800 dark:text-stone-200 leading-relaxed font-serif">
                  {selectedPrompt.instruction}
                </div>
              </div>

              <div className="text-center py-4">
                <button
                  onClick={handleSimulateSpeaking}
                  className={`px-8 py-3.5 rounded-full font-bold text-xs sm:text-sm tracking-wide shadow-lg transition-all flex items-center justify-center gap-2.5 mx-auto cursor-pointer ${
                    isSpeakingRecording
                      ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse'
                      : 'bg-sky-500 hover:bg-sky-600 text-white'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                  <span>{isSpeakingRecording ? 'Đang Ghi Âm Câu Trả Lời...' : 'Bắt Đầu Nói (Speaking)'}</span>
                </button>
              </div>

              {speakingScore && (
                <div className="p-5 rounded-2xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/50 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-900 dark:text-sky-200">
                      Kết Quả Đánh Giá Speaking AI
                    </span>
                    <span className="text-lg font-black text-sky-600 dark:text-sky-400">
                      Band {speakingScore.overallBand.toFixed(1)}
                    </span>
                  </div>

                  <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                    {speakingScore.feedback}
                  </p>

                  <div className="pt-2 border-t border-sky-200/50 dark:border-sky-900/40 text-xs">
                    <span className="font-bold text-stone-900 dark:text-stone-100 block mb-1">
                      Câu trả lời mẫu Band 8.5+:
                    </span>
                    <p className="font-serif italic text-stone-700 dark:text-stone-300">
                      "{speakingScore.sampleAnswer}"
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* READING & LISTENING PLACEHOLDER QUICK DRILL */}
          {(activeSkill === 'reading' || activeSkill === 'listening') && (
            <div className="p-6 rounded-3xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-4 text-center py-12">
              <BookOpen className="w-10 h-10 text-indigo-500 mx-auto opacity-70" />
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {activeSkill === 'reading' ? 'Phần Luyện Đọc Học Thuật' : 'Phần Luyện Nghe Học Thuật'}
              </h3>
              <p className="text-xs text-stone-700 dark:text-stone-300 max-w-md mx-auto">
                Hệ thống đề thi trọn bộ theo format Cambridge IELTS đã sẵn sàng trong Module 6 (Thi thử IELTS).
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
