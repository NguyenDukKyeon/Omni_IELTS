import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  Clock,
  Sparkles,
  Award,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Zap,
  Play,
  Square,
  HelpCircle,
  FileEdit,
  Headphones,
  Flame,
  ArrowRight,
  Radio
} from 'lucide-react';
import {
  SpeakingPracticePart,
  SpeakingPracticePrompt,
  SpeakingEvaluationResult,
} from '../../types';
import {
  generateSpeakingPracticePromptApi,
  evaluateSpeakingPracticeApi,
  speakExaminerText,
} from '../../services/practiceService';
import { useApp } from '../../context/AppContext';
import { SpeakingRealtimeRoom } from '../speaking/SpeakingRealtimeRoom';

const SPEAKING_PARTS: Array<{
  part: SpeakingPracticePart;
  title: string;
  desc: string;
  badge: string;
}> = [
  {
    part: 'part1_qa',
    title: 'Speaking Part 1: Hỏi đáp ngắn',
    desc: 'Trả lời 3-4 câu hỏi phản xạ tự nhiên về các chủ đề đời sống, sở thích, thói quen.',
    badge: 'Phản xạ 15-30s',
  },
  {
    part: 'part2_cue_card',
    title: 'Speaking Part 2: Cue Card (Long Turn)',
    desc: '1 phút chuẩn bị dàn ý + 2 phút nói độc thoại theo 4 gạch đầu dòng chủ đề.',
    badge: 'Đồng hồ 1m prep + 2m nói',
  },
  {
    part: 'part3_deep_discussion',
    title: 'Speaking Part 3: Thảo luận sâu',
    desc: 'Phân tích đa chiều các vấn đề xã hội trừu tượng, vĩ mô mở rộng từ Part 2.',
    badge: 'Tư duy học thuật Band 8+',
  },
];

const INITIAL_SPEAKING_PROMPT: SpeakingPracticePrompt = {
  id: 's_init_part2_1',
  part: 'part2_cue_card',
  title: 'Describe an Important Public Facility',
  topic: 'Urban Infrastructure & Public Space',
  difficulty: 'Band 7.0-8.0',
  examinerPersona: 'Dr. Jonathan Vance - Cambridge Senior Speaking Examiner',
  cueCard: {
    prompt: 'Describe a public facility or park in your city that you enjoy visiting.',
    bulletPoints: [
      'Where this facility or park is situated',
      'How frequently you visit it and who you go with',
      'What activities people engage in when they are there',
      'And explain why you consider this facility so essential for the local community.',
    ],
    prepTimeSeconds: 60,
    speakingTimeSeconds: 120,
    keyIdeasVi: [
      'Mở đầu: Giới thiệu công viên sinh thái hoặc thư viện trung tâm thành phố',
      'Chi tiết không gian: Không gian xanh mở, đường chạy bộ, khu vui chơi cộng đồng',
      'Ý nghĩa xã hội: Giảm căng thẳng tinh thần, kết nối các thế hệ, cải thiện chất lượng không khí',
    ],
  },
};

