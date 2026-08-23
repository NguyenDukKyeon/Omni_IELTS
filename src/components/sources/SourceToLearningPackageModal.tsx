import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  BookOpen,
  Headphones,
  Mic2,
  PenTool,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Volume2,
  BookmarkPlus,
  Check,
  Zap,
  ArrowRight,
  ShieldAlert,
  Sliders,
  FileText,
  Copy,
  FolderPlus,
  Play,
  Pause,
} from 'lucide-react';
import {
  SourceToLearningPackageResult,
  CourseDesignerReadingQuestion,
  CourseDesignerListeningQuestion,
  CourseDesignerVocabItem,
  VocabCard,
} from '../../types';
import {
  generateSourceToLearningPackageApi,
  speakExaminerText,
} from '../../services/practiceService';
import { useApp } from '../../context/AppContext';
import { XP_REWARDS } from '../../services/gamification';

interface SourceToLearningPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSourceText?: string;
  initialTargetBand?: number;
}

const SAMPLE_SOURCES = [
  {
    title: 'Mẫu 1: Trí tuệ nhân tạo trong Y tế (AI & Healthcare)',
    text: `Artificial intelligence is transforming contemporary clinical healthcare by enabling rapid diagnostic analysis and personalized treatment regimens. In recent epidemiological studies, deep-learning algorithms detected early-stage pulmonary abnormalities with accuracy rates surpassing 94%, matching seasoned radiologists. However, bioethicists urge caution regarding algorithmic bias, algorithmic opacity, and the erosion of patient-physician rapport. Consequently, healthcare authorities emphasize that AI systems must act as augmentative clinical copilots rather than autonomous medical arbiters.`,
  },
  {
    title: 'Mẫu 2: Biến đổi khí hậu & Đô thị hóa (Urban Ecology)',
    text: `Accelerated urbanization combined with global temperature anomalies has exacerbated the urban heat island effect across megacities. Impervious concrete surfaces absorb and re-radiate thermal energy, creating microclimates up to 5 degrees Celsius hotter than surrounding rural peripheries. To mitigate ecological vulnerability, civil architects advocate for bioswales, reflective roofing substrates, and expanded urban tree canopies, which drastically reduce building cooling costs and enhance stormwater absorption.`,
  },
];

