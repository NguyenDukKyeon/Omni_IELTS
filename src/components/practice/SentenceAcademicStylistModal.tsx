import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  BookmarkPlus,
  Layers,
  RotateCcw,
  Zap,
  Info,
  ShieldAlert,
  Flame,
  FileText,
  Sliders,
} from 'lucide-react';
import {
  SentenceAcademicStylistResult,
  SentenceAcademicStylistInput,
  StandardErrorObject,
} from '../../types';
import { rewriteSentence3TiersApi } from '../../services/practiceService';
import { useApp } from '../../context/AppContext';
import { XP_REWARDS } from '../../services/gamification';

interface SentenceAcademicStylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSentence?: string;
  initialTopic?: string;
}

const PRESET_SENTENCES = [
  {
    label: 'Opinion / Agreement',
    topic: 'Should environmental protection be prioritized over economic expansion?',
    sentence: 'I think that government must spend more money to protect nature because pollution is very bad for people life.',
  },
  {
    label: 'Cause & Effect',
    topic: 'Causes of urban traffic congestion and potential remedies',
    sentence: 'Many people has cars nowadays so the traffic jam happen everyday and make everyone feel tired.',
  },
  {
    label: 'Problem & Solution',
    topic: 'Rising cost of higher education for young individuals',
    sentence: 'Tuition fee is getting very high and poor students can not go to university, so government should give them free money.',
  },
  {
    label: 'Technology & AI',
    topic: 'The impact of artificial intelligence on future employment',
    sentence: 'AI is taking away many jobs from worker and this is a huge danger for the human society.',
  },
];

