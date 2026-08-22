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
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ModuleId } from '../types';
import { getDueVocabCards } from '../services/srsScheduler';

export const BottomNav: React.FC = () => {
  const { activeModule, setActiveModule, vocabCards } = useApp();
  const dueVocab = getDueVocabCards(vocabCards);

  const mobileNavItems: Array<{ id: ModuleId; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }> = [
    { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'sources', label: 'Học liệu', icon: FileUp },
    { id: 'vocabulary', label: 'Từ vựng', icon: Layers, badge: dueVocab.length > 0 ? dueVocab.length : undefined },
    { id: 'grammar', label: 'Ngữ pháp', icon: FileCheck2 },
    { id: 'media', label: 'Media', icon: Mic2 },
    { id: 'practice', label: 'Luyện tập', icon: Target },
    { id: 'mock_test', label: 'Thi thử', icon: GraduationCap },
    { id: 'knowledge', label: 'Kiến thức', icon: BookOpenCheck },
  ];

  return (
    <nav
      id="mobile-bottom-nav"
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 py-1 flex items-center justify-around overflow-x-auto"
    >
      {mobileNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeModule === item.id;

        return (
          <button
            key={item.id}
            id={`mobile-nav-${item.id}`}
            onClick={() => setActiveModule(item.id)}
            className={`relative flex flex-col items-center justify-center py-1 px-2 min-w-[56px] rounded-xl transition-colors ${
              isActive
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
