import React, { useState } from 'react';
import {
  AlertTriangle,
  Flame,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Sparkles,
  Search,
  BookOpen,
  Headphones,
  FileText,
  Lock,
  Eye,
  Key,
} from 'lucide-react';
import { COMMON_PITFALLS_DATA } from '../../data/ieltsKnowledgeData';
import { CommonPitfallTrap } from '../../types';
import { InLessonAIInquirer } from './InLessonAIInquirer';
import { useApp } from '../../context/AppContext';

export const CommonPitfallsViewer: React.FC = () => {
  const { awardXP } = useApp();
  const [skillFilter, setSkillFilter] = useState<'all' | 'listening' | 'reading' | 'writing' | 'speaking'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [masteredTraps, setMasteredTraps] = useState<Record<string, boolean>>({});

  const filteredTraps = COMMON_PITFALLS_DATA.filter((trap) => {
    const matchesSkill = skillFilter === 'all' || trap.skill === skillFilter;
    const matchesQuery =
      searchQuery.trim() === '' ||
      trap.trapTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trap.howTrapWorks.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trap.highBandSolution.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSkill && matchesQuery;
  });

  const toggleMastered = (id: string, title: string) => {
    setMasteredTraps((prev) => {
      const next = !prev[id];
      if (next) {
        awardXP(10, `Ghi nhớ bí quyết khắc phục bẫy: ${title.slice(0, 30)}...`);
      }
      return { ...prev, [id]: next };
    });
  };

  const getDangerBadge = (level: string) => {
    switch (level) {
      case 'critical':
        return {
          label: 'Mức Độ Nguy Hiểm: CỰC KỲ CAO',
          bg: 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800',
        };
      case 'high':
        return {
          label: 'Mức Độ Nguy Hiểm: CAO',
          bg: 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800',
        };
      default:
        return {
          label: 'Mức Độ Nguy Hiểm: TRUNG BÌNH',
          bg: 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800',
        };
    }
  };

  return (
    <div id="common-pitfalls-viewer" className="space-y-8 animate-fadeIn">
      {/* Header with Search and Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input data-ux-flow="knowledge.learn"
            type="text"
            placeholder="Tìm kiếm bẫy khảo thí, lỗi sai hay gặp..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-xs"
          />
        </div>

        {/* Skill Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs font-semibold">
          <button data-ux-flow="knowledge.learn"
            onClick={() => setSkillFilter('all')}
            className={`px-3 py-2 rounded-xl transition-all cursor-pointer ${
              skillFilter === 'all'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
            }`}
          >
            Tất cả bẫy ({COMMON_PITFALLS_DATA.length})
          </button>
          <button data-ux-flow="knowledge.learn"
            onClick={() => setSkillFilter('listening')}
            className={`px-3 py-2 rounded-xl transition-all cursor-pointer ${
              skillFilter === 'listening'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
            }`}
          >
            Listening
          </button>
          <button data-ux-flow="knowledge.learn"
            onClick={() => setSkillFilter('reading')}
            className={`px-3 py-2 rounded-xl transition-all cursor-pointer ${
              skillFilter === 'reading'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
            }`}
          >
            Reading
          </button>
          <button data-ux-flow="knowledge.learn"
            onClick={() => setSkillFilter('writing')}
            className={`px-3 py-2 rounded-xl transition-all cursor-pointer ${
              skillFilter === 'writing'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
            }`}
          >
            Writing
          </button>
          <button data-ux-flow="knowledge.learn"
            onClick={() => setSkillFilter('speaking')}
            className={`px-3 py-2 rounded-xl transition-all cursor-pointer ${
              skillFilter === 'speaking'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
            }`}
          >
            Speaking
          </button>
        </div>
      </div>

      {/* Traps List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredTraps.map((trap) => {
          const isMastered = !!masteredTraps[trap.id];
          const badge = getDangerBadge(trap.dangerLevel);

          return (
            <div
              key={trap.id}
              className={`p-6 rounded-3xl bg-white dark:bg-slate-900 border transition-all space-y-5 flex flex-col justify-between ${
                isMastered
                  ? 'border-emerald-500/80 bg-emerald-50/20 dark:bg-emerald-950/10 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="space-y-4">
                {/* Badges row */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg border ${badge.bg}`}
                  >
                    {badge.label}
                  </span>

                  <span className="text-xs font-mono font-extrabold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded-md">
                    Hậu quả: {trap.impactBand}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Tần suất: {trap.frequency}
                  </span>
                  <h3 className="text-base font-black text-slate-900 dark:text-white leading-snug">
                    {trap.trapTitle}
                  </h3>
                </div>

                {/* How trap works */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 text-xs text-slate-700 dark:text-slate-300 leading-relaxed border border-slate-200/80 dark:border-slate-800">
                  <strong className="text-slate-900 dark:text-white block mb-1">
                    Cơ chế bẫy của Hội đồng thi:
                  </strong>
                  {trap.howTrapWorks}
                </div>

                {/* Comparison Box: Risky Example vs High-Band Solution */}
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/60 space-y-1">
                    <strong className="text-rose-900 dark:text-rose-300 flex items-center gap-1.5 font-bold">
                      <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>Lỗi sai thực tế phổ biến:</span>
                    </strong>
                    <p className="text-rose-950 dark:text-rose-200 font-mono text-[11px]">
                      {trap.riskyExample}
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 space-y-1">
                    <strong className="text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Giải pháp phá bẫy Band 8.0+:</span>
                    </strong>
                    <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                      {trap.highBandSolution}
                    </p>
                  </div>
                </div>

                {/* Secret Examiner Insight */}
                <div className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/70 dark:border-purple-900/60 text-xs text-purple-950 dark:text-purple-200 leading-relaxed flex items-start gap-2">
                  <Key className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <strong>Bí mật từ Giám khảo:</strong> {trap.examinerSecretInsight}
                  </div>
                </div>
              </div>

              {/* Mastered Toggle Footer */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  {isMastered ? 'Đã ghi nhớ bí quyết' : 'Cần chú ý khi luyện tập'}
                </span>
                <button data-ux-flow="knowledge.learn"
                  onClick={() => toggleMastered(trap.id, trap.trapTitle)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isMastered
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isMastered ? 'Đã Thành Thạo' : 'Đánh Dấu Đã Nắm Rõ'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Embedded Ask AI in Pitfalls */}
      <InLessonAIInquirer
        contextTopicTitle="Bẫy và Lỗi Sai Thường Gặp Trong Bài Thi IELTS"
        contextSkill="Tổng quan 4 kỹ năng"
        quickPrompts={[
          'Làm sao để không bao giờ lỡ âm đuôi "s" trong Listening?',
          'Cách nhận diện nhanh bẫy Not Given trong bài thi thật',
          'Làm thế nào để viết Overview Task 1 mà không bị lẫn số liệu?',
        ]}
      />
    </div>
  );
};
