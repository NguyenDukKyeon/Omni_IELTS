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
} from 'lucide-react';
import { SkillType } from '../types';
import { useApp } from '../context/AppContext';
import { ReadingQuestionModule } from '../components/practice/ReadingQuestionModule';
import { ListeningQuestionModule } from '../components/practice/ListeningQuestionModule';
import { WritingQuestionModule } from '../components/practice/WritingQuestionModule';
import { SpeakingQuestionModule } from '../components/practice/SpeakingQuestionModule';

export const IELTSPracticeView: React.FC = () => {
  const { mistakes, openAITutorWithPrompt } = useApp();
  const [activeSkill, setActiveSkill] = useState<SkillType>('reading');

  // Count mistake items per skill
  const skillMistakesCount = {
    reading: mistakes.filter((m) => m.skill === 'reading').length,
    listening: mistakes.filter((m) => m.skill === 'listening').length,
    writing: mistakes.filter((m) => m.skill === 'writing').length,
    speaking: mistakes.filter((m) => m.skill === 'speaking').length,
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
              Chuyên sâu từng dạng câu hỏi IELTS
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Luyện Tập IELTS Theo Từng Dạng Bài Chuẩn Cambridge
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Học có chủ đích với đề bài sinh bởi AI không giới hạn. Mọi bẫy câu hỏi và lỗi sai khi làm bài
            sẽ được tự động đồng bộ vào <strong>Sổ tay lỗi sai (Mistake Notebook)</strong> để tối ưu điểm số.
          </p>
        </div>

        {/* Quick Review Action */}
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              openAITutorWithPrompt(
                'Hãy kiểm tra lại các bẫy thường gặp nhất trong kỳ thi IELTS ở cả 4 kỹ năng (Reading, Listening, Writing, Speaking) và cho tôi 5 mẹo khắc phục quan trọng nhất.'
              )
            }
            className="px-4 py-2.5 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-bold flex items-center gap-2 border border-indigo-400/40 shadow-sm transition-all whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Chiến thuật bẻ bẫy cùng AI Tutor</span>
          </button>
        </div>
      </div>

      {/* 4 Skill Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            id: 'reading',
            title: 'IELTS Reading',
            subtitle: '6 dạng câu hỏi học thuật',
            icon: BookOpen,
            color: 'indigo',
            badge: 'Headings, TFNG, Matching...',
          },
          {
            id: 'listening',
            title: 'IELTS Listening',
            subtitle: '4 dạng bài kèm audio & bản đồ',
            icon: Headphones,
            color: 'sky',
            badge: 'Form, Maps, Distractors...',
          },
          {
            id: 'writing',
            title: 'IELTS Writing',
            subtitle: 'Task 1 & Task 2 (Chấm 4 tiêu chí)',
            icon: PenTool,
            color: 'amber',
            badge: 'TR, CC, LR, GRA Rubric',
          },
          {
            id: 'speaking',
            title: 'IELTS Speaking',
            subtitle: 'Part 1, 2 (1m prep) & Part 3',
            icon: Mic,
            color: 'rose',
            badge: 'Voice Examiner & 4 Criteria',
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSkill === tab.id;
          const mistakeCount = skillMistakesCount[tab.id as keyof typeof skillMistakesCount];

          return (
            <button
              key={tab.id}
              onClick={() => setActiveSkill(tab.id as SkillType)}
              className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                isActive
                  ? 'border-indigo-600 bg-white dark:bg-slate-800 shadow-md ring-2 ring-indigo-500/20'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-800/80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  {mistakeCount > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 flex items-center gap-1">
                      <BookMarked className="w-3 h-3" /> {mistakeCount} lỗi
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">{tab.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{tab.subtitle}</p>
              </div>

              <span className="mt-3 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 truncate">
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Render Active Skill Module */}
      <div className="transition-all duration-300">
        {activeSkill === 'reading' && <ReadingQuestionModule />}
        {activeSkill === 'listening' && <ListeningQuestionModule />}
        {activeSkill === 'writing' && <WritingQuestionModule />}
        {activeSkill === 'speaking' && <SpeakingQuestionModule />}
      </div>
    </div>
  );
};
