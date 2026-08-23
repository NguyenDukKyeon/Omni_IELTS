import React, { useState } from 'react';
import {
  BookOpenCheck,
  Compass,
  Award,
  AlertTriangle,
  Calculator,
  Sparkles,
  Layers,
  GraduationCap,
  HelpCircle,
} from 'lucide-react';
import { StrategyLessonViewer } from '../components/knowledge/StrategyLessonViewer';
import { AnnotatedModelAnswerViewer } from '../components/knowledge/AnnotatedModelAnswerViewer';
import { CommonPitfallsViewer } from '../components/knowledge/CommonPitfallsViewer';
import { OverviewBandCalculator } from '../components/knowledge/OverviewBandCalculator';
import { useApp } from '../context/AppContext';

export type KnowledgeTab = 'strategies' | 'model_answers' | 'pitfalls' | 'overview_calculator';

export const KnowledgeBaseView: React.FC = () => {
  const { openAITutorWithPrompt } = useApp();
  const [activeTab, setActiveTab] = useState<KnowledgeTab>('strategies');

  return (
    <div id="knowledge-module" className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono tracking-wider">
              IELTS Masterclass • Học Cách Thi
            </span>
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5 text-purple-500" /> Chiến thuật & Tư duy Khảo thí
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <BookOpenCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>Học Kiến Thức & Chiến Thuật Làm Bài IELTS</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
            Tập trung dạy <strong>CÁCH THI</strong> và <strong>TƯ DUY KHẢO THÍ</strong>: Chiến lược chuyên biệt từng dạng câu hỏi, bài mẫu Band 8.5+ có chú thích AI lý giải điểm cao, sổ tay bẫy thường gặp và thuật toán tính điểm chuẩn.
          </p>
        </div>

        {/* Ask AI Global Quick Trigger */}
        <button
          onClick={() =>
            openAITutorWithPrompt(
              'Tôi muốn được tư vấn chiến thuật làm bài thi IELTS đạt mục tiêu Band 7.5+. Hãy phân tích giúp tôi lộ trình và các kỹ thuật trọng yếu!'
            )
          }
          className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm shadow-blue-500/20 cursor-pointer active:scale-95 transition-all shrink-0"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Tư Vấn Chiến Thuật Với AI</span>
        </button>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 border-b border-slate-200/80 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('strategies')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'strategies'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Chiến Thuật Từng Dạng Bài & Quiz Ứng Dụng</span>
        </button>

        <button
          onClick={() => setActiveTab('model_answers')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'model_answers'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Bài Mẫu Band 8.5+ Có Chú Thích AI</span>
        </button>

        <button
          onClick={() => setActiveTab('pitfalls')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'pitfalls'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Sổ Tay Bẫy & Lỗi Phổ Biến</span>
        </button>

        <button
          onClick={() => setActiveTab('overview_calculator')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'overview_calculator'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>Tổng Quan Kỳ Thi & Máy Tính Điểm</span>
        </button>
      </div>

      {/* Render Selected Module */}
      {activeTab === 'strategies' && <StrategyLessonViewer />}
      {activeTab === 'model_answers' && <AnnotatedModelAnswerViewer />}
      {activeTab === 'pitfalls' && <CommonPitfallsViewer />}
      {activeTab === 'overview_calculator' && <OverviewBandCalculator />}
    </div>
  );
};