export const SentenceAcademicStylistModal: React.FC<SentenceAcademicStylistModalProps> = ({
  isOpen,
  onClose,
  initialSentence = '',
  initialTopic = '',
}) => {
  const { addMistake, addVocabCard, awardXP } = useApp();

  const [sentence, setSentence] = useState<string>(initialSentence || PRESET_SENTENCES[0].sentence);
  const [essayTopic, setEssayTopic] = useState<string>(initialTopic || PRESET_SENTENCES[0].topic);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<SentenceAcademicStylistResult | null>(null);

  // Interaction feedback states
  const [copiedTier, setCopiedTier] = useState<string | null>(null);
  const [savedCollocations, setSavedCollocations] = useState<Set<string>>(new Set());
  const [savedMistakes, setSavedMistakes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (initialSentence) {
      setSentence(initialSentence);
    }
    if (initialTopic) {
      setEssayTopic(initialTopic);
    }
  }, [initialSentence, initialTopic]);

  if (!isOpen) return null;

  const handleRunRewrite = async () => {
    if (!sentence || sentence.trim().length < 5) {
      setErrorMessage('Vui lòng nhập một câu văn hoàn chỉnh để nâng cấp.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      const payload: SentenceAcademicStylistInput = {
        sentence: sentence.trim(),
        essayTopic: essayTopic.trim() || 'IELTS Academic Writing',
        targetBand: 8.5,
      };
      const data = await rewriteSentence3TiersApi(payload);
      setResult(data);
      awardXP(XP_REWARDS.EXERCISE_COMPLETED, 'Nâng cấp câu văn 3 cấp độ Band!');
    } catch (err: any) {
      console.error('Sentence rewrite error:', err);
      setErrorMessage(
        err.message || 'Không thể kết nối với mô hình gemini-3.1-pro để nâng cấp câu văn.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = (text: string, tierKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTier(tierKey);
    setTimeout(() => setCopiedTier(null), 2500);
  };

  const handleSaveCollocation = (collocation: string) => {
    addVocabCard({
      id: `vocab_colloc_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      word: collocation,
      phonetic: '',
      pos: 'collocation',
      definitionVi: `Cụm từ học thuật C1/C2 dùng trong chủ đề: ${essayTopic || 'IELTS Academic'}`,
      definitionEn: `Academic collocation extracted from Examiner Band 7.5+/8.5+ sentence upgrade`,
      exampleEn: result?.upgradedVersions.band85.text || result?.upgradedVersions.band75.text || '',
      exampleVi: 'Xem câu nâng cấp mẫu trong bài viết.',
      collocations: [collocation],
      cefrLevel: 'C1',
      srsStage: 0,
      nextReviewDate: new Date().toISOString(),
      easeFactor: 2.5,
      intervalDays: 1,
      repetitions: 0,
      tags: ['sentence_stylist', 'academic_collocation'],
    });

    setSavedCollocations((prev) => new Set(prev).add(collocation));
  };

  const handleSaveMistake = (err: StandardErrorObject, idx: number) => {
    const mistakeKey = `${err.errorSubstring}_${idx}`;
    addMistake({
      id: `err_${Date.now()}_${idx}`,
      errorText: err.errorSubstring,
      correction: result?.upgradedVersions.band65.text || 'Xem phiên bản sửa lỗi',
      explanation: err.explanationVi,
      type: (err.errorCategory.toLowerCase() as any) || 'grammar',
      srsStage: 0,
      nextReviewDate: new Date().toISOString(),
      tags: ['sentence_stylist', err.errorCategory],
    });

    setSavedMistakes((prev) => new Set(prev).add(mistakeKey));
  };

  return (
    <div
      id="sentence-academic-stylist-modal"
      className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden my-4 sm:my-8 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              <Sparkles className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                  Cambridge Examiner & Academic Stylist
                </h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-300/30">
                  gemini-3.1-pro
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Nâng cấp câu văn 3 cấp độ: Band 6.5 (Chuẩn ngữ pháp) ➔ Band 7.5 (Học thuật tự nhiên) ➔ Band 8.5+ (Sắc sảo & Nuance)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {/* ERROR ALERT (Strict error handling) */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 flex items-start gap-3 text-rose-900 dark:text-rose-200 animate-fadeIn">
              <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm">
                <p className="font-bold">Lỗi xử lý câu văn</p>
                <p className="mt-0.5 text-rose-700 dark:text-rose-300">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* INPUT FORM & PRESETS */}
          <div className="space-y-4 bg-stone-50 dark:bg-stone-800/40 p-4 sm:p-5 rounded-3xl border border-stone-200/80 dark:border-stone-700/80">
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5 flex items-center justify-between">
                <span>Ngữ cảnh / Chủ đề bài viết (Essay Topic Context):</span>
                <span className="text-[11px] text-stone-700 dark:text-stone-300 font-normal">
                  Giúp AI giữ nguyên lập trường và văn phong học thuật
                </span>
              </label>
              <input
                type="text"
                value={essayTopic}
                onChange={(e) => setEssayTopic(e.target.value)}
                placeholder="vd: Government subsidies for renewable energy vs fossil fuels"
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs sm:text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Câu văn bạn muốn nâng cấp (Selected Sentence):</span>
                </label>
                <span className="text-[11px] text-stone-700 dark:text-stone-300 font-mono">
                  {sentence.trim().split(/\s+/).filter(Boolean).length} từ
                </span>
              </div>
              <textarea
                rows={3}
                value={sentence}
                onChange={(e) => setSentence(e.target.value)}
                placeholder="Nhập hoặc dán câu văn cần nâng cấp..."
                className="w-full p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs sm:text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:border-indigo-500 font-mono leading-relaxed"
              />
            </div>

            {/* Quick Preset Buttons */}
            <div>
              <span className="text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider block mb-2">
                Hoặc thử nhanh câu mẫu các dạng đề:
              </span>
              <div className="flex flex-wrap gap-2">
                {PRESET_SENTENCES.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSentence(preset.sentence);
                      setEssayTopic(preset.topic);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:border-indigo-400 text-xs text-stone-700 dark:text-stone-300 font-medium transition-all text-left flex items-center gap-1.5"
                  >
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Run Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleRunRewrite}
                disabled={isLoading}
                className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin" />
                    <span>Giám Khảo Cambridge đang phân tích & nâng cấp...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Nâng Cấp 3 Cấp Độ Band (gemini-3.1-pro)</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* RESULTS DISPLAY */}
          {result && (
            <div className="space-y-6 animate-fadeIn">
              {/* DETECTED ERRORS TAXONOMY */}
              {result.detectedErrors && result.detectedErrors.length > 0 && (
                <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 space-y-2.5">
                  <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Lỗi phát hiện trong câu gốc ({result.detectedErrors.length} điểm cần sửa):</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {result.detectedErrors.map((err, idx) => {
                      const mistakeKey = `${err.errorSubstring}_${idx}`;
                      const isSaved = savedMistakes.has(mistakeKey);
                      return (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-white dark:bg-stone-800 border border-rose-200/80 dark:border-rose-900/40 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-mono font-bold text-[10px]">
                              {err.errorCategory}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleSaveMistake(err, idx)}
                              disabled={isSaved}
                              className={`flex items-center gap-1 text-[11px] font-bold ${
                                isSaved
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-stone-700 dark:text-stone-300 hover:text-rose-600'
                              }`}
                            >
                              {isSaved ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Đã lưu sổ tay</span>
                                </>
                              ) : (
                                <>
                                  <BookmarkPlus className="w-3.5 h-3.5" />
                                  <span>Lưu lỗi sai</span>
                                </>
                              )}
                            </button>
                          </div>
                          <p className="font-mono text-stone-900 dark:text-stone-100 font-bold">
                            "{err.errorSubstring}"
                          </p>
                          <p className="text-stone-700 dark:text-stone-300 text-[11px] leading-relaxed">
                            {err.explanationVi}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3-TIER COMPARISON CARDS */}
              <div className="space-y-4">
                <h3 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>3 Cấp Độ Nâng Cấp Chuẩn Cambridge Band Descriptors:</span>
                </h3>

                <div className="grid grid-cols-1 gap-4">
                  {/* TIER 1: BAND 6.5 (Clean & Accurate) */}
                  <div className="p-5 rounded-3xl bg-slate-50 dark:bg-stone-800/60 border border-slate-200 dark:border-stone-700 space-y-3 relative overflow-hidden group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-black">
                          Band 6.5
                        </span>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                          Clean & Accurate (Sửa đúng 100% ngữ pháp, giữ cấu trúc gốc)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyText(result.upgradedVersions.band65.text, 'band65')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-stone-800 hover:bg-slate-100 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-stone-700 transition-all cursor-pointer"
                      >
                        {copiedTier === 'band65' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600">Đã sao chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Sao chép</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-sm font-serif italic text-slate-900 dark:text-slate-100 leading-relaxed pl-3 border-l-2 border-slate-400">
                      "{result.upgradedVersions.band65.text}"
                    </p>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900/60 text-xs text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-stone-800 flex items-start gap-2">
                      <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <span>
                        <strong>Điểm sửa chính:</strong> {result.upgradedVersions.band65.keyFixesVi}
                      </span>
                    </div>
                  </div>

                  {/* TIER 2: BAND 7.5 (Academic & Cohesive) */}
                  <div className="p-5 rounded-3xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/80 space-y-3 relative overflow-hidden group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-black shadow-sm shadow-indigo-600/25">
                          Band 7.5
                        </span>
                        <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                          Academic & Cohesive (Từ vựng B2/C1, nhịp điệu mượt mà)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyText(result.upgradedVersions.band75.text, 'band75')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-stone-800 hover:bg-indigo-100 text-xs font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-all cursor-pointer"
                      >
                        {copiedTier === 'band75' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600">Đã sao chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Sao chép</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-sm font-serif italic text-indigo-950 dark:text-indigo-100 font-medium leading-relaxed pl-3 border-l-2 border-indigo-500">
                      "{result.upgradedVersions.band75.text}"
                    </p>

                    {/* Key Collocations */}
                    {result.upgradedVersions.band75.keyCollocations &&
                      result.upgradedVersions.band75.keyCollocations.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span className="text-[11px] font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider">
                            Collocations C1:
                          </span>
                          {result.upgradedVersions.band75.keyCollocations.map((colloc, cIdx) => {
                            const isSaved = savedCollocations.has(colloc);
                            return (
                              <button
                                key={cIdx}
                                type="button"
                                onClick={() => handleSaveCollocation(colloc)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1 transition-all ${
                                  isSaved
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-white dark:bg-stone-900 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700 hover:bg-indigo-100'
                                }`}
                              >
                                {isSaved ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <BookmarkPlus className="w-3 h-3" />
                                )}
                                <span>{colloc}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                    <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900/60 text-xs text-indigo-900 dark:text-indigo-200 border border-indigo-200/60 dark:border-indigo-900 flex items-start gap-2">
                      <Zap className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                      <span>
                        <strong>Giải thích nâng cấp:</strong> {result.upgradedVersions.band75.keyFixesVi}
                      </span>
                    </div>
                  </div>

                  {/* TIER 3: BAND 8.5+ (Mastery & Nuance) */}
                  <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-500/10 via-sky-500/10 to-indigo-500/10 border-2 border-amber-400/60 dark:border-amber-500/40 space-y-3.5 relative overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-black shadow-md shadow-amber-500/30">
                          Band 8.5+
                        </span>
                        <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                          Mastery & Nuance (Cleft sentence, Nominalization, Hedging)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyText(result.upgradedVersions.band85.text, 'band85')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                      >
                        {copiedTier === 'band85' ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Đã sao chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Sao chép</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-sm sm:text-base font-serif italic text-stone-900 dark:text-stone-100 font-bold leading-relaxed pl-3 border-l-2 border-amber-500">
                      "{result.upgradedVersions.band85.text}"
                    </p>

                    {/* Technique & Collocations */}
                    <div className="space-y-2 pt-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                          Kỹ thuật đỉnh cao:
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 text-xs font-bold">
                          {result.upgradedVersions.band85.grammaticalTechnique}
                        </span>
                      </div>

                      {result.upgradedVersions.band85.keyCollocations &&
                        result.upgradedVersions.band85.keyCollocations.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                              Vốn từ C2:
                            </span>
                            {result.upgradedVersions.band85.keyCollocations.map((colloc, cIdx) => {
                              const isSaved = savedCollocations.has(colloc);
                              return (
                                <button
                                  key={cIdx}
                                  type="button"
                                  onClick={() => handleSaveCollocation(colloc)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1 transition-all ${
                                    isSaved
                                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                                      : 'bg-white dark:bg-stone-900 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700 hover:bg-amber-100'
                                  }`}
                                >
                                  {isSaved ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <BookmarkPlus className="w-3 h-3" />
                                  )}
                                  <span>{colloc}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-stone-900/80 text-xs text-stone-800 dark:text-stone-200 border border-amber-300/60 dark:border-amber-800 flex items-start gap-2 leading-relaxed">
                      <Flame className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <span>
                        <strong>Nuance & Phân tích Giám khảo:</strong>{' '}
                        {result.upgradedVersions.band85.keyFixesVi}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
