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
  Award,
  Layers,
  ChevronRight,
  Filter,
  CheckCircle2,
  Clock,
  Search,
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
  const { mistakes, practiceAttempts, openAITutorWithPrompt } = useApp();
  const [activeTab, setActiveTab] = useState<PracticeTabType>(() => {
    if (typeof window === 'undefined') return 'forecast_hub';
    if (sessionStorage.getItem('omni_pending_writing_prompt')) return 'writing';
    if (sessionStorage.getItem('omni_pending_speaking_prompt')) return 'speaking';
    return 'forecast_hub';
  });
  const [isItemWriterOpen, setIsItemWriterOpen] = useState<boolean>(false);
  const [isFullGraderOpen, setIsFullGraderOpen] = useState<boolean>(false);
  const [filterQuery, setFilterQuery] = useState<string>('all');

  // Count mistake items per skill
  const skillMistakesCount = {
    reading: mistakes.filter((m) => m.skill === 'reading').length,
    listening: mistakes.filter((m) => m.skill === 'listening').length,
    writing: mistakes.filter((m) => m.skill === 'writing').length,
    speaking: mistakes.filter((m) => m.skill === 'speaking').length,
  };

  const completedCount = practiceAttempts.filter((a) => a.score !== undefined).length;

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

  const skillTabs = [
    {
      id: 'forecast_hub',
      title: 'Forecast Live Hub',
      subtitle: 'Nguồn đề thi & dự báo thời gian thực',
      icon: Flame,
      tag: '🔥 Hot Forecast 2026',
      accentColor: 'rose',
      colorClass: 'text-rose-600 dark:text-rose-400',
      bgClass: 'bg-rose-50 dark:bg-rose-950/40',
      borderActiveClass: 'border-rose-500 ring-2 ring-rose-500/20',
      activeIndicatorClass: 'bg-rose-500',
      totalItems: '140+ Đề thi thật',
    },
    {
      id: 'reading',
      title: 'IELTS Reading',
      subtitle: 'Passage split-view & 6 dạng câu hỏi',
      icon: BookOpen,
      tag: 'Headings, TFNG, Matching',
      accentColor: 'emerald',
      colorClass: 'text-emerald-600 dark:text-emerald-400',
      bgClass: 'bg-emerald-50 dark:bg-emerald-950/40',
      borderActiveClass: 'border-emerald-500 ring-2 ring-emerald-500/20',
      activeIndicatorClass: 'bg-emerald-500',
      totalItems: 'Cam 16-21 Full',
    },
    {
      id: 'listening',
      title: 'IELTS Listening',
      subtitle: 'Audio sync, bản đồ & distractor analysis',
      icon: Headphones,
      tag: 'Section 1-4 & Maps',
      accentColor: 'sky',
      colorClass: 'text-sky-600 dark:text-sky-400',
      bgClass: 'bg-sky-50 dark:bg-sky-950/40',
      borderActiveClass: 'border-sky-500 ring-2 ring-sky-500/20',
      activeIndicatorClass: 'bg-sky-500',
      totalItems: 'Audio chuẩn bản xứ',
    },
    {
      id: 'writing',
      title: 'IELTS Writing',
      subtitle: 'Task 1, 2 & Band Upgrader tức thì',
      icon: PenTool,
      tag: 'TR, CC, LR, GRA Rubric',
      accentColor: 'amber',
      colorClass: 'text-amber-600 dark:text-amber-400',
      bgClass: 'bg-amber-50 dark:bg-amber-950/40',
      borderActiveClass: 'border-amber-500 ring-2 ring-amber-500/20',
      activeIndicatorClass: 'bg-amber-500',
      totalItems: 'Chấm 4 Tiêu Chí',
    },
    {
      id: 'speaking',
      title: 'IELTS Speaking',
      subtitle: 'Voice AI Examiner 1-on-1 có bấm giờ',
      icon: Mic,
      tag: 'Part 1, 2, 3 chuẩn IDP',
      accentColor: 'violet',
      colorClass: 'text-violet-600 dark:text-violet-400',
      bgClass: 'bg-violet-50 dark:bg-violet-950/40',
      borderActiveClass: 'border-violet-500 ring-2 ring-violet-500/20',
      activeIndicatorClass: 'bg-violet-500',
      totalItems: 'Phản xạ & Phát âm',
    },
  ];

  return (
    <div id="ielts_practice_view" className="space-y-6 animate-fadeIn pb-14">
      {/* Top Quick Breadcrumbs & Metric Stats Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 px-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800 dark:text-slate-200">Luyện Tập Khảo Thí</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
            Mô phỏng Computer-Delivered IELTS
          </span>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Đã làm: <strong>{completedCount} bài</strong></span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
            <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Thời gian khuyến nghị: <strong>12 - 40 phút / bài</strong></span>
          </div>
        </div>
      </div>

      {/* Modern EdTech Hero Header Banner (IZONE-inspired) */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-6 sm:p-7 shadow-xl border border-slate-800">
        {/* Subtle decorative background gradient circles */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-gradient-to-br from-indigo-500/20 to-rose-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-gradient-to-tr from-sky-500/15 to-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                <Target className="w-3.5 h-3.5 text-rose-400" />
                <span>Cambridge 16-21 & Forecast Live</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                IDP / BC Simulation
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
              Luyện Tập IELTS Chuyên Sâu 4 Kỹ Năng
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Mô phỏng 100% trải nghiệm thi trên máy tính với <strong>Highlight, Note, Đếm từ trực tiếp</strong> và hệ thống AI giám khảo phân tích lỗi sai & chấm 4 tiêu chí tức thì.
            </p>
          </div>

          {/* Quick AI Examination Tools */}
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            <button
              data-ux-flow="practice.skills"
              onClick={() => setIsFullGraderOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>⚖️ Giám Khảo Chấm 4 Tiêu Chí</span>
            </button>

            <button
              data-ux-flow="practice.skills"
              onClick={() => setIsItemWriterOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-950/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Target className="w-4 h-4 text-amber-300" />
              <span>🎯 Cambridge Item Writer</span>
            </button>

            <button
              data-ux-flow="practice.skills"
              onClick={() =>
                openAITutorWithPrompt(
                  'Hãy kiểm tra lại các bẫy thường gặp nhất trong kỳ thi IELTS ở cả 4 kỹ năng (Reading, Listening, Writing, Speaking) và cho tôi 5 mẹo khắc phục quan trọng nhất.'
                )
              }
              className="px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-2 border border-slate-700 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Chiến thuật bẻ bẫy</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5 Distinct Skill Selector Cards (IZONE Practice Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {skillTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const mistakeCount =
            tab.id !== 'forecast_hub'
              ? skillMistakesCount[tab.id as keyof typeof skillMistakesCount]
              : 0;

          return (
            <button
              data-ux-flow="practice.skills"
              key={tab.id}
              onClick={() => setActiveTab(tab.id as PracticeTabType)}
              className={`group relative p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between overflow-hidden bg-white dark:bg-slate-800 shadow-sm hover:shadow-md ${
                isActive
                  ? `${tab.borderActiveClass} bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/90`
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              {/* Active top color bar */}
              {isActive && (
                <div className={`absolute top-0 left-0 right-0 h-1 ${tab.activeIndicatorClass}`} />
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                      isActive
                        ? `${tab.bgClass} ${tab.colorClass}`
                        : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  {mistakeCount > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 flex items-center gap-1 border border-rose-200 dark:border-rose-800/50">
                      <BookMarked className="w-3 h-3" /> {mistakeCount} lỗi
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {tab.title}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {tab.subtitle}
                </p>
              </div>

              <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[10px]">
                <span className="font-semibold text-slate-600 dark:text-slate-300 truncate">
                  {tab.tag}
                </span>
                <span className="text-slate-400 dark:text-slate-500 font-medium">
                  {tab.totalItems}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Render Active Skill Module with Smooth Transition */}
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


