import React from 'react';
import {
  LayoutDashboard,
  FileUp,
  Layers,
  FileCheck2,
  Mic2,
  Target,
  GraduationCap,
  BookOpenCheck,
  User,
  Sparkles,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ModuleId } from '../types';
import { getDueVocabCards, getDueMistakes } from '../services/srsScheduler';

interface NavItem {
  id: ModuleId;
  label: string;
  subLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeCount?: number;
}

export const Sidebar: React.FC = () => {
  const { activeModule, setActiveModule, vocabCards, mistakes, sources, setIsAITutorOpen } = useApp();

  const dueVocab = getDueVocabCards(vocabCards);
  const dueMistakes = getDueMistakes(mistakes);

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Trang chủ',
      subLabel: 'Tổng quan & Lộ trình',
      icon: LayoutDashboard,
    },
    {
      id: 'sources',
      label: 'Nguồn học liệu',
      subLabel: 'PDF, URL, Docs, Video',
      icon: FileUp,
      badgeCount: sources.length,
    },
    {
      id: 'vocabulary',
      label: 'Từ vựng (SRS)',
      subLabel: 'Spaced Repetition',
      icon: Layers,
      badgeCount: dueVocab.length > 0 ? dueVocab.length : undefined,
    },
    {
      id: 'grammar',
      label: 'Ngữ pháp',
      subLabel: 'Trọng điểm & Bẫy điểm',
      icon: FileCheck2,
    },
    {
      id: 'media',
      label: 'Media Lab',
      subLabel: 'Shadowing & Dictation',
      icon: Mic2,
    },
    {
      id: 'practice',
      label: 'Luyện tập IELTS',
      subLabel: 'Forecast Live & 4 Kỹ năng',
      icon: Target,
    },
    {
      id: 'mock_test',
      label: 'Thi thử IELTS',
      subLabel: 'Mini & Full Test',
      icon: GraduationCap,
    },
    {
      id: 'knowledge',
      label: 'Kiến thức IELTS',
      subLabel: 'Chiến thuật & Band Descriptors',
      icon: BookOpenCheck,
    },
  ];

  return (
    <aside
      id="desktop-sidebar"
      className="hidden md:flex flex-col w-64 lg:w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0 h-[calc(100vh-4rem)] sticky top-16 select-none justify-between p-3.5"
    >
      {/* Navigation Modules */}
      <div className="space-y-1.5 overflow-y-auto pr-1 custom-scrollbar">
        <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          7 Module Học Tập
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;

          return (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => setActiveModule(item.id)}
              className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-left transition-all group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25 font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`p-2 rounded-xl transition-colors ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/40'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate leading-tight flex items-center gap-1.5">
                    <span>{item.label}</span>
                  </div>
                  <div
                    className={`text-[11px] truncate ${
                      isActive ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {item.subLabel}
                  </div>
                </div>
              </div>

              {item.badgeCount !== undefined && item.badgeCount > 0 && (
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    isActive
                      ? 'bg-white text-blue-700'
                      : item.id === 'vocabulary'
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {item.badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Helper Widget */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
        {/* Quick Ask AI Prompt Banner */}
        <button
          id="sidebar-ask-ai-quick-btn"
          onClick={() => setIsAITutorOpen(true)}
          className="w-full p-3 rounded-2xl bg-slate-900 text-white dark:bg-slate-800 text-left hover:bg-slate-800 dark:hover:bg-slate-700 transition-all flex items-center justify-between group shadow-sm"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1">
                <span>Gia Sư AI IELTS</span>
              </div>
              <div className="text-[11px] text-slate-300">
                Hỏi đáp theo ngữ cảnh
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* Profile Link in Footer */}
        <button
          id="sidebar-profile-link"
          onClick={() => setActiveModule('profile')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeModule === 'profile'
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <User className="w-4 h-4 text-slate-400" />
          <span>Hồ Sơ & Cài Đặt Mục Tiêu</span>
        </button>
      </div>
    </aside>
  );
};
