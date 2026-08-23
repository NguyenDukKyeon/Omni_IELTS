import React from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  AlertTriangle,
  Flame,
  CheckCircle2,
  TrendingUp,
  Zap,
  Target,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Info,
  Clock,
  Crosshair,
} from 'lucide-react';
import { MistakeEntry, TrapCategory } from '../../types';
import {
  calculateWeaknessStats,
  TRAP_CATEGORY_METAS,
  TrapCategoryMeta,
} from '../../services/srsScheduler';
import { useApp } from '../../context/AppContext';

interface MistakeAnalyticsViewProps {
  mistakes: MistakeEntry[];
  onStartDrill: (trapKey?: TrapCategory) => void;
}

export const MistakeAnalyticsView: React.FC<MistakeAnalyticsViewProps> = ({
  mistakes,
  onStartDrill,
}) => {
  const { openAITutorWithPrompt } = useApp();
  const stats = calculateWeaknessStats(mistakes);

  const handleAskAIAboutTrap = (trap: TrapCategoryMeta) => {
    const prompt = `Chào thầy AI, em đang gặp khó khăn và hay mắc lỗi ở dạng "${trap.titleVi}" (${trap.commonIn}). Thầy có thể hướng dẫn chi tiết:
1. Bản chất vì sao người học hay bị bẫy ở dạng này?
2. Bộ quy tắc nhận diện bẫy trong đề thi IELTS (Reading/Listening/Writing/Speaking).
3. 3 bài tập mẫu kèm đáp án và chiến thuật làm bài để đạt điểm tối đa?`;
    openAITutorWithPrompt(prompt);
  };

  return (
    <div id="mistake-analytics-view" className="space-y-6">
      {/* 1. KPI Metric Badges */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-stone-900 dark:text-white leading-none">
              {stats.totalMistakesCount}
            </div>
            <div className="text-xs text-stone-700 dark:text-stone-300 mt-1 font-medium">Tổng số lỗi đã lưu</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 leading-none">
              {stats.dueTodayCount}
            </div>
            <div className="text-xs text-stone-700 dark:text-stone-300 mt-1 font-medium">Cần ôn tập hôm nay</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 leading-none">
              {stats.masteredPercent}%
            </div>
            <div className="text-xs text-stone-700 dark:text-stone-300 mt-1 font-medium">Tỷ lệ đã khắc phục (SRS)</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 leading-tight truncate">
              {stats.weakestTrap ? stats.weakestTrap.shortLabel : 'Tốt'}
            </div>
            <div className="text-xs text-stone-700 dark:text-stone-300 font-medium">Điểm yếu cần chú ý nhất</div>
          </div>
        </div>
      </div>

      {/* 2. Highlight Alert: Most Critical Weakness with Targeted Drill CTA */}
      {stats.weakestTrap && (
        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-rose-500/10 border border-amber-300/80 dark:border-amber-700/60 relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-400/40">
                  ⚠️ Cảnh báo Điểm yếu Trọng tâm
                </span>
                <span className="text-xs text-stone-700 dark:text-stone-300">
                  {stats.weakestTrap.commonIn}
                </span>
              </div>
              <h3 className="text-base font-bold text-stone-900 dark:text-white">
                {stats.weakestTrap.titleVi}
              </h3>
              <p className="text-xs text-stone-700 dark:text-stone-300 max-w-2xl leading-relaxed">
                💡 <strong>Lời khuyên Giám khảo:</strong> {stats.weakestTrap.proTipVi}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button data-ux-flow="grammar.learning"
                id="target-drill-weakest-btn"
                onClick={() => onStartDrill(stats.weakestTrap?.id)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
              >
                <Crosshair className="w-4 h-4" />
                <span>Luyện tập Trọng điểm ngay</span>
              </button>

              <button data-ux-flow="grammar.learning"
                onClick={() => stats.weakestTrap && handleAskAIAboutTrap(stats.weakestTrap)}
                className="p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition-colors"
                title="Hỏi AI Tutor chuyên sâu về dạng bẫy này"
              >
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Radar Chart & Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Recharts Radar Chart */}
        <div className="lg:col-span-6 p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Biểu đồ Radar Năng lực & Bẫy Đề Thi
              </h4>
              <p className="text-xs text-stone-700 dark:text-stone-300">
                Thang điểm thành thạo 0 - 100% qua chu kỳ lặp lại ngắt quãng (SRS)
              </p>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={stats.radarData}>
                <PolarGrid stroke="#78716c" strokeDasharray="3 3" opacity={0.3} />
                <PolarAngleAxis
                  dataKey="category"
                  tick={{ fill: '#78716c', fontSize: 10, fontWeight: 600 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fill: '#a8a29e', fontSize: 9 }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-stone-900 text-white p-2.5 rounded-xl text-xs shadow-xl border border-stone-700 space-y-1">
                          <p className="font-bold text-amber-400">{data.category}</p>
                          <p className="text-stone-300">
                            Điểm kiểm soát bẫy: <strong>{data.scorePercent}%</strong>
                          </p>
                          <p className="text-stone-400 text-[11px]">
                            Lỗi chưa thuộc: {data.activeMistakes} / Tổng: {data.totalMistakes}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Radar
                  name="Mastery Score"
                  dataKey="scorePercent"
                  stroke="#F59E0B"
                  fill="#F59E0B"
                  fillOpacity={0.45}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-around pt-2 border-t border-stone-100 dark:border-stone-800 text-[11px] text-stone-700 dark:text-stone-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              &gt; 80%: Kiểm soát an toàn
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              50-80%: Cần chú ý
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              &lt; 50%: Vùng bẫy nguy hiểm
            </span>
          </div>
        </div>

        {/* Right: Weakness Heatmap Matrix */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              Ma trận Phân loại 8 Nhóm Bẫy & Lỗi Sai
            </h4>
            <span className="text-xs text-stone-700 dark:text-stone-300">Bấm nút để luyện riêng từng nhóm</span>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {stats.heatmapItems.map((item) => (
              <div
                key={item.trap.id}
                className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-amber-400 dark:hover:border-amber-600 transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.trap.badgeBg} ${item.trap.badgeText} shrink-0`}
                    >
                      {item.trap.shortLabel}
                    </span>
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-200 truncate">
                      {item.trap.titleVi}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        item.riskLevel === 'high'
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                          : item.riskLevel === 'medium'
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                          : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                      }`}
                    >
                      {item.active > 0 ? `${item.active} lỗi cần sửa` : 'Đã làm chủ'}
                    </span>

                    <button data-ux-flow="grammar.learning"
                      onClick={() => onStartDrill(item.trap.id)}
                      className="px-2.5 py-1 bg-stone-100 hover:bg-amber-500 hover:text-white dark:bg-stone-800 dark:hover:bg-amber-600 text-stone-700 dark:text-stone-300 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1"
                      title="Luyện tập câu hỏi thuộc nhóm này"
                    >
                      <Crosshair className="w-3 h-3" />
                      <span>Luyện</span>
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex-1 bg-stone-100 dark:bg-stone-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${item.masteryRate}%`,
                        backgroundColor: item.trap.color,
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-stone-700 dark:text-stone-300 shrink-0">
                    {item.masteryRate}% SRS ({item.mastered}/{item.total})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
