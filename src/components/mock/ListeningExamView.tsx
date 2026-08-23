import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  AlertCircle,
  Headphones,
  FileText,
  CheckCircle2,
  Lock,
  FastForward,
  Rewind,
  Repeat,
  Sparkles,
  PenTool,
  Check,
  RefreshCw,
  Award,
  BookOpen
} from 'lucide-react';
import { FullMockTestPackage, ExamColorScheme } from '../../types';
import { GEMINI_VOICES, playVoiceText } from '../../services/voiceService';
import { diffWords } from '../../lib/wordDiff';

interface ListeningExamViewProps {
  testPackage: FullMockTestPackage;
  currentQuestionNumber: number;
  userAnswers: Record<number, string>;
  onAnswerChange: (questionNumber: number, answer: string) => void;
  textSize: 'normal' | 'large' | 'xlarge';
  activeSectionIndex: number;
  onSelectSection: (index: number) => void;
  colorScheme?: ExamColorScheme;
}

export const ListeningExamView: React.FC<ListeningExamViewProps> = ({
  testPackage,
  currentQuestionNumber,
  userAnswers,
  onAnswerChange,
  textSize,
  activeSectionIndex,
  onSelectSection,
  colorScheme = 'standard',
}) => {
  // Mode switch: 'exam' (Standard CD-IELTS) or 'dictation' (A-B Loop & Dictation practice)
  const [activeTabMode, setActiveTabMode] = useState<'exam' | 'dictation'>('exam');

  // Audio Playback state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<0.75 | 1.0 | 1.25>(1.0);
  const [audioProgress, setAudioProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [audioDurationSeconds, setAudioDurationSeconds] = useState(180); // ~3 mins per section
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const audioStopRef = useRef<(() => void) | null>(null);

  // Dictation Mode State & A-B Loop
  const [dictationSegmentIndex, setDictationSegmentIndex] = useState(0);
  const [isAbLooping, setIsAbLooping] = useState(true);
  const [dictationInput, setDictationInput] = useState('');
  const [dictationChecked, setDictationChecked] = useState(false);
  const [dictationAccuracy, setDictationAccuracy] = useState<number | null>(null);

  const sections = testPackage.listening.sections;
  const currentSection = sections[activeSectionIndex] || sections[0];

  // Prepare dictation sentences from audio excerpt
  const dictationSentences = React.useMemo(() => {
    if (!currentSection.audioScriptExcerpt) {
      return [
        "Welcome to the International Community Center orientation program.",
        "The registration office is situated on the second floor near the library.",
        "You need to provide two passport photos and proof of current residency."
      ];
    }
    return currentSection.audioScriptExcerpt
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 8);
  }, [currentSection]);

  const currentDictationTarget = dictationSentences[dictationSegmentIndex] || dictationSentences[0] || '';

  // Font scale
  const fontClass =
    textSize === 'xlarge' ? 'text-lg leading-relaxed' : textSize === 'large' ? 'text-base leading-normal' : 'text-sm leading-normal';

  // Timer interval for realistic audio playback progress
  useEffect(() => {
    let interval: any;
    if (isPlayingAudio) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => {
          const next = prev + 1;
          const progress = Math.min((next / audioDurationSeconds) * 100, 100);
          setAudioProgress(progress);
          if (progress >= 100) {
            setIsPlayingAudio(false);
            audioStopRef.current?.();
          }
          return next;
        });
      }, 1000 / playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlayingAudio, audioDurationSeconds, playbackSpeed]);

  // Generated mocks prefer cached Gemini TTS and fall back to a browser voice.
  const playSpeechAudio = (textToPlay: string, onEndCallback?: () => void) => {
    audioStopRef.current?.();
    void playVoiceText(textToPlay, {
      descriptor: GEMINI_VOICES.find((voice) => voice.id === 'Kore'),
      useCase: 'narrator',
      rate: playbackSpeed * 0.95,
      style: 'Clear British IELTS listening narrator; preserve every word exactly',
      onEnd: () => onEndCallback ? onEndCallback() : !isAbLooping && setIsPlayingAudio(false),
    }).then((stop) => { audioStopRef.current = stop; });
  };

  const toggleAudio = () => {
    if (isPlayingAudio) {
      audioStopRef.current?.();
      setIsPlayingAudio(false);
    } else {
      setIsPlayingAudio(true);
      if (currentSection.audioScriptExcerpt) {
        playSpeechAudio(currentSection.audioScriptExcerpt, () => {
          setIsPlayingAudio(false);
        });
      }
    }
  };

  // Rewind 5 seconds
  const handleRewind5s = () => {
    setElapsedSeconds((prev) => Math.max(prev - 5, 0));
    setAudioProgress((prev) => Math.max(prev - (5 / audioDurationSeconds) * 100, 0));
    if (isPlayingAudio && currentSection.audioScriptExcerpt) {
      playSpeechAudio(currentSection.audioScriptExcerpt);
    }
  };

  // Forward 5 seconds
  const handleForward5s = () => {
    setElapsedSeconds((prev) => Math.min(prev + 5, audioDurationSeconds));
    setAudioProgress((prev) => Math.min(prev + (5 / audioDurationSeconds) * 100, 100));
  };

  // Dictation Sentence Audio Playback with A-B Loop
  const playDictationSentence = (loop = isAbLooping) => {
    if (!currentDictationTarget) return;
    setIsPlayingAudio(true);
    playSpeechAudio(currentDictationTarget, () => {
      if (loop && activeTabMode === 'dictation') {
        setTimeout(() => {
          if (activeTabMode === 'dictation') {
            playDictationSentence(true);
          }
        }, 1200);
      } else {
        setIsPlayingAudio(false);
      }
    });
  };

  const stopAllAudio = () => {
    audioStopRef.current?.();
    setIsPlayingAudio(false);
  };

  // Check Dictation Words Accuracy
  const handleCheckDictation = () => {
    if (!dictationInput.trim()) return;
    const acc = diffWords(currentDictationTarget, dictationInput).accuracy;
    setDictationAccuracy(acc);
    setDictationChecked(true);
  };

  const handleNextDictationSegment = () => {
    stopAllAudio();
    if (dictationSegmentIndex < dictationSentences.length - 1) {
      setDictationSegmentIndex((prev) => prev + 1);
    } else {
      setDictationSegmentIndex(0);
    }
    setDictationInput('');
    setDictationChecked(false);
    setDictationAccuracy(null);
  };

  const formatAudioTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Color Theme Classes
  const themeBgClass =
    colorScheme === 'high_contrast'
      ? 'bg-black text-yellow-300'
      : colorScheme === 'inverted'
      ? 'bg-slate-100 text-slate-900'
      : 'bg-slate-900 text-slate-100';

  const cardBg =
    colorScheme === 'high_contrast'
      ? 'bg-black border-yellow-500 text-yellow-300'
      : colorScheme === 'inverted'
      ? 'bg-white border-slate-300 text-slate-900 shadow-sm'
      : 'bg-slate-950/80 border-slate-800 text-slate-200';

  return (
    <div className={`flex-1 flex flex-col h-full ${themeBgClass} overflow-hidden`}>
      {/* Audio Controller Bar */}
      <div className={`border-b px-4 py-3 flex flex-wrap items-center justify-between gap-4 ${
        colorScheme === 'high_contrast'
          ? 'bg-black border-yellow-500'
          : colorScheme === 'inverted'
          ? 'bg-slate-200 border-slate-300'
          : 'bg-slate-950 border-slate-800'
      }`}>
        {/* Left: Section Selector Tabs & Tab Mode Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg">
            {sections.map((sec, idx) => (
              <button data-ux-flow="mock.exam"
                key={sec.sectionNumber}
                onClick={() => {
                  onSelectSection(idx);
                  stopAllAudio();
                  setDictationSegmentIndex(0);
                  setDictationInput('');
                  setDictationChecked(false);
                }}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                  activeSectionIndex === idx
                    ? colorScheme === 'high_contrast'
                      ? 'bg-yellow-400 text-black font-bold'
                      : 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                Section {sec.sectionNumber} (Q{sec.questions[0]?.number}-{sec.questions[sec.questions.length - 1]?.number})
              </button>
            ))}
          </div>

          {/* Mode Switcher: Exam vs Dictation A-B */}
          <div className="hidden sm:flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-lg text-xs">
            <button data-ux-flow="mock.exam"
              onClick={() => {
                setActiveTabMode('exam');
                stopAllAudio();
              }}
              className={`px-3 py-1 rounded font-medium transition-all ${
                activeTabMode === 'exam'
                  ? 'bg-sky-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Thi Thật (Exam)
            </button>
            <button data-ux-flow="mock.exam"
              onClick={() => {
                setActiveTabMode('dictation');
                stopAllAudio();
              }}
              className={`px-3 py-1 rounded font-medium transition-all flex items-center gap-1 ${
                activeTabMode === 'dictation'
                  ? 'bg-amber-600 text-white shadow-sm font-bold'
                  : 'text-amber-300 hover:text-amber-100'
              }`}
            >
              <PenTool className="w-3 h-3" />
              <span>Chép Chính Tả (A-B Loop)</span>
            </button>
          </div>
        </div>

        {/* Center: Audio Player Simulation with Speed & 5s Controls */}
        <div className="flex items-center gap-2.5 bg-slate-900/90 border border-slate-700/80 px-3.5 py-1.5 rounded-xl shadow-inner">
          {/* Rewind 5s */}
          <button data-ux-flow="mock.exam"
            onClick={handleRewind5s}
            title="Tua lại 5 giây (-5s)"
            className="p-1.5 text-slate-400 hover:text-sky-300 rounded hover:bg-slate-800"
          >
            <Rewind className="w-4 h-4" />
          </button>

          {/* Play / Pause Toggle */}
          <button data-ux-flow="mock.exam"
            onClick={activeTabMode === 'dictation' ? () => playDictationSentence() : toggleAudio}
            className={`p-2 rounded-full transition-all ${
              isPlayingAudio
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-sky-400'
            }`}
            title={isPlayingAudio ? 'Tạm dừng băng nghe' : 'Phát băng nghe (Chuẩn Anh-Anh)'}
          >
            {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-sky-400 ml-0.5" />}
          </button>

          {/* Forward 5s */}
          <button data-ux-flow="mock.exam"
            onClick={handleForward5s}
            title="Tua tới 5 giây (+5s)"
            className="p-1.5 text-slate-400 hover:text-sky-300 rounded hover:bg-slate-800"
          >
            <FastForward className="w-4 h-4" />
          </button>

          {/* Progress and Waveform */}
          <div className="flex flex-col min-w-[140px] sm:min-w-[190px]">
            <div className="flex items-center justify-between text-[11px] text-slate-300 font-mono">
              <span className="flex items-center gap-1">
                <Headphones className={`w-3 h-3 ${isPlayingAudio ? 'text-sky-400 animate-spin' : 'text-slate-500'}`} />
                <span>{formatAudioTime(elapsedSeconds)} / {formatAudioTime(audioDurationSeconds)}</span>
              </span>
              <span>{Math.round(audioProgress)}%</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden">
              <div
                className="bg-sky-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${audioProgress}%` }}
              />
            </div>
          </div>

          {/* Speed Selector (0.75x, 1.0x, 1.25x) */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-[11px] font-mono">
            {[0.75, 1.0, 1.25].map((spd) => (
              <button data-ux-flow="mock.exam"
                key={spd}
                onClick={() => setPlaybackSpeed(spd as any)}
                className={`px-1.5 py-0.5 rounded ${playbackSpeed === spd ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {spd}x
              </button>
            ))}
          </div>

          <button data-ux-flow="mock.exam"
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Right: Security & Lock Notice */}
        <div className="hidden xl:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
          <Lock className="w-3.5 h-3.5 text-amber-400" />
          <span>Transcript bị khóa theo chuẩn thi IDP/BC</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* If in Dictation Practice Mode */}
        {activeTabMode === 'dictation' ? (
          <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
            {/* Dictation Mode Hero Box */}
            <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
                <div className="flex items-center gap-2">
                  <PenTool className="w-5 h-5 text-amber-400" />
                  <h2 className="text-base font-bold text-white">
                    Luyện Nghe Chép Chính Tả (Dictation & A-B Loop) — Câu {dictationSegmentIndex + 1}/{dictationSentences.length}
                  </h2>
                </div>
                {/* A-B Loop Toggle */}
                <button data-ux-flow="mock.exam"
                  onClick={() => setIsAbLooping(!isAbLooping)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                    isAbLooping
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-700'
                  }`}
                >
                  <Repeat className={`w-3.5 h-3.5 ${isAbLooping ? 'animate-spin' : ''}`} />
                  <span>{isAbLooping ? 'A-B Loop ĐANG BẬT' : 'A-B Loop Đang Tắt'}</span>
                </button>
              </div>

              <p className="text-xs text-amber-200/90 leading-relaxed">
                🎯 <strong>Mục tiêu:</strong> Lắng nghe từng âm vị, hiện tượng nối âm (connected speech) và ngữ điệu tự nhiên. Gõ lại chính xác câu bạn nghe được bên dưới.
              </p>

              {/* Play Audio Button for this sentence */}
              <div className="flex items-center gap-3 pt-1">
                <button data-ux-flow="mock.exam"
                  onClick={() => playDictationSentence(isAbLooping)}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>Phát Câu Này {isAbLooping ? '(Lặp lại liên tục)' : ''}</span>
                </button>
                <button data-ux-flow="mock.exam"
                  onClick={stopAllAudio}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs rounded-xl border border-slate-700"
                >
                  Dừng phát
                </button>
              </div>

              {/* Typing Box */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  Nhập câu văn bạn nghe được (tiếng Anh):
                </label>
                <textarea data-ux-flow="mock.exam"
                  value={dictationInput}
                  onChange={(e) => setDictationInput(e.target.value)}
                  placeholder="Gõ toàn bộ câu bạn nghe được tại đây..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono leading-relaxed"
                />
              </div>

              {/* Actions & Accuracy Check */}
              <div className="flex items-center justify-between pt-2">
                <button data-ux-flow="mock.exam"
                  onClick={handleCheckDictation}
                  disabled={!dictationInput.trim()}
                  className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>Kiểm Tra Độ Chính Xác</span>
                </button>

                <button data-ux-flow="mock.exam"
                  onClick={handleNextDictationSegment}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-all"
                >
                  <span>Câu tiếp theo</span>
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Dictation Result Card */}
              {dictationChecked && dictationAccuracy !== null && (
                <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-700 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className={`w-5 h-5 ${dictationAccuracy >= 80 ? 'text-emerald-400' : 'text-amber-400'}`} />
                      <span className="text-sm font-bold text-white">
                        Độ chính xác: <span className={dictationAccuracy >= 80 ? 'text-emerald-400' : 'text-amber-400'}>{dictationAccuracy}%</span>
                      </span>
                    </div>
                    {dictationAccuracy >= 80 && (
                      <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full font-bold border border-emerald-500/30">
                        +15 XP Tai nghe Vàng!
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-xs">
                    <p className="text-slate-400 font-medium">Đáp án gốc chuẩn:</p>
                    <p className="p-2.5 bg-emerald-950/40 border border-emerald-700/50 rounded-lg text-emerald-200 font-mono text-sm">
                      {currentDictationTarget}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Standard Exam Mode Layout */
          <>
            {/* Section Banner */}
            <div className={`${cardBg} rounded-xl p-4 sm:p-5 shadow-md`}>
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3">
                <div>
                  <span className={`text-xs font-bold uppercase tracking-wider ${colorScheme === 'high_contrast' ? 'text-yellow-400' : 'text-sky-400'}`}>
                    Listening Test — Section {currentSection.sectionNumber}
                  </span>
                  <h2 className={`text-base sm:text-lg font-bold mt-0.5 ${colorScheme === 'high_contrast' ? 'text-yellow-300' : 'text-white'}`}>
                    {currentSection.title}
                  </h2>
                </div>
                <span className="text-xs text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-700">
                  {currentSection.questions.length} câu hỏi
                </span>
              </div>

              <p className="text-xs text-slate-300 italic mb-2">
                <strong>Bối cảnh:</strong> {currentSection.context}
              </p>

              <div className={`p-3 rounded-lg text-xs font-medium border ${colorScheme === 'high_contrast' ? 'bg-black border-yellow-500 text-yellow-300' : 'bg-sky-950/40 border-sky-800/40 text-sky-200'}`}>
                <strong>Hướng dẫn đề thi:</strong> {currentSection.instructionsVi}
              </div>
            </div>

            {/* Locked Transcript Banner */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Audio Transcript & Lời thoại chi tiết được bảo mật trong lúc thi. Toàn bộ transcript sẽ được mở khóa phân tích sau khi bạn nộp bài.</span>
              </div>
              <span className="hidden md:inline px-2 py-0.5 bg-slate-900 rounded font-mono text-[11px] text-slate-400">
                🔒 Security Locked
              </span>
            </div>

            {/* Render Map Diagram if available (e.g. Section 2) */}
            {currentSection.mapData && (
              <div className={`${cardBg} rounded-xl p-4 sm:p-6`}>
                <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2 ${colorScheme === 'high_contrast' ? 'text-yellow-400' : 'text-sky-400'}`}>
                  <FileText className="w-4 h-4" />
                  Sơ đồ bản đồ (Map Diagram): {currentSection.mapData.title}
                </h3>
                <div className="relative bg-slate-900 border border-slate-700 rounded-lg p-6 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-lg">
                    {currentSection.mapData.locations.map((loc) => (
                      <div
                        key={loc.letter}
                        className="p-3 bg-slate-800/90 border border-slate-600 rounded-lg flex flex-col items-center"
                      >
                        <span className="w-7 h-7 rounded-full bg-sky-500 text-white font-bold text-sm flex items-center justify-center mb-1">
                          {loc.letter}
                        </span>
                        <span className="text-xs text-slate-300 font-medium">{loc.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Question List */}
            <div className="space-y-4">
              {currentSection.questions.map((q) => {
                const isCurrent = q.number === currentQuestionNumber;
                const currentAns = userAnswers[q.number] || '';

                return (
                  <div
                    key={q.id}
                    id={`question-box-${q.number}`}
                    className={`p-4 sm:p-5 rounded-xl border transition-all ${
                      isCurrent
                        ? colorScheme === 'high_contrast'
                          ? 'bg-black border-yellow-400 ring-2 ring-yellow-400 shadow-lg'
                          : 'bg-slate-950 border-sky-500 shadow-lg shadow-sky-950/40 ring-1 ring-sky-500/50'
                        : colorScheme === 'high_contrast'
                        ? 'bg-black border-yellow-500/40 text-yellow-300'
                        : colorScheme === 'inverted'
                        ? 'bg-white border-slate-300 text-slate-900 shadow-sm'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Question Prompt */}
                    <div className="flex items-start gap-3">
                      <span
                        className={`w-7 h-7 rounded text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                          isCurrent
                            ? colorScheme === 'high_contrast'
                              ? 'bg-yellow-400 text-black font-bold'
                              : 'bg-sky-500 text-white'
                            : currentAns
                            ? 'bg-slate-800 text-slate-200 border border-slate-600'
                            : 'bg-slate-900 text-slate-400 border border-slate-800'
                        }`}
                      >
                        {q.number}
                      </span>

                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${fontClass}`}>
                          {q.prompt}
                        </p>

                        {/* Question Input by Type */}
                        <div className="mt-3">
                          {/* 1. Multiple Choice */}
                          {q.type === 'multiple_choice' && q.options && (
                            <div className="space-y-2">
                              {q.options.map((opt, oIdx) => {
                                const optionLetter = opt.charAt(0);
                                const isSelected = currentAns.toUpperCase() === optionLetter;

                                return (
                                  <label
                                    key={oIdx}
                                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                      isSelected
                                        ? colorScheme === 'high_contrast'
                                          ? 'bg-yellow-950/80 border-yellow-400 text-yellow-200'
                                          : 'bg-sky-950/60 border-sky-500 text-white shadow-sm'
                                        : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900 text-slate-300 hover:text-slate-100'
                                    }`}
                                  >
                                    <input data-ux-flow="mock.exam"
                                      type="radio"
                                      name={`question-${q.number}`}
                                      value={optionLetter}
                                      checked={isSelected}
                                      onChange={() => onAnswerChange(q.number, optionLetter)}
                                      className="w-4 h-4 text-sky-500 focus:ring-sky-500 bg-slate-800 border-slate-700"
                                    />
                                    <span className={fontClass}>{opt}</span>
                                  </label>
                                );
                              })}
                            </div>
                          )}

                          {/* 2. Map Labelling / Letter Options */}
                          {q.type === 'map_labelling' && q.options && (
                            <div className="flex flex-wrap gap-2">
                              {q.options.map((opt) => {
                                const isSelected = currentAns.toUpperCase() === opt.trim().toUpperCase();
                                return (
                                  <button data-ux-flow="mock.exam"
                                    key={opt}
                                    onClick={() => onAnswerChange(q.number, opt)}
                                    className={`px-4 py-2 rounded-lg font-mono font-bold text-sm border transition-all ${
                                      isSelected
                                        ? colorScheme === 'high_contrast'
                                          ? 'bg-yellow-400 text-black border-yellow-300 font-bold'
                                          : 'bg-sky-600 border-sky-400 text-white shadow-sm'
                                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {/* 3. Gap Fill / Short Answer */}
                          {q.type === 'gap_fill' && (
                            <div className="flex items-center gap-2 max-w-md">
                              <input data-ux-flow="mock.exam"
                                type="text"
                                value={currentAns}
                                onChange={(e) => onAnswerChange(q.number, e.target.value)}
                                placeholder="Nhập từ nghe được vào đây..."
                                className={`w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono ${fontClass}`}
                              />
                              {currentAns && (
                                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
