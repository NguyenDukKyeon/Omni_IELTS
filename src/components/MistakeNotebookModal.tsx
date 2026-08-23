import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Plus,
  Play,
  RotateCw,
  Sparkles,
  BookOpen,
  Volume2,
  Trash2,
  Flame,
  Target,
  BarChart3,
  Search,
  Crosshair,
  Tag,
  Layers,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MistakeEntry, ErrorCategory, SkillType, TrapCategory } from '../types';
import { ReviewRating, TRAP_CATEGORY_METAS, getDueMistakes } from '../services/srsScheduler';
import { playTextToSpeech } from '../services/aiTutor';
import { MistakeAnalyticsView } from './mistakes/MistakeAnalyticsView';
import { DailyMistakeWorkoutView } from './mistakes/DailyMistakeWorkoutView';
import { IntelligentErrorTaggerModal } from './mistakes/IntelligentErrorTaggerModal';

export const MistakeNotebookModal: React.FC = () => {
  const {
    isMistakeNotebookOpen,
    setIsMistakeNotebookOpen,
    mistakes,
    reviewMistake,
    addMistake,
    deleteMistake,
    openAITutorWithPrompt,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'analytics' | 'workout' | 'vault' | 'add'>('analytics');
  const [selectedTrapFilter, setSelectedTrapFilter] = useState<TrapCategory | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<ErrorCategory | 'all'>('all');
  const [selectedSkill, setSelectedSkill] = useState<SkillType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [workoutTrapTarget, setWorkoutTrapTarget] = useState<TrapCategory | 'all'>('all');
  const [isTaggerOpen, setIsTaggerOpen] = useState<boolean>(false);

  // New mistake form state
  const [newErrorText, setNewErrorText] = useState('');
  const [newCorrectedText, setNewCorrectedText] = useState('');
  const [newExplanation, setNewExplanation] = useState('');
  const [newTrapBreakdown, setNewTrapBreakdown] = useState('');
  const [newExaminerTip, setNewExaminerTip] = useState('');
  const [newTrapCategory, setNewTrapCategory] = useState<TrapCategory>('trap_not_given');
  const [newErrorType, setNewErrorType] = useState<ErrorCategory>('task_response');
  const [newSkill, setNewSkill] = useState<SkillType>('reading');

  if (!isMistakeNotebookOpen) return null;

  const dueMistakes = getDueMistakes(mistakes);

  const handleStartTargetedDrill = (trapKey?: TrapCategory) => {
    setWorkoutTrapTarget(trapKey || 'all');
    setActiveTab('workout');
  };

  const filteredMistakes = mistakes.filter((m) => {
    if (selectedTrapFilter !== 'all' && m.trapCategory !== selectedTrapFilter) return false;
    if (selectedCategory !== 'all' && m.errorType !== selectedCategory) return false;
    if (selectedSkill !== 'all' && m.skill !== selectedSkill) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = (m.errorText || '').toLowerCase().includes(q);
      const matchCorr = (m.correctedText || '').toLowerCase().includes(q);
      const matchExpl = (m.explanation || '').toLowerCase().includes(q);
      const matchTag = (m.tags || []).some((t) => t.toLowerCase().includes(q));
      if (!matchText && !matchCorr && !matchExpl && !matchTag) return false;
    }
    return true;
  });

  const handleCreateMistake = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newErrorText.trim() || !newCorrectedText.trim()) return;

    const trapMeta = TRAP_CATEGORY_METAS[newTrapCategory];

    const entry: MistakeEntry = {
      id: `mistake_${Date.now()}`,
      errorText: newErrorText.trim(),
      correctedText: newCorrectedText.trim(),
      explanation: newExplanation.trim() || 'Lỗi tự ghi nhận trong quá trình luyện đề.',
      trapCategory: newTrapCategory,
      trapCategoryTitleVi: trapMeta?.titleVi,
      trapBreakdownVi: newTrapBreakdown.trim() || trapMeta?.descriptionVi,
      examinerTipVi: newExaminerTip.trim() || trapMeta?.proTipVi,
      errorType: newErrorType,
      skill: newSkill,
      originModule: 'ielts_practice_reading',
      srsStage: 0,
      intervalDays: 1,
      easeFactor: 2.5,
      repetitions: 0,
      nextReviewDate: new Date().toISOString(),
      reviewCount: 0,
      mastered: false,
      createdAt: new Date().toISOString(),
      tags: [newErrorType, newSkill, newTrapCategory],
    };

    addMistake(entry);
    setNewErrorText('');
    setNewCorrectedText('');
    setNewExplanation('');
    setNewTrapBreakdown('');
    setNewExaminerTip('');
    setActiveTab('vault');
  };

  return (
    <div
      id="unified-mistake-notebook-modal"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden my-4 flex flex-col max-h-[92vh]">
        {/* Modal Header Banner */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shrink-0">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">
                  Sổ Tay Bẫy & Lỗi Sai Cá Nhân Hóa (AI Smart Mistake Vault)
                </h2>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
                  {mistakes.length} Bẫy
                </span>
              </div>
              <p className="text-xs text-amber-100 hidden sm:block">
                Thuật toán Lặp lại Ngắt quãng (SM-2 SRS) • Tự động phân loại 8 nhóm bẫy đề thi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button data-ux-flow="grammar.learning"
              onClick={() => setIsTaggerOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>🏷️ AI Error Tagger (Bóc Tách Lỗi Tự Động)</span>
            </button>

            <button data-ux-flow="grammar.learning"
              id="close-mistake-modal-btn"
              onClick={() => setIsMistakeNotebookOpen(false)}
              className="p-2 rounded-xl hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 sm:px-6 pt-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button data-ux-flow="grammar.learning"
              id="tab-mistake-analytics"
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-t-xl text-xs font-bold border-b-2 transition-all shrink-0 cursor-pointer ${
                activeTab === 'analytics'
                  ? 'border-amber-600 text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-900 shadow-sm'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Bản Đồ Điểm Yếu & Bẫy (Radar)</span>
            </button>

            <button data-ux-flow="grammar.learning"
              id="tab-mistake-workout"
              onClick={() => {
                setWorkoutTrapTarget('all');
                setActiveTab('workout');
              }}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-t-xl text-xs font-bold border-b-2 transition-all shrink-0 cursor-pointer ${
                activeTab === 'workout'
                  ? 'border-amber-600 text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-900 shadow-sm'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Flame className="w-4 h-4 text-orange-500" />
              <span>Daily Mistake Workout</span>
              {dueMistakes.length > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-bold">
                  {dueMistakes.length}
                </span>
              )}
            </button>

            <button data-ux-flow="grammar.learning"
              id="tab-mistake-vault"
              onClick={() => setActiveTab('vault')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-t-xl text-xs font-bold border-b-2 transition-all shrink-0 cursor-pointer ${
                activeTab === 'vault'
                  ? 'border-amber-600 text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-900 shadow-sm'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Kho Bẫy & Lỗi ({mistakes.length})</span>
            </button>

            <button data-ux-flow="grammar.learning"
              id="tab-mistake-add"
              onClick={() => setActiveTab('add')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-t-xl text-xs font-bold border-b-2 transition-all shrink-0 cursor-pointer ${
                activeTab === 'add'
                  ? 'border-amber-600 text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-900 shadow-sm'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Bẫy Mới</span>
            </button>
          </div>
        </div>

        {/* Modal Main Content Container */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-white dark:bg-slate-900">
          {/* TAB 1: ANALYTICS & WEAKNESS RADAR */}
          {activeTab === 'analytics' && (
            <MistakeAnalyticsView
              mistakes={mistakes}
              onStartDrill={handleStartTargetedDrill}
            />
          )}

          {/* TAB 2: DAILY MISTAKE WORKOUT */}
          {activeTab === 'workout' && (
            <DailyMistakeWorkoutView
              mistakes={mistakes}
              initialTrapFilter={workoutTrapTarget}
              onCompleteSession={() => setActiveTab('analytics')}
              onBackToAnalytics={() => setActiveTab('analytics')}
            />
          )}

          {/* TAB 3: VAULT EXPLORER */}
          {activeTab === 'vault' && (
            <div className="space-y-4">
              {/* Search & Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input data-ux-flow="grammar.learning"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm bẫy, từ khóa..."
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <select data-ux-flow="grammar.learning"
                    value={selectedTrapFilter}
                    onChange={(e) => setSelectedTrapFilter(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium"
                  >
                    <option value="all">Tất cả Nhóm Bẫy (8 nhóm)</option>
                    {Object.entries(TRAP_CATEGORY_METAS).map(([k, meta]) => (
                      <option key={k} value={k}>
                        {meta.titleVi}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <select data-ux-flow="grammar.learning"
                    value={selectedSkill}
                    onChange={(e) => setSelectedSkill(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium"
                  >
                    <option value="all">Tất cả Kỹ năng</option>
                    <option value="reading">Reading</option>
                    <option value="listening">Listening</option>
                    <option value="writing">Writing</option>
                    <option value="speaking">Speaking</option>
                    <option value="grammar">Grammar</option>
                  </select>
                </div>
              </div>

              {/* Items List */}
              {filteredMistakes.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto opacity-70" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Không tìm thấy lỗi sai nào trong bộ lọc này
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Hãy thử thay đổi điều kiện lọc hoặc tạo thêm bẫy mới.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredMistakes.map((m) => {
                    const trapMeta = m.trapCategory ? TRAP_CATEGORY_METAS[m.trapCategory] : null;
                    return (
                      <div
                        key={m.id}
                        className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 hover:border-amber-400 dark:hover:border-amber-600 transition-all space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {trapMeta ? (
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${trapMeta.badgeBg} ${trapMeta.badgeText}`}
                              >
                                {trapMeta.titleVi}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 uppercase">
                                {m.errorType}
                              </span>
                            )}

                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300">
                              {m.skill}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                m.mastered || m.srsStage >= 5
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                              }`}
                            >
                              SRS Hộp {m.srsStage}/5 {m.mastered ? '• Đã làm chủ' : ''}
                            </span>

                            <button data-ux-flow="grammar.learning"
                              onClick={() => deleteMistake(m.id)}
                              className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                              title="Xóa lỗi này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Error vs Corrected */}
                        <div className="space-y-1.5 text-xs">
                          <div className="p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 text-rose-900 dark:text-rose-200 font-medium">
                            <span className="font-bold text-rose-600 dark:text-rose-400 block text-[10px] uppercase">
                              Câu chứa bẫy / Lỗi sai:
                            </span>
                            {m.errorText}
                          </div>

                          <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200 font-bold">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 block text-[10px] uppercase">
                              Đáp án chuẩn Band 8.0+:
                            </span>
                            {m.correctedText}
                          </div>
                        </div>

                        {/* Trap Breakdown & Explanation */}
                        <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                          {m.trapBreakdownVi && (
                            <p className="text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed">
                              <strong>🔍 Mổ xẻ bẫy:</strong> {m.trapBreakdownVi}
                            </p>
                          )}
                          <p className="leading-relaxed">
                            <strong>📖 Giải thích:</strong> {m.explanation}
                          </p>
                          {m.examinerTipVi && (
                            <p className="text-slate-500 dark:text-slate-400 text-[11px] italic">
                              💡 <strong>Mẹo Giám khảo:</strong> {m.examinerTipVi}
                            </p>
                          )}
                        </div>

                        {/* Card Actions */}
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
                          <button data-ux-flow="grammar.learning"
                            onClick={() => playTextToSpeech(m.correctedText || m.errorText)}
                            className="flex items-center gap-1 text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Nghe phát âm</span>
                          </button>

                          <button data-ux-flow="grammar.learning"
                            onClick={() => handleStartTargetedDrill(m.trapCategory)}
                            className="flex items-center gap-1 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                          >
                            <Crosshair className="w-3 h-3" />
                            <span>Luyện tập dạng này</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ADD CUSTOM MISTAKE */}
          {activeTab === 'add' && (
            <form data-ux-flow="grammar.learning" onSubmit={handleCreateMistake} className="space-y-4 max-w-xl mx-auto py-2">
              <div className="text-center space-y-1 pb-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Thêm Bẫy / Lỗi Sai Vào Sổ Tay Cá Nhân
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ghi lại các bẫy bạn tự làm sai khi luyện đề bên ngoài để thuật toán SRS nhắc nhở.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Nhóm Bẫy:
                  </label>
                  <select data-ux-flow="grammar.learning"
                    value={newTrapCategory}
                    onChange={(e) => setNewTrapCategory(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    {Object.entries(TRAP_CATEGORY_METAS).map(([k, meta]) => (
                      <option key={k} value={k}>
                        {meta.titleVi}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Kỹ Năng:
                  </label>
                  <select data-ux-flow="grammar.learning"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="reading">Reading</option>
                    <option value="listening">Listening</option>
                    <option value="writing">Writing</option>
                    <option value="speaking">Speaking</option>
                    <option value="grammar">Grammar</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Phân Loại Lỗi:
                  </label>
                  <select data-ux-flow="grammar.learning"
                    value={newErrorType}
                    onChange={(e) => setNewErrorType(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="task_response">Bẫy đề thi (Task Response)</option>
                    <option value="grammar">Ngữ pháp (Grammar)</option>
                    <option value="vocab">Từ vựng & Collocation</option>
                    <option value="cohesion">Mạch lạc (Cohesion)</option>
                    <option value="pronunciation">Phát âm & Trọng âm</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-rose-600 dark:text-rose-400 block mb-1">
                  * Câu có lỗi sai / Thí sinh chọn sai:
                </label>
                <textarea data-ux-flow="grammar.learning"
                  rows={2}
                  value={newErrorText}
                  onChange={(e) => setNewErrorText(e.target.value)}
                  placeholder="Ví dụ: Statement: Government subsidizes all companies (Thí sinh chọn FALSE)..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block mb-1">
                  * Đáp án đúng / Câu sửa chuẩn hóa Band 8.0+:
                </label>
                <textarea data-ux-flow="grammar.learning"
                  rows={2}
                  value={newCorrectedText}
                  onChange={(e) => setNewCorrectedText(e.target.value)}
                  placeholder="Ví dụ: Đáp án chuẩn: NOT GIVEN..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Giải thích chi tiết:
                </label>
                <textarea data-ux-flow="grammar.learning"
                  rows={2}
                  value={newExplanation}
                  onChange={(e) => setNewExplanation(e.target.value)}
                  placeholder="Giải thích vì sao câu ban đầu sai..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button data-ux-flow="grammar.learning"
                  type="button"
                  onClick={() => setActiveTab('vault')}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button data-ux-flow="grammar.learning"
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Lưu vào Sổ Tay Bẫy
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Intelligent Error Tagger Modal */}
      <IntelligentErrorTaggerModal
        isOpen={isTaggerOpen}
        onClose={() => setIsTaggerOpen(false)}
      />
    </div>
  );
};
