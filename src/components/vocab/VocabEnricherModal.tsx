import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Volume2,
  BookmarkPlus,
  Check,
  RotateCcw,
  BookOpen,
  HelpCircle,
  Lightbulb,
  Zap,
  Layers,
  ArrowRight,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  Tag,
} from 'lucide-react';
import { VocabEnricherResult, VocabCard } from '../../types';
import { enrichVocabCardApi, speakExaminerText } from '../../services/practiceService';
import { useApp } from '../../context/AppContext';
import { XP_REWARDS } from '../../services/gamification';

interface VocabEnricherModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialWord?: string;
  initialContext?: string;
}

const SAMPLE_WORDS = [
  { word: 'ubiquitous', context: 'công nghệ & đời sống số' },
  { word: 'mitigate', context: 'biến đổi khí hậu & môi trường' },
  { word: 'conduct research', context: 'nghiên cứu học thuật y khoa' },
  { word: 'detrimental', context: 'sức khỏe & lối sống ít vận động' },
];

export const VocabEnricherModal: React.FC<VocabEnricherModalProps> = ({
  isOpen,
  onClose,
  initialWord = '',
  initialContext = '',
}) => {
  const { addVocabCard, awardXP } = useApp();

  const [inputWord, setInputWord] = useState<string>(initialWord);
  const [interestContext, setInterestContext] = useState<string>(initialContext);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<VocabEnricherResult | null>(null);
  const [isSynced, setIsSynced] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      if (initialWord) {
        setInputWord(initialWord);
        setInterestContext(initialContext);
        handleEnrich(initialWord, initialContext);
      } else {
        setInputWord(SAMPLE_WORDS[0].word);
        setInterestContext(SAMPLE_WORDS[0].context);
      }
    } else {
      setResult(null);
      setErrorMessage(null);
      setIsSynced(false);
      window.speechSynthesis?.cancel();
    }
  }, [isOpen, initialWord, initialContext]);

  if (!isOpen) return null;

  const handleEnrich = async (wordOverride?: string, contextOverride?: string) => {
    const targetWord = wordOverride || inputWord;
    const targetCtx = contextOverride !== undefined ? contextOverride : interestContext;

    if (!targetWord.trim()) {
      setErrorMessage('Vui lòng nhập từ hoặc cụm từ cần làm giàu flashcard.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setResult(null);
    setIsSynced(false);

    try {
      const data = await enrichVocabCardApi({
        word: targetWord.trim(),
        userInterestContext: targetCtx,
      });

      setResult(data);
      if (!data.invalidInput) {
        awardXP(XP_REWARDS.FLASHCARD_REVIEWED, 'Làm giàu thẻ từ vựng với AI Lexicographer');
      }
    } catch (err: any) {
      console.error('Vocab Enricher failed:', err);
      setErrorMessage(err?.message || 'Không thể kết nối với mô hình gemini-3.1-pro.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayVoice = (text: string) => {
    if (isPlayingAudio) {
      window.speechSynthesis?.cancel();
      setIsPlayingAudio(false);
      return;
    }

    setIsPlayingAudio(true);
    speakExaminerText(text, 0.9, 'British', () => {
      setIsPlayingAudio(false);
    });
  };

  const handleSaveToSRS = () => {
    if (!result || result.invalidInput) return;

    const newCard: VocabCard = {
      id: `vc_enrich_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      word: result.word,
      phonetic: '',
      pos: 'academic',
      definitionVi: result.definitionAcademicVi || result.definitionSimpleVi || '',
      definitionEn: result.ttsScript || '',
      definitionAcademicEn: result.definitionAcademicVi || '',
      exampleEn: result.exampleSentences?.[0] || '',
      exampleVi: result.mnemonicVi || '',
      examples: (result.exampleSentences || []).map((s) => ({
        en: s,
        vi: '',
        context: interestContext || 'IELTS Context',
      })),
      synonyms: (result.synonyms || []).map((s) => ({ word: s, nuanceVi: 'Đồng nghĩa' })),
      antonyms: result.antonyms || [],
      collocations: result.collocations || [],
      topic: interestContext || 'IELTS Lexical Resource',
      difficulty: (result.cefrLevel as any) || 'C1',
      srsStage: 0,
      nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      reviewCount: 0,
      mastered: false,
      createdAt: new Date().toISOString(),
    };

    addVocabCard(newCard);
    setIsSynced(true);
  };

  return (
    <div
      id="vocab-enricher-modal"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-4 sm:my-8 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-teal-800 via-emerald-900 to-slate-900 text-white flex items-center justify-between shrink-0 shadow-md border-b border-teal-900/50">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-teal-600/30 border border-teal-400/40 flex items-center justify-center text-2xl shadow-inner shrink-0">
              📖
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  IELTS Lexicographer Vocab Enricher
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-teal-400/20 text-teal-200 border border-teal-300/30">
                  vocab-enricher-v1
                </span>
              </div>
              <p className="text-xs text-teal-200/90 mt-0.5">
                Tự động sinh toàn diện định nghĩa kép, Collocations, Synonyms & Mẹo ghi nhớ
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              window.speechSynthesis?.cancel();
              onClose();
            }}
            className="p-2 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Form */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Từ hoặc cụm từ tiếng Anh:
              </label>
              <input
                type="text"
                value={inputWord}
                onChange={(e) => setInputWord(e.target.value)}
                placeholder="Ví dụ: ubiquitous, mitigate..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Ngữ cảnh / Chủ đề quan tâm (tùy chọn):
              </label>
              <input
                type="text"
                value={interestContext}
                onChange={(e) => setInterestContext(e.target.value)}
                placeholder="Ví dụ: công nghệ, y tế, môi trường..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Sample quick picks */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-slate-400">Từ gợi ý:</span>
            {SAMPLE_WORDS.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setInputWord(s.word);
                  setInterestContext(s.context);
                  handleEnrich(s.word, s.context);
                }}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition-all"
              >
                {s.word}
              </button>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => handleEnrich()}
              disabled={isLoading || !inputWord.trim()}
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all"
            >
              {isLoading ? (
                <RotateCcw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>{isLoading ? 'Đang tra cứu học thuật...' : 'Làm Giàu Thẻ Flashcard'}</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="m-5 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Lỗi làm giàu từ vựng</p>
              <p className="mt-0.5 text-rose-700 dark:text-rose-300">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Loading animation */}
        {isLoading && (
          <div className="py-14 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-teal-100 dark:bg-teal-950/60 flex items-center justify-center text-2xl mx-auto animate-pulse">
              📖
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              AI Lexicographer đang làm giàu dữ liệu từ điển cho "{inputWord}"...
            </p>
          </div>
        )}

        {/* Invalid Input Notification */}
        {result && result.invalidInput && (
          <div className="p-6 m-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              <span>Đầu vào không hợp lệ (Invalid Input)</span>
            </div>
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              Cụm từ "<strong>{result.word}</strong>" không phải là một từ hoặc cụm từ vựng tiếng Anh hợp lệ. Hệ thống không tự ý bịa nội dung thẻ. Vui lòng kiểm tra lại chính tả hoặc nhập một từ tiếng Anh chuẩn xác.
            </p>
          </div>
        )}

        {/* Valid Flashcard Output */}
        {result && !result.invalidInput && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-5">
            {/* Main Word Card Header */}
            <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white border border-teal-800/60 shadow-lg space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl sm:text-3xl font-black text-white">{result.word}</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30 text-xs font-black">
                    CEFR {result.cefrLevel || 'C1'}
                  </span>
                </div>

                {result.ttsScript && (
                  <button
                    type="button"
                    onClick={() => handlePlayVoice(result.ttsScript || result.word)}
                    className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{isPlayingAudio ? 'Đang đọc...' : 'Nghe Phát Âm'}</span>
                  </button>
                )}
              </div>

              {/* Dual Definitions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 space-y-1">
                  <span className="text-[10px] font-bold text-teal-300 uppercase tracking-wider">
                    🟢 Định nghĩa thông dụng:
                  </span>
                  <p className="text-slate-100 font-medium">{result.definitionSimpleVi}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 space-y-1">
                  <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                    🎓 Định nghĩa học thuật IELTS:
                  </span>
                  <p className="text-slate-100 font-medium">{result.definitionAcademicVi}</p>
                </div>
              </div>
            </div>

            {/* Collocations & Synonyms Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              {/* Collocations */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="font-bold text-teal-700 dark:text-teal-300 flex items-center gap-1.5 uppercase text-[11px]">
                  🔗 Collocations Tự Nhiên (Natural Collocations):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(result.collocations || []).map((col, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200 font-semibold"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>

              {/* Synonyms & Antonyms */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 uppercase text-[11px]">
                  🔄 Từ Đồng Nghĩa & Trái Nghĩa:
                </span>
                <div className="space-y-1">
                  <p className="text-slate-700 dark:text-slate-300">
                    <strong>Đồng nghĩa:</strong> {(result.synonyms || []).join(', ') || 'N/A'}
                  </p>
                  <p className="text-slate-500">
                    <strong>Trái nghĩa:</strong> {(result.antonyms || []).join(', ') || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Example Sentences */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs">
              <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                💬 Ví Dụ Ngữ Cảnh Chuẩn Academic:
              </span>
              <div className="space-y-2">
                {(result.exampleSentences || []).map((ex, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 font-serif italic text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800"
                  >
                    • "{ex}"
                  </div>
                ))}
              </div>
            </div>

            {/* Mnemonic Vi */}
            {result.mnemonicVi && (
              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold uppercase tracking-wider text-[11px] block">
                    Mẹo Ghi Nhớ Nhanh (Mnemonic):
                  </span>
                  <p className="mt-1 leading-relaxed">{result.mnemonicVi}</p>
                </div>
              </div>
            )}

            {/* Save to SRS Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveToSRS}
                disabled={isSynced}
                className={`w-full py-3.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all ${
                  isSynced
                    ? 'bg-emerald-600 text-white cursor-default'
                    : 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white'
                }`}
              >
                {isSynced ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>✓ Đã Lưu Vào Sổ Từ Vựng SRS (Hộp 0 - Sắp lịch lặp lại)</span>
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="w-4 h-4" />
                    <span>+ Lưu Thẻ Flashcard Này Vào Hệ Thống SRS</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
