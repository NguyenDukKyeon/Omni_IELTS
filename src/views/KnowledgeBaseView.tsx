import React, { useState } from 'react';
import {
  BookOpenCheck,
  Award,
  Sparkles,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { initialKnowledgeArticles } from '../data/initialData';
import { IELTSKnowledgeArticle } from '../types';

export const KnowledgeBaseView: React.FC = () => {
  const { openAITutorWithPrompt } = useApp();

  const [articles] = useState<IELTSKnowledgeArticle[]>(initialKnowledgeArticles);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedArticle, setSelectedArticle] = useState<IELTSKnowledgeArticle>(initialKnowledgeArticles[0]);

  const filteredArticles = articles.filter((art) => {
    const matchesCategory = selectedCategory === 'all' || art.category === selectedCategory;
    const matchesSearch =
      (art.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (art.excerpt || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (art.tags || []).some((t) => (t || '').toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div id="knowledge-module" className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-stone-900 dark:text-stone-100 font-display flex items-center gap-2.5">
          <BookOpenCheck className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          <span>Học Kiến Thức & Chiến Thuật Làm Bài IELTS</span>
        </h1>
        <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 mt-1">
          Giải mã toàn diện 4 tiêu chí chấm thi của giám khảo, công thức viết PEEL và phương pháp phản xạ nói PPF.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Article List & Search */}
        <div className="p-5 rounded-3xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
            <input
              type="text"
              placeholder="Tìm bài học chiến thuật..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar text-xs">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'band_descriptors', label: 'Tiêu chí chấm' },
              { id: 'writing_templates', label: 'PEEL Writing' },
              { id: 'speaking_strategies', label: 'PPF Speaking' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors shrink-0 cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-orange-600 text-white'
                    : 'bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
            {filteredArticles.map((art) => {
              const isSelected = selectedArticle.id === art.id;
              return (
                <button
                  key={art.id}
                  onClick={() => setSelectedArticle(art)}
                  className={`w-full p-3.5 rounded-2xl text-left transition-all border cursor-pointer ${
                    isSelected
                      ? 'bg-orange-50 dark:bg-orange-950/60 border-orange-500 shadow-sm'
                      : 'bg-stone-50 dark:bg-stone-900/40 border-stone-200/80 dark:border-stone-700/80 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300">
                      {art.categoryTitleVi}
                    </span>
                    <span className="text-[10px] text-stone-700 dark:text-stone-300">{art.readTimeMinutes} phút đọc</span>
                  </div>
                  <div className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100 mt-1 line-clamp-1">
                    {art.title}
                  </div>
                  <p className="text-[11px] text-stone-700 dark:text-stone-300 line-clamp-2 mt-1">
                    {art.excerpt}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Article Reader */}
        <div className="lg:col-span-2 p-6 sm:p-7 rounded-3xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-5 shadow-sm">
          {selectedArticle ? (
            <div className="space-y-5">
              <div className="border-b border-stone-200 dark:border-stone-700 pb-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300">
                    {selectedArticle.categoryTitleVi}
                  </span>
                  <span className="text-xs text-stone-700 dark:text-stone-300">
                    Thời lượng đọc: {selectedArticle.readTimeMinutes} phút
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 font-display">
                  {selectedArticle.title}
                </h2>
                <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 italic">
                  "{selectedArticle.excerpt}"
                </p>
              </div>

              {/* Key Takeaways Box */}
              <div className="p-4 rounded-2xl bg-orange-50/70 dark:bg-orange-950/40 border border-orange-200/80 dark:border-orange-900/50 space-y-2">
                <span className="text-xs font-bold text-orange-900 dark:text-orange-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Điểm mấu chốt cần ghi nhớ:</span>
                </span>
                <div className="text-xs text-stone-800 dark:text-stone-200 font-medium">
                  {selectedArticle.keyTakeaway}
                </div>
              </div>

              {/* Full Article Content */}
              <div className="text-xs sm:text-sm text-stone-800 dark:text-stone-200 leading-relaxed font-sans whitespace-pre-line space-y-3">
                {selectedArticle.contentMarkdown}
              </div>

              {/* Ask AI Contextual Discussion */}
              <div className="pt-4 border-t border-stone-200 dark:border-stone-700 flex justify-between items-center">
                <span className="text-xs text-stone-700 dark:text-stone-300">
                  Bạn có thắc mắc về chiến thuật này?
                </span>
                <button
                  onClick={() =>
                    openAITutorWithPrompt(
                      `Hãy giải thích kỹ hơn chiến thuật "${selectedArticle.title}" và cho ví dụ áp dụng thực tế.`
                    )
                  }
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-orange-600/20 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Thảo luận cùng AI Tutor</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
