import React, { useState } from 'react';
import {
  FileUp,
  Link,
  Youtube,
  FileText,
  Sparkles,
  Layers,
  BookOpen,
  CheckCircle2,
  Trash2,
  Volume2,
  Plus,
  RefreshCw,
  Search,
  ExternalLink,
  Sliders,
  Flame,
  ArrowRight,
  FolderPlus,
  Zap,
  Globe,
  UploadCloud,
  Check,
  GraduationCap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LearningSource, SourceType, ExtractedVocabItem } from '../types';
import { analyzeLearningSourceApi, fetchUrlContentApi } from '../services/aiTutor';
import { LessonPackViewer } from '../components/LessonPackViewer';
import { SourceToLearningPackageModal } from '../components/sources/SourceToLearningPackageModal';

export const SourceIngestionView: React.FC = () => {
  const { sources, addSource, deleteSource, addVocabCard, awardXP } = useApp();

  // Mode: Ingestion Form vs Batch Multi-source Ingestion
  const [ingestionMode, setIngestionMode] = useState<'single' | 'batch'>('single');

  // Single Ingestion State
  const [activeTab, setActiveTab] = useState<SourceType>('pdf');
  const [sourceTitle, setSourceTitle] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [rawTextContent, setRawTextContent] = useState('');
  const [targetBand, setTargetBand] = useState<number>(6.5);
  const [customInstruction, setCustomInstruction] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [fetchUrlSuccess, setFetchUrlSuccess] = useState(false);
  const [isCourseDesignerOpen, setIsCourseDesignerOpen] = useState(false);

  // Batch Ingestion State
  const [batchSources, setBatchSources] = useState<
    Array<{ id: string; title: string; urlOrType: string; content: string }>
  >([
    {
      id: 'batch_1',
      title: 'Bài đọc 1: Biến đổi khí hậu & Đa dạng sinh học',
      urlOrType: 'PDF Report',
      content:
        'Biodiversity loss due to global warming has accelerated dramatically. Ecosystem degradation disrupts carbon sequestration cycles and threatens agricultural food security.',
    },
    {
      id: 'batch_2',
      title: 'Bài đọc 2: Kinh tế xanh & Năng lượng tái tạo',
      urlOrType: 'The Economist Article',
      content:
        'Investing in solar and wind power generates substantial employment opportunities while mitigating sovereign reliance on volatile fossil fuel markets.',
    },
  ]);
  const [batchCourseTitle, setBatchCourseTitle] = useState('Khoá Mini 4 Kỹ Năng: Môi Trường & Kinh Tế Xanh');
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);

  // Filtering & View State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<LearningSource | null>(sources[0] || null);
  const [activeSubView, setActiveSubView] = useState<'pack' | 'vocab' | 'grammar'>('pack');

  // Sample quick templates
  const loadSampleSource = (type: SourceType) => {
    if (type === 'pdf') {
      setSourceTitle('The Economic Paradigm of Renewable Subsidies (Academic Report)');
      setRawTextContent(
        `The transition toward renewable energy represents a monumental paradigm shift in global macroeconomic policy. Decarbonization requires massive capital expenditures in wind and solar infrastructure. Subsidizing clean energy technologies not only accelerates technological maturity through economies of scale, but also mitigates catastrophic climate risks. However, fiscal policymakers must balance these subsidies against potential inflationary pressures and sovereign debt constraints.`
      );
    } else if (type === 'url') {
      setSourceTitle('The Economist: Artificial Intelligence and Modern Labor Markets');
      setSourceUrl('https://economist.com/finance-economics/ai-labor-markets');
      setRawTextContent(
        `Recent advancements in generative artificial intelligence have sparked vigorous debate concerning employment dislocation. While manual automation predominantly displaced routine manufacturing positions, cognitive AI threatens knowledge-intensive white-collar occupations. Consequently, educational institutions must overhaul traditional pedagogical curricula to prioritize critical reasoning, emotional intelligence, and cross-disciplinary adaptability.`
      );
    } else if (type === 'youtube') {
      setSourceTitle('TED Talk: The Architecture of Memory and Spaced Recall');
      setSourceUrl('https://youtube.com/watch?v=memory-spaced-repetition');
      setRawTextContent(
        `The forgetting curve illustrates how rapidly neurological data deteriorates without systematic reinforcement. Implementing algorithmic spaced repetition schedules counteracts synaptic decay, dramatically enhancing long-term retrieval strength and lexical fluency for language learners.`
      );
    } else {
      setSourceTitle('IELTS Task 2 Reading Passage on Biodiversity & Habitat Loss');
      setRawTextContent(
        `Preserving terrestrial and marine biodiversity is indispensable for maintaining planetary homeostasis. Habitat fragmentation and anthropogenic exploitation have accelerated species extinction at unprecedented rates, posing catastrophic hazards to delicate biosystems.`
      );
    }
  };

  // FETCH URL CONTENT HANDLER
  const handleFetchUrlContent = async () => {
    if (!sourceUrl.trim()) return;
    setIsFetchingUrl(true);
    setFetchUrlSuccess(false);

    try {
      const data = await fetchUrlContentApi(sourceUrl.trim());
      if (data.title && !sourceTitle) {
        setSourceTitle(data.title);
      }
      if (data.content) {
        setRawTextContent(data.content);
        setFetchUrlSuccess(true);
      }
    } catch (err) {
      console.error('Fetch URL error', err);
    } finally {
      setIsFetchingUrl(false);
    }
  };

  // ANALYZE & SAVE SOURCE HANDLER
  const handleAnalyzeAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceTitle.trim()) return;

    const contentToProcess = rawTextContent.trim() || `Tài liệu từ nguồn ${sourceUrl || sourceTitle}`;
    setIsAnalyzing(true);

    try {
      const analysis = await analyzeLearningSourceApi(
        contentToProcess,
        sourceTitle,
        activeTab,
        targetBand,
        customInstruction
      );

      const newSource: LearningSource = {
        id: `source_${Date.now()}`,
        title: sourceTitle.trim(),
        type: activeTab,
        sourceUrlOrName: sourceUrl.trim() || `${sourceTitle}.${activeTab}`,
        originalContent: contentToProcess,
        targetBand: targetBand,
        summary: analysis.summary || 'Tóm tắt nội dung học thuật từ tài liệu.',
        extractedVocab: analysis.keyVocab || [],
        extractedGrammar: analysis.grammarPoints || [],
        exercises: analysis.exercises || [],
        lessonsCount: (analysis.keyVocab?.length || 0) + (analysis.exercises?.length || 0),
        tags: [activeTab.toUpperCase(), `Band ${targetBand}`, 'Academic IELTS'],
        createdAt: new Date().toISOString(),
        lessonPack: analysis.lessonPack,
      };

      addSource(newSource);
      setSelectedSource(newSource);
      setActiveSubView('pack');
      awardXP(40, `Tạo thành công Gói bài học 4 kỹ năng từ nguồn mới (Band ${targetBand})`);

      // Auto add key vocab cards to SRS
      if (analysis.keyVocab && analysis.keyVocab.length > 0) {
        analysis.keyVocab.forEach((v: ExtractedVocabItem) => {
          addVocabCard({
            id: `vc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            word: v.word,
            phonetic: v.phonetic,
            pos: v.pos,
            definitionVi: v.definitionVi,
            definitionEn: v.definitionEn,
            exampleEn: v.exampleEn,
            exampleVi: v.exampleVi,
            collocations: v.collocations || [],
            cefrLevel: v.cefrLevel,
            originModule: 'source_import',
            originSourceId: newSource.id,
            originSourceTitle: newSource.title,
            srsStage: 0,
            intervalDays: 1,
            nextReviewDate: new Date().toISOString(),
            easeFactor: 2.5,
            repetitions: 0,
            mastered: false,
          });
        });
      }

      // Reset Form
      setSourceTitle('');
      setSourceUrl('');
      setRawTextContent('');
      setFetchUrlSuccess(false);
      setCustomInstruction('');
    } catch (err) {
      console.error('Failed to ingest source', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // PROCESS BATCH MINI-COURSE HANDLER
  const handleProcessBatchCourse = async () => {
    if (batchSources.length === 0 || !batchCourseTitle.trim()) return;
    setIsProcessingBatch(true);

    try {
      const combinedText = batchSources.map((s, idx) => `[Chủ đề ${idx + 1}: ${s.title}]\n${s.content}`).join('\n\n');
      const analysis = await analyzeLearningSourceApi(
        combinedText,
        batchCourseTitle,
        'docx',
        targetBand,
        'Gộp các tài liệu thành 1 khoá học mini liên hoàn 4 kỹ năng theo chủ đề chung.'
      );

      const newSource: LearningSource = {
        id: `batch_course_${Date.now()}`,
        title: batchCourseTitle.trim(),
        type: 'docx',
        sourceUrlOrName: `Khoá mini (${batchSources.length} nguồn tổng hợp)`,
        originalContent: combinedText,
        targetBand: targetBand,
        summary: analysis.summary || 'Khoá học mini 4 kỹ năng tích hợp từ nhiều nguồn.',
        extractedVocab: analysis.keyVocab || [],
        extractedGrammar: analysis.grammarPoints || [],
        exercises: analysis.exercises || [],
        lessonsCount: (analysis.keyVocab?.length || 0) + (analysis.exercises?.length || 0),
        tags: ['KHOÁ MINI', `Band ${targetBand}`, 'Đa Nguồn'],
        createdAt: new Date().toISOString(),
        lessonPack: analysis.lessonPack,
      };

      addSource(newSource);
      setSelectedSource(newSource);
      setIngestionMode('single');
      setActiveSubView('pack');
      awardXP(80, `Đã tổng hợp khoá học mini 4 kỹ năng từ ${batchSources.length} nguồn tài liệu`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessingBatch(false);
    }
  };

  const filteredSources = sources.filter(
    (s) =>
      (s.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.tags || []).some((t) => (t || '').toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div id="sources-module" className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 font-display flex items-center gap-2.5">
            <FileUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>Nguồn Học Liệu (Tạo Bài Học 4 Kỹ Năng)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Nạp URL web, file PDF, Word hoặc YouTube. Chọn Band mong muốn để AI phỏng theo và sinh trọn bộ bài tập 4 kỹ năng (Reading, Listening, Speaking, Writing).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCourseDesignerOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all"
          >
            <GraduationCap className="w-4 h-4" />
            <span>🎓 AI Course Designer (Gói 4 Kỹ Năng)</span>
          </button>

          {/* Mode Switcher */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              id="mode-single-btn"
              onClick={() => setIngestionMode('single')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                ingestionMode === 'single'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Nạp Nguồn Đơn
            </button>
            <button
              id="mode-batch-btn"
              onClick={() => setIngestionMode('batch')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                ingestionMode === 'batch'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Gộp Khoá Mini (Nhiều Nguồn)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. SINGLE INGESTION FORM CONTAINER */}
      {/* ========================================================================= */}
      {ingestionMode === 'single' ? (
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
          {/* Source Type Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-3 overflow-x-auto no-scrollbar">
            {[
              { id: 'pdf', label: 'Tải File PDF', icon: FileUp },
              { id: 'url', label: 'Bài Báo / URL Web (Fetch Tự Động)', icon: Link },
              { id: 'youtube', label: 'Video YouTube', icon: Youtube },
              { id: 'docx', label: 'Word / Văn Bản Raw', icon: FileText },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`source-tab-${tab.id}`}
                  onClick={() => {
                    setActiveTab(tab.id as SourceType);
                    loadSampleSource(tab.id as SourceType);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Input Form */}
          <form onSubmit={handleAnalyzeAndSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tiêu đề học liệu:
                </label>
                <input
                  type="text"
                  required
                  value={sourceTitle}
                  onChange={(e) => setSourceTitle(e.target.value)}
                  placeholder="Ví dụ: Báo cáo kinh tế vĩ mo / Báo BBC / Bài TED..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Band Calibration Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Band mục tiêu (AI sẽ phỏng theo & viết lại nội dung):
                  </label>
                  <span className="text-xs font-black text-blue-600 dark:text-blue-400 font-mono">
                    Band {targetBand.toFixed(1)}
                  </span>
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {[5.5, 6.0, 6.5, 7.0, 7.5, 8.0].map((band) => (
                    <button
                      key={band}
                      type="button"
                      id={`target-band-btn-${band}`}
                      onClick={() => setTargetBand(band)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        targetBand === band
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {band.toFixed(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* URL Fetch Section */}
            {(activeTab === 'url' || activeTab === 'youtube') && (
              <div className="space-y-2 p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Đường dẫn (URL bài báo / Link video YouTube):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    placeholder="https://economist.com/... hoặc https://bbc.com/news/..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400"
                  />
                  <button
                    type="button"
                    id="fetch-url-btn"
                    onClick={handleFetchUrlContent}
                    disabled={isFetchingUrl || !sourceUrl.trim()}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
                  >
                    {isFetchingUrl ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : fetchUrlSuccess ? (
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                    ) : (
                      <Globe className="w-3.5 h-3.5" />
                    )}
                    <span>{isFetchingUrl ? 'Đang cào...' : fetchUrlSuccess ? 'Đã trích xuất' : 'Cào & Trích xuất'}</span>
                  </button>
                </div>
                {fetchUrlSuccess && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ Đã trích xuất nội dung văn bản chính và loại bỏ quảng cáo thành công.
                  </p>
                )}
              </div>
            )}

            {/* Content Textarea */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Nội dung văn bản / Trích đoạn học thuật:
              </label>
              <textarea
                rows={4}
                required
                value={rawTextContent}
                onChange={(e) => setRawTextContent(e.target.value)}
                placeholder="Dán nội dung bài đọc, trích đoạn PDF hoặc phụ đề video tại đây..."
                className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 font-serif leading-relaxed"
              />
            </div>

            {/* Custom Instruction (Optional) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Yêu cầu tuỳ chỉnh bổ sung (Tuỳ chọn):
              </label>
              <input
                type="text"
                value={customInstruction}
                onChange={(e) => setCustomInstruction(e.target.value)}
                placeholder="Ví dụ: Tập trung vào dạng câu hỏi True/False/Not Given, hoặc chú trọng từ vựng kinh tế vĩ mô..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400"
              />
            </div>

            {/* Submit Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>
                  AI sẽ sinh: <strong>Đoạn đọc chuẩn Band {targetBand} + Bài nghe hội thoại + Speaking + Đề Writing</strong>.
                </span>
              </div>

              <button
                id="analyze-source-btn"
                type="submit"
                disabled={isAnalyzing || !sourceTitle.trim()}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>AI Đang Phân Tích & Sinh Gói 4 Kỹ Năng...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Tạo Gói Bài Học 4 Kỹ Năng (Band {targetBand})</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* ========================================================================= */
        /* 2. BATCH INGESTION (MINI-COURSE BUILDER) */
        /* ========================================================================= */
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400">
                BATCH SOURCE PROCESSING
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Gộp Nhiều Nguồn Thành 1 Khoá Học Mini Liên Hoàn
              </h2>
            </div>
            <span className="text-xs font-bold text-slate-500">
              {batchSources.length} nguồn trong danh sách
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Tên khoá học mini tổng hợp:
              </label>
              <input
                type="text"
                value={batchCourseTitle}
                onChange={(e) => setBatchCourseTitle(e.target.value)}
                placeholder="Ví dụ: Mini-Course: AI & Tương lai thị trường lao động"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Band mục tiêu cho toàn khoá:
              </label>
              <select
                value={targetBand}
                onChange={(e) => setTargetBand(parseFloat(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
              >
                <option value={5.5}>Band 5.5 (Intermediate)</option>
                <option value={6.0}>Band 6.0 (Competent)</option>
                <option value={6.5}>Band 6.5 (Upper Intermediate)</option>
                <option value={7.0}>Band 7.0 (Good User)</option>
                <option value={7.5}>Band 7.5 (Very Good User)</option>
                <option value={8.0}>Band 8.0 (Expert)</option>
              </select>
            </div>
          </div>

          {/* List of Batch Sources */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Danh sách nguồn tài liệu thành phần:
            </label>
            <div className="space-y-2.5">
              {batchSources.map((bs, bi) => (
                <div
                  key={bs.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center">
                        {bi + 1}
                      </span>
                      <strong className="text-xs text-slate-900 dark:text-slate-100">{bs.title}</strong>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600">
                        {bs.urlOrType}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 pl-7 font-serif italic">
                      "{bs.content}"
                    </p>
                  </div>

                  <button
                    onClick={() => setBatchSources(batchSources.filter((s) => s.id !== bs.id))}
                    className="p-1.5 text-slate-400 hover:text-rose-600"
                    title="Xóa nguồn này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Action */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
            <button
              onClick={() => {
                const newId = `batch_${Date.now()}`;
                setBatchSources([
                  ...batchSources,
                  {
                    id: newId,
                    title: `Tài liệu bổ sung #${batchSources.length + 1}`,
                    urlOrType: 'Custom Note',
                    content: 'Nội dung bổ sung về chính sách và giải pháp công nghệ mới...',
                  },
                ]);
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm nguồn khác</span>
            </button>

            <button
              id="generate-batch-course-btn"
              onClick={handleProcessBatchCourse}
              disabled={isProcessingBatch || batchSources.length === 0}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-600/20 cursor-pointer"
            >
              {isProcessingBatch ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>AI Đang Tổng Hợp Khoá Học...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Tổng Hợp Khoá Học Mini 4 Kỹ Năng</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SOURCES LIBRARY & ACTIVE SOURCE VIEWER */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Sources List (4 cols) */}
        <div className="lg:col-span-4 p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Thư Viện Nguồn ({sources.length})
            </h2>
            <div className="relative w-32">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1 custom-scrollbar">
            {filteredSources.map((src) => {
              const isSelected = selectedSource?.id === src.id;
              return (
                <div
                  key={src.id}
                  onClick={() => setSelectedSource(src)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 shadow-sm'
                      : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold text-xs text-slate-900 dark:text-slate-100 line-clamp-1">
                      {src.title}
                    </div>
                    <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 shrink-0">
                      {src.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 mt-1">
                    {src.summary}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {src.lessonPack ? '✓ Có Gói 4 Kỹ Năng' : `${src.extractedVocab.length} Từ vựng`}
                    </span>
                    <span>{new Date(src.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Detailed Extracted Content & Lesson Pack (8 cols) */}
        <div className="lg:col-span-8 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-5">
          {selectedSource ? (
            <>
              {/* Header of selected source */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      {selectedSource.type}
                    </span>
                    <span className="text-xs text-slate-500">
                      {selectedSource.sourceUrlOrName}
                    </span>
                    {selectedSource.targetBand && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                        Band {selectedSource.targetBand}
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {selectedSource.title}
                  </h2>
                </div>

                <button
                  onClick={() => deleteSource(selectedSource.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                  title="Xóa nguồn này"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Sub-view switcher: Lesson Pack vs Extracted Vocab vs Grammar */}
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-3">
                <button
                  onClick={() => setActiveSubView('pack')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeSubView === 'pack'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Gói Bài Học 4 Kỹ Năng</span>
                </button>

                <button
                  onClick={() => setActiveSubView('vocab')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeSubView === 'vocab'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Từ Vựng C1/C2 ({selectedSource.extractedVocab.length})</span>
                </button>

                <button
                  onClick={() => setActiveSubView('grammar')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeSubView === 'grammar'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Ngữ Pháp & Tóm Tắt</span>
                </button>
              </div>

              {/* SUBVIEW 1: LESSON PACK */}
              {activeSubView === 'pack' && selectedSource.lessonPack && (
                <LessonPackViewer
                  sourceTitle={selectedSource.title}
                  sourceId={selectedSource.id}
                  lessonPack={selectedSource.lessonPack}
                  extractedVocab={selectedSource.extractedVocab}
                />
              )}

              {/* Fallback if no lesson pack yet */}
              {activeSubView === 'pack' && !selectedSource.lessonPack && (
                <div className="p-8 text-center space-y-3 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <BookOpen className="w-8 h-8 mx-auto text-blue-500 opacity-60" />
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    Nguồn này được tạo từ phiên bản trước hoặc chưa có Gói 4 kỹ năng hoàn chỉnh.
                  </div>
                  <button
                    onClick={() => setActiveSubView('vocab')}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs"
                  >
                    Xem Từ Vựng & Cấu Trúc Đã Trích Xuất
                  </button>
                </div>
              )}

              {/* SUBVIEW 2: VOCABULARY */}
              {activeSubView === 'vocab' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-500" />
                      <span>Từ Vựng C1/C2 Được Trích Xuất ({selectedSource.extractedVocab.length})</span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedSource.extractedVocab.map((v, i) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{v.word}</span>
                            <span className="text-xs text-slate-400 font-mono">{v.phonetic}</span>
                          </div>
                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                            {v.cefrLevel || 'C1'}
                          </span>
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                          {v.definitionVi}
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 italic font-serif">
                          "{v.exampleEn}"
                        </div>
                        {v.collocations && v.collocations.length > 0 && (
                          <div className="text-[10px] text-slate-500 pt-1 flex flex-wrap gap-1">
                            <strong className="text-slate-700 dark:text-slate-300">Collocations:</strong>
                            {v.collocations.map((c, ci) => (
                              <span
                                key={ci}
                                className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SUBVIEW 3: GRAMMAR & SUMMARY */}
              {activeSubView === 'grammar' && (
                <div className="space-y-4">
                  {/* Summary Box */}
                  <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800/60">
                    <div className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5 mb-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>AI Tóm Tắt Ý Chính Học Thuật:</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-serif">
                      {selectedSource.summary}
                    </p>
                  </div>

                  {/* Extracted Grammar Structure */}
                  {selectedSource.extractedGrammar && selectedSource.extractedGrammar.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Cấu Trúc Ngữ Pháp Điểm Nhấn
                      </h3>
                      {selectedSource.extractedGrammar.map((g, gi) => (
                        <div
                          key={gi}
                          className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/50 text-xs space-y-1"
                        >
                          <div className="font-bold text-emerald-900 dark:text-emerald-300">{g.pattern}</div>
                          <div className="font-mono text-[11px] text-slate-500">{g.formula}</div>
                          <div className="italic text-slate-800 dark:text-slate-200 font-serif">"{g.example}"</div>
                          <div className="text-slate-600 dark:text-slate-400 text-[11px]">{g.explanation}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 text-slate-400">
              <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50 text-blue-500" />
              <p className="text-sm font-semibold">Chưa chọn nguồn học liệu nào</p>
              <p className="text-xs">Chọn một nguồn ở danh sách bên trái hoặc nạp nguồn mới.</p>
            </div>
          )}
        </div>
      </div>

      {/* AI Course Designer Modal */}
      <SourceToLearningPackageModal
        isOpen={isCourseDesignerOpen}
        onClose={() => setIsCourseDesignerOpen(false)}
        initialSourceText={rawTextContent || ''}
        initialTargetBand={targetBand || 7.0}
      />
    </div>
  );
};