export const SpeakingQuestionModule: React.FC = () => {
  const { addMistake, awardXP, openAITutorWithPrompt, profile } = useApp();

  // Mode: 'virtual_room' (1:1 Exam Room with AI Examiner) vs 'drill' (Single Part Drill)
  const [speakingMode, setSpeakingMode] = useState<'virtual_room' | 'drill'>('virtual_room');

  const [selectedPart, setSelectedPart] = useState<SpeakingPracticePart>('part2_cue_card');
  const [prompt, setPrompt] = useState<SpeakingPracticePrompt>(INITIAL_SPEAKING_PROMPT);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evaluation, setEvaluation] = useState<SpeakingEvaluationResult | null>(null);

  // Cue card timers & notes
  const [prepSeconds, setPrepSeconds] = useState<number>(60);
  const [isPrepping, setIsPrepping] = useState<boolean>(false);
  const [speakingSeconds, setSpeakingSeconds] = useState<number>(120);
  const [isSpeakingTimerActive, setIsSpeakingTimerActive] = useState<boolean>(false);
  const [prepNotes, setPrepNotes] = useState<string>('');

  // Speech Recognition & Recording State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number>(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [recordedAudio, setRecordedAudio] = useState<{ base64: string; mimeType: string } | null>(null);
  const [recordingError, setRecordingError] = useState<string>('');

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  // Initialize Web Speech API Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let fullText = '';
          for (let i = 0; i < event.results.length; i++) {
            fullText += event.results[i][0].transcript + ' ';
          }
          setLiveTranscript(fullText);
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
        };

        recognitionRef.current = recognition;
      }
    }

    // Check for pending speaking prompt from Forecast Live Hub
    const handleLoadSpeakingPrompt = (data: any) => {
      if (!data) return;
      const isPart1 = data.part === 'speaking_part1';
      const isPart3 = data.part === 'speaking_part3';
      const targetPart: SpeakingPracticePart = isPart1
        ? 'part1_qa'
        : isPart3
        ? 'part3_deep_discussion'
        : 'part2_cue_card';

      setSelectedPart(targetPart);
      setPrompt({
        id: data.id || `custom_speaking_${Date.now()}`,
        part: targetPart,
        title: data.title || 'Nguồn luyện Speaking từ Live Hub',
        topic: 'IELTS Real Exam Forecast 2026',
        difficulty: 'Band 7.0-8.0',
        examinerPersona: 'Dr. Jonathan Vance - Cambridge Senior Speaking Examiner',
        cueCard: {
          prompt: data.promptStatement || 'Describe an IELTS-style practice topic',
          bulletPoints: data.cueCardPoints || [
            'What it is and when it occurred',
            'Who was involved',
            'How you felt about it',
            'And explain why it made a lasting impression on you',
          ],
          prepTimeSeconds: 60,
          speakingTimeSeconds: 120,
          keyIdeasVi: [
            'Phát triển ý mạch lạc theo trình tự thời gian hoặc nguyên nhân - kết quả',
            'Ứng dụng cụm từ Collocations C1/C2 tự nhiên',
          ],
        },
      });
      setEvaluation(null);
      setLiveTranscript('');
      setRecordedAudio(null);
      setRecordingError('');
      setPrepNotes('');
      setPrepSeconds(60);
      setSpeakingSeconds(120);
    };

    const saved = sessionStorage.getItem('omni_pending_speaking_prompt');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        handleLoadSpeakingPrompt(parsed);
        sessionStorage.removeItem('omni_pending_speaking_prompt');
      } catch (e) {
        console.warn(e);
      }
    }

    const listener = (e: any) => {
      if (e.detail) {
        handleLoadSpeakingPrompt(e.detail);
      }
    };

    window.addEventListener('omni_load_speaking_prompt', listener);
    return () => window.removeEventListener('omni_load_speaking_prompt', listener);
  }, []);

  // Timer countdowns for Cue Card
  useEffect(() => {
    let interval: any = null;
    if (isPrepping && prepSeconds > 0) {
      interval = setInterval(() => setPrepSeconds((p) => p - 1), 1000);
    } else if (isPrepping && prepSeconds === 0) {
      setIsPrepping(false);
      // Auto start speaking timer
      handleStartRecording();
    }
    return () => clearInterval(interval);
  }, [isPrepping, prepSeconds]);

  useEffect(() => {
    let interval: any = null;
    if (isSpeakingTimerActive && speakingSeconds > 0) {
      interval = setInterval(() => setSpeakingSeconds((s) => s - 1), 1000);
    } else if (isSpeakingTimerActive && speakingSeconds === 0) {
      handleStopRecording();
    }
    return () => clearInterval(interval);
  }, [isSpeakingTimerActive, speakingSeconds]);

  const handleGenerateNew = async (part = selectedPart) => {
    handleStopRecording();
    setIsGenerating(true);
    setEvaluation(null);
    setLiveTranscript('');
    setRecordedAudio(null);
    setRecordingError('');
    setPrepNotes('');
    setPrepSeconds(60);
    setSpeakingSeconds(120);
    setIsPrepping(false);
    setIsSpeakingTimerActive(false);

    try {
      const newPrompt = await generateSpeakingPracticePromptApi(
        part,
        undefined,
        'Band 7.0-8.0'
      );
      setPrompt(newPrompt);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectPart = (part: SpeakingPracticePart) => {
    setSelectedPart(part);
    handleGenerateNew(part);
  };

  const handlePlayExaminerQuestion = (text: string) => {
    setIsPlayingAudio(true);
    speakExaminerText(text, 0.95, () => setIsPlayingAudio(false));
  };

  const handleStartPrepTimer = () => {
    setPrepSeconds(60);
    setIsPrepping(true);
  };

  const handleStartRecording = async () => {
    setRecordedAudio(null);
    setRecordingError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const preferredMimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType: preferredMimeType });
      audioChunksRef.current = [];
      recorder.ondataavailable = event => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || preferredMimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = String(reader.result || '');
          setRecordedAudio({
            base64: dataUrl.replace(/^data:[^;]+;base64,/, ''),
            mimeType: blob.type || 'audio/webm',
          });
        };
        reader.readAsDataURL(blob);
      };
      mediaRecorderRef.current = recorder;
      recorder.start(500);
      setIsRecording(true);
      setIsSpeakingTimerActive(true);
    } catch {
      setRecordingError('Không truy cập được microphone. Phần pronunciation sẽ không được chấm khi thiếu audio thật.');
      setIsRecording(false);
      setIsSpeakingTimerActive(false);
      return;
    }
    try {
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
    } catch {
      // already started or fallback
    }
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setIsSpeakingTimerActive(false);
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } catch {
      // already stopped
    }
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    mediaStreamRef.current = null;
  };

  const handleEvaluateSpeaking = async () => {
    const textToEval = liveTranscript.trim();
    if (!textToEval || textToEval.length < 10 || !recordedAudio || isEvaluating) return;

    setIsEvaluating(true);
    setEvaluation(null);

    const questionContext =
      prompt.part === 'part2_cue_card'
        ? prompt.cueCard?.prompt || prompt.title
        : prompt.questions?.[selectedQuestionIndex]?.questionText || prompt.title;

    try {
      const result = await evaluateSpeakingPracticeApi(
        questionContext,
        textToEval,
        prompt.part,
        profile.targetBand || 7.0,
        recordedAudio
      );

      setEvaluation(result);

      // Lưu các lỗi grammar / pronunciation vào MistakeNotebook
      if (
        result.criteriaScores.grammaticalRangeAccuracy.grammarSlips &&
        result.criteriaScores.grammaticalRangeAccuracy.grammarSlips.length > 0
      ) {
        result.criteriaScores.grammaticalRangeAccuracy.grammarSlips.forEach((slip) => {
          addMistake({
            id: `mistake_spk_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            errorText: `"${slip.original}"`,
            correctedText: `"${slip.corrected}"`,
            explanation: `${slip.explanation} (Speaking ${prompt.part})`,
            errorType: 'grammar',
            skill: 'speaking',
            originModule: 'ielts_practice_speaking',
            srsStage: 0,
            nextReviewDate: new Date(Date.now() + 86400000).toISOString(),
            reviewCount: 0,
            mastered: false,
            createdAt: new Date().toISOString(),
            tags: ['Speaking Error', 'Grammar Slip', prompt.part],
          });
        });
      }

      awardXP(80, `Hoàn thành bài luyện Speaking ${prompt.part} (Band ${result.overallBand})`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsEvaluating(false);
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div id="ielts_speaking_module" className="space-y-6">
      {/* Top Speaking Mode Switcher Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
        <div className="grid grid-cols-2 w-full sm:w-auto gap-1">
          <button data-ux-flow="practice.skills"
            onClick={() => setSpeakingMode('virtual_room')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              speakingMode === 'virtual_room'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Radio className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>Phòng Thi 1:1 Giám Khảo Khảo Thí AI</span>
          </button>

          <button data-ux-flow="practice.skills"
            onClick={() => setSpeakingMode('drill')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              speakingMode === 'drill'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileEdit className="w-4 h-4" />
            <span>Luyện Từng Dạng Bài (Part 1, 2, 3)</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-500 dark:text-slate-400 px-3 flex items-center gap-1.5 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Nhận dạng transcript + phân tích audio thật theo 4 tiêu chí IELTS</span>
        </div>
      </div>

      {/* Mode 1: Virtual Examiner Room */}
      {speakingMode === 'virtual_room' && (
        <SpeakingRealtimeRoom onBackToPractice={() => setSpeakingMode('drill')} />
      )}

      {/* Mode 2: Drill View */}
      {speakingMode === 'drill' && (
        <div className="space-y-6 animate-fadeIn">
          {/* 1. Selector bar: Part 1, Part 2 (Cue Card with 1m+2m timers), Part 3 */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Mic className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  Luyện từng phần thi IELTS Speaking (Part 1, Part 2 & Part 3)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Mô phỏng đối thoại với Giám khảo AI Cambridge qua giọng đọc tự nhiên và đồng hồ chuẩn phòng thi.
                </p>
              </div>

              <button data-ux-flow="practice.skills"
                onClick={() => handleGenerateNew(selectedPart)}
                disabled={isGenerating}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
              >
                {isGenerating ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                {isGenerating ? 'Đang tạo đề AI...' : 'Tạo đề AI mới'}
              </button>
            </div>

            {/* Part Selection Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {SPEAKING_PARTS.map((p) => {
                const isSelected = selectedPart === p.part;
                return (
                  <button data-ux-flow="practice.skills"
                    key={p.part}
                    onClick={() => handleSelectPart(p.part)}
                    className={`text-left p-4 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 font-semibold shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm">{p.title}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                        {p.desc}
                      </p>
                    </div>
                    <span className="mt-3 inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 w-fit">
                      {p.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

      {/* 2. Speaking Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Cue Card / Examiner Questions & Interactive Audio Prompt */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                {prompt.topic} • {prompt.difficulty}
              </span>
              <span className="text-xs text-slate-500">{prompt.examinerPersona}</span>
            </div>

            {/* PART 2 CUE CARD SPECIALIZED VIEW */}
            {prompt.part === 'part2_cue_card' && prompt.cueCard && (
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border-2 border-amber-300 dark:border-amber-700/60 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                      IELTS Candidate Task Card (Cue Card)
                    </span>
                    <button data-ux-flow="practice.skills"
                      onClick={() => handlePlayExaminerQuestion(prompt.cueCard!.prompt)}
                      className="px-2.5 py-1 rounded-lg bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 text-xs font-bold flex items-center gap-1 hover:opacity-80"
                    >
                      <Volume2 className="w-3.5 h-3.5" /> Nghe giám khảo đọc đề
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {prompt.cueCard.prompt}
                  </h3>

                  <div className="space-y-1.5 pt-2">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                      You should say:
                    </span>
                    <ul className="space-y-1 text-xs text-slate-800 dark:text-slate-200 list-disc list-inside">
                      {prompt.cueCard.bulletPoints.map((bp, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {bp}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 1-Minute Prep Countdown & Notes Scratchpad */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        1 phút chuẩn bị ghi chú:
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black px-2.5 py-1 rounded bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200">
                        {formatTimer(prepSeconds)}
                      </span>
                      {!isPrepping && prepSeconds === 60 && (
                        <button data-ux-flow="practice.skills"
                          onClick={handleStartPrepTimer}
                          className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold"
                        >
                          Bắt đầu 1 phút
                        </button>
                      )}
                    </div>
                  </div>

                  <textarea data-ux-flow="practice.skills"
                    value={prepNotes}
                    onChange={(e) => setPrepNotes(e.target.value)}
                    placeholder="Ghi chú nhanh các từ khóa / collocations trong 1 phút chuẩn bị..."
                    rows={3}
                    className="w-full p-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            )}

            {/* PART 1 & PART 3 QUESTIONS LIST */}
            {prompt.part !== 'part2_cue_card' && prompt.questions && (
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Danh sách câu hỏi phỏng vấn:
                </div>
                {prompt.questions.map((q, idx) => (
                  <div
                    key={q.id}
                    onClick={() => setSelectedQuestionIndex(idx)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer text-xs space-y-2 ${
                      selectedQuestionIndex === idx
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        Câu {idx + 1}:
                      </span>
                      <button data-ux-flow="practice.skills"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayExaminerQuestion(q.questionText);
                        }}
                        className="p-1 rounded hover:bg-indigo-200 dark:hover:bg-indigo-800 text-indigo-600 dark:text-indigo-300"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="font-semibold text-slate-900 dark:text-white">{q.questionText}</p>
                    {q.followUpHintVi && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        💡 <strong>Gợi ý:</strong> {q.followUpHintVi}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Audio Recording / Live Transcript / AI Evaluation */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            {/* Top Toolbar: Speaking Timer & Audio Status */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Phòng thu âm IELTS:
                </span>
                {isRecording && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-rose-600 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-rose-600" /> Đang ghi âm bài nói...
                  </span>
                )}
              </div>

              {prompt.part === 'part2_cue_card' && (
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-lg">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  <span>2 phút nói: {formatTimer(speakingSeconds)}</span>
                </div>
              )}
            </div>

            {/* Live Transcript / Speech Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Transcript bài nói (tự động nhận diện từ microphone):</span>
                <span className="text-[11px]">{liveTranscript.split(/\s+/).filter(Boolean).length} từ</span>
              </div>
              <textarea data-ux-flow="practice.skills"
                value={liveTranscript}
                onChange={(e) => setLiveTranscript(e.target.value)}
                placeholder="Bấm nút 'Bắt đầu nói' bên dưới để thu âm, hoặc nhập trực tiếp transcript câu trả lời của bạn tại đây..."
                rows={6}
                className="w-full p-4 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 text-xs leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-y"
              />
            </div>

            {/* Recording Controls & Submit */}
            <div className="flex items-center gap-3 pt-2">
              {!isRecording ? (
                <button data-ux-flow="practice.skills"
                  onClick={handleStartRecording}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  <Mic className="w-4 h-4" /> Bắt đầu nói (Thu âm)
                </button>
              ) : (
                <button data-ux-flow="practice.skills"
                  onClick={handleStopRecording}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all animate-pulse"
                >
                  <Square className="w-4 h-4" /> Hoàn thành bài nói
                </button>
              )}

              <button data-ux-flow="practice.skills"
                onClick={handleEvaluateSpeaking}
                disabled={isEvaluating || !liveTranscript.trim() || liveTranscript.length < 10 || !recordedAudio}
                className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                {isEvaluating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 text-amber-400" />
                )}
                {isEvaluating ? 'Đang chấm...' : 'Chấm 4 tiêu chí Speaking'}
              </button>
            </div>
            {recordingError && (
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{recordingError}</p>
            )}
          </div>

          {/* 3. Official 4-Criteria Speaking Evaluation Dashboard */}
          {evaluation && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border-2 border-indigo-500/40 shadow-xl space-y-6">
              {/* Overall Speaking Band Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white shadow-md">
                <div>
                  <span className="text-xs uppercase tracking-wider text-indigo-300 font-bold">
                    Kết quả giám khảo IELTS Speaking
                  </span>
                  <h3 className="text-xl font-black text-white mt-1">
                    Ước tính: Band {evaluation.overallBand.toFixed(1)}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Đánh giá theo 4 tiêu chí chính thức (FC, LR, GRA, PR)
                  </p>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-indigo-600/40 border-2 border-indigo-400 flex items-center justify-center text-2xl font-black text-white shadow-inner flex-shrink-0">
                  {evaluation.overallBand.toFixed(1)}
                </div>
              </div>

              {/* 4 Criteria Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Fluency & Coherence */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Fluency & Coherence (FC)
                    </span>
                    <span className="text-xs font-black px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                      Band {evaluation.criteriaScores.fluencyCoherence.band.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {evaluation.criteriaScores.fluencyCoherence.feedback}
                  </p>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400">
                    💡 {evaluation.criteriaScores.fluencyCoherence.pauseRateAdvice}
                  </p>
                </div>

                {/* 2. Lexical Resource */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Lexical Resource (LR)
                    </span>
                    <span className="text-xs font-black px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                      Band {evaluation.criteriaScores.lexicalResource.band.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {evaluation.criteriaScores.lexicalResource.feedback}
                  </p>
                </div>

                {/* 3. Grammatical Range & Accuracy */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Grammatical Range & Accuracy (GRA)
                    </span>
                    <span className="text-xs font-black px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                      Band {evaluation.criteriaScores.grammaticalRangeAccuracy.band.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {evaluation.criteriaScores.grammaticalRangeAccuracy.feedback}
                  </p>
                </div>

                {/* 4. Pronunciation */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Pronunciation (PR)
                    </span>
                    <span className="text-xs font-black px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                      Band {evaluation.criteriaScores.pronunciation.band.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {evaluation.criteriaScores.pronunciation.feedback}
                  </p>
                </div>
              </div>

              {/* High Band Speaking Upgrades */}
              {evaluation.highBandUpgrades && evaluation.highBandUpgrades.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <Award className="w-4 h-4" /> Nâng cấp câu nói lên Band 8.0+:
                  </h4>
                  <div className="space-y-2.5">
                    {evaluation.highBandUpgrades.map((u, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 text-xs space-y-1.5"
                      >
                        <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                          <strong>Bạn đã nói:</strong> "{u.spokenSentence}"
                        </p>
                        <p className="text-indigo-900 dark:text-indigo-200 font-bold">
                          <strong>Band 8.0+:</strong> "{u.band8Upgrade}"
                        </p>
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                          Trọng tâm: {u.focus}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actionable Steps */}
              {evaluation.actionableStepsVi && evaluation.actionableStepsVi.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                  <strong className="text-slate-900 dark:text-white font-bold block">
                    🎯 3 hành động cải thiện ngay cho lần luyện nói tiếp theo:
                  </strong>
                  <ul className="space-y-1 text-slate-700 dark:text-slate-300 list-disc list-inside">
                    {evaluation.actionableStepsVi.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )}
</div>
);
};
