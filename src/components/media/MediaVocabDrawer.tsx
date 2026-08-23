import React from 'react';
import {
  BookOpen,
  Plus,
  Check,
  Sparkles,
  ExternalLink,
  Volume2,
} from 'lucide-react';
import { MediaExtractedVocab, VocabCard } from '../../types';
import { useApp } from '../../context/AppContext';
import { playTextToSpeech } from '../../services/aiTutor';
import { XP_REWARDS } from '../../services/gamification';

interface MediaVocabDrawerProps {
  vocabList?: MediaExtractedVocab[];
  sessionTitle: string;
}

export const MediaVocabDrawer: React.FC<MediaVocabDrawerProps> = ({
  vocabList = [],
  sessionTitle,
}) => {
  const { vocabCards, addVocabCard, awardXP } = useApp();

  const isWordSaved = (word: string) => {
    return vocabCards.some((c) => c.word.toLowerCase() === word.toLowerCase());
  };

  const handleSaveToSRS = (item: MediaExtractedVocab) => {
    if (isWordSaved(item.word)) return;

    const newCard: VocabCard = {
      id: `vc_med_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      word: item.word,
      phonetic: item.phonetic || '',
      pos: item.pos as any,
      definitionVi: item.definitionVi,
      definitionEn: item.definitionEn,
      exampleEn: item.exampleEn,
      exampleVi: item.exampleVi,
      collocations: item.collocations || [],
      originModule: 'media',
      originSourceTitle: sessionTitle,
      srsStage: 0,
      intervalDays: 1,
      nextReviewDate: new Date().toISOString(),
      easeFactor: 2.5,
      repetitions: 0,
      mastered: false,
    };

    addVocabCard(newCard);
    awardXP(XP_REWARDS.VOCAB_REVIEW_CARD, `Thêm từ "${item.word}" vào sổ tay SRS Flashcard!`);
  };

  if (!vocabList || vocabList.length === 0) {
    return (
      <div className="p-8 text-center bg-stone-50 dark:bg-stone-900/40 rounded-3xl border border-stone-200 dark:border-stone-800 space-y-3">
        <BookOpen className="w-8 h-8 text-stone-400 mx-auto" />
        <p className="text-xs text-stone-600 dark:text-stone-400">
          Chưa có từ vựng học thuật nào được trích xuất cho bài này.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-stone-900 dark:text-stone-100 flex items-center gap-2 font-display">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Từ Vựng Học Thuật C1/C2 Được Trích Xuất ({vocabList.length})</span>
          </h3>
          <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5">
            Bấm "Lưu vào Flashcard" để đưa từ vào lộ trình lặp lại ngắt quãng (SRS)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {vocabList.map((item, idx) => {
          const saved = isWordSaved(item.word);
          return (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-2.5 hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-serif font-black text-base text-stone-900 dark:text-stone-100">
                      {item.word}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 uppercase">
                      {item.pos}
                    </span>
                    {item.cefrLevel && (
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                        {item.cefrLevel}
                      </span>
                    )}
                  </div>

                  <button data-ux-flow="media.learning"
                    onClick={() => playTextToSpeech(item.word)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950 transition-colors cursor-pointer"
                    title="Nghe phát âm"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-xs font-bold text-sky-700 dark:text-sky-300 mt-1">
                  {item.definitionVi}
                </div>

                {item.definitionEn && (
                  <div className="text-[11px] text-stone-500 dark:text-stone-400 italic mt-0.5">
                    {item.definitionEn}
                  </div>
                )}

                {item.exampleEn && (
                  <div className="mt-2 p-2 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-100 dark:border-stone-800 text-xs">
                    <p className="text-stone-800 dark:text-stone-200 font-serif leading-relaxed">
                      "{item.exampleEn}"
                    </p>
                    {item.exampleVi && (
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                        {item.exampleVi}
                      </p>
                    )}
                  </div>
                )}

                {item.collocations && item.collocations.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {item.collocations.map((col, cIdx) => (
                      <span
                        key={cIdx}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-900 text-stone-600 dark:text-stone-400 border border-stone-200/60 dark:border-stone-700/60"
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-stone-100 dark:border-stone-700/60 flex justify-end">
                <button data-ux-flow="media.learning"
                  onClick={() => handleSaveToSRS(item)}
                  disabled={saved}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    saved
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 cursor-default'
                      : 'bg-sky-600 hover:bg-sky-700 text-white shadow-xs shadow-sky-600/20'
                  }`}
                >
                  {saved ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Đã có trong Flashcard</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Lưu vào Flashcard SRS</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
