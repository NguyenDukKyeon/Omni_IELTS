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
  Tag,
  Layers,
  FileText,
  Volume2,
  Copy,
  PlusCircle,
  CheckSquare,
} from 'lucide-react';
import {
  IntelligentErrorTaggerInput,
  IntelligentErrorTaggerReport,
  ExtractedErrorTaggerItem,
  MistakeEntry,
  VocabCard,
} from '../../types';
import { extractIntelligentErrorTagsApi } from '../../services/practiceService';
import { useApp } from '../../context/AppContext';
import { XP_REWARDS } from '../../services/gamification';

interface IntelligentErrorTaggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialText?: string;
  initialSkillSource?: string;
  contextPrompt?: string;
}

const SAMPLE_SUBMISSIONS = [
  {
    title: 'Writing Task 2 (Collocations & Modal)',
    skill: 'writing_task2',
    text: 'In contemporary society, many people thinks that university must to teach only science for get high salary jobs. He made a big research on environment but the result was not satisfied.',
  },
  {
    title: 'Speaking Part 2 (Pronunciation & Phrasing)',
    skill: 'speaking_part2',
    text: 'I would like to describe a memorable journey. Actually, I am very interested in explore new places, but my schedule was too tight so I cannot go there last summer.',
  },
  {
    title: 'Writing Task 1 (Tense & Data Reporting)',
    skill: 'writing_task1',
    text: 'As can be seen from the graph, the number of car users increase dramatically between 2000 and 2015, reaching a peak at 50% in the year of 2010.',
  },
];

