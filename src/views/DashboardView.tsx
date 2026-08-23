import React from 'react';
import {
  TrendingUp,
  Layers,
  AlertTriangle,
  Flame,
  FileUp,
  Target,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Clock,
  Award,
  CheckCircle2,
  Calendar,
  Zap,
  Mic2,
  BookOpen,
  ArrowUpRight,
  Compass,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getDueVocabCards, getDueMistakes } from '../services/srsScheduler';
import { calculateLevel } from '../services/gamification';

export const DashboardView: React.FC = () => {
  const {
    profile,
    vocabCards,
    mistakes,
    sources,
    mockResults,
    setActiveModule,
    setIsMistakeNotebookOpen,
    setIsOnboardingOpen,
    setIsDiagnosticOpen,
    openAITutorWithPrompt,
  } = useApp();

  const dueVocab = getDueVocabCards(vocabCards);
  const dueMistakes = getDueMistakes(mistakes);
  const { level, progressPercent } = calculateLevel(profile.xp);

  // Calculate target exam countdown
  const examDateObj = new Date(profile.examDate);
  const today = new Date();
  const diffTime = examDateObj.getTime() - today.getTime();
  const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  return (
    <div id="dashboard-view" className="space-y-6 animate-fadeIn">
      {/* ========================================================================= */}
      {/* PRIMARY BENTO GRID LAYER 1 */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-12 gap-5">
        {/* Bento Cell 1: Welcome & AI Trajectory (8 cols on large) */}
        <div className="col-span-12 lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-blue-50 dark:bg-blue-950/30 rounded-full blur-2xl pointer-events-none" />

          <div className="space-y-3 relative z-10">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/50 dark:border-blue-800/40 text-xs font-semibold text-blue-700 dark:text-blue-300">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Omni IELTS Personalized Engine</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                <span>Còn <strong className="text-slate-800 dark:text-slate-200">{daysLeft} ngày</strong> thi</span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 font-sans">
              Chào {profile.name}, cùng bứt phá Band {profile.targetBand.toFixed(1)}!
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
              Bạn đang ở <strong>Band {profile.currentBand.toFixed(1)}</strong>. Hệ thống đã chuẩn bị bài ôn tập ngắt quãng (SRS) và các lỗi sai cần củng cố hôm nay từ các nguồn học liệu của bạn.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsDiagnosticOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <Compass className="w-4 h-4 text-sky-200" />
                <span>Chẩn Đoán 8 Trục Psychometrician (gemini-3.1-pro)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 4 Skill Mini Breakdown inside Bento Cell */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase">Listening</span>
              <span className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">Band {profile.skillBands.listening.toFixed(1)}</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase">Reading</span>
              <span className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">Band {profile.skillBands.reading.toFixed(1)}</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase">Writing</span>
              <span className="text-base font-bold text-blue-600 dark:text-blue-400 mt-1">Band {profile.skillBands.writing.toFixed(1)}</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase">Speaking</span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1">Band {profile.skillBands.speaking.toFixed(1)}</span>
            </div>
          </div>
        </div>

        {/* Bento Cell 2: Streak & Band Trajectory Card (4 cols on large, royal blue) */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-4 bg-blue-600 dark:bg-blue-700 text-white rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
          {/* Flame Watermark Icon */}
          <Flame className="absolute -bottom-6 -right-6 w-36 h-36 text-white/10 pointer-events-none group-hover:scale-110 transition-transform duration-500" />

          <div className="space-y-4 relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold tracking-wider text-blue-100 bg-white/15 px-3 py-1 rounded-full border border-white/20">
                Chuỗi học tập
              </span>
              <div className="flex items-center gap-1 text-xs font-bold bg-white/20 px-2.5 py-1 rounded-full">
                <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                <span>Lv.{level}</span>
              </div>
            </div>

            <div>
              <div className="text-4xl sm:text-5xl font-black tracking-tight flex items-baseline gap-2">
                <span>{profile.streak}</span>
                <span className="text-xl font-bold text-blue-200">ngày</span>
              </div>
              <p className="text-xs text-blue-100 mt-1">
                Duy trì đều đặn để kích hoạt bộ nhớ dài hạn!
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/20 relative z-10 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-blue-100">
              <span>Tiến độ Band</span>
              <span className="text-white font-bold">{profile.currentBand.toFixed(1)} ➔ {profile.targetBand.toFixed(1)}</span>
            </div>
            <div className="w-full h-2 bg-blue-900/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (profile.currentBand / profile.targetBand) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BENTO GRID LAYER 2: TODAY'S PRIORITY DRILLS (3 Modular Cards) */}
      {/* ========================================================================= */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Việc Cần Ôn Hôm Nay ({dueVocab.length + dueMistakes.length + 1} Nhiệm vụ)</span>
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Đã học: <strong className="text-slate-800 dark:text-slate-200">{profile.todayMinutesSpent}</strong>/{profile.dailyStudyMinutes} phút
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Bento Cell 3: Spaced Repetition Vocab */}
          <div
            id="today-task-vocab"
            onClick={() => setActiveModule('vocabulary')}
            className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/50 dark:border-amber-800/40">
                  <Layers className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
                  SRS Đến Hạn
                </span>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Ôn tập {dueVocab.length} Thẻ Từ Vựng
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                  Thuật toán Leitner/SM-2 đã xếp lịch ôn để củng cố các từ vựng C1 vừa trích xuất vào trí nhớ dài hạn.
                </p>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-amber-600 dark:text-amber-400">
              <span>Bắt đầu ôn (5 phút)</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Bento Cell 4: Sổ Tay Lỗi Sai */}
          <div
            id="today-task-mistakes"
            onClick={() => setIsMistakeNotebookOpen(true)}
            className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-rose-400 dark:hover:border-rose-600 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200/50 dark:border-rose-800/40">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60">
                  Sổ Tay Lỗi Sai
                </span>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                  Khắc phục {dueMistakes.length} Lỗi Sai
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                  Lỗi ngữ pháp & collocation từ bài viết/nói gần nhất. Làm lại để chấm dứt thói quen sai lặp lại.
                </p>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-rose-600 dark:text-rose-400">
              <span>Mở Sổ tay ôn tập</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Bento Cell 5: Media Lab Shadowing */}
          <div
            id="today-task-media"
            onClick={() => setActiveModule('media')}
            className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/50 dark:border-blue-800/40">
                  <Mic2 className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                  Media Lab
                </span>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Luyện Shadowing 15 Phút
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                  Luyện phát âm, trọng âm câu và ngữ điệu tự nhiên qua video ngắn của BBC & Cambridge IELTS.
                </p>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
              <span>Vào phòng Shadowing</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BENTO GRID LAYER 3: 7 LEARNING MODULES TILES */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            7 Module Học Tập Cá Nhân Hóa
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">Truy cập nhanh</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3.5">
          {[
            {
              id: 'sources',
              title: '1. Học liệu',
              desc: 'PDF, URL, Docs',
              icon: FileUp,
              color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border-blue-200/50 dark:border-blue-800/40',
            },
            {
              id: 'vocabulary',
              title: '2. Từ vựng',
              desc: `${vocabCards.length} thẻ SRS`,
              icon: Layers,
              color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200/50 dark:border-amber-800/40',
            },
            {
              id: 'grammar',
              title: '3. Ngữ pháp',
              desc: 'Trọng điểm C1',
              icon: Zap,
              color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200/50 dark:border-emerald-800/40',
            },
            {
              id: 'media',
              title: '4. Media Lab',
              desc: 'Shadowing drill',
              icon: Mic2,
              color: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 border-sky-200/50 dark:border-sky-800/40',
            },
            {
              id: 'practice',
              title: '5. Luyện tập',
              desc: '4 kỹ năng AI',
              icon: Target,
              color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 border-purple-200/50 dark:border-purple-800/40',
            },
            {
              id: 'mock_test',
              title: '6. Thi thử',
              desc: 'Mini & Full test',
              icon: GraduationCap,
              color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border-rose-200/50 dark:border-rose-800/40',
            },
            {
              id: 'knowledge',
              title: '7. Chiến thuật',
              desc: 'PEEL, PPF, Rubrics',
              icon: Award,
              color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/60 border-orange-200/50 dark:border-orange-800/40',
            },
          ].map((mod) => {
            const Icon = mod.icon;
            return (
              <button
                key={mod.id}
                onClick={() => setActiveModule(mod.id as any)}
                className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 shadow-xs hover:shadow-sm text-left transition-all group flex flex-col justify-between cursor-pointer"
              >
                <div className="space-y-2.5">
                  <div className={`w-9 h-9 rounded-2xl flex items-center justify-center border ${mod.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {mod.title}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{mod.desc}</div>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BENTO GRID LAYER 4: RECENT MOCK TESTS & MULTI-SOURCE SPOTLIGHT */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Recent Mocks (6 cols) */}
        <div className="lg:col-span-6 p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Lịch Sử Thi Thử Gần Nhất</span>
            </h3>
            <button
              onClick={() => setActiveModule('mock_test')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Thi thử ngay
            </button>
          </div>

          <div className="space-y-3">
            {mockResults.slice(0, 3).map((mock) => (
              <div
                key={mock.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate max-w-[220px]">
                    {mock.testTitle}
                  </div>
                  <div className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold border border-emerald-200/50 dark:border-emerald-800/50">
                    Overall {mock.overallBand.toFixed(1)}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-[11px] text-center text-slate-600 dark:text-slate-300">
                  <div className="p-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/50 dark:border-slate-700/50 font-medium">L: {mock.listeningBand.toFixed(1)}</div>
                  <div className="p-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/50 dark:border-slate-700/50 font-medium">R: {mock.readingBand.toFixed(1)}</div>
                  <div className="p-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/50 dark:border-slate-700/50 font-medium">W: {mock.writingBand.toFixed(1)}</div>
                  <div className="p-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/50 dark:border-slate-700/50 font-medium">S: {mock.speakingBand.toFixed(1)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Multi-Source Ingestion Spotlight (6 cols) */}
        <div className="lg:col-span-6 p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/50 dark:border-blue-800/40 text-xs font-semibold text-blue-700 dark:text-blue-300">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Điểm Khác Biệt: Học Từ Mọi Nguồn Bạn Thích</span>
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Tạo bài học cá nhân hóa từ PDF, URL, Docs, Video
            </h3>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Thay vì giới hạn trong ngân hàng đề cố định, bạn có thể nạp bất kỳ bài báo chuyên ngành (The Economist, Nature), file PDF tài liệu học tập, hoặc link video YouTube ưa thích.
            </p>

            <div className="space-y-2 text-xs pt-1">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Trích xuất từ vựng C1/C2 kèm phiên âm IPA & Collocations chuẩn</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Nhận diện cấu trúc ngữ pháp ăn điểm (Đảo ngữ, câu chẻ)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Tạo ngay bài tập trắc nghiệm & câu hỏi phản xạ Speaking</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setActiveModule('sources')}
              className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs tracking-wide shadow-xs hover:shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <FileUp className="w-4 h-4" />
              <span>Nạp Nguồn Học Liệu Mới Ngay</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
