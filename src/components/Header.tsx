import React from 'react';
import {
  Sparkles,
  Flame,
  Zap,
  Moon,
  Sun,
  AlertTriangle,
  User,
  Compass,
  Calendar,
  BookOpen,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { calculateLevel } from '../services/gamification';
import { getDueMistakes } from '../services/srsScheduler';

export const Header: React.FC = () => {
  const {
    profile,
    darkMode,
    toggleDarkMode,
    mistakes,
    setIsMistakeNotebookOpen,
    activeModule,
    setActiveModule,
    setIsOnboardingOpen,
  } = useApp();

  const dueMistakes = getDueMistakes(mistakes);
  const { level, currentLevelXP, nextLevelXP, progressPercent } = calculateLevel(profile.xp);

  // Calculate days left to exam
  const examDateObj = new Date(profile.examDate);
  const today = new Date();
  const diffTime = examDateObj.getTime() - today.getTime();
  const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  return (
    <header
      id="app-header"
      className="sticky top-0 z-30 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md transition-colors duration-200"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <button data-ux-flow="app.navigation"
            id="brand-home-btn"
            onClick={() => setActiveModule('dashboard')}
            className="flex items-center gap-3 text-left group focus:outline-none"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm shadow-blue-500/20 group-hover:scale-105 transition-transform">
              Ω
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-slate-100 font-sans">
                  Omni IELTS
                </span>
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/40">
                  Bento AI
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                Lộ trình cá nhân hóa từ mọi nguồn học liệu
              </p>
            </div>
          </button>
        </div>

        {/* Center Target & Countdown Pill */}
        <div className="hidden md:flex items-center gap-3 bg-slate-100/80 dark:bg-slate-800/80 px-4 py-1.5 rounded-full border border-slate-200/80 dark:border-slate-700/80">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
            <span>Band Goal:</span>
            <span className="font-extrabold text-blue-600 dark:text-blue-400 text-sm">
              {profile.targetBand.toFixed(1)}
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              Current: {profile.currentBand.toFixed(1)}
            </span>
          </div>
          <span className="w-1 h-3.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <Calendar className="w-3.5 h-3.5 text-amber-500" />
            <span>Còn <strong className="text-slate-800 dark:text-slate-200">{daysLeft}</strong> ngày thi</span>
          </div>
        </div>

        {/* Right Stats & Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Placement Diagnostic Trigger */}
          <button data-ux-flow="app.navigation"
            id="header-diagnostic-btn"
            onClick={() => setIsOnboardingOpen(true)}
            className="hidden lg:flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl text-blue-700 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            title="Kiểm tra trình độ đầu vào chẩn đoán nhanh"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Test chẩn đoán</span>
          </button>

          {/* Sổ tay lỗi sai Badge Button */}
          <button data-ux-flow="app.navigation"
            id="header-mistakes-btn"
            onClick={() => setIsMistakeNotebookOpen(true)}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 transition-colors"
            title="Mở Sổ tay lỗi sai hợp nhất"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            <span className="hidden sm:inline">Error Journal</span>
            {dueMistakes.length > 0 && (
              <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-rose-500 rounded-full animate-pulse">
                {dueMistakes.length}
              </span>
            )}
          </button>

          {/* Streak Counter */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 text-xs font-bold"
            title={`Chuỗi học tập liên tiếp: ${profile.streak} ngày`}
          >
            <Flame className="w-4 h-4 fill-orange-500 text-orange-500" />
            <span>{profile.streak}d</span>
          </div>

          {/* XP & Level */}
          <div
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
            title={`Cấp độ ${level} (${currentLevelXP}/${nextLevelXP} XP để lên cấp)`}
          >
            <Zap className="w-3.5 h-3.5 fill-blue-500 text-blue-500" />
            <span>Lv.{level}</span>
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Dark Mode Toggle with Practice Izone Pill Switcher */}
          <button data-ux-flow="app.navigation"
            id="darkmode-toggle-btn"
            onClick={toggleDarkMode}
            className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-white dark:hover:bg-slate-750 transition-all cursor-pointer shadow-xs group"
            title={darkMode ? 'Chuyển sang Giao diện Sáng (Izone Light)' : 'Chuyển sang Giao diện Tối (Izone Dark / Midnight)'}
            aria-label="Toggle theme"
          >
            <div className="w-5 h-5 rounded-lg flex items-center justify-center bg-white dark:bg-slate-700 text-amber-500 dark:text-amber-300 shadow-xs group-hover:scale-105 transition-transform">
              {darkMode ? <Moon className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> : <Sun className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />}
            </div>
            <span className="text-[11px] font-semibold hidden md:inline text-slate-600 dark:text-slate-300">
              {darkMode ? 'Dark' : 'Light'}
            </span>
          </button>

          {/* Profile Quick Button */}
          <button data-ux-flow="app.navigation"
            id="profile-nav-btn"
            onClick={() => setActiveModule('profile')}
            className={`flex items-center gap-2 p-1.5 rounded-xl border transition-all ${
              activeModule === 'profile'
                ? 'border-blue-600 ring-2 ring-blue-600/20 bg-blue-50 dark:bg-blue-950/50'
                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Hồ sơ học tập của bạn"
          >
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt={profile.name}
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-lg object-cover"
              />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-xs">
                {profile.name ? profile.name.charAt(0).toUpperCase() : 'A'}
              </div>
            )}
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 hidden xl:block max-w-[100px] truncate">
              {profile.name}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
