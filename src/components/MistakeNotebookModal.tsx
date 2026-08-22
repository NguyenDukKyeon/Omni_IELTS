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
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MistakeEntry, ErrorCategory, SkillType } from '../types';
import { ReviewRating } from '../services/srsScheduler';
import { playTextToSpeech } from '../services/aiTutor';

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

  const [selectedCategory, setSelectedCategory] = useState<ErrorCategory | 'all'>('all');
  const [selectedSkill, setSelectedSkill] = useState<SkillType | 'all'>('all');
  const [isReviewMode, setIsReviewMode] = useState<boolean>(false);
  const [currentReviewIndex, setCurrentReviewIndex] = useState<number>(0);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState<boolean>(false);
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);

  // New mistake form state
  const [newErrorText, setNewErrorText] = useState('');
  const [newCorrectedText, setNewCorrectedText] = useState('');
  const [newExplanation, setNewExplanation] = useState('');
  const [newErrorType, setNewErrorType] = useState<ErrorCategory>('grammar');
  const [newSkill, setNewSkill] = useState<SkillType>('writing');

  if (!isMistakeNotebookOpen) return null;

  const filteredMistakes = mistakes.filter((m) => {
    if (selectedCategory !== 'all' && m.errorType !== selectedCategory) return false;
    if (selectedSkill !== 'all' && m.skill !== selectedSkill) return false;
    return true;
  });

  const dueMistakes = mistakes.filter((m) => !m.mastered);

  const handleStartSRSReview = () => {
    if (dueMistakes.length === 0) return;
    setIsReviewMode(true);
    setCurrentReviewIndex(0);
    setIsAnswerRevealed(false);
  };

  const handleReviewRating = (rating: ReviewRating) => {
    const currentItem = dueMistakes[currentReviewIndex];
    if (currentItem) {
      reviewMistake(currentItem.id, rating);
    }

    if (currentReviewIndex < dueMistakes.length - 1) {
      setCurrentReviewIndex((prev) => prev + 1);
      setIsAnswerRevealed(false);
    } else {
      setIsReviewMode(false);
    }
  };

  const handleCreateMistake = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newErrorText.trim() || !newCorrectedText.trim()) return;

    const entry: MistakeEntry = {
      id: `mistake_${Date.now()}`,
      errorText: newErrorText.trim(),
      correctedText: newCorrectedText.trim(),
      explanation: newExplanation.trim() || 'Lỗi tự ghi nhận trong quá trình tự học.',
      errorType: newErrorType,
      skill: newSkill,
      originModule: 'writing_eval',
      srsStage: 0,
      nextReviewDate: new Date().toISOString(),
      reviewCount: 0,
      mastered: false,
      createdAt: new Date().toISOString(),
      tags: [newErrorType, newSkill],
    };

    addMistake(entry);
    setNewErrorText('');
    setNewCorrectedText('');
    setNewExplanation('');
    setIsAddingNew(false);
  };

  return (
    <div
      id="unified-mistake-notebook-modal"
      className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-600 to-orange-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Sổ Tay Lỗi Sai Hợp Nhất</h2>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
                  {mistakes.length} Lỗi đã lưu
                </span>
              </div>
              <p className="text-xs text-amber-100">
                Tự động thu thập từ Writing, Speaking, Dictation & Ngữ pháp để ôn tập SRS
              </p>
            </div>
          </div>
          <button
            id="close-mistake-modal-btn"
            onClick={() => {
              setIsMistakeNotebookOpen(false);
              setIsReviewMode(false);
            }}
            className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* REVIEW MODE SCREEN */}
        {isReviewMode && dueMistakes.length > 0 ? (
          <div className="p-6 flex-1 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-stone-700 dark:text-stone-300 pb-3 border-b border-stone-100 dark:border-stone-800">
                <span className="text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">
                  Chế độ ôn tập SRS ({currentReviewIndex + 1}/{dueMistakes.length})
                </span>
                <button
                  onClick={() => setIsReviewMode(false)}
                  className="text-stone-700 hover:text-stone-800 dark:hover:text-stone-200"
                >
                  Thoát ôn tập
                </button>
              </div>

              {/* Flash Card Question */}
              <div className="mt-4 p-5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/60 px-2 py-0.5 rounded-full">
                  Câu có lỗi sai ({dueMistakes[currentReviewIndex].errorType})
                </span>
                <p className="text-base font-semibold text-stone-900 dark:text-stone-100 mt-2 font-serif">
                  "{dueMistakes[currentReviewIndex].errorText}"
                </p>
              </div>

              {/* Reveal Answer */}
              {!isAnswerRevealed ? (
                <div className="mt-6 text-center">
                  <button
                    id="reveal-mistake-correction-btn"
                    onClick={() => setIsAnswerRevealed(true)}
                    className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/20 active:scale-95 transition-all"
                  >
                    Xem câu đã sửa đúng & Giải thích
                  </button>
                </div>
              ) : (
                <div className="mt-4 p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 space-y-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
                      Phiên bản chuẩn ngữ pháp / từ vựng
                    </span>
                    <div className="flex items-center justify-between gap-2 mt-2">
                      <p className="text-base font-bold text-emerald-900 dark:text-emerald-200 font-serif">
                        "{dueMistakes[currentReviewIndex].correctedText}"
                      </p>
                      <button
                        onClick={() => playTextToSpeech(dueMistakes[currentReviewIndex].correctedText)}
                        className="p-1.5 rounded-lg bg-white dark:bg-stone-800 text-emerald-600 hover:bg-emerald-100 transition-colors"
                        title="Nghe phát âm chuẩn"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-emerald-200/50 dark:border-emerald-900/40 text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                    <strong>Giải thích chi tiết:</strong> {dueMistakes[currentReviewIndex].explanation}
                  </div>
                </div>
              )}
            </div>

            {/* SRS Rating Buttons */}
            {isAnswerRevealed && (
              <div className="mt-6 pt-4 border-t border-stone-100 dark:border-stone-800">
                <div className="text-center text-xs font-bold text-stone-700 dark:text-stone-300 mb-2">
                  Bạn nhớ quy tắc này ở mức độ nào?
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => handleReviewRating('again')}
                    className="py-2.5 px-2 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold text-xs hover:bg-rose-200 transition-colors border border-rose-200 dark:border-rose-900"
                  >
                    Quên (Lặp lại)
                  </button>
                  <button
                    onClick={() => handleReviewRating('hard')}
                    className="py-2.5 px-2 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold text-xs hover:bg-amber-200 transition-colors border border-amber-200 dark:border-amber-900"
                  >
                    Hơi khó
                  </button>
                  <button
                    onClick={() => handleReviewRating('good')}
                    className="py-2.5 px-2 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold text-xs hover:bg-sky-200 transition-colors border border-sky-200 dark:border-sky-900"
                  >
                    Nhớ tốt
                  </button>
                  <button
                    onClick={() => handleReviewRating('easy')}
                    className="py-2.5 px-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-200 transition-colors border border-emerald-200 dark:border-emerald-900"
                  >
                    Rất dễ
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* NORMAL LIST VIEW */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Filter & SRS Action Bar */}
            <div className="p-4 bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
                {[
                  { id: 'all', label: 'Tất cả' },
                  { id: 'grammar', label: 'Ngữ pháp' },
                  { id: 'vocab', label: 'Từ vựng' },
                  { id: 'pronunciation', label: 'Phát âm' },
                  { id: 'cohesion', label: 'Liên kết câu' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id as any)}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                      selectedCategory === cat.id
                        ? 'bg-amber-600 text-white'
                        : 'bg-white dark:bg-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  id="start-srs-mistake-review-btn"
                  onClick={handleStartSRSReview}
                  disabled={dueMistakes.length === 0}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm shadow-amber-600/20 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Ôn tập ngay ({dueMistakes.length})</span>
                </button>
                <button
                  id="add-custom-mistake-btn"
                  onClick={() => setIsAddingNew(!isAddingNew)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-100"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm lỗi</span>
                </button>
              </div>
            </div>

            {/* Add Custom Mistake Form */}
            {isAddingNew && (
              <form
                onSubmit={handleCreateMistake}
                className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border-b border-amber-200/60 dark:border-amber-900/40 space-y-3 shrink-0"
              >
                <div className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  Thêm lỗi sai thủ công vào sổ tay:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Câu bị sai (Ví dụ: She don't like...)"
                    value={newErrorText}
                    onChange={(e) => setNewErrorText(e.target.value)}
                    className="px-3 py-2 text-xs rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Câu đã sửa đúng (Ví dụ: She doesn't like...)"
                    value={newCorrectedText}
                    onChange={(e) => setNewCorrectedText(e.target.value)}
                    className="px-3 py-2 text-xs rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Giải thích nguyên nhân / quy tắc cần nhớ..."
                  value={newExplanation}
                  onChange={(e) => setNewExplanation(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <select
                      value={newErrorType}
                      onChange={(e) => setNewErrorType(e.target.value as ErrorCategory)}
                      className="px-2 py-1 text-xs rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700"
                    >
                      <option value="grammar">Ngữ pháp</option>
                      <option value="vocab">Từ vựng/Collocation</option>
                      <option value="pronunciation">Phát âm</option>
                      <option value="cohesion">Liên kết câu</option>
                    </select>
                    <select
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value as SkillType)}
                      className="px-2 py-1 text-xs rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700"
                    >
                      <option value="writing">Writing</option>
                      <option value="speaking">Speaking</option>
                      <option value="dictation">Dictation</option>
                      <option value="grammar">Grammar</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingNew(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-stone-700 dark:text-stone-300"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs"
                    >
                      Lưu lỗi
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* List of Mistakes */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-3 custom-scrollbar flex-1">
              {filteredMistakes.length === 0 ? (
                <div className="text-center py-12 text-stone-700 dark:text-stone-300">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <p className="text-sm font-semibold">Chưa có lỗi nào trong danh mục này!</p>
                  <p className="text-xs mt-1">Khi bạn làm bài Writing, Speaking hoặc Dictation, AI sẽ tự động gom lỗi về đây.</p>
                </div>
              ) : (
                filteredMistakes.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700/80 shadow-2xs hover:border-amber-300 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                          {item.errorType}
                        </span>
                        <span className="text-[10px] font-semibold text-stone-700 dark:text-stone-300 uppercase">
                          • {item.skill}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-stone-700 dark:text-stone-300">
                          SRS Lv.{item.srsStage} ({item.reviewCount} lần ôn)
                        </span>
                        <button
                          onClick={() => deleteMistake(item.id)}
                          className="p-1 text-stone-700 hover:text-rose-500 transition-colors"
                          title="Xóa lỗi này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs sm:text-sm">
                      <div className="text-rose-600 dark:text-rose-400 font-serif line-through">
                        "{item.errorText}"
                      </div>
                      <div className="text-emerald-700 dark:text-emerald-300 font-bold font-serif flex items-center gap-1.5">
                        <span>➔ "{item.correctedText}"</span>
                        <button
                          onClick={() => playTextToSpeech(item.correctedText)}
                          className="p-1 rounded text-stone-700 hover:text-emerald-600"
                          title="Nghe câu chuẩn"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-stone-700 dark:text-stone-300 bg-stone-50 dark:bg-stone-900/60 p-2.5 rounded-xl border border-stone-100 dark:border-stone-800">
                      {item.explanation}
                    </div>

                    {/* AI Drill question prompt link */}
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() =>
                          openAITutorWithPrompt(
                            `Hãy giải thích kỹ hơn lỗi này và tạo 2 câu bài tập luyện tập cho tôi: "${item.errorText}"`
                          )
                        }
                        className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Nhờ AI tạo bài tập cho lỗi này</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
