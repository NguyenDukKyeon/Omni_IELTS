import React, { useState } from 'react';
import {
  BookOpen,
  Headphones,
  Mic,
  PenTool,
  CheckCircle2,
  XCircle,
  Volume2,
  Sparkles,
  RefreshCw,
  Send,
  HelpCircle,
  Plus,
  Flame,
  Award,
  ChevronRight,
  RotateCcw,
  MessageSquare,
  Radio,
  FileCheck,
  Check,
  AlertCircle,
  BarChart2,
} from 'lucide-react';
import { FourSkillLessonPack, ExtractedVocabItem } from '../types';
import { useApp } from '../context/AppContext';
import { playTextToSpeech, evaluateWritingApi } from '../services/aiTutor';

interface LessonPackViewerProps {
  sourceTitle: string;
  sourceId: string;
  lessonPack: FourSkillLessonPack;
  extractedVocab: ExtractedVocabItem[];
}

export const LessonPackViewer: React.FC<LessonPackViewerProps> = ({
  sourceTitle,
  sourceId,
  lessonPack,
  extractedVocab,
}) => {
  const { addVocabCard, awardXP, addPracticeAttempt, openAITutorWithPrompt } = useApp();

  const [activeSkillTab, setActiveSkillTab] = useState<'reading' | 'listening' | 'speaking' | 'writing'>('reading');

  // READING STATE
  const [readingAnswers, setReadingAnswers] = useState<Record<string, string>>({});
  const [readingSubmitted, setReadingSubmitted] = useState(false);
  const [highlightWord, setHighlightWord] = useState<string | null>(null);

  // LISTENING STATE
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentlyPlayingSpeaker, setCurrentlyPlayingSpeaker] = useState<number | null>(null);
  const [listeningAnswers, setListeningAnswers] = useState<Record<string, string>>({});
  const [listeningSubmitted, setListeningSubmitted] = useState(false);

  // SPEAKING STATE
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState<Array<{ sender: 'ai' | 'user'; text: string; time: string }>>([
    {
      sender: 'ai',
      text: `Hello! I am your AI IELTS Examiner. Let's discuss "${lessonPack.topicVi}". To begin with, what is your perspective on this topic?`,
      time: '00:01',
    },
  ]);
  const [speakingUserInput, setSpeakingUserInput] = useState('');
  const [isAiReplyingSpeaking, setIsAiReplyingSpeaking] = useState(false);

  // WRITING STATE
  const [essayText, setEssayText] = useState('');
  const [isEvaluatingWriting, setIsEvaluatingWriting] = useState(false);
  const [writingEvaluationResult, setWritingEvaluationResult] = useState<any | null>(null);

  // SAVED VOCAB TRACKER
  const [savedWords, setSavedWords] = useState<Record<string, boolean>>({});

  // 1-TAP SAVE VOCAB TO SRS
  const handleQuickAddVocab = (v: ExtractedVocabItem) => {
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
      originSourceId: sourceId,
      originSourceTitle: sourceTitle,
      srsStage: 0,
      intervalDays: 1,
      nextReviewDate: new Date().toISOString(),
      easeFactor: 2.5,
      repetitions: 0,
      mastered: false,
    });

    setSavedWords((prev) => ({ ...prev, [v.word.toLowerCase()]: true }));
    awardXP(15, `Đã lưu từ "${v.word}" vào Sổ từ vựng SRS`);
  };

  // CHECK READING ANSWERS
  const handleCheckReading = () => {
    setReadingSubmitted(true);
    let correctCount = 0;
    lessonPack.reading.questions.forEach((q) => {
      if (
        readingAnswers[q.id]?.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()
      ) {
        correctCount++;
      }
    });
    awardXP(correctCount * 20, `Hoàn thành bài IELTS Reading (${correctCount}/${lessonPack.reading.questions.length} câu đúng)`);
  };

  // CHECK LISTENING ANSWERS
  const handleCheckListening = () => {
    setListeningSubmitted(true);
    let correctCount = 0;
    lessonPack.listening.questions.forEach((q) => {
      if (
        listeningAnswers[q.id]?.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()
      ) {
        correctCount++;
      }
    });
    awardXP(correctCount * 20, `Hoàn thành bài IELTS Listening (${correctCount}/${lessonPack.listening.questions.length} câu đúng)`);
  };

  // PLAY SCRIPT AUDIO (TTS)
  const handlePlayFullAudio = () => {
    if (isPlayingAudio) return;
    setIsPlayingAudio(true);
    try {
      playTextToSpeech(lessonPack.listening.audioScript, 'us');
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setIsPlayingAudio(false), 3000);
    }
  };

  // PLAY DIALOGUE TURN AUDIO
  const handlePlayDialogueTurn = (text: string, index: number, _gender?: 'male' | 'female') => {
    setCurrentlyPlayingSpeaker(index);
    try {
      playTextToSpeech(text, 'us');
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setCurrentlyPlayingSpeaker(null), 2000);
    }
  };

  // SPEAKING SIMULATION (Gemini Live Discussion)
  const handleSendSpeakingUtterance = async () => {
    if (!speakingUserInput.trim()) return;

    const userText = speakingUserInput.trim();
    const newTranscripts = [
      ...liveTranscript,
      {
        sender: 'user' as const,
        text: userText,
        time: new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }),
      },
    ];
    setLiveTranscript(newTranscripts);
    setSpeakingUserInput('');
    setIsAiReplyingSpeaking(true);

    try {
      // Simulate / Call AI response for Speaking Discussion
      const res = await fetch('/api/gemini/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newTranscripts.map((t) => ({
            role: t.sender === 'user' ? 'user' : 'assistant',
            content: t.text,
          })),
          screenContext: `IELTS Speaking Part 3 Live Session: ${lessonPack.topicVi}`,
          currentBand: lessonPack.targetBand - 1.0,
          targetBand: lessonPack.targetBand,
        }),
      });
      const data = await res.json();
      const aiReply = data.reply || `That is an insightful argument. Could you elaborate further on how this trend might develop over the next decade?`;

      setLiveTranscript((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: aiReply,
          time: new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }),
        },
      ]);
      awardXP(25, 'Luyện phản xạ IELTS Speaking Part 3');
      // Speak AI reply
      playTextToSpeech(aiReply.slice(0, 180), 'us');
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiReplyingSpeaking(false);
    }
  };

  // SUBMIT ESSAY FOR EVALUATION
  const handleEvaluateWriting = async () => {
    if (!essayText.trim()) return;
    setIsEvaluatingWriting(true);

    try {
      const result = await evaluateWritingApi(
        lessonPack.writing.prompt,
        essayText,
        lessonPack.writing.taskType,
        lessonPack.targetBand
      );
      setWritingEvaluationResult(result);
      awardXP(50, `Hoàn thành bài viết IELTS Writing (${lessonPack.writing.taskType})`);

      addPracticeAttempt({
        id: `att_${Date.now()}`,
        skill: 'writing',
        topic: lessonPack.topicVi,
        taskType: lessonPack.writing.taskType,
        scoreBand: result.estimatedBand || lessonPack.targetBand,
        feedbackSummary: result.generalFeedback || 'Bài viết đã được chấm điểm chi tiết.',
        detailedCriteria: result.criteriaScores || {
          taskResponse: 6.5,
          coherenceCohesion: 6.5,
          lexicalResource: 6.5,
          grammaticalAccuracy: 6.5,
        },
        mistakesGeneratedCount: result.mistakesFound?.length || 0,
        timestamp: new Date().toISOString(),
        durationMinutes: 20,
      });
    } catch (err) {
      console.error('Writing eval failed', err);
    } finally {
      setIsEvaluatingWriting(false);
    }
  };

  const wordCount = essayText.trim() ? essayText.trim().split(/\s+/).length : 0;

  return (
    <div id="four-skill-lesson-pack" className="space-y-6 animate-fadeIn">
      {/* Header Info Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-indigo-950/50 border border-blue-200 dark:border-indigo-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[11px] font-bold">
              GÓI BÀI HỌC 4 KỸ NĂNG
            </span>
            <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
              Mục tiêu: Band {lessonPack.targetBand.toFixed(1)} ({lessonPack.estimatedCEFR})
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
            {lessonPack.topicVi}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Nội dung nguồn: <strong className="text-slate-800 dark:text-slate-200">{sourceTitle}</strong>
          </p>
        </div>

        {/* 1-Tap Quick Add Vocab Chips */}
        {extractedVocab && extractedVocab.length > 0 && (
          <div className="flex flex-col gap-1.5 sm:items-end">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Thêm 1-chạm vào Sổ từ vựng:
            </span>
            <div className="flex flex-wrap gap-1.5 max-w-sm justify-start sm:justify-end">
              {extractedVocab.slice(0, 4).map((v, i) => {
                const isSaved = savedWords[v.word.toLowerCase()];
                return (
                  <button
                    key={i}
                    id={`quick-save-vocab-${i}`}
                    onClick={() => handleQuickAddVocab(v)}
                    disabled={isSaved}
                    className={`text-[11px] px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition-all cursor-pointer ${
                      isSaved
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300'
                        : 'bg-white dark:bg-slate-800 hover:bg-amber-50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-amber-300'
                    }`}
                  >
                    {isSaved ? <Check className="w-3 h-3 text-emerald-600" /> : <Plus className="w-3 h-3 text-amber-600" />}
                    <span>{v.word}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 4 SKILL TABS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {[
          { id: 'reading', label: '1. Reading', icon: BookOpen, sub: 'Đọc hiểu & T/F/NG' },
          { id: 'listening', label: '2. Listening', icon: Headphones, sub: 'Audio TTS & Hội thoại' },
          { id: 'speaking', label: '3. Speaking', icon: Mic, sub: 'Thảo luận & Gemini Live' },
          { id: 'writing', label: '4. Writing', icon: PenTool, sub: 'Chấm 4 tiêu chí AI' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSkillTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`skill-tab-${tab.id}`}
              onClick={() => setActiveSkillTab(tab.id as any)}
              className={`p-3 rounded-2xl text-left transition-all cursor-pointer border ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
                <span className="font-bold text-xs sm:text-sm">{tab.label}</span>
              </div>
              <p className={`text-[10px] sm:text-[11px] mt-0.5 ${isActive ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                {tab.sub}
              </p>
            </button>
          );
        })}
      </div>

      {/* ============================================================ */}
      {/* TAB 1: READING */}
      {/* ============================================================ */}
      {activeSkillTab === 'reading' && (
        <div id="reading-skill-pane" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Passage Column */}
          <div className="lg:col-span-7 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider">
                  IELTS Academic Reading Passage (Adapted Band {lessonPack.targetBand})
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  {lessonPack.reading.title}
                </h3>
              </div>
              <button
                onClick={() => playTextToSpeech(lessonPack.reading.adaptedPassage, 'us')}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-blue-600 transition-colors"
                title="Nghe phát âm toàn bài đọc"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            <div className="prose prose-slate dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed font-serif text-slate-800 dark:text-slate-200 space-y-3 bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              {lessonPack.reading.adaptedPassage.split('\n\n').map((paragraph, pi) => (
                <p key={pi} className="indent-4 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2">
              <span>Độ dài: ~{lessonPack.reading.wordCount || 180} từ</span>
              <span>Độ khó chuẩn: Band {lessonPack.targetBand}</span>
            </div>
          </div>

          {/* Questions Column */}
          <div className="lg:col-span-5 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Câu Hỏi Đọc Hiểu ({lessonPack.reading.questions.length})
              </h3>
              {readingSubmitted && (
                <button
                  onClick={() => {
                    setReadingSubmitted(false);
                    setReadingAnswers({});
                  }}
                  className="text-xs text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1 hover:underline"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Làm lại
                </button>
              )}
            </div>

            <div className="space-y-4">
              {lessonPack.reading.questions.map((q, idx) => {
                const userAnswer = readingAnswers[q.id] || '';
                const isCorrect = userAnswer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();

                return (
                  <div
                    key={q.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      readingSubmitted
                        ? isCorrect
                          ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                          : 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                        : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {q.type.replace(/_/g, ' ')}
                          </span>
                          {readingSubmitted && (
                            <span className="text-xs font-bold flex items-center gap-1">
                              {isCorrect ? (
                                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                  <CheckCircle2 className="w-4 h-4" /> Đúng
                                </span>
                              ) : (
                                <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                  <XCircle className="w-4 h-4" /> Sai
                                </span>
                              )}
                            </span>
                          )}
                        </div>

                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {q.question}
                        </p>

                        {/* Input or Options */}
                        {q.type === 'true_false_not_given' && (
                          <div className="grid grid-cols-3 gap-2 pt-1">
                            {['TRUE', 'FALSE', 'NOT GIVEN'].map((opt) => (
                              <button
                                key={opt}
                                id={`q-${q.id}-opt-${opt}`}
                                disabled={readingSubmitted}
                                onClick={() => setReadingAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                                className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                  userAnswer === opt
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        )}

                        {q.type === 'multiple_choice' && q.options && (
                          <div className="space-y-1.5 pt-1">
                            {q.options.map((opt, oi) => (
                              <button
                                key={oi}
                                id={`q-${q.id}-opt-${oi}`}
                                disabled={readingSubmitted}
                                onClick={() => setReadingAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                                className={`w-full text-left p-2.5 rounded-xl text-xs border transition-all cursor-pointer ${
                                  userAnswer === opt
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        )}

                        {q.type === 'sentence_completion' && (
                          <div className="pt-1">
                            <input
                              type="text"
                              disabled={readingSubmitted}
                              value={userAnswer}
                              onChange={(e) => setReadingAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                              placeholder="Nhập từ cần điền..."
                              className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                            />
                          </div>
                        )}

                        {/* Explanation */}
                        {readingSubmitted && (
                          <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-[11px] space-y-1 mt-2">
                            <div className="font-bold text-slate-900 dark:text-slate-100">
                              Đáp án chuẩn: <span className="text-blue-600 dark:text-blue-400">{q.correctAnswer}</span>
                            </div>
                            <div className="text-slate-600 dark:text-slate-400">
                              {q.explanation}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {!readingSubmitted && (
              <button
                id="submit-reading-btn"
                onClick={handleCheckReading}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Kiểm Tra Đáp Án Reading & Nhận XP</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: LISTENING */}
      {/* ============================================================ */}
      {activeSkillTab === 'listening' && (
        <div id="listening-skill-pane" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Audio Player & Dialogue Column */}
          <div className="lg:col-span-7 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">
                  IELTS Listening Audio Section
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  {lessonPack.listening.isDialogue ? 'Hội Thoại Thảo Luận 2 Người' : 'Bài Giảng Học Thuật'}
                </h3>
              </div>

              <button
                id="play-full-listening-audio-btn"
                onClick={handlePlayFullAudio}
                disabled={isPlayingAudio}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                {isPlayingAudio ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang Đọc TTS...</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4" />
                    <span>Phát Toàn Bài Nghe</span>
                  </>
                )}
              </button>
            </div>

            {/* Dialogue Turns or Monologue Script */}
            {lessonPack.listening.isDialogue && lessonPack.listening.dialogueTurns ? (
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Headphones className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Bấm vào từng câu để nghe giọng đọc TTS riêng biệt:</span>
                </div>

                <div className="space-y-3">
                  {lessonPack.listening.dialogueTurns.map((turn, ti) => {
                    const isSpeakerPlaying = currentlyPlayingSpeaker === ti;
                    const isEmma = turn.speaker.toLowerCase().includes('emma') || turn.gender === 'female';

                    return (
                      <div
                        key={ti}
                        className={`p-4 rounded-2xl border transition-all text-left flex items-start gap-3 ${
                          isEmma
                            ? 'bg-purple-50/60 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800'
                            : 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800'
                        }`}
                      >
                        <button
                          onClick={() => handlePlayDialogueTurn(turn.text, ti, turn.gender)}
                          className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 hover:scale-105 transition-transform cursor-pointer"
                          title="Nghe câu này"
                        >
                          {isSpeakerPlaying ? (
                            <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                          ) : (
                            <Volume2 className="w-4 h-4" />
                          )}
                        </button>

                        <div className="space-y-1 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                              {turn.speaker}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-slate-400">
                              {turn.gender || 'Speaker'}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-serif">
                            "{turn.text}"
                          </p>
                          {turn.translationVi && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                              {turn.translationVi}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-serif leading-relaxed">
                {lessonPack.listening.audioScript}
              </div>
            )}
          </div>

          {/* Listening Questions */}
          <div className="lg:col-span-5 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Câu Hỏi Nghe Hiểu ({lessonPack.listening.questions.length})
              </h3>
              {listeningSubmitted && (
                <button
                  onClick={() => {
                    setListeningSubmitted(false);
                    setListeningAnswers({});
                  }}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1 hover:underline"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Làm lại
                </button>
              )}
            </div>

            <div className="space-y-4">
              {lessonPack.listening.questions.map((q, idx) => {
                const userAnswer = listeningAnswers[q.id] || '';
                const isCorrect = userAnswer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();

                return (
                  <div
                    key={q.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      listeningSubmitted
                        ? isCorrect
                          ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                          : 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                        : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="space-y-2 flex-1">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {q.question}
                        </p>

                        {q.type === 'multiple_choice' && q.options && (
                          <div className="space-y-1.5 pt-1">
                            {q.options.map((opt, oi) => (
                              <button
                                key={oi}
                                id={`lq-${q.id}-opt-${oi}`}
                                disabled={listeningSubmitted}
                                onClick={() => setListeningAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                                className={`w-full text-left p-2.5 rounded-xl text-xs border transition-all cursor-pointer ${
                                  userAnswer === opt
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        )}

                        {q.type === 'gap_fill' && (
                          <div className="pt-1">
                            <input
                              type="text"
                              disabled={listeningSubmitted}
                              value={userAnswer}
                              onChange={(e) => setListeningAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                              placeholder="Nhập từ nghe được..."
                              className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                            />
                          </div>
                        )}

                        {listeningSubmitted && (
                          <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-[11px] space-y-1 mt-2">
                            <div className="font-bold text-slate-900 dark:text-slate-100">
                              Đáp án chuẩn: <span className="text-indigo-600 dark:text-indigo-400">{q.correctAnswer}</span>
                            </div>
                            <div className="text-slate-600 dark:text-slate-400">
                              {q.explanation}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {!listeningSubmitted && (
              <button
                id="submit-listening-btn"
                onClick={handleCheckListening}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Kiểm Tra Đáp Án Listening & Nhận XP</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: SPEAKING (DISCUSSION & GEMINI LIVE) */}
      {/* ============================================================ */}
      {activeSkillTab === 'speaking' && (
        <div id="speaking-skill-pane" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Discussion Questions Column */}
          <div className="lg:col-span-6 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-5">
            <div className="border-b border-slate-100 dark:border-slate-700 pb-3">
              <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
                IELTS Speaking Part 3 Discussion Questions
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                Câu Hỏi Thảo Luận Chuyên Sâu
              </h3>
            </div>

            <div className="space-y-4">
              {lessonPack.speaking.discussionQuestions.map((sq, idx) => (
                <div
                  key={sq.id || idx}
                  className="p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/50 space-y-3"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      Q{idx + 1}
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 font-serif leading-relaxed">
                      "{sq.question}"
                    </p>
                  </div>

                  {sq.suggestedIdeasVi && sq.suggestedIdeasVi.length > 0 && (
                    <div className="space-y-1 pl-7 text-[11px] text-slate-600 dark:text-slate-400">
                      <strong className="text-emerald-800 dark:text-emerald-300 font-semibold block">
                        Gợi ý triển khai ý tưởng (Ideas):
                      </strong>
                      <ul className="list-disc list-inside space-y-0.5">
                        {sq.suggestedIdeasVi.map((idea, ii) => (
                          <li key={ii}>{idea}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {sq.bandBoostVocab && sq.bandBoostVocab.length > 0 && (
                    <div className="pl-7 pt-1 flex flex-wrap gap-1 items-center">
                      <span className="text-[10px] font-bold text-slate-500">Từ vựng nâng band:</span>
                      {sq.bandBoostVocab.map((w, wi) => (
                        <span
                          key={wi}
                          className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 font-mono"
                        >
                          {w}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Gemini Live Interactive Speaking Simulation */}
          <div className="lg:col-span-6 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Luyện Nói Với AI (Gemini Live Session)
                  </h3>
                </div>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  Real-time Voice/Chat
                </span>
              </div>

              {/* Chat / Utterance History */}
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 mt-4 custom-scrollbar">
                {liveTranscript.map((t, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${t.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-0.5 px-1">
                      <span>{t.sender === 'user' ? 'Bạn' : 'Giám khảo AI'}</span>
                      <span>•</span>
                      <span>{t.time}</span>
                    </div>
                    <div
                      className={`p-3.5 rounded-2xl text-xs sm:text-sm max-w-[90%] leading-relaxed ${
                        t.sender === 'user'
                          ? 'bg-emerald-600 text-white rounded-tr-none'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-tl-none font-serif'
                      }`}
                    >
                      {t.text}
                    </div>
                  </div>
                ))}

                {isAiReplyingSpeaking && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 italic p-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                    <span>Giám khảo AI đang lắng nghe và phản hồi...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Input & Voice Controls */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={speakingUserInput}
                  onChange={(e) => setSpeakingUserInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendSpeakingUtterance()}
                  placeholder="Gõ hoặc nói câu trả lời của bạn..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100"
                />
                <button
                  id="send-speaking-reply-btn"
                  onClick={handleSendSpeakingUtterance}
                  disabled={!speakingUserInput.trim() || isAiReplyingSpeaking}
                  className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white cursor-pointer shadow-sm"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Gợi ý: Trả lời kèm ít nhất 1 collocation học thuật</span>
                <button
                  onClick={() => openAITutorWithPrompt(`Gợi ý câu trả lời mẫu đạt band ${lessonPack.targetBand} cho câu hỏi Speaking Part 3 này: "${lessonPack.speaking.discussionQuestions[0]?.question}"`)}
                  className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                >
                  Xem câu mẫu Band {lessonPack.targetBand}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: WRITING (AI EVALUATION) */}
      {/* ============================================================ */}
      {activeSkillTab === 'writing' && (
        <div id="writing-skill-pane" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Essay Prompt & Editor */}
          <div className="lg:col-span-7 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-700 pb-3">
              <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 tracking-wider">
                {lessonPack.writing.taskType} (Chuẩn hóa từ nguồn học liệu)
              </span>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mt-1 font-serif">
                "{lessonPack.writing.prompt}"
              </h3>
            </div>

            {/* Suggested Outline Accordion */}
            {lessonPack.writing.sampleOutline && (
              <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-xs space-y-1.5">
                <span className="font-bold text-amber-900 dark:text-amber-300 block">
                  Dàn ý gợi ý (Sample Outline):
                </span>
                <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 space-y-1 text-[11px]">
                  {lessonPack.writing.sampleOutline.map((point, pi) => (
                    <li key={pi}>{point}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Textarea */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Bài làm của bạn:
                </label>
                <span className={`font-mono font-bold ${wordCount >= 150 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {wordCount} từ {lessonPack.writing.taskType.includes('Task 1') ? '(Mục tiêu: 150+)' : '(Mục tiêu: 250+)'}
                </span>
              </div>
              <textarea
                rows={10}
                value={essayText}
                onChange={(e) => setEssayText(e.target.value)}
                placeholder="Nhập bài viết của bạn tại đây để AI chấm theo 4 tiêu chí IELTS Writing..."
                className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 leading-relaxed placeholder-slate-400 focus:ring-2 focus:ring-amber-500 font-serif"
              />
            </div>

            <button
              id="submit-writing-eval-btn"
              onClick={handleEvaluateWriting}
              disabled={isEvaluatingWriting || wordCount < 30}
              className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              {isEvaluatingWriting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>AI Đang Chấm Điểm 4 Tiêu Chí...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Chấm Điểm Bằng AI Theo 4 Tiêu Chí IELTS</span>
                </>
              )}
            </button>
          </div>

          {/* AI Feedback & Score Breakdown */}
          <div className="lg:col-span-5 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-amber-500" />
                <span>Kết Quả Đánh Giá Bài Viết</span>
              </h3>
            </div>

            {writingEvaluationResult ? (
              <div className="space-y-4 animate-fadeIn">
                {/* Overall Score Badge */}
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-center">
                  <div className="text-xs font-bold text-amber-800 dark:text-amber-300">
                    Band Điểm Dự Tính
                  </div>
                  <div className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
                    Band {writingEvaluationResult.estimatedBand?.toFixed(1) || '6.5'}
                  </div>
                </div>

                {/* 4 Criteria Scores */}
                {writingEvaluationResult.criteriaScores && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      <div className="text-slate-500 text-[10px]">Task Response</div>
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        Band {writingEvaluationResult.criteriaScores.taskResponse}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      <div className="text-slate-500 text-[10px]">Coherence & Cohesion</div>
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        Band {writingEvaluationResult.criteriaScores.coherenceCohesion}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      <div className="text-slate-500 text-[10px]">Lexical Resource</div>
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        Band {writingEvaluationResult.criteriaScores.lexicalResource}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      <div className="text-slate-500 text-[10px]">Grammar Accuracy</div>
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        Band {writingEvaluationResult.criteriaScores.grammaticalAccuracy}
                      </div>
                    </div>
                  </div>
                )}

                {/* General Feedback */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                  <div className="font-bold text-slate-900 dark:text-slate-100">Nhận xét tổng thể:</div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    {writingEvaluationResult.generalFeedback}
                  </p>
                </div>

                {/* Upgraded Sentences */}
                {writingEvaluationResult.upgradedSentences && writingEvaluationResult.upgradedSentences.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-amber-700 dark:text-amber-300">
                      Gợi ý nâng cấp câu Band 8.0+:
                    </div>
                    {writingEvaluationResult.upgradedSentences.map((u: any, ui: number) => (
                      <div
                        key={ui}
                        className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs space-y-1"
                      >
                        <div className="text-slate-500 line-through text-[11px]">{u.original}</div>
                        <div className="font-bold text-emerald-800 dark:text-emerald-300 font-serif">
                          ➜ {u.upgraded}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 space-y-2">
                <PenTool className="w-8 h-8 mx-auto opacity-40 text-amber-500" />
                <p className="text-xs font-medium">
                  Hãy viết bài và bấm nút chấm điểm để nhận phân tích 4 tiêu chí chi tiết.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
