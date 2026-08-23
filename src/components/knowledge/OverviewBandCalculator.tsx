import React, { useState } from 'react';
import {
  Calculator,
  Scale,
  Award,
  HelpCircle,
  Sparkles,
  ArrowRight,
  BookOpen,
  Headphones,
  FileText,
  Compass,
  CheckCircle2,
} from 'lucide-react';
import {
  LISTENING_BAND_CONVERSION,
  READING_ACADEMIC_BAND_CONVERSION,
  READING_GENERAL_BAND_CONVERSION,
  ACADEMIC_VS_GENERAL_COMPARISON,
} from '../../data/ieltsKnowledgeData';
import { BandConversionItem } from '../../types';

export const OverviewBandCalculator: React.FC = () => {
  // Score Conversion Table State
  const [conversionSkill, setConversionSkill] = useState<'listening' | 'reading_academic' | 'reading_general'>('listening');
  const [highlightRawScore, setHighlightRawScore] = useState<number | null>(32);

  // Overall Band Calculator State
  const [lBand, setLBand] = useState<number>(7.5);
  const [rBand, setRBand] = useState<number>(7.0);
  const [wBand, setWBand] = useState<number>(6.5);
  const [sBand, setSBand] = useState<number>(7.0);

  // Comparison View Filter
  const [selectedAspectIndex, setSelectedAspectIndex] = useState<number>(0);

  // Compute Overall Band with Official IELTS Rounding Algorithm
  const calculateOverallBand = (l: number, r: number, w: number, s: number) => {
    const rawAverage = (l + r + w + s) / 4;
    const decimal = rawAverage - Math.floor(rawAverage);

    let roundedBand = Math.floor(rawAverage);
    if (decimal < 0.25) {
      roundedBand += 0.0;
    } else if (decimal < 0.75) {
      roundedBand += 0.5;
    } else {
      roundedBand += 1.0;
    }
    return {
      rawAverage: rawAverage.toFixed(3),
      roundedBand: roundedBand.toFixed(1),
      decimalFraction: decimal.toFixed(3),
    };
  };

  const overallStats = calculateOverallBand(lBand, rBand, wBand, sBand);

  // Current active conversion table
  const activeConversionList: BandConversionItem[] =
    conversionSkill === 'listening'
      ? LISTENING_BAND_CONVERSION
      : conversionSkill === 'reading_academic'
      ? READING_ACADEMIC_BAND_CONVERSION
      : READING_GENERAL_BAND_CONVERSION;

  return (
    <div id="overview-band-calculator" className="space-y-8 animate-fadeIn">
      {/* 1. OVERALL BAND CALCULATOR & OFFICIAL ROUNDING ENGINE */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <Calculator className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>Máy Tính Điểm Overall & Thuật Toán Làm Tròn Chuẩn IELTS</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Khám phá cách tính điểm trung bình cộng 4 kỹ năng và quy tắc làm tròn 0.25 / 0.75 chính thức của IDP & British Council.
            </p>
          </div>

          {/* Target Result Pill */}
          <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 px-4 py-2.5 rounded-2xl shrink-0">
            <Award className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <div>
              <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300 block">
                Overall Band Làm Tròn
              </span>
              <strong className="text-xl font-extrabold font-mono text-blue-600 dark:text-blue-400">
                Band {overallStats.roundedBand}
              </strong>
            </div>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 pl-2 border-l border-blue-200 dark:border-blue-800">
              (Gốc: {overallStats.rawAverage})
            </span>
          </div>
        </div>

        {/* 4 Skills Slider Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Listening */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Headphones className="w-4 h-4 text-sky-500" /> Listening
              </span>
              <span className="text-sm font-extrabold font-mono text-blue-600 dark:text-blue-400">
                {lBand.toFixed(1)}
              </span>
            </div>
            <input data-ux-flow="knowledge.learn"
              type="range"
              min={4.0}
              max={9.0}
              step={0.5}
              value={lBand}
              onChange={(e) => setLBand(parseFloat(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-600 dark:text-slate-400 font-mono">
              <span>4.0</span>
              <span>6.5</span>
              <span>9.0</span>
            </div>
          </div>

          {/* Reading */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-emerald-500" /> Reading
              </span>
              <span className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                {rBand.toFixed(1)}
              </span>
            </div>
            <input data-ux-flow="knowledge.learn"
              type="range"
              min={4.0}
              max={9.0}
              step={0.5}
              value={rBand}
              onChange={(e) => setRBand(parseFloat(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-600 dark:text-slate-400 font-mono">
              <span>4.0</span>
              <span>6.5</span>
              <span>9.0</span>
            </div>
          </div>

          {/* Writing */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-500" /> Writing
              </span>
              <span className="text-sm font-extrabold font-mono text-amber-600 dark:text-amber-400">
                {wBand.toFixed(1)}
              </span>
            </div>
            <input data-ux-flow="knowledge.learn"
              type="range"
              min={4.0}
              max={9.0}
              step={0.5}
              value={wBand}
              onChange={(e) => setWBand(parseFloat(e.target.value))}
              className="w-full accent-amber-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-600 dark:text-slate-400 font-mono">
              <span>4.0</span>
              <span>6.5</span>
              <span>9.0</span>
            </div>
          </div>

          {/* Speaking */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-500" /> Speaking
              </span>
              <span className="text-sm font-extrabold font-mono text-purple-600 dark:text-purple-400">
                {sBand.toFixed(1)}
              </span>
            </div>
            <input data-ux-flow="knowledge.learn"
              type="range"
              min={4.0}
              max={9.0}
              step={0.5}
              value={sBand}
              onChange={(e) => setSBand(parseFloat(e.target.value))}
              className="w-full accent-purple-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-600 dark:text-slate-400 font-mono">
              <span>4.0</span>
              <span>6.5</span>
              <span>9.0</span>
            </div>
          </div>
        </div>

        {/* Algorithm Explanation Box */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800 text-xs space-y-2.5">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
            <HelpCircle className="w-4 h-4 text-blue-500" />
            <span>Quy tắc làm tròn điểm Overall chính thức của Hội đồng khảo thí:</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-600 dark:text-slate-400 leading-relaxed">
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <strong className="text-slate-900 dark:text-white block mb-1">
                Phần thập phân &lt; .25:
              </strong>
              Làm tròn XUỐNG số nguyên gần nhất (Ví dụ: 6.125 -&gt; <strong>6.0</strong>).
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <strong className="text-slate-900 dark:text-white block mb-1">
                .25 &le; Phần thập phân &lt; .75:
              </strong>
              Làm tròn LÊN mức <strong>.5</strong> (Ví dụ: 6.25 -&gt; <strong>6.5</strong>, 6.625 -&gt; <strong>6.5</strong>).
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <strong className="text-slate-900 dark:text-white block mb-1">
                Phần thập phân &ge; .75:
              </strong>
              Làm tròn LÊN số nguyên tiếp theo (Ví dụ: 6.75 -&gt; <strong>7.0</strong>, 7.875 -&gt; <strong>8.0</strong>).
            </div>
          </div>
        </div>
      </div>

      {/* 2. RAW SCORE TO BAND SCORE CONVERSION TABLE */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <Scale className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Bảng Quy Đổi Số Câu Đúng (Raw Score) Sang Band Điểm (0 - 9.0)</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
              Barem điểm chuẩn xác nhất cho Listening, Reading Academic và Reading General Training.
            </p>
          </div>

          {/* Skill Selector Tabs */}
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center gap-1 border border-slate-200 dark:border-slate-700 text-xs font-semibold shrink-0">
            <button data-ux-flow="knowledge.learn"
              onClick={() => setConversionSkill('listening')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                conversionSkill === 'listening'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Listening (40 câu)
            </button>
            <button data-ux-flow="knowledge.learn"
              onClick={() => setConversionSkill('reading_academic')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                conversionSkill === 'reading_academic'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Reading Academic
            </button>
            <button data-ux-flow="knowledge.learn"
              onClick={() => setConversionSkill('reading_general')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                conversionSkill === 'reading_general'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Reading General Training
            </button>
          </div>
        </div>

        {/* Conversion Table Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Số Câu Đúng / 40</th>
                <th className="py-3 px-4">IELTS Band</th>
                <th className="py-3 px-4">Trình Độ CEFR</th>
                <th className="py-3 px-4">Mô Tả Năng Lực Khảo Thí</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {activeConversionList.map((row) => {
                const isTopBand = row.bandScore >= 8.0;
                const isTargetBand = row.bandScore >= 6.5 && row.bandScore <= 7.5;
                return (
                  <tr
                    key={row.bandScore}
                    className={`transition-colors ${
                      isTopBand
                        ? 'bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                        : isTargetBand
                        ? 'bg-emerald-50/30 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {row.rawScoreRange} câu
                    </td>
                    <td className="py-3 px-4 font-mono font-extrabold text-sm text-blue-600 dark:text-blue-400">
                      Band {row.bandScore.toFixed(1)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold font-mono text-[10px]">
                        {row.cefrLevel}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      {row.competencyDescription}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. ACADEMIC VS GENERAL TRAINING COMPARISON MATRIX */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Compass className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span>So Sánh Toàn Diện: IELTS Academic vs General Training (GT)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Hiểu rõ sự khác biệt về cấu trúc đề, thang chấm điểm và định hướng ôn thi chính xác cho từng mục tiêu.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ACADEMIC_VS_GENERAL_COMPARISON.map((comp, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <span className="text-[11px] uppercase tracking-wider font-extrabold text-purple-700 dark:text-purple-400 bg-purple-100 dark:bg-purple-950 px-2 py-0.5 rounded-md">
                  {comp.aspect}
                </span>

                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60">
                    <strong className="text-blue-900 dark:text-blue-300 block mb-0.5">
                      IELTS Academic:
                    </strong>
                    <span className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {comp.academic}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-900/60">
                    <strong className="text-purple-900 dark:text-purple-300 block mb-0.5">
                      General Training (GT):
                    </strong>
                    <span className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {comp.generalTraining}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800/80 text-[11px] text-slate-600 dark:text-slate-400 italic flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>{comp.strategicNoteVi}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
