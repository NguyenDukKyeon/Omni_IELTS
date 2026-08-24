import React, { useState } from 'react';
import {
  Target,
  BookOpen,
  Headphones,
  PenTool,
  Mic,
  Sparkles,
  BookMarked,
  Zap,
  Globe2,
  Flame,
} from 'lucide-react';
import { SkillType, RealExamForecastItem } from '../types';
import { useApp } from '../context/AppContext';
import { ReadingQuestionModule } from '../components/practice/ReadingQuestionModule';
import { ListeningQuestionModule } from '../components/practice/ListeningQuestionModule';
import { WritingQuestionModule } from '../components/practice/WritingQuestionModule';
import { SpeakingQuestionModule } from '../components/practice/SpeakingQuestionModule';
import { ForecastLiveHub } from '../components/forecast/ForecastLiveHub';
import { ItemWriterPracticeModal } from '../components/practice/ItemWriterPracticeModal';
import { FullGraderModal } from '../components/practice/FullGraderModal';

export type PracticeTabType = SkillType | 'forecast_hub';

export const IELTSPracticeView: React.FC = () => {
  const { mistakes, openAITutorWithPrompt } = useApp();
  const [activeTab, setActiveTab] = useState<PracticeTabType>(() => {
    if (typeof window === 'undefined') return 'forecast_hub';
    if (sessionStorage.getItem('omni_pending_writing_prompt')) return 'writing';
    if (sessionStorage.getItem('omni_pending_speaking_prompt')) return 'speaking';
    return 'forecast_hub';
  });
  const [isItemWriterOpen, setIsItemWriterOpen] = useState<boolean>(false);
  const [isFullGraderOpen, setIsFullGraderOpen] = useState<boolean>(false);

  // Count mistake items per skill
  const skillMistakesCount = {
    reading: mistakes.filter((m) => m.skill === 'reading').length,
    listening: mistakes.filter((m) => m.skill === 'listening').length,
    writing: mistakes.filter((m) => m.skill === 'writing').length,
    speaking: mistakes.filter((m) => m.skill === 'speaking').length,
  };

  const handleSelectForecastForPractice = (item: RealExamForecastItem) => {
    if (item.skill.startsWith('writing')) {
      sessionStorage.setItem(
        'omni_pending_writing_prompt',
        JSON.stringify({
          id: item.id,
          promptStatement: item.promptStatement,
          title: item.title,
          category: item.subCategory || 'Opinion Essay',
          taskType: item.skill === 'writing_task1' ? 'task1_academic' : 'task2_essay',
        })
      );
      window.dispatchEvent(
        new CustomEvent('omni_load_writing_prompt', {
          detail: {
            id: item.id,
            promptStatement: item.promptStatement,
            title: item.title,
            category: item.subCategory || 'Opinion Essay',
            taskType: item.skill === 'writing_task1' ? 'task1_academic' : 'task2_essay',
          },
        })
      );
      setActiveTab('writing');
    } else {
      sessionStorage.setItem(
        'omni_pending_speaking_prompt',
        JSON.stringify({
          id: item.id,
          promptStatement: item.promptStatement,
          title: item.title,
          cueCardPoints: item.cueCardPoints,
          part: item.skill,
        })
      );
      window.dispatchEvent(
        new CustomEvent('omni_load_speaking_prompt', {
          detail: {
            id: item.id,
            promptStatement: item.promptStatement,
            title: item.title,
            cueCardPoints: item.cueCardPoints,
            part: item.skill,
          },
        })
      );
      setActiveTab('speaking');
    }
  };

  return (
    <div id="ielts_practice_view" className="space-y-6 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-lg border border-indigo-800/40">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
              <Target className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="text-xs uppercase tracking-wider font-bold text-indigo-300">
              Khảo Thí IELTS Chuẩn Quốc Tế & AI Grounding Live
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Luyện Tập IELTS & Kho Đề Thi Thật Forecast
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Tra cứu đề thi thật IDP/BC thời gian thực qua <strong>Google Search Grounding</strong> hoặc luyện tập chuyên sâu 4 kỹ năng với AI chấm điểm 4 tiêu chí chuẩn Cambridge.
          </p>
        </div>

        {/* Quick Review Action */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button data-ux-flow="practice.skills"
            onClick={() => setIsFullGraderOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all whitespace-nowrap cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>⚖️ Giám Khảo Chấm 4 Tiêu Chí (full-grader-v1)</span>
          </button>

          <button data-ux-flow="practice.skills"
            onClick={() => setIsItemWriterOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all whitespace-nowrap cursor-pointer"
          >
            <Target className="w-4 h-4 text-amber-300" />
            <span>🎯 Cambridge Item Writer (Sinh Đề)</span>
          </button>

          <button data-ux-flow="practice.skills"
            onClick={() =>
              openAITutorWithPrompt(
                'Hãy kiểm tra lại các bẫy thường gặp nhất trong kỳ thi IELTS ở cả 4 kỹ năng (Reading, Listening, Writing, Speaking) và cho tôi 5 mẹo khắc phục quan trọng nhất.'
              )
            }
            className="px-4 py-2.5 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-bold flex items-center gap-2 border border-indigo-400/40 shadow-sm transition-all whitespace-nowrap cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Chiến thuật bẻ bẫy</span>
          </button>
        </div>
      </div>

      {/* 5 Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          {
            id: 'forecast_hub',
            title: '🔥 Forecast Live Hub',
            subtitle: 'Đề thi thật IDP & BC 2026',
            icon: Globe2,
            badge: 'Grounding Search Live',
            highlight: true,
          },
          {
            id: 'reading',
            title: 'IELTS Reading',
            subtitle: '6 dạng câu hỏi học thuật',
            icon: BookOpen,
            badge: 'Headings, TFNG, Matching...',
          },
          {
            id: 'listening',
            title: 'IELTS Listening',
            subtitle: '4 dạng bài kèm audio & bản đồ',
            icon: Headphones,
            badge: 'Form, Maps, Distractors...',
          },
          {
            id: 'writing',
            title: 'IELTS Writing',
            subtitle: 'Task 1, 2 & Band Upgrader',
            icon: PenTool,
            badge: 'TR, CC, LR, GRA Rubric',
          },
          {
            id: 'speaking',
            title: 'IELTS Speaking',
            subtitle: 'Part 1, 2 (1m prep) & Part 3',
            icon: Mic,
            badge: 'Voice Examiner & 4 Criteria',
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const mistakeCount =
            tab.id !== 'forecast_hub'
              ? skillMistakesCount[tab.id as keyof typeof skillMistakesCount]
              : 0;

          return (
            <button data-ux-flow="practice.skills"
              key={tab.id}
              onClick={() => setActiveTab(tab.id as PracticeTabType)}
              className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                isActive
                  ? 'border-indigo-600 bg-white dark:bg-slate-800 shadow-md ring-2 ring-indigo-500/20'
                  : tab.highlight
                  ? 'border-amber-400/40 bg-amber-500/5 dark:bg-amber-500/10 hover:bg-white dark:hover:bg-slate-800/80'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-800/80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : tab.highlight
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  {mistakeCount > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 flex items-center gap-1">
                      <BookMarked className="w-3 h-3" /> {mistakeCount} lỗi
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-tight">
                  {tab.title}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                  {tab.subtitle}
                </p>
              </div>

              <span className="mt-2.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 truncate">
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Render Active Module */}
      <div className="transition-all duration-300">
        {activeTab === 'forecast_hub' && (
          <ForecastLiveHub onSelectPromptForPractice={handleSelectForecastForPractice} />
        )}
        {activeTab === 'reading' && <ReadingQuestionModule />}
        {activeTab === 'listening' && <ListeningQuestionModule />}
        {activeTab === 'writing' && <WritingQuestionModule />}
        {activeTab === 'speaking' && <SpeakingQuestionModule />}
      </div>

      {/* Cambridge Item Writer Practice Modal */}
      <ItemWriterPracticeModal
        isOpen={isItemWriterOpen}
        onClose={() => setIsItemWriterOpen(false)}
        initialSkill={activeTab === 'listening' ? 'listening' : 'reading'}
      />

      {/* IELTS Examiner 4-Criteria Full Grader Modal */}
      <FullGraderModal
        isOpen={isFullGraderOpen}
        onClose={() => setIsFullGraderOpen(false)}
        initialTaskType={activeTab === 'speaking' ? 'speaking' : 'writing_task2'}
      />
    </div>
  );
};

