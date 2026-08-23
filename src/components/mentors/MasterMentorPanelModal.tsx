import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  BookmarkPlus,
  Check,
  RotateCcw,
  BookOpen,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  Zap,
  Users,
  Feather,
  Layers,
  Scale,
  Award,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import {
  MasterMentorPanelInput,
  MasterMentorPanelReport,
  StandardErrorObject,
  MistakeEntry,
} from '../../types';
import { consultMasterMentorPanelApi } from '../../services/practiceService';
import { useApp } from '../../context/AppContext';
import { XP_REWARDS } from '../../services/gamification';

interface MasterMentorPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialInput: MasterMentorPanelInput | null;
}

export const MasterMentorPanelModal: React.FC<MasterMentorPanelModalProps> = ({
  isOpen,
  onClose,
  initialInput,
}) => {
  const { addMistake, awardXP, openAITutorWithPrompt } = useApp();

  const [activeTab, setActiveTab] = useState<'flaws' | 'ideas' | 'collocations' | 'tensions'>('flaws');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [report, setReport] = useState<MasterMentorPanelReport | null>(null);
  const [syncedFlaws, setSyncedFlaws] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (isOpen && initialInput) {
      handleConsultPanel();
    } else {
      setReport(null);
      setErrorMessage(null);
      setSyncedFlaws({});
    }
  }, [isOpen, initialInput]);

  if (!isOpen || !initialInput) return null;

  const handleConsultPanel = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSyncedFlaws({});

    try {
      const data = await consultMasterMentorPanelApi(initialInput);
      setReport(data);
      awardXP(XP_REWARDS.ESSAY_FEEDBACK_REVIEWED, 'Tham vấn Hội đồng Cố vấn IELTS Master Mentor Panel');
    } catch (err: any) {
      console.error('Mentor Panel Error:', err);
      setErrorMessage(
        err?.message ||
          'Không thể kết nối với Hội đồng Cố vấn IELTS Master Mentor Panel (gemini-3.1-pro).'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveFlawToNotebook = (flaw: StandardErrorObject, index: number) => {
    const entry: MistakeEntry = {
      id: `flaw_mentor_${Date.now()}_${index}`,
      errorText: flaw.errorSubstring,
      correctedText: 'Xem bản sửa gợi ý của Giám khảo Dr. Vance',
      explanation: flaw.explanationVi,
      errorType: (flaw.errorCategory as any) || 'grammar',
      skill: 'writing',
      originModule: 'ielts_practice_writing',
      srsStage: 0,
      nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      reviewCount: 0,
      mastered: false,
      createdAt: new Date().toISOString(),
      tags: ['Master Mentor Panel', 'Dr. Vance', flaw.errorCategory, flaw.severity || 'medium'],
    };

    addMistake(entry);
    setSyncedFlaws((prev) => ({ ...prev, [index]: true }));
  };

  return (
    <div
      id="master-mentor-panel-modal"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden my-4 sm:my-8 flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-indigo-900/50">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-2xl shadow-inner">
              🏛️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  IELTS Master Mentor Panel
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-300/30">
                  gemini-3.1-pro
                </span>
              </div>
              <p className="text-xs text-indigo-200/90 mt-0.5">
                Hội đồng 3 Chuyên gia Khảo thí: Dr. Vance • Coach Mia • Prof. Arthur
              </p>
            </div>
          </div>
          <button data-ux-flow="dashboard.daily"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Personas Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-xs shrink-0">
          {/* Persona 1: Dr. Vance */}
          <div className="p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 flex items-center justify-center text-base shrink-0">
              👨‍⚖️
            </div>
            <div className="min-w-0">
              <div className="font-bold text-slate-900 dark:text-white truncate">
                Dr. Jonathan Vance
              </div>
              <div className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold truncate">
                🔴 Cambridge Examiner (Band Descriptors)
              </div>
            </div>
          </div>

          {/* Persona 2: Coach Mia */}
          <div className="p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 flex items-center justify-center text-base shrink-0">
              👩‍🏫
            </div>
            <div className="min-w-0">
              <div className="font-bold text-slate-900 dark:text-white truncate">
                Coach Mia Lin
              </div>
              <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold truncate">
                💡 Band Booster Coach (PEEL Scaffolding)
              </div>
            </div>
          </div>

          {/* Persona 3: Prof. Arthur */}
          <div className="p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-950/80 border border-indigo-300 dark:border-indigo-800 flex items-center justify-center text-base shrink-0">
              🧐
            </div>
            <div className="min-w-0">
              <div className="font-bold text-slate-900 dark:text-white truncate">
                Prof. Arthur Pendelton
              </div>
              <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold truncate">
                ✨ Lexical Maestro (C1/C2 Collocations)
              </div>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs sm:text-sm flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Lỗi tham vấn Master Mentor Panel</p>
                <p className="mt-0.5 text-rose-700 dark:text-rose-300">{errorMessage}</p>
                <button data-ux-flow="dashboard.daily"
                  onClick={handleConsultPanel}
                  className="mt-2 text-xs font-bold text-rose-700 underline"
                >
                  Thử lại ➔
                </button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950/80 border-2 border-indigo-500/40 flex items-center justify-center text-2xl mx-auto animate-pulse">
                🏛️
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  Hội đồng Cố vấn đang tiến hành phản biện chéo...
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Dr. Vance phát hiện lỗi sai, Coach Mia phát triển luận điểm PEEL, Prof. Arthur nâng cấp C1/C2 collocations theo Consistency Rule...
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                <RotateCcw className="w-4 h-4 animate-spin" />
                <span>Đang tạo báo cáo đa góc nhìn chuyên sâu...</span>
              </div>
            </div>
          )}

          {/* Report Results */}
          {report && (
            <div className="space-y-6 animate-fadeIn">
              {/* Panel Consensus Summary Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white space-y-2 border border-indigo-800/40 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <Award className="w-4 h-4" /> Đồng Thuận Cố Vấn (Panel Consensus)
                  </span>
                  <span className="text-[11px] text-slate-300">
                    Target Band {initialInput.targetBand || 7.5}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-serif">
                  {report.panelSummaryVi}
                </p>
              </div>

              {/* Navigation Tabs for the 3 Personas */}
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <button data-ux-flow="dashboard.daily"
                  onClick={() => setActiveTab('flaws')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                    activeTab === 'flaws'
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <span>🔴 Critical Flaws (Dr. Vance)</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
                    {report.criticalFlaws?.length || 0}
                  </span>
                </button>

                <button data-ux-flow="dashboard.daily"
                  onClick={() => setActiveTab('ideas')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                    activeTab === 'ideas'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <span>💡 Idea Expansion (Coach Mia)</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
                    {report.ideaExpansion?.length || 0}
                  </span>
                </button>

                <button data-ux-flow="dashboard.daily"
                  onClick={() => setActiveTab('collocations')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                    activeTab === 'collocations'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <span>✨ C1/C2 Collocations (Prof. Arthur)</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
                    {report.collocationUpgrades?.length || 0}
                  </span>
                </button>

                {report.perspectiveTensions && report.perspectiveTensions.length > 0 && (
                  <button data-ux-flow="dashboard.daily"
                    onClick={() => setActiveTab('tensions')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                      activeTab === 'tensions'
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <span>⚖️ Đa Góc Nhìn & Cân Bằng</span>
                    <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
                      {report.perspectiveTensions.length}
                    </span>
                  </button>
                )}
              </div>

              {/* TAB 1: 🔴 Critical Flaws (Dr. Vance) */}
              {activeTab === 'flaws' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-rose-900 dark:text-rose-200 text-xs font-bold">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Giám khảo Dr. Vance: Bắt lỗi nghiêm trọng ảnh hưởng trực tiếp đến Band điểm</span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Chuẩn StandardErrorObject • Đồng bộ vào Mistake Notebook
                    </span>
                  </div>

                  {report.criticalFlaws && report.criticalFlaws.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3">
                      {report.criticalFlaws.map((flaw, idx) => {
                        const isSynced = syncedFlaws[idx];
                        return (
                          <div
                            key={idx}
                            className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2.5 shadow-sm"
                          >
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[10px] font-mono font-bold uppercase">
                                  {flaw.errorCategory}
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                                  Mức độ: {flaw.severity || 'Medium'}
                                </span>
                              </div>

                              <button data-ux-flow="dashboard.daily"
                                type="button"
                                onClick={() => handleSaveFlawToNotebook(flaw, idx)}
                                disabled={isSynced}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                                  isSynced
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'
                                }`}
                              >
                                {isSynced ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Đã lưu vào Sổ tay</span>
                                  </>
                                ) : (
                                  <>
                                    <BookmarkPlus className="w-3.5 h-3.5" />
                                    <span>+ Lưu vào Sổ tay Lỗi sai</span>
                                  </>
                                )}
                              </button>
                            </div>

                            <p className="font-mono text-xs text-rose-700 dark:text-rose-300 font-bold bg-rose-50/60 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-100 dark:border-rose-900/40">
                              "{flaw.errorSubstring}"
                            </p>

                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                              💡 <strong>Phân tích của Dr. Vance:</strong> {flaw.explanationVi}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-500 rounded-2xl bg-slate-50 dark:bg-slate-800">
                      🎉 Tuyệt vời! Dr. Vance không phát hiện lỗi sai ngữ pháp nghiêm trọng nào.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: 💡 Idea Expansion (Coach Mia) */}
              {activeTab === 'ideas' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 text-xs font-bold">
                      <Feather className="w-4 h-4 text-amber-600" />
                      <span>Coach Mia: Khung phát triển luận điểm PEEL & Chiều sâu lập luận Task Response</span>
                    </div>
                  </div>

                  {report.ideaExpansion && report.ideaExpansion.length > 0 ? (
                    <div className="space-y-4">
                      {report.ideaExpansion.map((idea, idx) => (
                        <div
                          key={idx}
                          className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-4 shadow-sm"
                        >
                          <div className="flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-300">
                            <span>Vị trí / Đoạn: {idea.pointOrParagraph}</span>
                            <span className="text-slate-400 font-normal">
                              Luận cứ hiện tại: "{idea.currentArgument}"
                            </span>
                          </div>

                          {/* PEEL Scaffolding Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div className="p-3.5 rounded-xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 text-xs space-y-1">
                              <span className="font-bold text-amber-800 dark:text-amber-300 block text-[11px] uppercase">
                                📌 P - Point (Luận điểm cốt lõi):
                              </span>
                              <p className="text-slate-800 dark:text-slate-200">{idea.peelScaffolding.point}</p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 text-xs space-y-1">
                              <span className="font-bold text-amber-800 dark:text-amber-300 block text-[11px] uppercase">
                                🔍 E - Explanation (Giải thích logic):
                              </span>
                              <p className="text-slate-800 dark:text-slate-200">{idea.peelScaffolding.explanation}</p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 text-xs space-y-1">
                              <span className="font-bold text-amber-800 dark:text-amber-300 block text-[11px] uppercase">
                                🌍 E - Example (Dẫn chứng thực tế):
                              </span>
                              <p className="text-slate-800 dark:text-slate-200">{idea.peelScaffolding.example}</p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 text-xs space-y-1">
                              <span className="font-bold text-amber-800 dark:text-amber-300 block text-[11px] uppercase">
                                🔗 L - Link (Liên kết câu kết):
                              </span>
                              <p className="text-slate-800 dark:text-slate-200">{idea.peelScaffolding.link}</p>
                            </div>
                          </div>

                          {/* Counter Argument & Coach Advice */}
                          {idea.counterArgumentOrNuance && (
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 block">
                                ⚡ Luận điểm phản biện (Counterargument Nuance):
                              </span>
                              <p className="text-slate-700 dark:text-slate-300">{idea.counterArgumentOrNuance}</p>
                            </div>
                          )}

                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">
                            💡 <strong>Lời khuyên của Coach Mia:</strong> {idea.coachAdviceVi}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}

              {/* TAB 3: ✨ C1/C2 Collocations (Prof. Arthur) */}
              {activeTab === 'collocations' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 text-xs font-bold">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>Prof. Arthur: Nâng cấp Collocations & Academic Hedging (Dựa trên câu chuẩn của Dr. Vance)</span>
                    </div>
                  </div>

                  {report.collocationUpgrades && report.collocationUpgrades.length > 0 ? (
                    <div className="space-y-3.5">
                      {report.collocationUpgrades.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3 shadow-sm"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">
                                Cụm gốc / Câu đã sửa lỗi chuẩn:
                              </span>
                              <p className="text-slate-700 dark:text-slate-300 italic font-mono">
                                "{item.fixedBaseSentence || item.originalPhrase}"
                              </p>
                            </div>

                            <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 space-y-1">
                              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                                Bản nâng cấp C1/C2 Collocation:
                              </span>
                              <p className="text-slate-900 dark:text-white font-bold font-mono">
                                "{item.upgradedC1C2Collocation}"
                              </p>
                            </div>
                          </div>

                          {item.academicHedgingOption && (
                            <div className="p-2.5 rounded-lg bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/50 text-xs space-y-0.5">
                              <span className="text-[10px] font-bold text-sky-700 dark:text-sky-300 uppercase">
                                🛡️ Academic Hedging (Thận trọng học thuật):
                              </span>
                              <p className="text-slate-800 dark:text-slate-200">{item.academicHedgingOption}</p>
                            </div>
                          )}

                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            💡 <strong>Ghi chú của Prof. Arthur:</strong> {item.maestroNotesVi}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}

              {/* TAB 4: ⚖️ Perspective Tensions */}
              {activeTab === 'tensions' && report.perspectiveTensions && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 flex items-center gap-2 text-purple-900 dark:text-purple-200 text-xs font-bold">
                    <Scale className="w-4 h-4 text-purple-600" />
                    <span>Quy tắc Nhất Quán (Consistency Rule): Giải quyết xung đột giữa Độ Chính Xác (Accuracy) và Chiều Sâu Luận Điểm (Idea Depth)</span>
                  </div>

                  <div className="space-y-3">
                    {report.perspectiveTensions.map((ten, idx) => (
                      <div
                        key={idx}
                        className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3 text-xs"
                      >
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                          {ten.issue}
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 space-y-1">
                            <span className="font-bold text-rose-700 dark:text-rose-300 text-[11px] block">
                              🔴 Quan điểm của Giám khảo Dr. Vance (Accuracy First):
                            </span>
                            <p className="text-slate-700 dark:text-slate-300">{ten.examinerStance}</p>
                          </div>

                          <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 space-y-1">
                            <span className="font-bold text-amber-700 dark:text-amber-300 text-[11px] block">
                              💡 Quan điểm của Coach Mia (Depth & Development):
                            </span>
                            <p className="text-slate-700 dark:text-slate-300">{ten.coachStance}</p>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 space-y-1">
                          <span className="font-bold text-indigo-700 dark:text-indigo-300 text-[11px] block">
                            🎯 Lời khuyên chiến lược dung hòa tối ưu điểm thi:
                          </span>
                          <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                            {ten.resolutionAdviceVi}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <button data-ux-flow="dashboard.daily"
                  type="button"
                  onClick={() =>
                    openAITutorWithPrompt(
                      `Tôi đang nhận phản hồi từ Hội Đồng Cố Vấn IELTS Master Mentor Panel về bài viết của mình. Hãy đóng vai Coach Mia và hướng dẫn tôi triển khai chi tiết cấu trúc PEEL cho bài viết này.`
                    )
                  }
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-2 transition-all"
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Trao đổi thêm với AI Tutor</span>
                </button>

                <button data-ux-flow="dashboard.daily"
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all"
                >
                  Đóng Bảng Cố Vấn
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
