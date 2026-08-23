import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Clock, CheckCircle2, RotateCcw, Sparkles, MessageSquare, AlertCircle, Play, Pause } from 'lucide-react';
import { FullMockTestPackage } from '../../types';

interface SpeakingExamViewProps {
  testPackage: FullMockTestPackage;
  speakingAnswers: {
    part1Answers: Array<{ question: string; transcript: string }>;
    part2Transcript: string;
    part2Notes: string;
    part3Answers: Array<{ question: string; transcript: string }>;
  };
  onUpdateSpeaking: (updated: any) => void;
  textSize: 'normal' | 'large' | 'xlarge';
}

export const SpeakingExamView: React.FC<SpeakingExamViewProps> = ({
  testPackage,
  speakingAnswers,
  onUpdateSpeaking,
  textSize,
}) => {
  const [currentPart, setCurrentPart] = useState<'part1' | 'part2' | 'part3'>('part1');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [prepSecondsRemaining, setPrepSecondsRemaining] = useState(60);
  const [isPrepActive, setIsPrepActive] = useState(false);
  const [speakSecondsRemaining, setSpeakSecondsRemaining] = useState(120);
  const [isSpeakTimerActive, setIsSpeakTimerActive] = useState(false);
  const [isExaminerSpeaking, setIsExaminerSpeaking] = useState(false);

  const recognitionRef = useRef<any>(null);
  const speaking = testPackage.speaking;

  // Speak Examiner prompt via Web Speech API
  const speakExaminerQuestion = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'en-GB'; // British English for IELTS examiner persona
      utter.rate = 0.95;
      utter.onstart = () => setIsExaminerSpeaking(true);
      utter.onend = () => setIsExaminerSpeaking(false);
      utter.onerror = () => setIsExaminerSpeaking(false);
      window.speechSynthesis.speak(utter);
    }
  };

  // Initialize Web Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript + ' ';
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        setLiveTranscript((prev) => (prev + ' ' + final + ' ' + interim).trim());
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition error:', e);
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Part 2 Prep Timer countdown
  useEffect(() => {
    let interval: any;
    if (isPrepActive && prepSecondsRemaining > 0) {
      interval = setInterval(() => {
        setPrepSecondsRemaining((prev) => {
          if (prev <= 1) {
            setIsPrepActive(false);
            // Automatically start 2-min speaking recording
            startPart2Speaking();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPrepActive, prepSecondsRemaining]);

  // Part 2 Speaking Timer countdown
  useEffect(() => {
    let interval: any;
    if (isSpeakTimerActive && speakSecondsRemaining > 0) {
      interval = setInterval(() => {
        setSpeakSecondsRemaining((prev) => {
          if (prev <= 1) {
            setIsSpeakTimerActive(false);
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSpeakTimerActive, speakSecondsRemaining]);

  const startRecording = () => {
    setLiveTranscript('');
    setIsRecording(true);
    try {
      recognitionRef.current?.start();
    } catch (e) {
      console.warn('Recognition already started');
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    try {
      recognitionRef.current?.stop();
    } catch (e) {
      console.warn('Recognition already stopped');
    }
  };

  const startPart2Prep = () => {
    setIsPrepActive(true);
    setPrepSecondsRemaining(60);
    speakExaminerQuestion(
      "You have one minute to prepare your talk on the cue card. You can make some notes if you wish. Your one minute starts now."
    );
  };

  const startPart2Speaking = () => {
    setIsPrepActive(false);
    setIsSpeakTimerActive(true);
    setSpeakSecondsRemaining(120);
    startRecording();
    speakExaminerQuestion("All right, remember you have one to two minutes for this. Please start speaking now.");
  };

  // Save current answer
  const saveCurrentAnswer = () => {
    if (currentPart === 'part1') {
      const q = speaking.part1.questions[currentQuestionIndex];
      const updated = [...speakingAnswers.part1Answers];
      const existingIdx = updated.findIndex((a) => a.question === q);
      if (existingIdx >= 0) {
        updated[existingIdx] = { question: q, transcript: liveTranscript || updated[existingIdx].transcript };
      } else {
        updated.push({ question: q, transcript: liveTranscript || '(Đã ghi nhận bài nói)' });
      }
      onUpdateSpeaking({ ...speakingAnswers, part1Answers: updated });
    } else if (currentPart === 'part2') {
      onUpdateSpeaking({ ...speakingAnswers, part2Transcript: liveTranscript || speakingAnswers.part2Transcript });
    } else if (currentPart === 'part3') {
      const q = speaking.part3.questions[currentQuestionIndex];
      const updated = [...speakingAnswers.part3Answers];
      const existingIdx = updated.findIndex((a) => a.question === q);
      if (existingIdx >= 0) {
        updated[existingIdx] = { question: q, transcript: liveTranscript || updated[existingIdx].transcript };
      } else {
        updated.push({ question: q, transcript: liveTranscript || '(Đã ghi nhận bài nói)' });
      }
      onUpdateSpeaking({ ...speakingAnswers, part3Answers: updated });
    }
    stopRecording();
  };

  const fontClass =
    textSize === 'xlarge' ? 'text-lg leading-relaxed' : textSize === 'large' ? 'text-base leading-normal' : 'text-sm leading-normal';

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 text-slate-100 overflow-hidden">
      {/* Speaking Part Navigator Header */}
      <div className="bg-slate-950 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-lg">
          <button
            onClick={() => {
              saveCurrentAnswer();
              setCurrentPart('part1');
              setCurrentQuestionIndex(0);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentPart === 'part1'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Part 1: Hỏi đáp cơ bản ({speaking.part1.questions.length} câu)
          </button>

          <button
            onClick={() => {
              saveCurrentAnswer();
              setCurrentPart('part2');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentPart === 'part2'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Part 2: Thuyết trình Cue Card (1m chuẩn bị + 2m nói)
          </button>

          <button
            onClick={() => {
              saveCurrentAnswer();
              setCurrentPart('part3');
              setCurrentQuestionIndex(0);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentPart === 'part3'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Part 3: Thảo luận chuyên sâu ({speaking.part3.questions.length} câu)
          </button>
        </div>

        {/* Examiner Live Audio Indicator */}
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-slate-300 font-medium">Giám khảo: {speaking.examinerName}</span>
        </div>
      </div>

      {/* Main Speaking Stage */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto w-full">
        {/* Examiner Avatar & Speech Prompt Box */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="relative shrink-0">
            <img
              src={speaking.examinerAvatar}
              alt={speaking.examinerName}
              referrerPolicy="no-referrer"
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-purple-500/80 shadow-md"
            />
            {isExaminerSpeaking && (
              <span className="absolute -bottom-1 -right-1 p-1 bg-purple-600 text-white rounded-full animate-bounce">
                <Volume2 className="w-3.5 h-3.5" />
              </span>
            )}
          </div>

          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-between gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                  IELTS Senior Examiner
                </span>
                <h2 className="text-base sm:text-lg font-bold text-white">
                  {speaking.examinerName}
                </h2>
              </div>

              {/* Speak Audio Button */}
              <button
                onClick={() => {
                  const qText =
                    currentPart === 'part1'
                      ? speaking.part1.questions[currentQuestionIndex]
                      : currentPart === 'part2'
                      ? `${speaking.part2.cueCard.topic}. ${speaking.part2.cueCard.prompt}`
                      : speaking.part3.questions[currentQuestionIndex];
                  speakExaminerQuestion(qText);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-700/80 text-purple-300 text-xs font-medium rounded-lg transition-colors"
                title="Giám khảo đọc lại câu hỏi bằng giọng chuẩn"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Nghe giám khảo đọc</span>
              </button>
            </div>

            {/* Current Active Question Display */}
            <div className="bg-slate-900/90 border border-slate-700/80 p-4 rounded-xl text-slate-100 font-medium text-base sm:text-lg leading-relaxed shadow-inner">
              {currentPart === 'part1' && speaking.part1.questions[currentQuestionIndex]}
              {currentPart === 'part2' && (
                <div className="space-y-3">
                  <div className="text-amber-400 font-bold text-base">
                    Candidate Task Card: {speaking.part2.cueCard.topic}
                  </div>
                  <p className="text-sm text-slate-200">{speaking.part2.cueCard.prompt}</p>
                  <div className="text-xs text-slate-300 space-y-1 pl-3 border-l-2 border-purple-500">
                    <p className="font-semibold text-slate-400">You should say:</p>
                    {speaking.part2.cueCard.bulletPoints.map((bp, idx) => (
                      <p key={idx}>• {bp}</p>
                    ))}
                  </div>
                </div>
              )}
              {currentPart === 'part3' && speaking.part3.questions[currentQuestionIndex]}
            </div>
          </div>
        </div>

        {/* Part 2 Specific: Preparation & 2-Minute Speech Controls */}
        {currentPart === 'part2' && (
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono font-bold text-amber-300 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Chuẩn bị: {prepSecondsRemaining}s</span>
                </div>
                <div className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono font-bold text-purple-300 flex items-center gap-1.5">
                  <Mic className="w-4 h-4 text-purple-400" />
                  <span>Nói: {speakSecondsRemaining}s</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!isPrepActive && prepSecondsRemaining === 60 && (
                  <button
                    onClick={startPart2Prep}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                  >
                    Bắt đầu 1 phút chuẩn bị
                  </button>
                )}
                {!isSpeakTimerActive && (
                  <button
                    onClick={startPart2Speaking}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                  >
                    Bắt đầu nói ngay (2 phút)
                  </button>
                )}
              </div>
            </div>

            {/* Note Scratchpad during Part 2 */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
                Ghi chú dàn ý 1 phút chuẩn bị (Candidate Notes):
              </label>
              <textarea
                value={speakingAnswers.part2Notes}
                onChange={(e) =>
                  onUpdateSpeaking({ ...speakingAnswers, part2Notes: e.target.value })
                }
                placeholder="Ghi nhanh các từ khóa, collocation ghi điểm, ví dụ thực tế..."
                rows={3}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
              />
            </div>
          </div>
        )}

        {/* Live Speech Recognition & Audio Recorder Studio */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2 justify-center sm:justify-start">
                <Mic className={`w-4 h-4 ${isRecording ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`} />
                Thu âm & Phân tích Giọng nói Thời gian Thực (Live AI Transcript)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Nhấn Micro để nói, AI sẽ tự động ghi nhận và phân tích 4 tiêu chí Speaking.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-lg active:scale-95 ${
                  isRecording
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40 animate-pulse'
                    : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/30'
                }`}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span>{isRecording ? 'Dừng thu âm' : 'Bật Micro & Trả lời'}</span>
              </button>
            </div>
          </div>

          {/* Transcript Box */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 min-h-[110px] flex flex-col justify-between">
            <p className={`text-slate-200 italic ${fontClass}`}>
              {liveTranscript ||
                (currentPart === 'part1'
                  ? speakingAnswers.part1Answers.find(
                      (a) => a.question === speaking.part1.questions[currentQuestionIndex]
                    )?.transcript || '(Chưa có bản ghi âm cho câu này. Hãy nhấn Micro để bắt đầu nói...)'
                  : currentPart === 'part2'
                  ? speakingAnswers.part2Transcript || '(Chưa có bản ghi âm Part 2. Hãy nhấn Micro để bắt đầu...)'
                  : speakingAnswers.part3Answers.find(
                      (a) => a.question === speaking.part3.questions[currentQuestionIndex]
                    )?.transcript || '(Chưa có bản ghi âm cho câu này. Hãy nhấn Micro để bắt đầu nói...)')}
            </p>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/60 mt-3 font-mono">
              <span>{isRecording ? '● Đang thu âm trực tiếp...' : '✓ Bản ghi hoàn tất'}</span>
              <span>{liveTranscript.split(/\s+/).filter(Boolean).length} từ đã nói</span>
            </div>
          </div>

          {/* Question Navigation for Part 1 and Part 3 */}
          {(currentPart === 'part1' || currentPart === 'part3') && (
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => {
                  saveCurrentAnswer();
                  if (currentQuestionIndex > 0) setCurrentQuestionIndex(currentQuestionIndex - 1);
                }}
                disabled={currentQuestionIndex === 0}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-700 text-slate-300 text-xs rounded-lg transition-colors"
              >
                Câu trước
              </button>

              <span className="text-xs font-mono text-slate-400">
                Câu {currentQuestionIndex + 1} /{' '}
                {currentPart === 'part1' ? speaking.part1.questions.length : speaking.part3.questions.length}
              </span>

              <button
                onClick={() => {
                  saveCurrentAnswer();
                  const maxLen =
                    currentPart === 'part1'
                      ? speaking.part1.questions.length
                      : speaking.part3.questions.length;
                  if (currentQuestionIndex < maxLen - 1) {
                    setCurrentQuestionIndex(currentQuestionIndex + 1);
                  }
                }}
                disabled={
                  currentQuestionIndex >=
                  (currentPart === 'part1'
                    ? speaking.part1.questions.length - 1
                    : speaking.part3.questions.length - 1)
                }
                className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Lưu & Câu kế tiếp
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
