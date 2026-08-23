import React, { useState } from 'react';
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
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { calculateLevel } from '../services/gamification';

export const LearnerProfileView: React.FC = () => {
  const { profile, updateProfile, setIsOnboardingOpen, setIsDiagnosticOpen, mockResults } = useApp();

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [name, setName] = useState(profile.name);
  const [targetBand, setTargetBand] = useState(profile.targetBand);
  const [currentBand, setCurrentBand] = useState(profile.currentBand);
  const [examDate, setExamDate] = useState(profile.examDate);
  const [dailyMinutes, setDailyMinutes] = useState(profile.dailyStudyMinutes);

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
      <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white text-2xl font-black shadow-md shadow-indigo-600/20">
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
              <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">{profile.name}</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                Lv.{level} Thí Sinh IELTS
              </span>
            </div>
            <p className="text-xs text-stone-700 dark:text-stone-300 mt-0.5">
              Mục tiêu bứt phá <strong>Band {profile.targetBand.toFixed(1)}</strong> • Kỳ thi: {profile.examDate}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsDiagnosticOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all"
          >
            <Compass className="w-4 h-4 text-sky-200" />
            <span>Chẩn Đoán 8 Trục (gemini-3.1-pro)</span>
          </button>
          <button
            onClick={() => setIsOnboardingOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100"
          >
            <Compass className="w-4 h-4" />
            <span>Test Nhanh</span>
          </button>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 dark:bg-stone-700 text-white text-xs font-bold hover:bg-stone-800"
          >
            <Edit3 className="w-4 h-4" />
            <span>{isEditing ? 'Đóng Chỉnh Sửa' : 'Chỉnh Sửa'}</span>
          </button>
        </div>
      </div>

      {/* EDIT PROFILE FORM */}
      {isEditing && (
        <form
          onSubmit={handleSave}
          className="p-6 rounded-3xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 space-y-4 animate-fadeIn"
        >
          <h2 className="text-sm font-bold text-indigo-900 dark:text-indigo-200">
            Cập Nhật Thông Tin Học Tập & Mục Tiêu
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Tên của bạn:
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs sm:text-sm text-stone-900 dark:text-stone-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Ngày thi dự kiến:
              </label>
              <input
                type="date"
                required
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs sm:text-sm text-stone-900 dark:text-stone-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Band hiện tại:
              </label>
              <input
                type="number"
                step="0.5"
                min="3.0"
                max="9.0"
                value={currentBand}
                onChange={(e) => setCurrentBand(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs sm:text-sm text-stone-900 dark:text-stone-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Band mục tiêu:
              </label>
              <input
                type="number"
                step="0.5"
                min="4.0"
                max="9.0"
                value={targetBand}
                onChange={(e) => setTargetBand(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs sm:text-sm text-stone-900 dark:text-stone-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Thời gian học mỗi ngày (phút):
              </label>
              <input
                type="number"
                min="15"
                max="240"
                value={dailyMinutes}
                onChange={(e) => setDailyMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs sm:text-sm text-stone-900 dark:text-stone-100"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-700 dark:text-stone-300"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20"
            >
              Lưu Thay Đổi
            </button>
          </div>
        </form>
      )}

      {/* STATS TILES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-center space-y-1">
          <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/50 text-orange-600 flex items-center justify-center mx-auto">
            <Flame className="w-4 h-4 fill-orange-500 text-orange-500" />
          </div>
          <div className="text-xl font-black text-stone-900 dark:text-stone-100">{profile.streak} Ngày</div>
          <div className="text-[11px] text-stone-700 dark:text-stone-300 font-medium">Chuỗi Học Liên Tiếp</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-center space-y-1">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center mx-auto">
            <Zap className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-stone-900 dark:text-stone-100">{profile.xp} XP</div>
          <div className="text-[11px] text-stone-700 dark:text-stone-300 font-medium">Cấp Độ Lv.{level}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-center space-y-1">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center mx-auto">
            <Calendar className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-black text-stone-900 dark:text-stone-100">{daysLeft} Ngày</div>
          <div className="text-[11px] text-stone-700 dark:text-stone-300 font-medium">Đến Ngày Thi</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-center space-y-1">
          <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 flex items-center justify-center mx-auto">
            <Clock className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-xl font-black text-stone-900 dark:text-stone-100">
            {profile.dailyStudyMinutes} Phút
          </div>
          <div className="text-[11px] text-stone-700 dark:text-stone-300 font-medium">Mục Tiêu / Ngày</div>
        </div>
      </div>

      {/* 4 SKILLS RADAR / BAR METRICS */}
      <div className="p-6 rounded-3xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-4 shadow-sm">
        <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-600" />
          <span>Biểu Đồ Năng Lực 4 Kỹ Năng IELTS Hiện Tại</span>
        </h2>

        <div className="space-y-3">
          {[
            { name: 'Listening', current: profile.skillBands.listening, target: profile.targetBand, color: 'bg-sky-500' },
            { name: 'Reading', current: profile.skillBands.reading, target: profile.targetBand, color: 'bg-emerald-500' },
            { name: 'Writing', current: profile.skillBands.writing, target: profile.targetBand, color: 'bg-amber-500' },
            { name: 'Speaking', current: profile.skillBands.speaking, target: profile.targetBand, color: 'bg-indigo-500' },
          ].map((skill) => {
            const percent = Math.min(100, (skill.current / 9.0) * 100);
            const targetPercent = Math.min(100, (skill.target / 9.0) * 100);

            return (
              <div key={skill.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-stone-800 dark:text-stone-200">{skill.name}</span>
                  <span>
                    Hiện tại: <strong>Band {skill.current.toFixed(1)}</strong> / Mục tiêu: {skill.target.toFixed(1)}
                  </span>
                </div>
                <div className="w-full h-3 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden relative">
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
      <div className="p-6 rounded-3xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-4 shadow-sm">
        <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-500" />
          <span>Huy Hiệu Đã Mở Khóa ({profile.badges.length})</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {profile.badges.map((badge) => (
            <div
              key={badge.id}
              className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-700/80 text-center space-y-1.5"
            >
              <span className="text-2xl block">{badge.icon}</span>
              <div className="font-bold text-xs text-stone-900 dark:text-stone-100">{badge.title}</div>
              <p className="text-[10px] text-stone-700 dark:text-stone-300 line-clamp-2">{badge.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