export const SourceToLearningPackageModal: React.FC<SourceToLearningPackageModalProps> = ({
  isOpen,
  onClose,
  initialSourceText = '',
  initialTargetBand = 7.0,
}) => {
  const { profile, mistakes, addVocabCard, awardXP } = useApp();

  const [sourceText, setSourceText] = useState<string>(initialSourceText);
  const [targetBand, setTargetBand] = useState<number>(initialTargetBand || profile.targetBand || 7.0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<SourceToLearningPackageResult | null>(null);
  const [activeTab, setActiveTab] = useState<'reading' | 'listening' | 'speaking' | 'writing' | 'vocab'>('reading');

  // Interactive Quiz States
  const [userReadingAnswers, setUserReadingAnswers] = useState<Record<number, string>>({});
  const [showReadingResults, setShowReadingResults] = useState<boolean>(false);
  const [userListeningAnswers, setUserListeningAnswers] = useState<Record<number, string>>({});
  const [showListeningResults, setShowListeningResults] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [syncedVocabIndices, setSyncedVocabIndices] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      if (initialSourceText) {
        setSourceText(initialSourceText);
        handleGeneratePackage(initialSourceText, targetBand);
      } else {
        setSourceText(SAMPLE_SOURCES[0].text);
      }
    } else {
      setResult(null);
      setErrorMessage(null);
      setShowReadingResults(false);
      setShowListeningResults(false);
      setUserReadingAnswers({});
      setUserListeningAnswers({});
      setSyncedVocabIndices({});
      window.speechSynthesis?.cancel();
    }
  }, [isOpen, initialSourceText, targetBand]);

  if (!isOpen) return null;

  // Extract learner weaknesses
  const weakestAxes: string[] = [];
  const recentMistakeTags = (Array.from(new Set(mistakes.flatMap((m) => m.tags || []))) as string[]).slice(0, 5);

  const handleGeneratePackage = async (textOverride?: string, bandOverride?: number) => {
    const text = textOverride || sourceText;
    const band = bandOverride || targetBand;

    if (!text.trim() || text.length < 15) {
      setErrorMessage('Vui lòng cung cấp văn bản nguồn (tối thiểu 15 ký tự).');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setResult(null);
    setShowReadingResults(false);
    setShowListeningResults(false);
    setUserReadingAnswers({});
    setUserListeningAnswers({});
    setSyncedVocabIndices({});

    try {
      const data = await generateSourceToLearningPackageApi({
        sourceText: text,
        targetBand: band,
        learnerProfile: {
          targetBand: band,
          weakestAxes: weakestAxes.length > 0 ? weakestAxes : undefined,
          recentMistakeTags: recentMistakeTags.length > 0 ? recentMistakeTags : undefined,
        },
      });

      setResult(data);
      awardXP(XP_REWARDS.EXERCISE_COMPLETED, 'Thiết kế gói bài học 4 kỹ năng với AI Course Designer');
    } catch (err: any) {
      console.error('Course Designer failed:', err);
      setErrorMessage(err?.message || 'Không thể tạo gói bài học từ gemini-3.1-pro.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayListeningAudio = (script: string) => {
    if (isPlayingAudio) {
      window.speechSynthesis?.cancel();
      setIsPlayingAudio(false);
      return;
    }

    setIsPlayingAudio(true);
    speakExaminerText(script, 0.9, 'British', () => {
      setIsPlayingAudio(false);
    });
  };

  const handleSyncVocab = (item: CourseDesignerVocabItem, index: number) => {
    const newCard: VocabCard = {
      id: `vocab_cd_${Date.now()}_${index}`,
      word: item.word,
      phonetic: item.phonetic || '',
      pos: 'noun',
      definitionVi: item.meaningVi,
      definitionEn: item.meaningVi,
      exampleEn: item.example || item.word,
      exampleVi: '',
      collocations: item.collocation ? [item.collocation] : [],
      examples: item.example
        ? [
            {
              en: item.example,
              vi: '',
              context: 'Academic',
            },
          ]
        : [],
      topicDeck: result?.detectedTopic || 'IELTS Academic Reading/Listening',
      cefrLevel: (item.cefrLevel as any) || 'C1',
      originModule: 'source_import',
      srsStage: 0,
      intervalDays: 1,
      repetitions: 0,
      easeFactor: 2.5,
      nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      mastered: false,
    };

    addVocabCard(newCard);
    setSyncedVocabIndices((prev) => ({ ...prev, [index]: true }));
  };

  const handleSyncAllVocab = () => {
    if (!result?.extractedVocabulary) return;
    result.extractedVocabulary.forEach((item, idx) => {
      if (!syncedVocabIndices[idx]) {
        handleSyncVocab(item, idx);
      }
    });
  };

  return (
    <div
      id="source-to-learning-package-modal"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden my-4 sm:my-8 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 shadow-md border-b border-indigo-900/50">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-2xl shadow-inner shrink-0">
              🎓
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  AI Course Designer (Source-To-Learning Package)
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-400/20 text-blue-200 border border-blue-300/30">
                  gemini-3.1-pro
                </span>
              </div>
              <p className="text-xs text-blue-200/90 mt-0.5">
                Chuyển 1 văn bản nguồn thành gói bài học 4 Kỹ Năng IELTS chuẩn khảo thí Cambridge
              </p>
            </div>
          </div>
          <button data-ux-flow="sources.manage"
            onClick={() => {
              window.speechSynthesis?.cancel();
              onClose();
            }}
            className="p-2 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Learner Profile Context Banner */}
        <div className="px-5 py-2.5 bg-indigo-50/80 dark:bg-indigo-950/60 border-b border-indigo-200 dark:border-indigo-900/50 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
            <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="font-bold">Trọng số cá nhân hóa:</span>
            <span>Mục tiêu Band {targetBand}</span>
            {recentMistakeTags.length > 0 && (
              <span className="text-[11px] text-slate-500">
                • Ưu tiên khắc phục: {recentMistakeTags.join(', ')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-slate-500">Đổi Band:</span>
            {[6.0, 6.5, 7.0, 7.5, 8.0].map((b) => (
              <button data-ux-flow="sources.manage"
                key={b}
                type="button"
                onClick={() => {
                  setTargetBand(b);
                  handleGeneratePackage(sourceText, b);
                }}
                className={`px-2 py-0.5 rounded font-bold transition-all ${
                  targetBand === b
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* Input Workspace (Collapsible if Result available) */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Văn bản nguồn (Trích từ PDF / URL / Tài liệu):</span>
            </span>

            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-slate-400">Tải mẫu nhanh:</span>
              {SAMPLE_SOURCES.map((s, idx) => (
                <button data-ux-flow="sources.manage"
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSourceText(s.text);
                    handleGeneratePackage(s.text, targetBand);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition-all"
                >
                  {s.title}
                </button>
              ))}
            </div>
          </div>

          <textarea data-ux-flow="sources.manage"
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="Dán đoạn văn học thuật từ sách, báo chí hoặc file PDF của bạn vào đây..."
            rows={3}
            className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs sm:text-sm leading-relaxed focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />

          <div className="flex justify-end">
            <button data-ux-flow="sources.manage"
              type="button"
              onClick={() => handleGeneratePackage()}
              disabled={isLoading || !sourceText.trim()}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all"
            >
              {isLoading ? (
                <RotateCcw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>{isLoading ? 'AI đang thiết kế bài học 4 kỹ năng...' : 'Thiết Kế Gói Bài Học 4 Kỹ Năng'}</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="m-5 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs sm:text-sm flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Lỗi thiết kế gói bài học</p>
              <p className="mt-0.5 text-rose-700 dark:text-rose-300">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="py-16 text-center space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/60 border border-blue-400/40 flex items-center justify-center text-3xl mx-auto animate-pulse">
              🎓
            </div>
            <div className="space-y-1">
              <p className="text-base font-black text-slate-900 dark:text-white">
                AI Course Designer đang soạn thảo bài học...
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Đang chuẩn hóa bài đọc Reading đa dạng câu hỏi, kịch bản Listening TTS, câu hỏi Speaking mở rộng, đề Writing và bộ từ vựng học thuật C1/C2...
              </p>
            </div>
          </div>
        )}

        {/* Results 4-Skill Navigation Tabs */}
        {result && (
          <>
            <div className="px-5 pt-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 overflow-x-auto shrink-0">
              <button data-ux-flow="sources.manage"
                type="button"
                onClick={() => setActiveTab('reading')}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-xl text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'reading'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/40'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>📖 Reading ({result.reading.questions.length} câu)</span>
              </button>

              <button data-ux-flow="sources.manage"
                type="button"
                onClick={() => setActiveTab('listening')}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-xl text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'listening'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/40'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Headphones className="w-4 h-4" />
                <span>🎧 Listening Audio ({result.listening.speakerCount} người nói)</span>
              </button>

              <button data-ux-flow="sources.manage"
                type="button"
                onClick={() => setActiveTab('speaking')}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-xl text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'speaking'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/40'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Mic2 className="w-4 h-4" />
                <span>🗣️ Speaking ({result.speaking.discussionQuestions.length} câu hỏi)</span>
              </button>

              <button data-ux-flow="sources.manage"
                type="button"
                onClick={() => setActiveTab('writing')}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-xl text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'writing'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/40'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <PenTool className="w-4 h-4" />
                <span>✍️ Writing Task</span>
              </button>

              <button data-ux-flow="sources.manage"
                type="button"
                onClick={() => setActiveTab('vocab')}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-xl text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'vocab'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/40'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>📚 Từ Vựng C1/C2 ({result.extractedVocabulary.length})</span>
              </button>
            </div>

            {/* Tab Panes */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
              {/* TAB 1: READING */}
              {activeTab === 'reading' && (
                <div className="space-y-6 animate-fadeIn">
                  {/* Passage */}
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                      <span>CHỦ ĐỀ: {result.detectedTopic}</span>
                      <span>ĐỘ KHÓ: CEFR {result.estimatedSourceDifficulty}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-serif">
                      {result.reading.passage}
                    </p>
                  </div>

                  {/* Mixed Questions */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      <span>Câu Hỏi Luyện Đọc (Đã trộn đa dạng dạng câu hỏi IELTS):</span>
                    </h4>

                    {result.reading.questions.map((q, qIdx) => {
                      const isAnswered = userReadingAnswers[qIdx] !== undefined;
                      const isCorrect =
                        userReadingAnswers[qIdx]?.trim().toLowerCase() ===
                        q.answer.trim().toLowerCase();

                      return (
                        <div
                          key={qIdx}
                          className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3 shadow-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase">
                              Câu {qIdx + 1} • {q.type}
                            </span>
                            {showReadingResults && (
                              <span
                                className={`text-xs font-bold ${
                                  isCorrect ? 'text-emerald-600' : 'text-rose-600'
                                }`}
                              >
                                {isCorrect ? '✓ Chính xác' : '✗ Chưa đúng'}
                              </span>
                            )}
                          </div>

                          <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                            {q.text}
                          </p>

                          {/* Options if available */}
                          {q.options && q.options.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {q.options.map((opt, oIdx) => (
                                <button data-ux-flow="sources.manage"
                                  key={oIdx}
                                  type="button"
                                  onClick={() =>
                                    setUserReadingAnswers((prev) => ({ ...prev, [qIdx]: opt }))
                                  }
                                  className={`p-2.5 rounded-xl text-xs font-semibold text-left border transition-all ${
                                    userReadingAnswers[qIdx] === opt
                                      ? 'bg-blue-600 text-white border-blue-600'
                                      : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-blue-50'
                                  }`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <input data-ux-flow="sources.manage"
                              type="text"
                              value={userReadingAnswers[qIdx] || ''}
                              onChange={(e) =>
                                setUserReadingAnswers((prev) => ({
                                  ...prev,
                                  [qIdx]: e.target.value,
                                }))
                              }
                              placeholder="Nhập câu trả lời của bạn..."
                              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            />
                          )}

                          {showReadingResults && (
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 text-xs space-y-1 border border-slate-200 dark:border-slate-700">
                              <p className="text-emerald-600 dark:text-emerald-400 font-bold">
                                Đáp án chuẩn: {q.answer}
                              </p>
                              {q.explanationVi && (
                                <p className="text-slate-500 italic">{q.explanationVi}</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <button data-ux-flow="sources.manage"
                      type="button"
                      onClick={() => setShowReadingResults(true)}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs shadow-md transition-all"
                    >
                      Kiểm Tra Đáp Án Reading
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: LISTENING */}
              {activeTab === 'listening' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                        Kịch Bản Audio Khảo Thí ({result.listening.speakerCount} người nói):
                      </span>

                      <button data-ux-flow="sources.manage"
                        type="button"
                        onClick={() => handlePlayListeningAudio(result.listening.script)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all ${
                          isPlayingAudio
                            ? 'bg-rose-600 text-white'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                      >
                        {isPlayingAudio ? (
                          <>
                            <Pause className="w-3.5 h-3.5" />
                            <span>Dừng Giọng Đọc</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" />
                            <span>Phát Giọng Giám Khảo (TTS)</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed italic bg-white dark:bg-slate-900 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900">
                      "{result.listening.script}"
                    </p>
                  </div>

                  {/* Listening Questions */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Câu Hỏi Nghe Hiểu (Listening Comprehension):
                    </h4>

                    {result.listening.questions.map((q, qIdx) => (
                      <div
                        key={qIdx}
                        className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3"
                      >
                        <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold uppercase">
                          Câu {qIdx + 1} • {q.type}
                        </span>
                        <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                          {q.text}
                        </p>

                        <input data-ux-flow="sources.manage"
                          type="text"
                          value={userListeningAnswers[qIdx] || ''}
                          onChange={(e) =>
                            setUserListeningAnswers((prev) => ({
                              ...prev,
                              [qIdx]: e.target.value,
                            }))
                          }
                          placeholder="Điền từ nghe được..."
                          className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />

                        {showListeningResults && (
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 text-xs space-y-1">
                            <p className="text-emerald-600 dark:text-emerald-400 font-bold">
                              Đáp án: {q.answer}
                            </p>
                            {q.explanationVi && (
                              <p className="text-slate-500 italic">{q.explanationVi}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    <button data-ux-flow="sources.manage"
                      type="button"
                      onClick={() => setShowListeningResults(true)}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs shadow-md transition-all"
                    >
                      Kiểm Tra Đáp Án Listening
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: SPEAKING */}
              {activeTab === 'speaking' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200">
                    💡 <strong>Chiến lược Speaking:</strong> Các câu hỏi được thiết kế tăng dần độ trừu tượng, từ trải nghiệm cá nhân đến tác động vĩ mô theo phong cách IELTS Speaking Part 3.
                  </div>

                  <div className="space-y-3">
                    {result.speaking.discussionQuestions.map((ques, idx) => (
                      <div
                        key={idx}
                        className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2 shadow-xs"
                      >
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                          Discussion Question {idx + 1}:
                        </span>
                        <p className="text-sm sm:text-base font-serif font-bold text-slate-900 dark:text-white leading-relaxed">
                          "{ques}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: WRITING */}
              {activeTab === 'writing' && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white border border-indigo-800/60 shadow-lg space-y-3">
                    <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">
                      Đề bài Writing Task 2 phát triển từ nguồn học liệu:
                    </span>
                    <h3 className="text-base sm:text-lg font-serif font-bold leading-relaxed text-slate-100">
                      "{result.writing.prompt}"
                    </h3>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">
                      Muốn làm bài viết này và được chấm theo 4 tiêu chí Cambridge?
                    </span>
                    <button data-ux-flow="sources.manage"
                      onClick={() => {
                        sessionStorage.setItem(
                          'omni_pending_writing_prompt',
                          JSON.stringify({
                            title: `Chủ đề từ tài liệu: ${result.detectedTopic}`,
                            promptStatement: result.writing.prompt,
                            category: 'Source-Based Essay',
                            taskType: 'task2_essay',
                          })
                        );
                        window.dispatchEvent(
                          new CustomEvent('omni_load_writing_prompt', {
                            detail: {
                              title: `Chủ đề từ tài liệu: ${result.detectedTopic}`,
                              promptStatement: result.writing.prompt,
                              category: 'Source-Based Essay',
                              taskType: 'task2_essay',
                            },
                          })
                        );
                        onClose();
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap shrink-0"
                    >
                      <span>Vào Viết Bài Ngay</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 5: VOCABULARY */}
              {activeTab === 'vocab' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between flex-wrap gap-2 p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60">
                    <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
                      Trích xuất {result.extractedVocabulary.length} từ vựng học thuật C1/C2 đáng học nhất
                    </span>
                    <button data-ux-flow="sources.manage"
                      type="button"
                      onClick={handleSyncAllVocab}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <BookmarkPlus className="w-3.5 h-3.5" />
                      <span>Đồng Bộ Tất Cả Vào Flashcard SRS</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {result.extractedVocabulary.map((v, idx) => {
                      const isSynced = syncedVocabIndices[idx];
                      return (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-2 flex flex-col justify-between"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-base font-black text-blue-700 dark:text-blue-300">
                                {v.word}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-extrabold">
                                {v.cefrLevel || 'C1'}
                              </span>
                            </div>

                            {v.phonetic && (
                              <p className="text-xs font-mono text-slate-400">{v.phonetic}</p>
                            )}

                            <p className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                              ➔ <strong>Nghĩa:</strong> {v.meaningVi}
                            </p>

                            {v.collocation && (
                              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                                🔗 <strong>Collocation:</strong> {v.collocation}
                              </p>
                            )}

                            {v.example && (
                              <p className="text-[11px] text-slate-500 italic">
                                "{v.example}"
                              </p>
                            )}
                          </div>

                          <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                            <button data-ux-flow="sources.manage"
                              type="button"
                              onClick={() => handleSyncVocab(v, idx)}
                              disabled={isSynced}
                              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                                isSynced
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600'
                              }`}
                            >
                              {isSynced ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span>Đã Lưu</span>
                                </>
                              ) : (
                                <>
                                  <BookmarkPlus className="w-3 h-3" />
                                  <span>Lưu Flashcard</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
