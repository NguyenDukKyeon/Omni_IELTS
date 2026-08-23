import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
  Volume2,
  RotateCw,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  Plus,
  ArrowRight,
  BookOpen,
  TrendingUp,
  Tag,
  Zap,
  Mic,
  MicOff,
  HelpCircle,
  Clock,
  Download,
  Printer,
  FileSpreadsheet,
  Trash2,
  Edit3,
  ExternalLink,
  Flame,
  Award,
  ChevronRight,
  ChevronLeft,
  X,
  VolumeX,
  Shuffle,
  Eye,
  Check,
  AlertCircle,
  Lightbulb,
  Share2,
  ListFilter
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { VocabCard, VocabExample, VocabSynonym } from '../types';
import { ReviewRating, getDueVocabCards, isDueForReview } from '../services/srsScheduler';
import { playTextToSpeech, generateVocabCardApi } from '../services/aiTutor';
import { curatedIELTSDecks, CuratedDeckMeta } from '../data/curatedDecks';
import { VocabEnricherModal } from '../components/vocab/VocabEnricherModal';

type StudyMode = 'flashcard' | 'quiz' | 'dictation' | 'context' | 'pronunciation' | 'lexicon' | 'decks';

export const VocabularySRSView: React.FC = () => {
  const {
    vocabCards,
    reviewVocabCard,
    addVocabCard,
    bulkAddVocabCards,
    updateVocabCard,
    resetVocabSRS,
    deleteVocabCard,
    importCuratedDeck,
    profile,
    sources,
    awardXP,
    openAITutorWithPrompt
  } = useApp();

  // Navigation & Study Mode
  const [studyMode, setStudyMode] = useState<StudyMode>('flashcard');
  const [selectedDeckFilter, setSelectedDeckFilter] = useState<string>('all');
  const [selectedCefrFilter, setSelectedCefrFilter] = useState<string>('all');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Flashcard State
  const [cardIndex, setCardIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [voiceAccent, setVoiceAccent] = useState<'uk' | 'us'>('uk');
  const [speechRate, setSpeechRate] = useState<number>(0.95);

  // Multiple Choice Quiz State
  const [quizIndex, setQuizIndex] = useState<number>(0);
  const [quizSelectedOption, setQuizSelectedOption] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState<{ correct: number; streak: number; total: number }>({
    correct: 0,
    streak: 0,
    total: 0,
  });
  const [quizFeedback, setQuizFeedback] = useState<boolean | null>(null);

  // Dictation State
  const [dictationInput, setDictationInput] = useState<string>('');
  const [dictationIndex, setDictationIndex] = useState<number>(0);
  const [dictationHintCount, setDictationHintCount] = useState<number>(0);
  const [dictationResult, setDictationResult] = useState<'correct' | 'wrong' | null>(null);

  // Context Gap-Fill State
  const [contextIndex, setContextIndex] = useState<number>(0);
  const [contextSelectedChoice, setContextSelectedChoice] = useState<string | null>(null);
  const [contextResult, setContextResult] = useState<boolean | null>(null);

  // Pronunciation Speaking Drill State
  const [pronIndex, setPronIndex] = useState<number>(0);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTranscript, setRecordingTranscript] = useState<string>('');
  const [pronunciationError, setPronunciationError] = useState<string | null>(null);
  const [pronEvaluation, setPronEvaluation] = useState<{
    accuracy: number;
    feedback: string;
    tips?: string;
  } | null>(null);
  const [isEvaluatingPron, setIsEvaluatingPron] = useState<boolean>(false);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [selectedCardDetail, setSelectedCardDetail] = useState<VocabCard | null>(null);
  const [selectedCuratedDeck, setSelectedCuratedDeck] = useState<CuratedDeckMeta | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isEnricherOpen, setIsEnricherOpen] = useState<boolean>(false);

  // AI Auto-Gen Form State in Add Modal
  const [inputWord, setInputWord] = useState('');
  const [inputContextHint, setInputContextHint] = useState('');
  const [inputTopicDeck, setInputTopicDeck] = useState('Academic Word List (AWL)');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState<Partial<VocabCard> | null>(null);

  // Filtered Cards for Study & List
  const dueCards = getDueVocabCards(vocabCards);
  
  // Active study deck: prioritize due cards, otherwise all cards matching deck filter
  const currentFilteredCards = vocabCards.filter((card) => {
    const matchesDeck =
      selectedDeckFilter === 'all' ||
      (selectedDeckFilter === 'due_only' && isDueForReview(card.nextReviewDate)) ||
      card.topicDeck === selectedDeckFilter ||
      (selectedDeckFilter === 'sources' && card.originModule === 'source_import');

    const matchesCefr = selectedCefrFilter === 'all' || card.cefrLevel === selectedCefrFilter;

    const matchesStage =
      selectedStageFilter === 'all' ||
      (selectedStageFilter === 'stage_0' && card.srsStage === 0) ||
      (selectedStageFilter === 'stage_1_2' && card.srsStage >= 1 && card.srsStage <= 2) ||
      (selectedStageFilter === 'stage_3_4' && card.srsStage >= 3 && card.srsStage <= 4) ||
      (selectedStageFilter === 'stage_5' && (card.mastered || card.srsStage >= 5));

    const matchesSearch =
      (card.word || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (card.definitionVi || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (card.collocations || []).some((c) => (c || '').toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesDeck && matchesCefr && matchesStage && matchesSearch;
  });

  const activeStudyQueue = currentFilteredCards.length > 0 ? currentFilteredCards : vocabCards;
  const currentCard: VocabCard | undefined = activeStudyQueue[cardIndex % Math.max(1, activeStudyQueue.length)];

  // Leitner Memory Statistics
  const stage0Count = vocabCards.filter((c) => c.srsStage === 0).length;
  const stage12Count = vocabCards.filter((c) => c.srsStage >= 1 && c.srsStage <= 2).length;
  const stage34Count = vocabCards.filter((c) => c.srsStage >= 3 && c.srsStage <= 4).length;
  const stageMasteredCount = vocabCards.filter((c) => c.mastered || c.srsStage >= 5).length;
  const retentionPercent = vocabCards.length > 0 ? Math.round((stageMasteredCount / vocabCards.length) * 100) : 0;

  // Keyboard shortcut for Flashcard mode (Space = Flip, 1/2/3/4 = Rate)
  useEffect(() => {
    if (studyMode !== 'flashcard' || !currentCard || isAddModalOpen || selectedCardDetail) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (isFlipped) {
        if (e.key === '1') handleSRSResponse('again');
        if (e.key === '2') handleSRSResponse('hard');
        if (e.key === '3') handleSRSResponse('good');
        if (e.key === '4') handleSRSResponse('easy');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [studyMode, isFlipped, currentCard, isAddModalOpen, selectedCardDetail]);

  // Flashcard SRS Response
  const handleSRSResponse = (rating: ReviewRating) => {
    if (!currentCard) return;
    reviewVocabCard(currentCard.id, rating);
    setIsFlipped(false);
    setCardIndex((prev) => (prev + 1) % activeStudyQueue.length);
  };

  // Play pronunciation sound
  const handlePlayVoice = (text: string, accent?: 'uk' | 'us') => {
    playTextToSpeech(text, accent || voiceAccent, speechRate);
  };

  // AI Auto-Generate Vocab Card
  const handleAiAutoGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputWord.trim()) return;

    setIsAiGenerating(true);
    try {
      const generated = await generateVocabCardApi(
        inputWord.trim(),
        inputContextHint || inputTopicDeck,
        profile.targetBand
      );
      setGeneratedDraft({
        ...generated,
        topicDeck: inputTopicDeck || generated.topicDeck || 'Academic Word List (AWL)',
        originModule: 'manual',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Save New Card to State
  const handleSaveDraftCard = () => {
    if (!generatedDraft || !generatedDraft.word) return;

    const newCard: VocabCard = {
      id: `vc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      word: generatedDraft.word.trim(),
      phonetic: generatedDraft.ukPhonetic || generatedDraft.phonetic || `/${generatedDraft.word}/`,
      ukPhonetic: generatedDraft.ukPhonetic || `/${generatedDraft.word}/`,
      usPhonetic: generatedDraft.usPhonetic || `/${generatedDraft.word}/`,
      pos: generatedDraft.pos || 'noun',
      definitionVi: generatedDraft.definitionVi || 'Định nghĩa tiếng Việt',
      definitionEn: generatedDraft.definitionEn || 'Academic English definition',
      definitionAcademicEn: generatedDraft.definitionAcademicEn || generatedDraft.definitionEn,
      exampleEn: generatedDraft.exampleEn || (generatedDraft.examples?.[0]?.en) || `The term ${generatedDraft.word} is widely examined in academic literature.`,
      exampleVi: generatedDraft.exampleVi || (generatedDraft.examples?.[0]?.vi) || 'Ví dụ minh họa ngữ cảnh.',
      examples: generatedDraft.examples || [
        {
          en: generatedDraft.exampleEn || `The term ${generatedDraft.word} is vital in IELTS.`,
          vi: generatedDraft.exampleVi || 'Ví dụ ngữ cảnh.',
          context: 'IELTS Task 2',
        },
      ],
      collocations: generatedDraft.collocations || [`profound ${generatedDraft.word}`],
      synonyms: generatedDraft.synonyms || [],
      antonyms: generatedDraft.antonyms || [],
      mnemonic: generatedDraft.mnemonic || 'Liên kết với hình ảnh thực tế để nhớ lâu hơn.',
      imageUrl: generatedDraft.imageUrl || 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&auto=format&fit=crop&q=80',
      cefrLevel: generatedDraft.cefrLevel || 'C1',
      topicDeck: generatedDraft.topicDeck || inputTopicDeck || 'Academic Word List (AWL)',
      originModule: 'manual',
      srsStage: 0,
      intervalDays: 1,
      nextReviewDate: new Date().toISOString(),
      easeFactor: 2.5,
      repetitions: 0,
      mastered: false,
    };

    addVocabCard(newCard);
    setIsAddModalOpen(false);
    setInputWord('');
    setInputContextHint('');
    setGeneratedDraft(null);
  };

  // Multiple Choice Question Generator for current quiz item
  const quizCard = activeStudyQueue[quizIndex % Math.max(1, activeStudyQueue.length)];
  const quizOptions = React.useMemo(() => {
    if (!quizCard) return [];
    const others = vocabCards.filter((c) => c.id !== quizCard.id);
    const shuffledOthers = [...others].sort(() => 0.5 - Math.random()).slice(0, 3);
    const options = [
      { text: quizCard.definitionVi, isCorrect: true },
      ...shuffledOthers.map((c) => ({ text: c.definitionVi, isCorrect: false })),
    ];
    // Fallback if not enough other cards
    if (options.length < 4) {
      options.push({ text: 'Làm suy thoái nhanh chóng các nguồn tài nguyên thiên nhiên', isCorrect: false });
      options.push({ text: 'Có tầm quan trọng tối cao trong chính sách phát triển', isCorrect: false });
    }
    return options.slice(0, 4).sort(() => 0.5 - Math.random());
  }, [quizCard, vocabCards]);

  const handleSelectQuizOption = (optionText: string, isCorrect: boolean) => {
    if (quizSelectedOption !== null) return;
    setQuizSelectedOption(optionText);
    setQuizFeedback(isCorrect);

    if (isCorrect) {
      setQuizScore((prev) => ({
        correct: prev.correct + 1,
        streak: prev.streak + 1,
        total: prev.total + 1,
      }));
      awardXP(10, 'Trả lời đúng trắc nghiệm từ vựng!');
      if (quizCard) reviewVocabCard(quizCard.id, 'good');
    } else {
      setQuizScore((prev) => ({
        ...prev,
        streak: 0,
        total: prev.total + 1,
      }));
      if (quizCard) reviewVocabCard(quizCard.id, 'again');
    }
  };

  const handleNextQuiz = () => {
    setQuizSelectedOption(null);
    setQuizFeedback(null);
    setQuizIndex((prev) => (prev + 1) % activeStudyQueue.length);
  };

  // Dictation Check
  const dictationCard = activeStudyQueue[dictationIndex % Math.max(1, activeStudyQueue.length)];
  const handleCheckDictation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dictationCard || !dictationInput.trim()) return;

    const isMatch = dictationInput.trim().toLowerCase() === dictationCard.word.toLowerCase();
    setDictationResult(isMatch ? 'correct' : 'wrong');

    if (isMatch) {
      awardXP(15, `Chính tả chính xác từ "${dictationCard.word}"!`);
      reviewVocabCard(dictationCard.id, 'good');
    } else {
      reviewVocabCard(dictationCard.id, 'again');
    }
  };

  const handleNextDictation = () => {
    setDictationInput('');
    setDictationHintCount(0);
    setDictationResult(null);
    setDictationIndex((prev) => (prev + 1) % activeStudyQueue.length);
  };

  // Context Gap-fill
  const contextCard = activeStudyQueue[contextIndex % Math.max(1, activeStudyQueue.length)];
  const contextSentence = contextCard?.exampleEn || `The concept of ________ plays a central role in modern research.`;
  const sentenceWithBlank = contextCard
    ? contextSentence.replace(new RegExp(contextCard.word, 'gi'), '__________')
    : '__________';

  const contextChoices = React.useMemo(() => {
    if (!contextCard) return [];
    const others = vocabCards.filter((c) => c.id !== contextCard.id);
    const shuffledOthers = [...others].sort(() => 0.5 - Math.random()).slice(0, 3);
    const choices = [contextCard.word, ...shuffledOthers.map((c) => c.word)];
    return choices.sort(() => 0.5 - Math.random());
  }, [contextCard, vocabCards]);

  const handleSelectContextChoice = (word: string) => {
    if (contextSelectedChoice !== null || !contextCard) return;
    setContextSelectedChoice(word);
    const isCorrect = word.toLowerCase() === contextCard.word.toLowerCase();
    setContextResult(isCorrect);
    if (isCorrect) {
      awardXP(15, `Điền đúng từ "${contextCard.word}" vào ngữ cảnh IELTS!`);
      reviewVocabCard(contextCard.id, 'good');
    } else {
      reviewVocabCard(contextCard.id, 'again');
    }
  };

  const handleNextContext = () => {
    setContextSelectedChoice(null);
    setContextResult(null);
    setContextIndex((prev) => (prev + 1) % activeStudyQueue.length);
  };

  // Pronunciation recognition drill. Never fabricate a successful microphone result.
  const pronCard = activeStudyQueue[pronIndex % Math.max(1, activeStudyQueue.length)];

  const startVoiceRecording = () => {
    if (!pronCard) return;
    setIsRecording(true);
    setRecordingTranscript('');
    setPronEvaluation(null);
    setPronunciationError(null);

    // Check if Web Speech Recognition is supported
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = voiceAccent === 'us' ? 'en-US' : 'en-GB';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = async (event: any) => {
          const transcript = event.results[0][0].transcript;
          setRecordingTranscript(transcript);
          setIsRecording(false);
          await evaluateSpeaking(transcript);
        };

        recognition.onerror = () => {
          setIsRecording(false);
          setPronunciationError('Không thể nhận giọng nói. Hãy kiểm tra quyền microphone và thử lại.');
        };

        recognition.start();
      } catch (err) {
        console.warn('SpeechRecognition error:', err);
        setIsRecording(false);
        setPronunciationError('Trình duyệt không thể khởi động nhận diện giọng nói.');
      }
    } else {
      setIsRecording(false);
      setPronunciationError('Nhận diện giọng nói không khả dụng trên trình duyệt này; không có điểm mô phỏng được tạo.');
    }
  };

  const evaluateSpeaking = async (transcript: string) => {
    if (!pronCard) return;
    setIsEvaluatingPron(true);
    try {
      const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9'\s-]/g, '').replace(/\s+/g, ' ').trim();
      const matched = normalize(transcript) === normalize(pronCard.word);
      const evalResult = {
        accuracy: matched ? 100 : 0,
        feedback: matched
          ? `Trình duyệt đã nhận diện đúng từ “${pronCard.word}”. Đây là kiểm tra nhận diện từ, không phải điểm âm học.`
          : `Trình duyệt nhận diện thành “${transcript}”. Hãy nghe mẫu, kiểm tra trọng âm ${pronCard.phonetic || ''} và thử lại.`,
        phoneticMatch: matched,
      };
      setPronEvaluation(evalResult);
      if (matched) {
        awardXP(20, `Nhận diện đúng từ "${pronCard.word}"!`);
        reviewVocabCard(pronCard.id, 'good');
      } else {
        reviewVocabCard(pronCard.id, 'hard');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsEvaluatingPron(false);
    }
  };

  const handleNextPron = () => {
    setRecordingTranscript('');
    setPronEvaluation(null);
    setPronunciationError(null);
    setPronIndex((prev) => (prev + 1) % activeStudyQueue.length);
  };

  // Export Data Handlers
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(vocabCards, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `omni_ielts_vocab_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportAnkiTSV = () => {
    // Format: Front (Word + Audio + Pos) \t Back (Phonetic + DefVi + DefEn + Collocations + Examples + Mnemonic) \t Tags
    const rows = vocabCards.map((c) => {
      const front = `${c.word} [${c.pos}] (${c.cefrLevel || 'C1'})`;
      const back = `<div><strong>${c.phonetic}</strong></div><div><strong>Nghĩa:</strong> ${c.definitionVi}</div><div><em>${c.definitionAcademicEn || c.definitionEn}</em></div><hr><div><strong>Collocations:</strong> ${c.collocations.join(', ')}</div><div><strong>Ví dụ:</strong> ${c.exampleEn}<br><em>${c.exampleVi}</em></div><div><strong>Mẹo nhớ:</strong> ${c.mnemonic || ''}</div>`;
      const tags = `${c.topicDeck?.replace(/\s+/g, '_') || 'IELTS'} CEFR_${c.cefrLevel || 'C1'}`;
      return `${front}\t${back}\t${tags}`;
    });
    const tsvContent = 'data:text/tab-separated-values;charset=utf-8,' + encodeURIComponent(rows.join('\n'));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', tsvContent);
    downloadAnchor.setAttribute('download', `omni_ielts_anki_deck_${new Date().toISOString().split('T')[0]}.txt`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handlePrintList = () => {
    window.print();
  };

  return (
    <div id="vocabulary-module" className="space-y-6 animate-fadeIn pb-12">
      {/* 1. BENTO HERO HEADER & CONTROLS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-display tracking-tight flex items-center gap-2">
                <span>Kho Từ Vựng & Thuật Toán SRS</span>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800">
                  SM-2 / Leitner 5
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Ghi nhớ từ vựng học thuật C1/C2 vào trí nhớ dài hạn. Đa dạng 5 chế độ tương tác theo triết lý Mochi-SRS.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* AI Lexicographer Enricher Button */}
          <button
            id="enrich-vocab-btn"
            onClick={() => setIsEnricherOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-teal-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>✨ AI Lexicographer (Làm Giàu Từ Vựng)</span>
          </button>

          {/* Add Word Button */}
          <button
            id="add-vocab-btn"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Thủ Công</span>
          </button>

          {/* Curated Decks Explorer */}
          <button
            id="browse-decks-btn"
            onClick={() => setStudyMode('decks')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              studyMode === 'decks'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-transparent shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
            }`}
          >
            <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Bộ từ chuẩn IELTS ({curatedIELTSDecks.length})</span>
          </button>

          {/* Export Modal Trigger */}
          <button
            id="export-vocab-btn"
            onClick={() => setIsExportModalOpen(true)}
            className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors cursor-pointer"
            title="Xuất dữ liệu / Ôn tập offline"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. LEITNER MEMORY BINS PROGRESSION & DUE QUEUE (BENTO ROW) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Golden Time Review Queue */}
        <div className="md:col-span-4 p-5 rounded-3xl bg-linear-to-br from-blue-600 to-indigo-700 text-white shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="space-y-2 relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase font-extrabold tracking-wider bg-white/20 px-2.5 py-0.8 rounded-full">
                Thời Điểm Vàng Ôn Tập
              </span>
              <Clock className="w-4 h-4 text-blue-200" />
            </div>

            <div className="flex items-baseline gap-2 pt-1">
              <span className="text-4xl sm:text-5xl font-black font-display">{dueCards.length}</span>
              <span className="text-xs text-blue-100 font-semibold">thẻ đến hạn hôm nay</span>
            </div>

            <p className="text-xs text-blue-100/90 leading-relaxed">
              Ôn ngay khi não sắp quên để củng cố liên kết nơ-ron mạnh nhất theo đường cong lãng quên Ebbinghaus.
            </p>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-white/15 mt-3 relative z-10 text-xs">
            <span className="text-blue-100">Tổng kho: <strong>{vocabCards.length} từ</strong></span>
            <span className="text-amber-300 font-bold flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 fill-amber-300" />
              <span>Nhớ sâu: {retentionPercent}%</span>
            </span>
          </div>
        </div>

        {/* 4 Leitner Memory Bins */}
        <div className="md:col-span-8 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Phân Bố 4 Cấp Độ Bộ Nhớ Dài Hạn (Leitner Memory Bins)</span>
            </span>
            <span className="text-slate-700 dark:text-slate-300 font-normal">
              Mục tiêu: Đưa 100% từ vào Hộp 4
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Box 1 */}
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 text-center">
              <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 block">
                Hộp 1 • Mới nạp
              </span>
              <span className="text-2xl font-black text-rose-700 dark:text-rose-300 mt-0.5 block">{stage0Count}</span>
              <span className="text-[10px] text-rose-600/80 dark:text-rose-400/80 font-medium">Chu kỳ: 1 ngày</span>
            </div>

            {/* Box 2 */}
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 text-center">
              <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 block">
                Hộp 2 • Đang nhớ
              </span>
              <span className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-0.5 block">{stage12Count}</span>
              <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80 font-medium">Chu kỳ: 3 - 5 ngày</span>
            </div>

            {/* Box 3 */}
            <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50 text-center">
              <span className="text-[10px] uppercase font-bold text-sky-600 dark:text-sky-400 block">
                Hộp 3 • Nhớ vững
              </span>
              <span className="text-2xl font-black text-sky-700 dark:text-sky-300 mt-0.5 block">{stage34Count}</span>
              <span className="text-[10px] text-sky-600/80 dark:text-sky-400/80 font-medium">Chu kỳ: 7 - 15 ngày</span>
            </div>

            {/* Box 4 */}
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">
                Hộp 4 • Thành thạo
              </span>
              <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5 block">{stageMasteredCount}</span>
              <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-medium">Chu kỳ: 30+ ngày</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
            <div style={{ width: `${(stage0Count / Math.max(1, vocabCards.length)) * 100}%` }} className="bg-rose-500 h-full transition-all" title="Mới nạp" />
            <div style={{ width: `${(stage12Count / Math.max(1, vocabCards.length)) * 100}%` }} className="bg-amber-500 h-full transition-all" title="Đang nhớ" />
            <div style={{ width: `${(stage34Count / Math.max(1, vocabCards.length)) * 100}%` }} className="bg-sky-500 h-full transition-all" title="Nhớ vững" />
            <div style={{ width: `${(stageMasteredCount / Math.max(1, vocabCards.length)) * 100}%` }} className="bg-emerald-500 h-full transition-all" title="Thành thạo" />
          </div>
        </div>
      </div>

      {/* 3. 5-MODE NAVIGATION TAB BAR (MOCHI STYLE) */}
      <div className="p-1.5 bg-slate-100 dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-1 overflow-x-auto no-scrollbar">
        <button
          id="mode-flashcard-btn"
          onClick={() => setStudyMode('flashcard')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            studyMode === 'flashcard'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>1. Thẻ Flashcard 3D</span>
        </button>

        <button
          id="mode-quiz-btn"
          onClick={() => setStudyMode('quiz')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            studyMode === 'quiz'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span>2. Trắc Nghiệm Nghĩa</span>
        </button>

        <button
          id="mode-dictation-btn"
          onClick={() => setStudyMode('dictation')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            studyMode === 'dictation'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Volume2 className="w-3.5 h-3.5 text-purple-500" />
          <span>3. Nghe & Gõ Từ</span>
        </button>

        <button
          id="mode-context-btn"
          onClick={() => setStudyMode('context')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            studyMode === 'context'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Edit3 className="w-3.5 h-3.5 text-emerald-500" />
          <span>4. Điền Từ Ngữ Cảnh</span>
        </button>

        <button
          id="mode-pronunciation-btn"
          onClick={() => setStudyMode('pronunciation')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            studyMode === 'pronunciation'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Mic className="w-3.5 h-3.5 text-rose-500" />
          <span>5. Luyện Phát Âm (AI)</span>
        </button>

        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1 shrink-0" />

        <button
          id="mode-lexicon-btn"
          onClick={() => setStudyMode('lexicon')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            studyMode === 'lexicon'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-slate-500" />
          <span>Sổ Từ & Bộ Lọc ({vocabCards.length})</span>
        </button>
      </div>

      {/* 4. MODE 1: 3D FLASHCARD SRS VIEW */}
      {studyMode === 'flashcard' && (
        <div className="max-w-2xl mx-auto space-y-4">
          {currentCard ? (
            <div className="space-y-4">
              {/* Header Info & Voice Accent Picker */}
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 px-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                    {cardIndex + 1} / {activeStudyQueue.length}
                  </span>
                  <span className="text-slate-700 dark:text-slate-300">
                    Chủ đề: <strong>{currentCard.topicDeck || 'Academic Core'}</strong>
                  </span>
                </div>

                {/* Voice Accent Switcher */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => setVoiceAccent('uk')}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      voiceAccent === 'uk'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    🇬🇧 Anh - Anh
                  </button>
                  <button
                    onClick={() => setVoiceAccent('us')}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      voiceAccent === 'us'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    🇺🇸 Anh - Mỹ
                  </button>
                </div>
              </div>

              {/* 3D Interactive Card Container */}
              <div
                id="interactive-flashcard"
                onClick={() => setIsFlipped(!isFlipped)}
                className={`relative min-h-[380px] sm:min-h-[420px] rounded-3xl p-6 sm:p-8 bg-white dark:bg-slate-900 border-2 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md flex flex-col justify-between select-none ${
                  isFlipped
                    ? 'border-blue-500/80 dark:border-blue-500/80 bg-linear-to-b from-white to-blue-50/20 dark:from-slate-900 dark:to-blue-950/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Top Badge Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.8 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800">
                      {currentCard.pos}
                    </span>
                    <span className="text-[11px] font-extrabold px-2 py-0.8 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800">
                      CEFR {currentCard.cefrLevel || 'C1'}
                    </span>
                  </div>

                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>{isFlipped ? 'Nhấn để xem mặt trước' : 'Nhấn phím Space hoặc chạm để lật'}</span>
                  </span>
                </div>

                {/* FRONT OF CARD */}
                {!isFlipped ? (
                  <div className="my-auto text-center space-y-4 py-6">
                    <div className="space-y-2">
                      <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight font-display">
                        {currentCard.word}
                      </h2>
                      <div className="flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 font-mono text-sm sm:text-base">
                        <span>
                          {voiceAccent === 'us'
                            ? currentCard.usPhonetic || currentCard.phonetic
                            : currentCard.ukPhonetic || currentCard.phonetic}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayVoice(currentCard.word);
                          }}
                          className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors cursor-pointer"
                          title="Nghe phát âm chuẩn"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Mnemonic Hint / Visual Cue */}
                    {currentCard.mnemonic && (
                      <div className="max-w-md mx-auto p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/50 text-left text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5 shadow-2xs">
                        <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block text-amber-800 dark:text-amber-300">Gợi ý ghi nhớ nhanh:</span>
                          <span className="text-[11px] leading-relaxed">{currentCard.mnemonic}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* BACK OF CARD */
                  <div className="space-y-4 py-2">
                    {/* Definitions */}
                    <div className="space-y-1">
                      <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                        {currentCard.definitionVi}
                      </div>
                      {currentCard.definitionAcademicEn && (
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 italic">
                          "{currentCard.definitionAcademicEn}"
                        </p>
                      )}
                    </div>

                    {/* Collocations & Synonyms */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {currentCard.collocations && currentCard.collocations.length > 0 && (
                        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 block">
                            Collocations thường gặp:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {currentCard.collocations.map((col, idx) => (
                              <span
                                key={idx}
                                className="text-[11px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-600 font-medium"
                              >
                                {col}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {currentCard.synonyms && currentCard.synonyms.length > 0 && (
                        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">
                            Từ đồng nghĩa (Synonyms):
                          </span>
                          <div className="text-[11px] text-slate-700 dark:text-slate-300 space-y-0.5">
                            {currentCard.synonyms.slice(0, 3).map((syn, idx) => (
                              <div key={idx} className="flex items-baseline gap-1">
                                <strong className="text-slate-900 dark:text-slate-100">{syn.word}</strong>
                                {syn.nuance && <span className="text-[10px] text-slate-700 dark:text-slate-300">({syn.nuance})</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Context Examples */}
                    {currentCard.examples && currentCard.examples.length > 0 ? (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] uppercase font-bold text-slate-700 dark:text-slate-300 block">
                          Câu ví dụ chuẩn IELTS:
                        </span>
                        <div className="space-y-1.5 text-xs">
                          {currentCard.examples.slice(0, 2).map((ex, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-slate-800 dark:text-slate-200 space-y-0.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{ex.en}</span>
                                {ex.context && (
                                  <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-blue-200/60 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                                    {ex.context}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">{ex.vi}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 text-xs text-slate-800 dark:text-slate-200">
                        <div>{currentCard.exampleEn}</div>
                        <div className="text-slate-500 text-[11px] mt-0.5">{currentCard.exampleVi}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom Bar inside Card */}
                <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <span>
                    Trạng thái SRS: <strong>Hộp {currentCard.srsStage}</strong> ({currentCard.intervalDays} ngày)
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openAITutorWithPrompt(`Giải thích chi tiết cách áp dụng từ "${currentCard.word}" (${currentCard.pos}) vào bài thi IELTS Writing Task 2 và Speaking Part 3 để đạt band 7.5+. Cho 2 ví dụ câu mẫu nâng cấp.`);
                    }}
                    className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-bold"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Hỏi AI Tutor</span>
                  </button>
                </div>
              </div>

              {/* 4 SM-2 SRS FEEDBACK BUTTONS */}
              <div className="grid grid-cols-4 gap-2 pt-2">
                {/* 1. Again */}
                <button
                  id="srs-rate-again"
                  onClick={() => handleSRSResponse('again')}
                  className="p-3 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-900/60 flex flex-col items-center gap-0.5 transition-all active:scale-95 cursor-pointer"
                >
                  <span className="text-xs font-black">🔴 Chưa nhớ (1)</span>
                  <span className="text-[10px] opacity-75">Ôn lại ngay</span>
                </button>

                {/* 2. Hard */}
                <button
                  id="srs-rate-hard"
                  onClick={() => handleSRSResponse('hard')}
                  className="p-3 rounded-2xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900/60 flex flex-col items-center gap-0.5 transition-all active:scale-95 cursor-pointer"
                >
                  <span className="text-xs font-black">🟠 Hơi khó (2)</span>
                  <span className="text-[10px] opacity-75">1 - 2 ngày</span>
                </button>

                {/* 3. Good */}
                <button
                  id="srs-rate-good"
                  onClick={() => handleSRSResponse('good')}
                  className="p-3 rounded-2xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/60 flex flex-col items-center gap-0.5 transition-all active:scale-95 cursor-pointer"
                >
                  <span className="text-xs font-black">🟢 Nhớ tốt (3)</span>
                  <span className="text-[10px] opacity-75">3 - 7 ngày</span>
                </button>

                {/* 4. Easy */}
                <button
                  id="srs-rate-easy"
                  onClick={() => handleSRSResponse('easy')}
                  className="p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-900/60 flex flex-col items-center gap-0.5 transition-all active:scale-95 cursor-pointer"
                >
                  <span className="text-xs font-black">🔵 Dễ ợt (4)</span>
                  <span className="text-[10px] opacity-75">10 - 15 ngày</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Chúc mừng! Bạn đã hoàn thành tất cả thẻ đến hạn
              </h3>
              <p className="text-xs text-slate-500">
                Hãy chuyển sang các chế độ trắc nghiệm, gõ từ hoặc nạp thêm bộ từ chuẩn để tiếp tục tăng vốn từ.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 5. MODE 2: MULTIPLE CHOICE QUIZ */}
      {studyMode === 'quiz' && (
        <div className="max-w-2xl mx-auto space-y-4">
          {quizCard ? (
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
              {/* Quiz Header */}
              <div className="flex items-center justify-between text-xs font-bold">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                    Câu {quizIndex + 1} / {activeStudyQueue.length}
                  </span>
                  <span className="flex items-center gap-1 text-amber-500">
                    <Flame className="w-4 h-4 fill-amber-500" />
                    <span>Streak: {quizScore.streak}</span>
                  </span>
                </div>
                <span className="text-slate-500">
                  Đúng: <strong>{quizScore.correct}</strong> / {quizScore.total}
                </span>
              </div>

              {/* Question Word */}
              <div className="text-center space-y-2 py-4">
                <span className="text-xs uppercase font-extrabold tracking-wider text-slate-700 dark:text-slate-300">
                  Chọn nghĩa tiếng Việt chính xác của từ:
                </span>
                <div className="flex items-center justify-center gap-3">
                  <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-slate-100 font-display">
                    {quizCard.word}
                  </h2>
                  <button
                    onClick={() => handlePlayVoice(quizCard.word)}
                    className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 hover:bg-blue-100 transition-colors"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
                  {quizCard.pos} • {quizCard.phonetic}
                </span>
              </div>

              {/* 4 Options */}
              <div className="grid grid-cols-1 gap-2.5">
                {quizOptions.map((opt, i) => {
                  const isSelected = quizSelectedOption === opt.text;
                  let btnStyle = 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700';

                  if (quizSelectedOption !== null) {
                    if (opt.isCorrect) {
                      btnStyle = 'bg-emerald-500 text-white border-emerald-600 shadow-sm';
                    } else if (isSelected && !opt.isCorrect) {
                      btnStyle = 'bg-rose-500 text-white border-rose-600';
                    } else {
                      btnStyle = 'opacity-40 bg-slate-100 dark:bg-slate-800 text-slate-400 border-transparent';
                    }
                  }

                  return (
                    <button
                      key={i}
                      disabled={quizSelectedOption !== null}
                      onClick={() => handleSelectQuizOption(opt.text, opt.isCorrect)}
                      className={`p-4 rounded-2xl border text-left text-xs sm:text-sm font-semibold transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                    >
                      <span>{opt.text}</span>
                      {quizSelectedOption !== null && opt.isCorrect && <Check className="w-4 h-4 text-white shrink-0" />}
                      {quizSelectedOption !== null && isSelected && !opt.isCorrect && <X className="w-4 h-4 text-white shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Next Button */}
              {quizSelectedOption !== null && (
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleNextQuiz}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
                  >
                    <span>Câu tiếp theo</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* 6. MODE 3: AUDIO DICTATION & SPELLING */}
      {studyMode === 'dictation' && (
        <div className="max-w-2xl mx-auto space-y-4">
          {dictationCard ? (
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Nghe & Gõ Lại Từ ({dictationIndex + 1}/{activeStudyQueue.length})</span>
                <span className="text-purple-600 dark:text-purple-400">Luyện trí nhớ thính giác & chính tả</span>
              </div>

              {/* Audio Player Box */}
              <div className="p-6 rounded-3xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 text-center space-y-3">
                <button
                  type="button"
                  onClick={() => handlePlayVoice(dictationCard.word)}
                  className="w-16 h-16 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center mx-auto shadow-lg shadow-purple-600/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  title="Nhấn để nghe lại phát âm"
                >
                  <Volume2 className="w-8 h-8" />
                </button>
                <div className="text-xs text-purple-900 dark:text-purple-200">
                  <span>Nhấn nút để nghe lại phát âm • Nghĩa: </span>
                  <strong>{dictationCard.definitionVi}</strong>
                </div>
              </div>

              {/* Dictation Input Form */}
              <form onSubmit={handleCheckDictation} className="space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    value={dictationInput}
                    onChange={(e) => setDictationInput(e.target.value)}
                    disabled={dictationResult !== null}
                    placeholder="Gõ lại chính xác từ bạn vừa nghe..."
                    className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-base font-bold tracking-wider placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    autoFocus
                  />
                  {dictationResult === 'correct' && (
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 absolute right-4 top-3.5" />
                  )}
                  {dictationResult === 'wrong' && (
                    <AlertCircle className="w-6 h-6 text-rose-500 absolute right-4 top-3.5" />
                  )}
                </div>

                {/* Hint Button */}
                {dictationResult === null && (
                  <div className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => setDictationHintCount((prev) => prev + 1)}
                      className="text-purple-600 dark:text-purple-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Gợi ý ký tự đầu ({dictationCard.word.slice(0, Math.max(1, dictationHintCount))}...)</span>
                    </button>
                  </div>
                )}

                {/* Feedback Box */}
                {dictationResult !== null && (
                  <div
                    className={`p-4 rounded-2xl border text-xs sm:text-sm space-y-1 ${
                      dictationResult === 'correct'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-900 dark:text-emerald-200'
                        : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 text-rose-900 dark:text-rose-200'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      {dictationResult === 'correct' ? 'Tuyệt vời! Chính xác 100%' : 'Chưa chính xác!'}
                    </div>
                    <div>
                      Đáp án đúng là: <strong className="text-base tracking-wider">{dictationCard.word}</strong>{' '}
                      <span className="font-mono text-xs opacity-75">({dictationCard.phonetic})</span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2">
                  {dictationResult === null ? (
                    <button
                      type="submit"
                      disabled={!dictationInput.trim()}
                      className="px-6 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
                    >
                      Kiểm tra đáp án
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleNextDictation}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
                    >
                      <span>Từ tiếp theo</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </form>
            </div>
          ) : null}
        </div>
      )}

      {/* 7. MODE 4: CONTEXT GAP-FILL IN IELTS */}
      {studyMode === 'context' && (
        <div className="max-w-2xl mx-auto space-y-4">
          {contextCard ? (
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Điền từ vào ngữ cảnh IELTS Task 2/Reading ({contextIndex + 1}/{activeStudyQueue.length})</span>
                <span className="text-emerald-600 dark:text-emerald-400">Lexical Resource Mastery</span>
              </div>

              {/* IELTS Sentence with Blank */}
              <div className="p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 space-y-2">
                <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300 block">
                  Đoạn văn học thuật:
                </span>
                <p className="text-base sm:text-lg text-slate-900 dark:text-slate-100 font-serif leading-relaxed">
                  "{sentenceWithBlank}"
                </p>
                <div className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                  Nghĩa tiếng Việt của câu: <em>{contextCard.exampleVi}</em>
                </div>
              </div>

              {/* Choices */}
              <div className="grid grid-cols-2 gap-3">
                {contextChoices.map((word, i) => {
                  const isSelected = contextSelectedChoice === word;
                  const isCorrect = word.toLowerCase() === contextCard.word.toLowerCase();
                  let btnStyle = 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700';

                  if (contextSelectedChoice !== null) {
                    if (isCorrect) {
                      btnStyle = 'bg-emerald-500 text-white border-emerald-600 shadow-xs';
                    } else if (isSelected && !isCorrect) {
                      btnStyle = 'bg-rose-500 text-white border-rose-600';
                    } else {
                      btnStyle = 'opacity-40 bg-slate-100 dark:bg-slate-800 text-slate-400 border-transparent';
                    }
                  }

                  return (
                    <button
                      key={i}
                      disabled={contextSelectedChoice !== null}
                      onClick={() => handleSelectContextChoice(word)}
                      className={`p-3.5 rounded-2xl border text-center font-bold text-sm transition-all cursor-pointer ${btnStyle}`}
                    >
                      {word}
                    </button>
                  );
                })}
              </div>

              {contextSelectedChoice !== null && (
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleNextContext}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
                  >
                    <span>Câu tiếp theo</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* 8. MODE 5: PRONUNCIATION SPEAKING DRILL (AI) */}
      {studyMode === 'pronunciation' && (
        <div className="max-w-2xl mx-auto space-y-4">
          {pronCard ? (
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Luyện phát âm chuẩn IELTS ({pronIndex + 1}/{activeStudyQueue.length})</span>
                <span className="text-rose-600 dark:text-rose-400">AI Speech Evaluator</span>
              </div>

              {/* Target Word Display */}
              <div className="text-center space-y-2 py-3">
                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-slate-100 font-display">
                  {pronCard.word}
                </h2>
                <div className="flex items-center justify-center gap-2 text-slate-500 font-mono text-sm">
                  <span>{pronCard.phonetic}</span>
                  <button
                    onClick={() => handlePlayVoice(pronCard.word)}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-xs text-slate-500">{pronCard.definitionVi}</div>
              </div>

              {/* Record Mic Button */}
              <div className="text-center space-y-3">
                <button
                  id="pron-record-btn"
                  onClick={startVoiceRecording}
                  disabled={isRecording || isEvaluatingPron}
                  className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-xl transition-all cursor-pointer ${
                    isRecording
                      ? 'bg-rose-500 text-white animate-pulse ring-8 ring-rose-500/20'
                      : 'bg-rose-600 hover:bg-rose-700 text-white hover:scale-105 active:scale-95 shadow-rose-600/30'
                  }`}
                >
                  <Mic className="w-8 h-8" />
                </button>
                <div className="text-xs text-slate-500">
                  {isRecording
                    ? 'Đang lắng nghe giọng bạn nói...'
                    : isEvaluatingPron
                    ? 'Đang đối chiếu từ được nhận diện...'
                    : 'Chạm mic và đọc to từ trên'}
                </div>
                {pronunciationError && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">{pronunciationError}</p>
                )}
              </div>

              {/* Pronunciation Feedback */}
              {pronEvaluation && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Bạn đã nói: <strong>"{recordingTranscript}"</strong>
                    </span>
                    <span
                      className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${
                        pronEvaluation.accuracy >= 80
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      Độ nhận diện từ: {pronEvaluation.accuracy}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {pronEvaluation.feedback}
                  </p>
                  {pronEvaluation.tips && (
                    <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                      💡 Mẹo: {pronEvaluation.tips}
                    </div>
                  )}
                </div>
              )}

              {/* Next Button */}
              {pronEvaluation && (
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleNextPron}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
                  >
                    <span>Từ tiếp theo</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* 9. MODE 6: CURATED STANDARD IELTS DECKS EXPLORER */}
      {studyMode === 'decks' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Các Bộ Từ Vựng IELTS Chuẩn Cambridge
              </h2>
              <p className="text-xs text-slate-500">
                Nạp sẵn các bộ từ academic và collocations trọng điểm để học viên mới có thể bắt đầu ngay.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {curatedIELTSDecks.map((deck) => {
              const isImported = (deck.cards || []).every((c) =>
                vocabCards.some((vc) => (vc.word || '').toLowerCase() === (c.word || '').toLowerCase())
              );

              return (
                <div
                  key={deck.id}
                  className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4 hover:border-blue-400/50 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.8 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        {deck.badge}
                      </span>
                      <span className="text-xs font-bold text-slate-500">{deck.bandTarget}</span>
                    </div>

                    <div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">{deck.titleVi}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                        {deck.description}
                      </p>
                    </div>

                    {/* Sample Words */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {deck.sampleWords.map((w, i) => (
                        <span
                          key={i}
                          className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono"
                        >
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">
                      <strong>{deck.cards.length}</strong> từ vựng C1/C2
                    </span>
                    <button
                      onClick={() => {
                        importCuratedDeck(deck.id);
                        setStudyMode('flashcard');
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                    >
                      {isImported ? 'Ôn bộ này ngay' : '+ Nạp vào SRS'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 10. MODE 7: SỔ TỪ VỰNG & QUẢN LÝ (LEXICON EXPLORER) */}
      {studyMode === 'lexicon' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm theo từ tiếng Anh, nghĩa tiếng Việt hoặc collocation..."
                className="w-full pl-9.5 pr-4 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Deck Selector */}
            <select
              value={selectedDeckFilter}
              onChange={(e) => setSelectedDeckFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
            >
              <option value="all">Tất cả chủ đề</option>
              <option value="due_only">Chỉ thẻ đến hạn hôm nay</option>
              <option value="Academic Word List (AWL)">Academic Word List</option>
              <option value="Environment & Climate">Environment & Climate</option>
              <option value="Science & AI">Science & AI</option>
              <option value="High-Impact Collocations">Collocations Band 8+</option>
              <option value="sources">Từ nguồn học liệu đã nạp</option>
            </select>

            {/* CEFR Level Filter */}
            <select
              value={selectedCefrFilter}
              onChange={(e) => setSelectedCefrFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
            >
              <option value="all">Tất cả CEFR</option>
              <option value="B2">Level B2</option>
              <option value="C1">Level C1</option>
              <option value="C2">Level C2</option>
            </select>
          </div>

          {/* Cards Grid / Table */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {currentFilteredCards.map((card) => (
              <div
                key={card.id}
                onClick={() => setSelectedCardDetail(card)}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between space-y-2 group"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      {card.pos} • {card.cefrLevel || 'C1'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                      Hộp {card.srsStage} ({card.intervalDays}d)
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition-colors">
                      {card.word}
                    </h4>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayVoice(card.word);
                      }}
                      className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-xs font-mono text-slate-700 dark:text-slate-300">{card.phonetic}</div>
                  <div className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2">{card.definitionVi}</div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-300">
                  <span className="truncate max-w-[150px]">{card.topicDeck || 'Academic Core'}</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold group-hover:underline">Chi tiết →</span>
                </div>
              </div>
            ))}
          </div>

          {currentFilteredCards.length === 0 && (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2 text-slate-500">
              <Search className="w-8 h-8 mx-auto text-slate-400" />
              <p className="text-sm font-bold">Không tìm thấy từ vựng nào khớp với bộ lọc</p>
              <p className="text-xs">Hãy thử đổi từ khóa tìm kiếm hoặc bấm "+ Thêm Từ Mới" để AI tự sinh thẻ.</p>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: SMART AI AUTO-GEN ADD VOCABULARY */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp">
            {/* Modal Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Thêm Thẻ Từ Vựng Thông Minh (AI)</h3>
                  <p className="text-xs text-slate-400">Gõ 1 từ hoặc cụm từ, AI sẽ tự sinh 100% nội dung học thuật</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setGeneratedDraft(null);
                }}
                className="p-1.5 rounded-xl hover:bg-white/20 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1">
              {/* Input Form */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Từ hoặc Cụm từ cần học (Word / Collocation) *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputWord}
                    onChange={(e) => setInputWord(e.target.value)}
                    placeholder="Ví dụ: mitigate, paradigm, ubiquitous, paramount importance..."
                    className="flex-1 px-4 py-2.5 text-sm rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-semibold"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => handleAiAutoGenerate()}
                    disabled={!inputWord.trim() || isAiGenerating}
                    className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
                  >
                    {isAiGenerating ? (
                      <>
                        <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang sinh...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>AI Sinh Thẻ</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Chủ đề (Deck):</label>
                    <select
                      value={inputTopicDeck}
                      onChange={(e) => setInputTopicDeck(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs"
                    >
                      <option value="Academic Word List (AWL)">Academic Word List (AWL)</option>
                      <option value="Environment & Climate">Environment & Climate</option>
                      <option value="Science & AI">Science & AI</option>
                      <option value="High-Impact Collocations">High-Impact Collocations</option>
                      <option value="Society & Education">Society & Education</option>
                      <option value="Economy & Trade">Economy & Trade</option>
                      <option value="Health & Psychology">Health & Psychology</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Gợi ý ngữ cảnh thêm (tùy chọn):</label>
                    <input
                      type="text"
                      value={inputContextHint}
                      onChange={(e) => setInputContextHint(e.target.value)}
                      placeholder="VD: Writing Task 2, Môi trường..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* PREVIEW OF GENERATED VOCAB CARD */}
              {generatedDraft && (
                <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded">
                      Bản xem trước thẻ AI vừa sinh
                    </span>
                    <span className="text-xs font-bold text-slate-500">CEFR {generatedDraft.cefrLevel || 'C1'}</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100">{generatedDraft.word}</h4>
                      <span className="font-mono text-xs text-slate-500">{generatedDraft.ukPhonetic || generatedDraft.phonetic}</span>
                      <span className="text-[11px] font-bold text-blue-600">[{generatedDraft.pos}]</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{generatedDraft.definitionVi}</div>
                    {generatedDraft.definitionAcademicEn && (
                      <p className="text-xs text-slate-500 italic">"{generatedDraft.definitionAcademicEn}"</p>
                    )}
                  </div>

                  {/* Collocations */}
                  {generatedDraft.collocations && generatedDraft.collocations.length > 0 && (
                    <div className="text-xs space-y-1">
                      <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">Collocations:</span>
                      <div className="flex flex-wrap gap-1">
                        {generatedDraft.collocations.map((c, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[11px] border border-slate-200/60 dark:border-slate-700">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mnemonic */}
                  {generatedDraft.mnemonic && (
                    <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span><strong>Mẹo nhớ:</strong> {generatedDraft.mnemonic}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setGeneratedDraft(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveDraftCard}
                disabled={!generatedDraft}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Lưu vào Kho Từ Vựng SRS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: DETAILED VOCAB CARD POPUP */}
      {selectedCardDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-blue-600 px-2.5 py-0.5 rounded-full">
                  {selectedCardDetail.pos} • CEFR {selectedCardDetail.cefrLevel || 'C1'}
                </span>
                <span className="text-xs text-slate-400">Hộp SRS: {selectedCardDetail.srsStage}</span>
              </div>
              <button
                onClick={() => setSelectedCardDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar flex-1">
              <div className="flex items-baseline justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 font-display">
                    {selectedCardDetail.word}
                  </h3>
                  <div className="text-xs font-mono text-slate-500 mt-0.5">
                    UK: {selectedCardDetail.ukPhonetic || selectedCardDetail.phonetic} | US: {selectedCardDetail.usPhonetic || selectedCardDetail.phonetic}
                  </div>
                </div>
                <button
                  onClick={() => handlePlayVoice(selectedCardDetail.word)}
                  className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {selectedCardDetail.definitionVi}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 italic">
                  "{selectedCardDetail.definitionAcademicEn || selectedCardDetail.definitionEn}"
                </div>
              </div>

              {selectedCardDetail.collocations && selectedCardDetail.collocations.length > 0 && (
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Collocations:</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedCardDetail.collocations.map((col, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200">
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedCardDetail.mnemonic && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-xs text-amber-900 dark:text-amber-200">
                  <strong>Mẹo nhớ:</strong> {selectedCardDetail.mnemonic}
                </div>
              )}

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    resetVocabSRS(selectedCardDetail.id);
                    setSelectedCardDetail(null);
                  }}
                  className="text-amber-600 hover:underline font-semibold"
                >
                  Reset lại Hộp 1
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteVocabCard(selectedCardDetail.id);
                    setSelectedCardDetail(null);
                  }}
                  className="text-rose-600 hover:underline font-semibold"
                >
                  Xóa thẻ này
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: EXPORT / OFFLINE STUDY MODAL */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Download className="w-4 h-4 text-blue-600" />
                <span>Xuất Dữ Liệu & Ôn Offline</span>
              </h3>
              <button onClick={() => setIsExportModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Bạn có thể xuất {vocabCards.length} từ vựng ra các định dạng chuẩn để đồng bộ vào Anki hoặc in ấn ra giấy để học ngoại tuyến.
            </p>

            <div className="space-y-2.5 pt-2">
              <button
                onClick={handleExportAnkiTSV}
                className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 border border-slate-200 dark:border-slate-700 text-left flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                  <div>
                    <div>Xuất file Anki (.txt / TSV)</div>
                    <div className="text-[10px] text-slate-500 font-normal">Dễ dàng import trực tiếp vào Anki Desktop/Mobile</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={handleExportJSON}
                className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 border border-slate-200 dark:border-slate-700 text-left flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Download className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div>Xuất file Backup JSON đầy đủ</div>
                    <div className="text-[10px] text-slate-500 font-normal">Lưu trữ toàn bộ cấu trúc dữ liệu SRS & ví dụ</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={handlePrintList}
                className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 border border-slate-200 dark:border-slate-700 text-left flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Printer className="w-4 h-4 text-purple-600" />
                  <div>
                    <div>In ấn danh sách từ vựng (Print-ready)</div>
                    <div className="text-[10px] text-slate-500 font-normal">Tạo bảng từ học thuật để ôn bài trên giấy</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Lexicographer Vocab Enricher Modal */}
      <VocabEnricherModal
        isOpen={isEnricherOpen}
        onClose={() => setIsEnricherOpen(false)}
      />
    </div>
  );
};