export const IntelligentErrorTaggerModal: React.FC<IntelligentErrorTaggerModalProps> = ({
  isOpen,
  onClose,
  initialText = '',
  initialSkillSource = 'writing_task2',
  contextPrompt = '',
}) => {
  const { addMistake, addVocabCard, awardXP } = useApp();

  const [textToAnalyze, setTextToAnalyze] = useState<string>(initialText);
  const [skillSource, setSkillSource] = useState<string>(initialSkillSource);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [report, setReport] = useState<IntelligentErrorTaggerReport | null>(null);
  const [syncedIndices, setSyncedIndices] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      if (initialText) {
        setTextToAnalyze(initialText);
        setSkillSource(initialSkillSource);
        handleExtractErrors(initialText, initialSkillSource);
      } else {
        setTextToAnalyze(SAMPLE_SUBMISSIONS[0].text);
        setSkillSource(SAMPLE_SUBMISSIONS[0].skill);
      }
    } else {
      setReport(null);
      setErrorMessage(null);
      setSyncedIndices({});
    }
  }, [isOpen, initialText, initialSkillSource]);

  if (!isOpen) return null;

  const handleExtractErrors = async (textOverride?: string, skillOverride?: string) => {
    const targetText = textOverride || textToAnalyze;
    const targetSkill = skillOverride || skillSource;

    if (!targetText.trim() || targetText.length < 10) {
      setErrorMessage('Vui lòng nhập tối thiểu 10 ký tự để bóc tách lỗi sai.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSyncedIndices({});

    try {
      const data = await extractIntelligentErrorTagsApi({
        submissionText: targetText,
        skillSource: targetSkill,
        contextOrPrompt: contextPrompt,
        targetBand: 7.5,
      });

      setReport(data);
      awardXP(XP_REWARDS.EXERCISE_COMPLETED, 'Bóc tách lỗi sai & Tạo Flashcard SRS với Intelligent Error Tagger');
    } catch (err: any) {
      console.error('Error Tagger failure:', err);
      setErrorMessage(
        err?.message ||
          'Không thể kết nối với mô hình gemini-3.1-pro để bóc tách lỗi sai.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncCard = (item: ExtractedErrorTaggerItem, index: number) => {
    // 1. Create Mistake Entry with deterministic application scheduling
    const mistakeEntry: MistakeEntry = {
      id: `mistake_tag_${Date.now()}_${index}`,
      errorText: item.originalText,
      correctedText: item.correctedText,
      explanation: `${item.explanationVi} [Thẻ SRS: "${item.srsCardContent.front}"]`,
      errorType: (item.errorTag as any) || 'grammar',
      skill: item.skillSource.includes('speaking')
        ? 'speaking'
        : item.skillSource.includes('listening')
        ? 'listening'
        : item.skillSource.includes('reading')
        ? 'reading'
        : 'writing',
      originModule: 'writing_eval',
      // Deterministic SRS Initial State
      srsStage: 0,
      intervalDays: 1,
      repetitions: 0,
      easeFactor: 2.5,
      nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      reviewCount: 0,
      mastered: false,
      createdAt: new Date().toISOString(),
      tags: ['Intelligent Error Tagger', item.errorTag, item.skillSource, item.severity],
    };

    // 2. Create VocabCard with high-yield collocation content
    const vocabCard: VocabCard = {
      id: `vocab_tag_${Date.now()}_${index}`,
      word: item.srsCardContent.front,
      phonetic: item.srsCardContent.phonetic || '',
      pos: 'phrase / collocation',
      definitionVi: item.srsCardContent.backDefinitionVi,
      definitionEn: item.srsCardContent.backDefinitionVi,
      exampleEn: item.srsCardContent.sampleSentence,
      exampleVi: '',
      examples: [
        {
          en: item.srsCardContent.sampleSentence,
          vi: '',
          context: 'Academic',
        },
      ],
      collocations: [item.srsCardContent.front],
      topicDeck: 'IELTS High-Yield Accuracy',
      cefrLevel: (item.srsCardContent.cefrLevel as any) || 'C1',
      originModule: 'writing_eval',
      // Deterministic SRS Initial State
      srsStage: 0,
      intervalDays: 1,
      easeFactor: 2.5,
      repetitions: 0,
      nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      mastered: false,
    };

    addMistake(mistakeEntry);
    addVocabCard(vocabCard);
    setSyncedIndices((prev) => ({ ...prev, [index]: true }));
  };

  const handleSyncAllCards = () => {
    if (!report?.extractedErrors) return;
    report.extractedErrors.forEach((item, idx) => {
      if (!syncedIndices[idx]) {
        handleSyncCard(item, idx);
      }
    });
  };

  return (
    <div
      id="intelligent-error-tagger-modal"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden my-4 sm:my-8 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-indigo-900/50">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-2xl shadow-inner">
              🏷️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  Intelligent Error Tagger & SRS Flashcard Generator
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-300/30">
                  gemini-3.1-pro
                </span>
              </div>
              <p className="text-xs text-indigo-200/90 mt-0.5">
                Bóc tách tự động mọi lỗi sai ngôn ngữ/phát âm & Chuyển đổi thành Thẻ Flashcard SRS tức thì
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

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {/* Input Workspace */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Tag className="w-4 h-4 text-indigo-600" />
                <span>Nội dung cần phân tích lỗi sai:</span>
              </div>

              {/* Sample loader buttons */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="text-slate-400">Mẫu thử:</span>
                {SAMPLE_SUBMISSIONS.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setTextToAnalyze(sample.text);
                      setSkillSource(sample.skill);
                      handleExtractErrors(sample.text, sample.skill);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition-all"
                  >
                    {sample.title}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={textToAnalyze}
              onChange={(e) => setTextToAnalyze(e.target.value)}
              placeholder="Dán bài viết, câu trả lời Speaking hoặc ghi chú của bạn vào đây..."
              rows={4}
              className="w-full p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs sm:text-sm leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">Phân hệ kỹ năng:</span>
                <select
                  value={skillSource}
                  onChange={(e) => setSkillSource(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="writing_task2">Writing Task 2</option>
                  <option value="writing_task1">Writing Task 1</option>
                  <option value="speaking_part1">Speaking Part 1</option>
                  <option value="speaking_part2">Speaking Part 2</option>
                  <option value="speaking_part3">Speaking Part 3</option>
                  <option value="reading">Reading</option>
                  <option value="listening">Listening</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => handleExtractErrors()}
                disabled={isLoading || !textToAnalyze.trim()}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all"
              >
                {isLoading ? (
                  <RotateCcw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>{isLoading ? 'Đang bóc tách lỗi...' : 'Bóc Tách Lỗi & Tạo Flashcard SRS'}</span>
              </button>
            </div>
          </div>

          {/* Error Notice */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs sm:text-sm flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Lỗi xử lý bóc tách lỗi sai</p>
                <p className="mt-0.5 text-rose-700 dark:text-rose-300">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Loading Animation */}
          {isLoading && (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950/80 border-2 border-indigo-500/40 flex items-center justify-center text-2xl mx-auto animate-pulse">
                🏷️
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  Intelligent Error Tagger đang bóc tách từng lỗi sai...
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Phân loại StandardErrorObject taxonomy, tạo thẻ Flashcard Collocation C1/C2 kèm phiên âm IPA và định nghĩa tiếng Việt...
                </p>
              </div>
            </div>
          )}

          {/* Results Display */}
          {report && (
            <div className="space-y-5 animate-fadeIn">
              {/* Batch Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                      Đã phát hiện {report.extractedErrors.length} lỗi sai ngôn ngữ & cấu trúc
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Tất cả đã được chuyển đổi thành Flashcard SRS chuẩn (Interval=1d, Repetitions=0, EF=2.5)
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSyncAllCards}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Đồng Bộ Tất Cả Vào Flashcard SRS</span>
                </button>
              </div>

              {/* Cards Grid */}
              <div className="space-y-4">
                {report.extractedErrors.map((item, idx) => {
                  const isSynced = syncedIndices[idx];
                  return (
                    <div
                      key={idx}
                      className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4"
                    >
                      {/* Top Badges & Action */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-mono font-bold uppercase">
                            {item.errorTag}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                            Nguồn: {item.skillSource}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              item.severity === 'major'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : item.severity === 'moderate'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                            }`}
                          >
                            Mức độ: {item.severity}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSyncCard(item, idx)}
                          disabled={isSynced}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                            isSynced
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                          }`}
                        >
                          {isSynced ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>✓ Đã Nạp Flashcard SRS</span>
                            </>
                          ) : (
                            <>
                              <BookmarkPlus className="w-3.5 h-3.5" />
                              <span>+ Nạp Thẻ Flashcard Này</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Error vs Correction Diff */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 space-y-1">
                          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">
                            Câu gốc của bạn:
                          </span>
                          <p className="font-mono text-rose-700 dark:text-rose-300 line-through">
                            "{item.originalText}"
                          </p>
                        </div>

                        <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 space-y-1">
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                            Bản sửa chuẩn học thuật:
                          </span>
                          <p className="font-mono text-emerald-700 dark:text-emerald-300 font-bold">
                            "{item.correctedText}"
                          </p>
                        </div>
                      </div>

                      {/* Explanation */}
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        💡 <strong>Giải thích sư phạm:</strong> {item.explanationVi}
                      </p>

                      {/* SRS Card Content Preview Box */}
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-indigo-200/80 dark:border-indigo-900/50 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                              Nội Dung Thẻ Flashcard SRS Tương Ứng:
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold text-[10px]">
                            CEFR {item.srsCardContent.cefrLevel}
                          </span>
                        </div>

                        <div className="space-y-1.5 pt-1">
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span className="text-sm font-black text-indigo-700 dark:text-indigo-300">
                              {item.srsCardContent.front}
                            </span>
                            <span className="text-xs font-mono text-slate-400">
                              {item.srsCardContent.phonetic}
                            </span>
                          </div>

                          <p className="text-slate-800 dark:text-slate-200 font-medium">
                            ➔ <strong>Định nghĩa:</strong> {item.srsCardContent.backDefinitionVi}
                          </p>

                          <p className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                            💬 <strong>Câu ví dụ mẫu:</strong> "{item.srsCardContent.sampleSentence}"
                          </p>

                          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                            <span>Lịch lặp lại ban đầu (Deterministic): Interval = 1 ngày</span>
                            <span>Repetitions = 0 • Ease Factor = 2.5</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
