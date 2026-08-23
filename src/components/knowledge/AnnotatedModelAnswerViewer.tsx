import React, { useState } from 'react';
import {
  Award,
  Sparkles,
  Bookmark,
  FileText,
  HelpCircle,
  Eye,
  CheckCircle2,
  Layers,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Tag,
  MessageSquare,
} from 'lucide-react';
import { ANNOTATED_MODEL_ANSWERS } from '../../data/ieltsKnowledgeData';
import { AnnotatedModelAnswer, AnnotatedSegment, AnnotationCategory } from '../../types';
import { InLessonAIInquirer } from './InLessonAIInquirer';

export const AnnotatedModelAnswerViewer: React.FC = () => {
  const [activeModelId, setActiveModelId] = useState<string>(ANNOTATED_MODEL_ANSWERS[0].id);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<AnnotationCategory | 'all'>('all');
  const [inspectedSegment, setInspectedSegment] = useState<AnnotatedSegment | null>(
    ANNOTATED_MODEL_ANSWERS[0].annotatedSegments[1] || null
  );

  const activeModel =
    ANNOTATED_MODEL_ANSWERS.find((m) => m.id === activeModelId) || ANNOTATED_MODEL_ANSWERS[0];

  const getAnnotationBadge = (type?: AnnotationCategory) => {
    switch (type) {
      case 'vocab':
        return {
          label: 'Lexical Resource (C1/C2)',
          bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
          dot: 'bg-emerald-500',
        };
      case 'grammar':
        return {
          label: 'Grammatical Range',
          bg: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 dark:border-blue-800',
          dot: 'bg-blue-500',
        };
      case 'cohesion':
        return {
          label: 'Coherence & Cohesion',
          bg: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300 dark:border-purple-800',
          dot: 'bg-purple-500',
        };
      case 'task_response':
        return {
          label: 'Task Response / Achievement',
          bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800',
          dot: 'bg-amber-500',
        };
      default:
        return {
          label: 'Highlight',
          bg: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
          dot: 'bg-slate-500',
        };
    }
  };

  return (
    <div id="annotated-model-answers" className="space-y-8 animate-fadeIn">
      {/* 1. Model Answer Selector Tabs */}
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
        {ANNOTATED_MODEL_ANSWERS.map((model) => {
          const isActive = model.id === activeModel.id;
          return (
            <button
              key={model.id}
              onClick={() => {
                setActiveModelId(model.id);
                setInspectedSegment(model.annotatedSegments[0] || null);
              }}
              className={`p-4 rounded-2xl border text-left transition-all shrink-0 min-w-[280px] max-w-[340px] cursor-pointer space-y-2 ${
                isActive
                  ? 'bg-blue-50/90 dark:bg-blue-950/60 border-blue-600 dark:border-blue-500 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {model.taskType}
                </span>
                <span className="text-xs font-black font-mono text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-950 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                  Band {model.targetBand.toFixed(1)}
                </span>
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-1">
                {model.topicVi}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                {model.examinerOverviewVi}
              </p>
            </button>
          );
        })}
      </div>

      {/* 2. Main Reader Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Center Column: Essay Text with Color-Coded Highlights (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            {/* Header info */}
            <div className="space-y-3 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {activeModel.taskType} • Bài Mẫu Phân Tích Chuyên Sâu
                </span>
                <span className="flex items-center gap-1.5 text-xs font-extrabold font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <Award className="w-3.5 h-3.5" /> Chuẩn Khảo Thí Band {activeModel.targetBand.toFixed(1)}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                <strong className="text-xs font-bold text-slate-900 dark:text-white block">
                  Đề Bài Thi Thật:
                </strong>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic">
                  "{activeModel.questionPrompt}"
                </p>
                {activeModel.diagramOrImageDescription && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800">
                    <strong>Mô tả số liệu:</strong> {activeModel.diagramOrImageDescription}
                  </p>
                )}
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Bộ Lọc Tiêu Chí Điểm Cao (Nhấp để bôi màu theo tiêu chí):
              </span>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  onClick={() => setSelectedCategoryFilter('all')}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                    selectedCategoryFilter === 'all'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Tất cả chú thích
                </button>
                <button
                  onClick={() => setSelectedCategoryFilter('vocab')}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedCategoryFilter === 'vocab'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Từ vựng C1/C2
                </button>
                <button
                  onClick={() => setSelectedCategoryFilter('grammar')}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedCategoryFilter === 'grammar'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-blue-500" /> Ngữ pháp phức tạp
                </button>
                <button
                  onClick={() => setSelectedCategoryFilter('cohesion')}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedCategoryFilter === 'cohesion'
                      ? 'bg-purple-600 text-white'
                      : 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/70 dark:border-purple-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-purple-500" /> Mạch lạc & Liên kết
                </button>
                <button
                  onClick={() => setSelectedCategoryFilter('task_response')}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedCategoryFilter === 'task_response'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Task Response
                </button>
              </div>
            </div>

            {/* Interactive Annotated Essay Body */}
            <div className="p-6 rounded-2xl bg-slate-50/70 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 font-serif text-sm sm:text-base leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line select-text">
              {activeModel.annotatedSegments.map((segment, sIdx) => {
                const isMatchingFilter =
                  selectedCategoryFilter === 'all' ||
                  segment.annotationType === selectedCategoryFilter;
                const isSelected = inspectedSegment?.text === segment.text;
                const badge = getAnnotationBadge(segment.annotationType);

                if (!segment.isHighlight || !isMatchingFilter) {
                  return (
                    <span
                      key={sIdx}
                      onClick={() => segment.isHighlight && setInspectedSegment(segment)}
                      className={segment.isHighlight ? 'cursor-pointer hover:underline' : ''}
                    >
                      {segment.text}
                    </span>
                  );
                }

                // Highlighted styled snippet
                let highlightClass =
                  'cursor-pointer transition-all duration-200 rounded-sm px-1 py-0.5 ';
                if (segment.annotationType === 'vocab') {
                  highlightClass += isSelected
                    ? 'bg-emerald-300 dark:bg-emerald-800 text-emerald-950 dark:text-white font-bold ring-2 ring-emerald-500'
                    : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-200';
                } else if (segment.annotationType === 'grammar') {
                  highlightClass += isSelected
                    ? 'bg-blue-300 dark:bg-blue-800 text-blue-950 dark:text-white font-bold ring-2 ring-blue-500'
                    : 'bg-blue-100 dark:bg-blue-950/80 text-blue-900 dark:text-blue-200 hover:bg-blue-200';
                } else if (segment.annotationType === 'cohesion') {
                  highlightClass += isSelected
                    ? 'bg-purple-300 dark:bg-purple-800 text-purple-950 dark:text-white font-bold ring-2 ring-purple-500'
                    : 'bg-purple-100 dark:bg-purple-950/80 text-purple-900 dark:text-purple-200 hover:bg-purple-200';
                } else {
                  highlightClass += isSelected
                    ? 'bg-amber-300 dark:bg-amber-800 text-amber-950 dark:text-white font-bold ring-2 ring-amber-500'
                    : 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 hover:bg-amber-200';
                }

                return (
                  <span
                    key={sIdx}
                    onClick={() => setInspectedSegment(segment)}
                    className={highlightClass}
                    title="Nhấp để xem phân tích của Giám khảo AI"
                  >
                    {segment.text}
                  </span>
                );
              })}
            </div>

            <p className="text-[11px] text-slate-500 italic text-center">
              💡 <strong>Mẹo:</strong> Nhấp vào bất kỳ câu/đoạn được bôi màu để xem giải thích chi tiết vì sao đạt điểm cao ở cột bên phải.
            </p>
          </div>
        </div>

        {/* Right Column: AI Examiner Inspection Box & Vocabulary Glossary (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Active Inspected Segment Card */}
          {inspectedSegment ? (
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-blue-500 dark:border-blue-500 shadow-md space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Phân Tích Của Giám Khảo AI
                </span>

                {inspectedSegment.bandImpact && (
                  <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {inspectedSegment.bandImpact}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {inspectedSegment.title || 'Điểm Sáng Đạt Chuẩn Band 8.5+'}
                </h4>
                <blockquote className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 text-xs italic text-slate-700 dark:text-slate-300 border-l-4 border-blue-500 font-serif leading-relaxed">
                  "{inspectedSegment.text.trim()}"
                </blockquote>
              </div>

              <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/50">
                <strong className="text-blue-900 dark:text-blue-300 block mb-1">
                  Tại sao câu này ghi điểm tuyệt đối?
                </strong>
                <p>{inspectedSegment.explanationVi}</p>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-2">
              <Eye className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-xs text-slate-500">
                Hãy nhấp vào một đoạn văn được bôi màu bên trái để xem lý do đạt điểm cao.
              </p>
            </div>
          )}

          {/* 4 Official Criteria Scoring Breakdown Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-500" />
              <span>Điểm Số Từng Tiêu Chí Của Giám Khảo</span>
            </h4>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">
                    1. {activeModel.criteriaAnalysis.criterion1Name}
                  </span>
                  <span className="font-extrabold font-mono text-emerald-600">
                    Band {activeModel.criteriaAnalysis.criterion1Score.toFixed(1)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  {activeModel.criteriaAnalysis.criterion1Notes}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">
                    2. {activeModel.criteriaAnalysis.criterion2Name}
                  </span>
                  <span className="font-extrabold font-mono text-purple-600">
                    Band {activeModel.criteriaAnalysis.criterion2Score.toFixed(1)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  {activeModel.criteriaAnalysis.criterion2Notes}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">
                    3. {activeModel.criteriaAnalysis.criterion3Name}
                  </span>
                  <span className="font-extrabold font-mono text-blue-600">
                    Band {activeModel.criteriaAnalysis.criterion3Score.toFixed(1)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  {activeModel.criteriaAnalysis.criterion3Notes}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">
                    4. {activeModel.criteriaAnalysis.criterion4Name}
                  </span>
                  <span className="font-extrabold font-mono text-amber-600">
                    Band {activeModel.criteriaAnalysis.criterion4Score.toFixed(1)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  {activeModel.criteriaAnalysis.criterion4Notes}
                </p>
              </div>
            </div>
          </div>

          {/* High-Band Vocabulary Glossary */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-500" />
              <span>Bộ Từ Vựng & Collocations C1/C2 Đắt Giá</span>
            </h4>

            <div className="space-y-3">
              {activeModel.vocabularyGlossary.map((vocab, vIdx) => (
                <div
                  key={vIdx}
                  className="p-3.5 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-emerald-900 dark:text-emerald-300 font-mono font-bold text-xs">
                      {vocab.phrase}
                    </strong>
                    <span className="px-1.5 py-0.5 rounded-md bg-emerald-600 text-white font-bold font-mono text-[9px]">
                      {vocab.level}
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300">
                    <strong>Nghĩa:</strong> {vocab.meaningVi}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                    💡 <strong>Cách dùng:</strong> {vocab.usageTip}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Ask AI Contextual in Model Answer */}
          <InLessonAIInquirer
            contextTopicTitle={`Bài mẫu ${activeModel.taskType}: ${activeModel.topicVi}`}
            contextSkill={activeModel.skill}
            quickPrompts={[
              'Vì sao đoạn Overview này đạt Band 9.0?',
              'Phân tích chi tiết chuỗi lập luận PEEL trong thân bài',
              'Gợi ý 3 cách mở bài khác cho đề này ở Band 8.0',
            ]}
          />
        </div>
      </div>
    </div>
  );
};
