import React, { useEffect, useState } from 'react';
import {
  User,
  Target,
  Calendar,
  Clock,
  Flame,
  Award,
  TrendingUp,
  Compass,
  CheckCircle2,
  Edit3,
  Save,
  Zap,
  Moon,
  Sun,
  Palette,
  Sparkles,
  LogIn,
  LogOut,
  KeyRound,
  Cloud,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { calculateLevel } from '../services/gamification';
import { getSession, isSupabaseConfigured, signInWithGoogle, signOut, supabase, syncPrivateSnapshot } from '../services/supabase';

export const LearnerProfileView: React.FC = () => {
  const {
    profile,
    updateProfile,
    setIsOnboardingOpen,
    setIsDiagnosticOpen,
    mockResults,
    darkMode,
    toggleDarkMode,
    sources,
    vocabCards,
    mistakes,
    mediaSessions,
    practiceAttempts,
  } = useApp();

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [name, setName] = useState(profile.name);
  const [targetBand, setTargetBand] = useState(profile.targetBand);
  const [currentBand, setCurrentBand] = useState(profile.currentBand);
  const [examDate, setExamDate] = useState(profile.examDate);
  const [dailyMinutes, setDailyMinutes] = useState(profile.dailyStudyMinutes);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [geminiKey, setGeminiKey] = useState('');
  const [hasSessionKey, setHasSessionKey] = useState(() => Boolean(sessionStorage.getItem('omni_gemini_api_key')));
  const [dataStatus, setDataStatus] = useState<string>('');

  useEffect(() => {
    void getSession().then((session) => setAuthEmail(session?.user.email || null)).catch(() => undefined);
    const subscription = supabase?.auth.onAuthStateChange((_event, session) => setAuthEmail(session?.user.email || null));
    return () => subscription?.data.subscription.unsubscribe();
  }, []);

  const saveGeminiKeyForSession = () => {
    const value = geminiKey.trim();
    if (!value) return;
    sessionStorage.setItem('omni_gemini_api_key', value);
    setGeminiKey('');
    setHasSessionKey(true);
    setDataStatus('Đã lưu Gemini API key trong tab hiện tại; key không được ghi vào localStorage/Supabase.');
  };

  const handleSync = async () => {
    setDataStatus('Đang đồng bộ dữ liệu riêng tư...');
    try {
      await syncPrivateSnapshot({ profile, sources, vocabCards, mistakes, mediaSessions, practiceAttempts, mockResults });
      setDataStatus(`Đồng bộ thành công lúc ${new Date().toLocaleTimeString()}.`);
    } catch (error: any) {
      setDataStatus(error?.message || 'Đồng bộ thất bại.');
    }
  };

  const { level, currentLevelXP, nextLevelXP, progressPercent } = calculateLevel(profile.xp);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name,
      targetBand: Number(targetBand),
      currentBand: Number(currentBand),
      examDate,
      dailyStudyMinutes: Number(dailyMinutes),
    });
    setIsEditing(false);
  };

  // Calculate days left
  const examDateObj = new Date(profile.examDate);
  const today = new Date();
  const diffTime = examDateObj.getTime() - today.getTime();
  const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  return (
    <div id="learner-profile-view" className="space-y-6 animate-fadeIn max-w-4xl mx-auto">
      {/* Profile Card Header */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-md shadow-blue-600/20">
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt={profile.name}
                referrerPolicy="no-referrer"
                className="w-full h-full rounded-2xl object-cover"
              />
            ) : (
              profile.name.charAt(0)
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{profile.name}</h1>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/50">
                Lv.{level} Thí Sinh IELTS
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              Mục tiêu bứt phá <strong>Band {profile.targetBand.toFixed(1)}</strong> • Kỳ thi: {profile.examDate}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsDiagnosticOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Compass className="w-4 h-4 text-sky-200" />
            <span>Chẩn Đoán 8 Trục (gemini-3.1-pro)</span>
          </button>
          <button
            onClick={() => setIsOnboardingOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200/80 dark:border-blue-800/60 hover:bg-blue-100 cursor-pointer"
          >
            <Compass className="w-4 h-4" />
            <span>Test Nhanh</span>
          </button>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold hover:bg-slate-800 cursor-pointer border border-slate-700"
          >
            <Edit3 className="w-4 h-4" />
            <span>{isEditing ? 'Đóng Chỉnh Sửa' : 'Chỉnh Sửa'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-blue-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Google OAuth & đồng bộ riêng tư</h2>
              <p className="text-[11px] text-slate-500">Supabase RLS chỉ cho chính tài khoản đọc/ghi snapshot và artifacts.</p>
            </div>
          </div>
          {!isSupabaseConfigured ? (
            <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">Cần điền VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY để bật đăng nhập Google.</p>
          ) : authEmail ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">{authEmail}</span>
              <button type="button" onClick={() => void handleSync()} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white">Đồng bộ ngay</button>
              <button type="button" onClick={() => void signOut()} className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold dark:border-slate-700"><LogOut className="h-3.5 w-3.5" /> Đăng xuất</button>
            </div>
          ) : (
            <button type="button" onClick={() => void signInWithGoogle()} className="flex w-fit items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white dark:bg-blue-600"><LogIn className="h-4 w-4" /> Đăng nhập bằng Google</button>
          )}
        </section>

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-violet-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Gemini BYOK</h2>
              <p className="text-[11px] text-slate-500">Chỉ giữ trong sessionStorage của tab; không đồng bộ key.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <input type="password" autoComplete="off" value={geminiKey} onChange={(event) => setGeminiKey(event.target.value)} placeholder={hasSessionKey ? 'Đã có key cho phiên này' : 'Dán Gemini API key'} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950" />
            <button type="button" onClick={saveGeminiKeyForSession} disabled={!geminiKey.trim()} className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">Lưu phiên</button>
            {hasSessionKey && <button type="button" onClick={() => { sessionStorage.removeItem('omni_gemini_api_key'); setHasSessionKey(false); }} className="rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-700">Xóa</button>}
          </div>
        </section>
      </div>

      {dataStatus && <div role="status" className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">{dataStatus}</div>}

      {/* EDIT PROFILE FORM */}
      {isEditing && (
        <form
          onSubmit={handleSave}
          className="p-6 rounded-3xl bg-blue-50/60 dark:bg-slate-900/80 border border-blue-200 dark:border-blue-900/60 space-y-4 animate-fadeIn"
        >
          <h2 className="text-sm font-bold text-blue-900 dark:text-blue-200">
            Cập Nhật Thông Tin Học Tập & Mục Tiêu
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tên của bạn:
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Ngày thi dự kiến:
              </label>
              <input
                type="date"
                required
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Band hiện tại:
              </label>
              <input
                type="number"
                step="0.5"
                min="3.0"
                max="9.0"
                value={currentBand}
                onChange={(e) => setCurrentBand(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Band mục tiêu:
              </label>
              <input
                type="number"
                step="0.5"
                min="4.0"
                max="9.0"
                value={targetBand}
                onChange={(e) => setTargetBand(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Thời gian học mỗi ngày (phút):
              </label>
              <input
                type="number"
                min="15"
                max="240"
                value={dailyMinutes}
                onChange={(e) => setDailyMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 cursor-pointer"
            >
              Lưu Thay Đổi
            </button>
          </div>
        </form>
      )}

      {/* THEME & DISPLAY SETTINGS CARD (Practice Izone Aesthetic) */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Giao Diện & Chế Độ Màu (Practice Izone Theme)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lựa chọn chế độ hiển thị tối ưu cho môi trường làm bài thi và luyện tập
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            {darkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          {/* Light Mode Option */}
          <button
            type="button"
            onClick={() => {
              if (darkMode) toggleDarkMode();
            }}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
              !darkMode
                ? 'border-blue-600 bg-blue-50/50 dark:bg-slate-800 ring-2 ring-blue-600/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <Sun className="w-5 h-5 fill-amber-500 text-amber-500" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Giao diện Sáng (Izone Light)</span>
                {!darkMode && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Màu trắng slate tinh khôi, độ tương phản cao, lý tưởng cho phòng học sáng và đọc tài liệu PDF.
              </p>
            </div>
          </button>

          {/* Dark Mode Option */}
          <button
            type="button"
            onClick={() => {
              if (!darkMode) toggleDarkMode();
            }}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
              darkMode
                ? 'border-blue-500 bg-blue-950/40 ring-2 ring-blue-500/25'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-950 text-indigo-300 flex items-center justify-center shrink-0 border border-indigo-800">
              <Moon className="w-5 h-5 fill-indigo-400 text-indigo-400" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Giao diện Tối (Izone Dark / Midnight)</span>
                {darkMode && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tông xanh đen Navy sâu thẳm, êm dịu cho mắt khi làm Full Test ban đêm, tăng sự tập trung cao độ.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* STATS TILES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-1">
          <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/50 text-orange-600 flex items-center justify-center mx-auto">
            <Flame className="w-4 h-4 fill-orange-500 text-orange-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-slate-100">{profile.streak} Ngày</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Chuỗi Học Liên Tiếp</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-1">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center mx-auto">
            <Zap className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-slate-100">{profile.xp} XP</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Cấp Độ Lv.{level}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-1">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center mx-auto">
            <Calendar className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-slate-100">{daysLeft} Ngày</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Đến Ngày Thi</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-1">
          <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 flex items-center justify-center mx-auto">
            <Clock className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-slate-100">
            {profile.dailyStudyMinutes} Phút
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Mục Tiêu / Ngày</div>
        </div>
      </div>

      {/* 4 SKILLS RADAR / BAR METRICS */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          <span>Biểu Đồ Năng Lực 4 Kỹ Năng IELTS Hiện Tại</span>
        </h2>

        <div className="space-y-3">
          {[
            { name: 'Listening', current: profile.skillBands.listening, target: profile.targetBand, color: 'bg-sky-500' },
            { name: 'Reading', current: profile.skillBands.reading, target: profile.targetBand, color: 'bg-emerald-500' },
            { name: 'Writing', current: profile.skillBands.writing, target: profile.targetBand, color: 'bg-amber-500' },
            { name: 'Speaking', current: profile.skillBands.speaking, target: profile.targetBand, color: 'bg-blue-600' },
          ].map((skill) => {
            const percent = Math.min(100, (skill.current / 9.0) * 100);

            return (
              <div key={skill.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-800 dark:text-slate-200">{skill.name}</span>
                  <span className="text-slate-600 dark:text-slate-400">
                    Hiện tại: <strong className="text-slate-900 dark:text-slate-100">Band {skill.current.toFixed(1)}</strong> / Mục tiêu: {skill.target.toFixed(1)}
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                  {/* Current progress */}
                  <div
                    className={`h-full ${skill.color} rounded-full transition-all duration-500`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* BADGES & ACHIEVEMENTS */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-500" />
          <span>Huy Hiệu Đã Mở Khóa ({profile.badges.length})</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {profile.badges.map((badge) => (
            <div
              key={badge.id}
              className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-800 text-center space-y-1.5"
            >
              <span className="text-2xl block">{badge.icon}</span>
              <div className="font-bold text-xs text-slate-900 dark:text-slate-100">{badge.title}</div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2">{badge.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
