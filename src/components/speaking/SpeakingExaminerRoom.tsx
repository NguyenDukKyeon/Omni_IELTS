import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Square,
  RefreshCw,
  Clock,
  Award,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  RotateCcw,
  BookOpen,
  MessageSquare,
  FileText,
  Zap,
  Activity,
  ArrowRight,
  TrendingUp,
  BookmarkPlus,
  HelpCircle,
  Headphones,
  User,
  ShieldCheck,
  BarChart3,
  Flame
} from 'lucide-react';
import {
  SpeakingRoomTurn,
  SpeakingRoomEvaluation,
  SpeakingLiveEvaluationReport,
  StandardErrorObject,
  MistakeEntry
} from '../../types';
import {
  callSpeakingExaminerTurnApi,
  evaluateSpeakingLiveAudioApi,
  speakExaminerText,
  ExaminerTurnResponse
} from '../../services/practiceService';
import { useApp } from '../../context/AppContext';
import { VoicePicker } from '../voice/VoicePicker';

// Preset Cue Cards for Part 2
const CUE_CARD_TOPICS = [
  {
    topic: 'An Environmental Campaign or Community Initiative',
    prompt: 'Describe an environmental initiative or project in your area that you find meaningful.',
    bulletPoints: [
      'What the initiative is and where it took place',
      'Who participated or organized it',
      'What specific actions or activities were involved',
      'And explain why you think this initiative had a positive impact on the community.'
    ],
    part3Theme: 'Environmental Responsibility, Government Policies & Citizen Awareness'
  },
  {
    topic: 'An Important Piece of Technology in Modern Life',
    prompt: 'Describe a piece of electronic equipment or software that significantly enhances your daily productivity.',
    bulletPoints: [
      'What piece of technology it is and how long you have used it',
      'What main functions or features it offers',
      'How frequently you rely on it throughout your daily routine',
      'And explain why this technology is so indispensable to your work or study.'
    ],
    part3Theme: 'Technological Automation, Human Connection & Future Workforce'
  },
  {
    topic: 'A Memorable Traditional Cultural Festival',
    prompt: 'Describe a traditional festival or cultural celebration in your country that you enjoy.',
    bulletPoints: [
      'What festival it is and when it is celebrated',
      'What special food, rituals, or customs are observed',
      'How people in your community take part in it',
      'And explain why this festival holds significant cultural value for the younger generation.'
    ],
    part3Theme: 'Cultural Preservation, Globalisation & Tourism Impact'
  }
];

const EXAMINER_PROFILES = [
  {
    id: 'dr_vance',
    name: 'Dr. Jonathan Vance',
    role: 'Senior IELTS Speaking Examiner (15+ yrs, Cambridge)',
    accent: 'British' as const,
    avatar: '👨‍🏫',
    style: 'Warm, International academic, strictly objective'
  },
  {
    id: 'mr_harper',
    name: 'Alistair Harper',
    role: 'IDP Chief Speaking Assessor (10+ yrs)',
    accent: 'Australian' as const,
    avatar: '👨‍🏫',
    style: 'Tự nhiên, phản xạ sắc bén, giọng điệu Anh-Úc chuẩn khảo thí'
  }
];

interface SpeakingExaminerRoomProps {
  onBackToPractice?: () => void;
}

export const SpeakingExaminerRoom: React.FC<SpeakingExaminerRoomProps> = ({ onBackToPractice }) => {
  const { addMistake, awardXP, profile, openAITutorWithPrompt } = useApp();

  // Test Session Stages: 'welcome' | 'part1' | 'part2_prep' | 'part2_speak' | 'part3' | 'evaluating' | 'score_report'
  const [testStage, setTestStage] = useState<
    'welcome' | 'part1' | 'part2_prep' | 'part2_speak' | 'part3' | 'evaluating' | 'score_report'
  >('welcome');

  // Selected Examiner
  const [selectedExaminerIndex, setSelectedExaminerIndex] = useState<number>(0);
  const currentExaminer = EXAMINER_PROFILES[selectedExaminerIndex];

  // Conversation turns record
  const [turns, setTurns] = useState<SpeakingRoomTurn[]>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState<number>(0);

  // Active turn state
  const [currentExaminerReply, setCurrentExaminerReply] = useState<string>('');
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [candidateTranscript, setCandidateTranscript] = useState<string>('');
  const [interimText, setInterimText] = useState<string>('');
  const [isExaminerSpeaking, setIsExaminerSpeaking] = useState<boolean>(false);
  const [isVoiceMuted, setIsVoiceMuted] = useState<boolean>(false);

  // Selected Cue Card for Part 2
  const [selectedCueCard, setSelectedCueCard] = useState(CUE_CARD_TOPICS[0]);
  const [part2Notes, setPart2Notes] = useState<string>('');
  const [prepTimeLeft, setPrepTimeLeft] = useState<number>(60);
  const [part2SpeakTimeLeft, setPart2SpeakTimeLeft] = useState<number>(120);

  // Timers & Recording
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [turnSecondsElapsed, setTurnSecondsElapsed] = useState<number>(0);
  const [totalSessionSeconds, setTotalSessionSeconds] = useState<number>(0);
  const [isCallingAi, setIsCallingAi] = useState<boolean>(false);

  // Live Audio Scoring Report (Dr. Jonathan Vance)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [recordedAudioBase64, setRecordedAudioBase64] = useState<string | null>(null);
  const [liveAudioReport, setLiveAudioReport] = useState<SpeakingLiveEvaluationReport | null>(null);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  const [manualAudioFile, setManualAudioFile] = useState<File | null>(null);
  const vadRef = useRef<{ pause: () => void; destroy: () => void } | null>(null);
  const vadSessionStartedAtRef = useRef<number>(0);
  const speechStartedAtRef = useRef<number | null>(null);
  const speechSegmentsRef = useRef<Array<{ start: number; end: number }>>([]);

  // Final evaluation result
  const [evaluationResult, setEvaluationResult] = useState<SpeakingRoomEvaluation | null>(null);
  const [syncedMistakes, setSyncedMistakes] = useState<Record<number, boolean>>({});

  // Audio recognition & speech synth refs
  const recognitionRef = useRef<any>(null);
  const stopSpeechRef = useRef<(() => void) | null>(null);
  const turnTimerRef = useRef<any>(null);
  const sessionTimerRef = useRef<any>(null);
  const prepTimerRef = useRef<any>(null);
  const speakTimerRef = useRef<any>(null);

  // Speech Recognition Initialization
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
          let finalStr = '';
          let interimStr = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalStr += event.results[i][0].transcript + ' ';
            } else {
              interimStr += event.results[i][0].transcript;
            }
          }
          if (finalStr) {
            setCandidateTranscript((prev) => (prev ? `${prev} ${finalStr.trim()}` : finalStr.trim()));
          }
          setInterimText(interimStr);
        };

        recognition.onerror = (event: any) => {
          console.warn('SpeechRecognition error:', event.error);
          setIsRecording(false);
        };

        recognition.onend = () => {
          // If still marked as recording, restart
          if (isRecording) {
            try {
              recognition.start();
            } catch (e) {
              setIsRecording(false);
            }
          }
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      if (stopSpeechRef.current) {
        stopSpeechRef.current();
      }
    };
  }, []);

  // Global Session Timer
  useEffect(() => {
    if (testStage !== 'welcome' && testStage !== 'score_report' && testStage !== 'evaluating') {
      sessionTimerRef.current = setInterval(() => {
        setTotalSessionSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    }
    return () => {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    };
  }, [testStage]);

  // Turn-level Timer
  useEffect(() => {
    if (isRecording) {
      turnTimerRef.current = setInterval(() => {
        setTurnSecondsElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (turnTimerRef.current) clearInterval(turnTimerRef.current);
    }
    return () => {
      if (turnTimerRef.current) clearInterval(turnTimerRef.current);
    };
  }, [isRecording]);

  // Start Voice Speaking via SpeechSynthesis
  const speakText = (text: string, onDone?: () => void) => {
    if (isVoiceMuted) {
      onDone?.();
      return;
    }
    setIsExaminerSpeaking(true);
    if (stopSpeechRef.current) {
      stopSpeechRef.current();
    }
    stopSpeechRef.current = speakExaminerText(
      text,
      0.96,
      currentExaminer.accent,
      () => {
        setIsExaminerSpeaking(false);
        onDone?.();
      }
    );
  };

  // Toggle Microphone
  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Trình duyệt của bạn chưa hỗ trợ Web Speech API. Bạn có thể gõ trực tiếp vào ô văn bản phía dưới.');
      return;
    }

    if (isRecording) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsRecording(false);
    } else {
      // Stop examiner voice if speaking
      if (stopSpeechRef.current) {
        stopSpeechRef.current();
        setIsExaminerSpeaking(false);
      }
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        console.error('Failed to start speech recognition:', e);
      }
    }
  };

  // Initialize Exam Session
  const handleStartExam = async () => {
    // Pick random Cue Card
    const randomCard = CUE_CARD_TOPICS[Math.floor(Math.random() * CUE_CARD_TOPICS.length)];
    setSelectedCueCard(randomCard);
    setTurns([]);
    setCurrentTurnIndex(0);
    setTotalSessionSeconds(0);
    setCandidateTranscript('');
    setInterimText('');
    setLiveAudioReport(null);
    setEvaluationError(null);
    setRecordedAudioBase64(null);
    audioChunksRef.current = [];
    speechSegmentsRef.current = [];
    vadSessionStartedAtRef.current = performance.now();
    setTestStage('part1');

    // Initialize MediaRecorder for full live audio track capture
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start(1000);

        try {
          const { MicVAD } = await import('@ricky0123/vad-web');
          const vad = await MicVAD.new({
            onSpeechStart: () => {
              speechStartedAtRef.current = (performance.now() - vadSessionStartedAtRef.current) / 1000;
            },
            onSpeechEnd: () => {
              if (speechStartedAtRef.current === null) return;
              speechSegmentsRef.current.push({
                start: speechStartedAtRef.current,
                end: (performance.now() - vadSessionStartedAtRef.current) / 1000,
              });
              speechStartedAtRef.current = null;
            },
          });
          vadRef.current = vad;
          vad.start();
        } catch (vadError) {
          console.warn('Silero VAD unavailable; pause metrics will be unavailable:', vadError);
        }
      }
    } catch (err) {
      console.warn('Microphone access for live track capture:', err);
    }

    const welcomeGreeting = `Good morning. My name is ${currentExaminer.name}. Could you please state your full name for the identification?`;
    const firstQuestion = "Let's begin Part 1. Could you tell me a little bit about what you do, whether you are a student or working?";

    setCurrentExaminerReply("Good morning and welcome to the IELTS Speaking test.");
    setCurrentQuestion(firstQuestion);

    speakText(`${welcomeGreeting} ${firstQuestion}`);
  };

  // Submit Candidate's Answer for Current Turn & Progress Interview
  const handleNextTurn = async () => {
    if (isRecording && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsRecording(false);
    }

    const currentSpeech = (candidateTranscript + ' ' + interimText).trim() || '(No speech detected)';
    
    // Save current turn
    const newTurn: SpeakingRoomTurn = {
      id: `turn_${Date.now()}`,
      part: testStage === 'part1' ? 'part1' : testStage === 'part2_speak' ? 'part2' : 'part3',
      questionNumber: currentTurnIndex + 1,
      examinerSpoken: currentExaminerReply,
      question: currentQuestion,
      candidateTranscript: currentSpeech,
      durationSeconds: turnSecondsElapsed,
      timestamp: new Date().toISOString()
    };

    const updatedTurns = [...turns, newTurn];
    setTurns(updatedTurns);

    // Reset turn inputs
    setCandidateTranscript('');
    setInterimText('');
    setTurnSecondsElapsed(0);
    setIsCallingAi(true);

    try {
      if (testStage === 'part1') {
        const nextTurnNum = currentTurnIndex + 1;
        setCurrentTurnIndex(nextTurnNum);

        if (nextTurnNum >= 3) {
          // Transition to Part 2
          setTestStage('part2_prep');
          setPrepTimeLeft(60);
          const transitionSpeech = `Thank you very much. That concludes Part 1. Now, we will proceed to Part 2 of the test. You will have one minute to prepare a short talk on a given topic, and you may take notes if you wish.`;
          setCurrentExaminerReply("That concludes Part 1.");
          setCurrentQuestion(`Please read the topic card and prepare your talk: "${selectedCueCard.prompt}"`);
          speakText(transitionSpeech, () => {
            // Start 1m prep countdown
            startPrepCountdown();
          });
        } else {
          // Ask next Part 1 question
          const response: ExaminerTurnResponse = await callSpeakingExaminerTurnApi({
            currentPart: 'part1',
            turnIndex: nextTurnNum,
            history: updatedTurns.map((t) => ({ speaker: 'Candidate', text: t.candidateTranscript })),
            candidateLastSpeech: currentSpeech,
            currentTopic: 'Daily Routine, Hobbies & Work-Life Balance',
            targetBand: profile.targetBand,
            examinerName: currentExaminer.name,
            examinerStyle: currentExaminer.style
          });

          setCurrentExaminerReply(response.examinerReply);
          setCurrentQuestion(response.nextQuestion);
          speakText(`${response.examinerReply} ${response.nextQuestion}`);
        }
      } else if (testStage === 'part2_speak') {
        // Transition to Part 3
        setTestStage('part3');
        setCurrentTurnIndex(0);
        const transitionSpeech = `Thank you. That was very interesting. We have been discussing ${selectedCueCard.topic}. Now, in Part 3, I'd like to ask you one or two more general questions related to this theme.`;
        
        const response: ExaminerTurnResponse = await callSpeakingExaminerTurnApi({
          currentPart: 'part3',
          turnIndex: 0,
          history: updatedTurns.map((t) => ({ speaker: 'Candidate', text: t.candidateTranscript })),
          candidateLastSpeech: currentSpeech,
          currentTopic: selectedCueCard.part3Theme,
          cueCard: selectedCueCard,
          targetBand: profile.targetBand,
          examinerName: currentExaminer.name,
          examinerStyle: currentExaminer.style
        });

        setCurrentExaminerReply(response.examinerReply || "Thank you.");
        setCurrentQuestion(response.nextQuestion || `How can society better address the long-term impact of ${selectedCueCard.topic}?`);
        speakText(`${transitionSpeech} ${response.nextQuestion}`);
      } else if (testStage === 'part3') {
        const nextTurnNum = currentTurnIndex + 1;
        setCurrentTurnIndex(nextTurnNum);

        if (nextTurnNum >= 3) {
          // Conclude interview and evaluate
          setTestStage('evaluating');
          const closingSpeech = "Thank you very much. That is the end of the speaking test. You have completed all three parts.";
          speakText(closingSpeech);
          await handleFinalEvaluation(updatedTurns);
        } else {
          const response: ExaminerTurnResponse = await callSpeakingExaminerTurnApi({
            currentPart: 'part3',
            turnIndex: nextTurnNum,
            history: updatedTurns.map((t) => ({ speaker: 'Candidate', text: t.candidateTranscript })),
            candidateLastSpeech: currentSpeech,
            currentTopic: selectedCueCard.part3Theme,
            targetBand: profile.targetBand,
            examinerName: currentExaminer.name,
            examinerStyle: currentExaminer.style
          });

          setCurrentExaminerReply(response.examinerReply);
          setCurrentQuestion(response.nextQuestion);
          speakText(`${response.examinerReply} ${response.nextQuestion}`);
        }
      }
    } catch (error) {
      console.error('Error during examiner interaction:', error);
    } finally {
      setIsCallingAi(false);
    }
  };

  // Start 1-Minute Prep Countdown for Part 2
  const startPrepCountdown = () => {
    let seconds = 60;
    if (prepTimerRef.current) clearInterval(prepTimerRef.current);
    prepTimerRef.current = setInterval(() => {
      seconds -= 1;
      setPrepTimeLeft(seconds);
      if (seconds <= 0) {
        clearInterval(prepTimerRef.current);
        // Automatically move to speaking stage
        setTestStage('part2_speak');
        setPart2SpeakTimeLeft(120);
        const startSpeakSpeech = "Your one minute preparation is up. Please begin speaking now. Remember, you have up to two minutes.";
        speakText(startSpeakSpeech, () => {
          startSpeakingCountdown();
        });
      }
    }, 1000);
  };

  // Skip 1-Minute Prep immediately
  const handleSkipPrep = () => {
    if (prepTimerRef.current) clearInterval(prepTimerRef.current);
    setTestStage('part2_speak');
    setPart2SpeakTimeLeft(120);
    const startSpeakSpeech = "All right, let's begin your Part 2 presentation. You have two minutes.";
    speakText(startSpeakSpeech, () => {
      startSpeakingCountdown();
    });
  };

  // 2-Minute Speaking Countdown for Part 2
  const startSpeakingCountdown = () => {
    let seconds = 120;
    if (speakTimerRef.current) clearInterval(speakTimerRef.current);
    speakTimerRef.current = setInterval(() => {
      seconds -= 1;
      setPart2SpeakTimeLeft(seconds);
      if (seconds <= 0) {
        clearInterval(speakTimerRef.current);
      }
    }, 1000);
  };

  // Final Overall Evaluation (Dr. Jonathan Vance Audio Track Scoring)
  const handleFinalEvaluation = async (finalTurns: SpeakingRoomTurn[]) => {
    setTestStage('evaluating');
    setEvaluationError(null);

    // Stop live MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    if (speechStartedAtRef.current !== null) {
      speechSegmentsRef.current.push({ start: speechStartedAtRef.current, end: totalSessionSeconds });
      speechStartedAtRef.current = null;
    }
    vadRef.current?.pause();
    vadRef.current?.destroy();
    vadRef.current = null;

    try {
      let audioBase64ToSend = recordedAudioBase64;
      if (!audioBase64ToSend && audioChunksRef.current.length > 0) {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioBase64ToSend = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      if (!audioBase64ToSend && manualAudioFile) {
        audioBase64ToSend = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(manualAudioFile);
        });
      }

      if (!audioBase64ToSend) throw new Error('Không có audio thật. Pronunciation và pause analytics đang unavailable.');

      const liveReport = await evaluateSpeakingLiveAudioApi({
        fullAudioBase64: audioBase64ToSend,
        mimeType: 'audio/webm',
        conversationHistory: finalTurns.map((t, idx) => ({
          turnIndex: idx + 1,
          part: t.part,
          question: t.question,
          userTranscript: t.candidateTranscript,
          durationSeconds: t.durationSeconds,
        })),
        totalDurationSeconds: totalSessionSeconds || 450,
        speechSegments: speechSegmentsRef.current.length ? speechSegmentsRef.current : null,
        targetBand: profile.targetBand || 7.5,
      });

      setLiveAudioReport(liveReport);
      setTestStage('score_report');
      awardXP(75, 'Hoàn thành bài thi Speaking 1:1 Giám khảo Khảo thí AI Dr. Jonathan Vance');
    } catch (error: any) {
      console.error('Speaking audio evaluation failure:', error);
      setEvaluationError(error?.message || 'Lỗi trong quá trình chấm điểm audio Speaking với gemini-3.1-pro.');
      setTestStage('score_report');
    }
  };

  // Sync a single mistake to notebook
  const handleSyncMistake = (
    mistake: { errorText: string; correctedText: string; explanation: string; errorType: any },
    index: number
  ) => {
    const entry: MistakeEntry = {
      id: `mistake_spk_${Date.now()}_${index}`,
      errorText: mistake.errorText,
      correctedText: mistake.correctedText,
      explanation: mistake.explanation,
      errorType: mistake.errorType || 'grammar',
      skill: 'speaking',
      originModule: 'ielts_practice_speaking',
      srsStage: 0,
      nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      reviewCount: 0,
      mastered: false,
      createdAt: new Date().toISOString(),
      tags: ['Speaking Virtual Room', 'Band Upgrade', mistake.errorType]
    };
    addMistake(entry);
    setSyncedMistakes((prev) => ({ ...prev, [index]: true }));
  };

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div id="ai_speaking_virtual_examiner_room" className="space-y-6 animate-fadeIn pb-12">
      {/* Top Breadcrumb & Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="hidden lg:block w-72">
            <VoicePicker useCase="examiner" compact />
          </div>
          <button
            onClick={onBackToPractice}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center gap-1 transition-all"
          >
            ← Thoát phòng thi
          </button>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Phòng Thi Speaking 1:1 Chuẩn Khảo Thí IDP / BC
            </span>
          </div>
        </div>

        {/* Global Timer & Mute Voice */}
        <div className="flex items-center gap-3">
          {testStage !== 'welcome' && testStage !== 'score_report' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>Thời gian thi: {formatTime(totalSessionSeconds)}</span>
            </div>
          )}

          <button
            onClick={() => {
              setIsVoiceMuted(!isVoiceMuted);
              if (!isVoiceMuted && stopSpeechRef.current) {
                stopSpeechRef.current();
                setIsExaminerSpeaking(false);
              }
            }}
            title={isVoiceMuted ? 'Bật giọng đọc giám khảo' : 'Tắt tiếng giọng đọc'}
            className={`p-2 rounded-xl border text-xs flex items-center gap-1.5 font-bold transition-all ${
              isVoiceMuted
                ? 'border-rose-300 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            {isVoiceMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-indigo-500" />}
            <span className="hidden sm:inline">{isVoiceMuted ? 'Mute' : 'Voice ON'}</span>
          </button>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 1. STAGE: WELCOME & EXAMINER SETUP                   */}
      {/* ==================================================== */}
      {testStage === 'welcome' && (
        <div className="bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 text-white rounded-3xl p-8 border border-indigo-900/50 shadow-2xl space-y-8">
          <div className="max-w-3xl mx-auto text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Mô Phỏng Phòng Khảo Thí Trực Tiếp 1:1
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Giả Lập Phòng Thi Speaking Với Giám Khảo Khảo Thí AI
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed max-w-2xl mx-auto">
              Trải nghiệm phỏng vấn đầy đủ 3 Parts theo tiêu chuẩn khảo thí quốc tế. Giám khảo AI tương tác
              bằng giọng nói tự nhiên, tự động phân tích 4 tiêu chí chấm điểm và nâng cấp câu trả lời lên Band 8.5+.
            </p>
          </div>

          {/* Examiner Selection */}
          <div className="max-w-2xl mx-auto space-y-3">
            <label className="text-xs uppercase tracking-wider font-bold text-indigo-300 block text-center">
              Chọn Giám Khảo Khảo Thí Đồng Hành:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {EXAMINER_PROFILES.map((examiner, idx) => {
                const isSelected = selectedExaminerIndex === idx;
                return (
                  <button
                    key={examiner.id}
                    onClick={() => setSelectedExaminerIndex(idx)}
                    className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden flex items-start gap-4 ${
                      isSelected
                        ? 'border-indigo-400 bg-indigo-900/50 shadow-lg ring-2 ring-indigo-400/40'
                        : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 text-slate-400'
                    }`}
                  >
                    <div className="w-14 h-14 rounded-2xl bg-indigo-800/60 border border-indigo-400/30 flex items-center justify-center text-3xl shrink-0">
                      {examiner.avatar}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-base">{examiner.name}</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/20">
                          {examiner.accent}
                        </span>
                      </div>
                      <p className="text-xs text-indigo-200/80 font-medium">{examiner.role}</p>
                      <p className="text-[11px] text-slate-400 leading-snug mt-1">{examiner.style}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Exam Roadmap Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto pt-4 border-t border-slate-800/80">
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Part 1 (4-5 phút)</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-300 font-bold">3-4 câu</span>
              </div>
              <h5 className="font-bold text-sm text-white">Hỏi đáp & Phản xạ đời sống</h5>
              <p className="text-xs text-slate-400 leading-relaxed">
                Các câu hỏi warm-up tự nhiên về bản thân, sở thích, thói quen và kỹ năng xã hội thường nhật.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Part 2 (3-4 phút)</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-900/60 text-amber-300 font-bold">Cue Card</span>
              </div>
              <h5 className="font-bold text-sm text-white">1m Chuẩn bị & 2m Độc thoại</h5>
              <p className="text-xs text-slate-400 leading-relaxed">
                Nhận Cue Card ngẫu nhiên, tích hợp giấy nháp dàn ý 1 phút và đồng hồ bấm giờ nói 2 phút chuẩn IDP/BC.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Part 3 (4-5 phút)</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-rose-900/60 text-rose-300 font-bold">Thảo luận sâu</span>
              </div>
              <h5 className="font-bold text-sm text-white">Tư duy phản biện & Vĩ mô</h5>
              <p className="text-xs text-slate-400 leading-relaxed">
                Thảo luận các chủ đề trừu tượng mở rộng từ Part 2, đánh giá khả năng lập luận học thuật và từ vựng C1/C2.
              </p>
            </div>
          </div>

          {/* Action CTA */}
          <div className="text-center pt-2">
            <button
              onClick={handleStartExam}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white font-black text-base shadow-xl hover:shadow-indigo-500/25 transition-all flex items-center gap-3 mx-auto"
            >
              <Mic className="w-5 h-5 text-amber-300 animate-pulse" />
              <span>BẮT ĐẦU BUỔI THI SPEAKING 1:1 NGAY</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <p className="text-xs text-slate-400 mt-2">
              Vui lòng cấp quyền Microphone trên trình duyệt để kích hoạt tính năng nhận diện giọng nói tự động.
            </p>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 2. STAGE: ACTIVE INTERVIEW (PART 1 & PART 3)         */}
      {/* ==================================================== */}
      {(testStage === 'part1' || testStage === 'part3') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Examiner Room Stage (Left 7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Visual Examiner Pod */}
            <div className="bg-gradient-to-b from-slate-900 to-indigo-950 text-white p-6 sm:p-8 rounded-3xl border border-indigo-800/40 shadow-xl space-y-6 relative overflow-hidden">
              {/* Part Indicator Pill */}
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                  {testStage === 'part1' ? 'Part 1: Warm-up & Phản xạ' : 'Part 3: Thảo luận học thuật mở rộng'}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  Câu hỏi {currentTurnIndex + 1} / 3
                </span>
              </div>

              {/* Examiner Avatar & Dynamic Waveform */}
              <div className="flex flex-col items-center justify-center py-4 space-y-4">
                <div className="relative">
                  <div
                    className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 flex items-center justify-center text-5xl transition-all duration-300 ${
                      isExaminerSpeaking
                        ? 'border-indigo-400 bg-indigo-800 shadow-[0_0_30px_rgba(99,102,241,0.5)] scale-105'
                        : 'border-slate-700 bg-slate-800'
                    }`}
                  >
                    {currentExaminer.avatar}
                  </div>
                  {isExaminerSpeaking && (
                    <span className="absolute -bottom-2 px-2.5 py-0.5 rounded-full bg-indigo-500 text-[10px] font-black uppercase text-white shadow-sm animate-bounce">
                      Speaking...
                    </span>
                  )}
                </div>

                {/* Animated Waveform Visualization */}
                <div className="flex items-center justify-center gap-1.5 h-8">
                  {[40, 70, 90, 60, 100, 45, 80, 55, 95, 65, 30].map((h, i) => (
                    <div
                      key={i}
                      style={{
                        height: isExaminerSpeaking || isRecording ? `${h}%` : '20%',
                        transition: 'height 0.2s ease-in-out'
                      }}
                      className={`w-1 rounded-full ${
                        isExaminerSpeaking
                          ? 'bg-indigo-400'
                          : isRecording
                          ? 'bg-rose-400'
                          : 'bg-slate-700'
                      }`}
                    />
                  ))}
                </div>

                <div className="text-center">
                  <h3 className="font-black text-lg text-white">{currentExaminer.name}</h3>
                  <p className="text-xs text-indigo-300">{currentExaminer.role} ({currentExaminer.accent})</p>
                </div>
              </div>

              {/* Examiner Subtitle Box */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-700/60 text-slate-200 text-sm leading-relaxed space-y-2">
                {currentExaminerReply && (
                  <p className="text-xs text-indigo-300 italic font-medium">"{currentExaminerReply}"</p>
                )}
                <div className="flex items-start gap-2">
                  <Volume2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                  <p className="font-bold text-white text-base leading-snug">{currentQuestion}</p>
                </div>
              </div>

              {/* Replay Question CTA */}
              <div className="flex justify-end">
                <button
                  onClick={() => speakText(`${currentExaminerReply} ${currentQuestion}`)}
                  className="text-xs text-indigo-300 hover:text-white flex items-center gap-1.5 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Nghe lại câu hỏi</span>
                </button>
              </div>
            </div>

            {/* Candidate Response Workspace */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      isRecording ? 'bg-rose-500 animate-ping' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    {isRecording ? 'Đang ghi âm câu trả lời...' : 'Sẵn sàng ghi âm câu trả lời'}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Thời gian nói: {turnSecondsElapsed}s</span>
                </div>
              </div>

              {/* Realtime Live Speech Box */}
              <div className="relative">
                <textarea
                  value={candidateTranscript + (interimText ? ` ${interimText}` : '')}
                  onChange={(e) => setCandidateTranscript(e.target.value)}
                  placeholder="Bấm nút Microphone bên dưới và bắt đầu nói bằng tiếng Anh, hoặc có thể gõ trực tiếp câu trả lời của bạn vào đây..."
                  rows={4}
                  className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 leading-relaxed custom-scrollbar"
                />
                {interimText && (
                  <span className="absolute right-3 bottom-3 text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300">
                    Live recognition...
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  onClick={toggleRecording}
                  className={`px-5 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm ${
                    isRecording
                      ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {isRecording ? (
                    <>
                      <Square className="w-4 h-4" />
                      <span>DỪNG GHI ÂM (Microphone Đang Bật)</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      <span>BẬT MICRO & BẮT ĐẦU TRẢ LỜI</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleNextTurn}
                  disabled={isCallingAi}
                  className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-sm ml-auto"
                >
                  {isCallingAi ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Giám khảo đang lắng nghe...</span>
                    </>
                  ) : (
                    <>
                      <span>HOÀN THÀNH CÂU NÓI & TIẾP TỤC</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right 5 Cols: Interview Log & Strategy Guidance */}
          <div className="lg:col-span-5 space-y-6">
            {/* Realtime Strategy Guidance Card */}
            <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 p-5 rounded-3xl space-y-3">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h4 className="font-bold text-xs uppercase tracking-wider">
                  Mẹo Giám Khảo Khuyên Dùng Cho {testStage === 'part1' ? 'Part 1' : 'Part 3'}
                </h4>
              </div>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed">
                {testStage === 'part1' ? (
                  <>
                    <li className="flex items-start gap-1.5">
                      <span className="text-indigo-500 font-bold">•</span>
                      <span><strong>Kỹ thuật A.R.E:</strong> Trả lời trực tiếp (Answer) + Nêu lý do (Reason) + Ví dụ thực tế (Example).</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-indigo-500 font-bold">•</span>
                      <span><strong>Độ dài lý tưởng:</strong> 2 - 4 câu (15 - 25 giây), không trả lời chỉ một từ "Yes/No".</span>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-start gap-1.5">
                      <span className="text-indigo-500 font-bold">•</span>
                      <span><strong>Nâng tầm vĩ mô:</strong> Tránh chỉ dùng kinh nghiệm cá nhân ("I think"), hãy dùng "From a societal standpoint", "Many experts argue that...".</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-indigo-500 font-bold">•</span>
                      <span><strong>Cấu trúc đa chiều:</strong> Trình bày cả hai mặt tích cực và hạn chế trước khi đưa ra nhận định.</span>
                    </li>
                  </>
                )}
              </ul>
            </div>

            {/* Conversation History Timeline */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 max-h-[420px] overflow-y-auto custom-scrollbar">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Biên Bản Phỏng Vấn (Live Transcript)
              </h4>

              {turns.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Chưa có câu hỏi nào được lưu. Bắt đầu trả lời để đồng bộ.</p>
              ) : (
                <div className="space-y-4">
                  {turns.map((t, idx) => (
                    <div key={t.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                        <span>Câu #{idx + 1} ({t.part.toUpperCase()})</span>
                        <span className="text-slate-400">{t.durationSeconds}s</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 font-medium">Q: {t.question}</p>
                      <p className="text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60 italic">
                        "{t.candidateTranscript}"
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 3. STAGE: PART 2 CUE CARD PREP & PRESENTATION       */}
      {/* ==================================================== */}
      {(testStage === 'part2_prep' || testStage === 'part2_speak') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Cue Card Display (Left 6 Cols) */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-3xl p-6 sm:p-8 space-y-5 shadow-lg bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-bold uppercase tracking-wider">
                  IELTS Speaking Part 2: Candidate Task Card
                </span>
                <span className="text-xs text-amber-600 dark:text-amber-400 font-bold">
                  {testStage === 'part2_prep' ? 'GIAI ĐOẠN CHUẨN BỊ' : 'GIAI ĐOẠN TRÌNH BÀY'}
                </span>
              </div>

              <h2 className="text-xl font-black text-slate-900 dark:text-white leading-snug">
                {selectedCueCard.prompt}
              </h2>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-amber-200 dark:border-amber-900/40 space-y-2">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  You should say:
                </p>
                <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-2 list-disc list-inside leading-relaxed">
                  {selectedCueCard.bulletPoints.map((bp, i) => (
                    <li key={i} className="font-medium">{bp}</li>
                  ))}
                </ul>
              </div>

              {/* Timer Pill */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900 text-white">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400 animate-spin" />
                  <span className="text-xs uppercase font-bold text-slate-300">
                    {testStage === 'part2_prep' ? '1 Phút Chuẩn Bị Còn Lại:' : '2 Phút Trình Bày Còn Lại:'}
                  </span>
                </div>
                <span className="text-2xl font-black text-amber-300">
                  {formatTime(testStage === 'part2_prep' ? prepTimeLeft : part2SpeakTimeLeft)}
                </span>
              </div>

              {testStage === 'part2_prep' && (
                <button
                  onClick={handleSkipPrep}
                  className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2"
                >
                  <span>Bỏ qua thời gian chuẩn bị & Bắt đầu nói ngay</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Scratchpad Notepad & Speaking Control (Right 6 Cols) */}
          <div className="lg:col-span-6 space-y-6">
            {/* Scratchpad */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    Giấy Nháp Ghi Từ Khóa (Scratchpad)
                  </h4>
                </div>
                <span className="text-[11px] text-slate-400">Ghi từ khóa C1/C2 & cấu trúc</span>
              </div>

              <textarea
                value={part2Notes}
                onChange={(e) => setPart2Notes(e.target.value)}
                placeholder="- Introduction: Botanical park in downtown&#10;- Features: lush foliage, tranquil ambiance&#10;- Impact: mental rejuvenation, social cohesion"
                rows={5}
                className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 leading-relaxed custom-scrollbar"
              />
            </div>

            {/* Speaking Recorder for Part 2 */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      isRecording ? 'bg-rose-500 animate-ping' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    {testStage === 'part2_speak' ? 'Bản Ghi Âm Part 2' : 'Sẵn sàng ghi âm khi hết 1 phút chuẩn bị'}
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-500">Đã nói: {turnSecondsElapsed}s</span>
              </div>

              <textarea
                value={candidateTranscript + (interimText ? ` ${interimText}` : '')}
                onChange={(e) => setCandidateTranscript(e.target.value)}
                disabled={testStage === 'part2_prep'}
                placeholder={
                  testStage === 'part2_prep'
                    ? 'Bạn đang trong 1 phút chuẩn bị. Hãy ghi chú vào giấy nháp phía trên...'
                    : 'Bấm Microphone và trình bày bài nói Part 2 liên tục trong 1-2 phút...'
                }
                rows={4}
                className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 leading-relaxed custom-scrollbar disabled:opacity-50"
              />

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  onClick={toggleRecording}
                  disabled={testStage === 'part2_prep'}
                  className={`px-5 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm disabled:opacity-50 ${
                    isRecording
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                  <span>{isRecording ? 'DỪNG NÓI' : 'BẬT MIC ĐỂ NÓI PART 2'}</span>
                </button>

                <button
                  onClick={handleNextTurn}
                  disabled={testStage === 'part2_prep' || isCallingAi}
                  className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-sm"
                >
                  {isCallingAi ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>KẾT THÚC PART 2 & SANG PART 3</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 4. STAGE: EVALUATING STATE                           */}
      {/* ==================================================== */}
      {testStage === 'evaluating' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-6 shadow-xl max-w-2xl mx-auto">
          <div className="w-20 h-20 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border-2 border-indigo-500/40 flex items-center justify-center text-4xl mx-auto animate-pulse">
            👨‍🏫
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              Giám Khảo Khảo Thí Đang Chấm Điểm 4 Tiêu Chí
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              Hệ thống đang đối chiếu dữ liệu nói của bạn với thang điểm Cambridge Band Descriptors, phân tích
              tốc độ WPM, filler words và sinh bản nâng cấp Band 8.5+...
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Đang tạo báo cáo năng lực chi tiết...</span>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 5. STAGE: COMPREHENSIVE SCORE REPORT                 */}
      {/* ==================================================== */}
      {testStage === 'score_report' && (
        <div className="space-y-6 animate-fadeIn">
          {evaluationError && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs sm:text-sm flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Lỗi chấm điểm Audio Speaking</p>
                <p className="mt-0.5 text-rose-700 dark:text-rose-300">{evaluationError}</p>
              </div>
            </div>
          )}

          {/* Header Band Score Card */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-indigo-800/40 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2.5 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <span className="text-xs uppercase tracking-wider font-bold text-indigo-300">
                  Báo Cáo Khảo Thí Audio IELTS Speaking 1:1 • Dr. Jonathan Vance
                </span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-300/30">
                  gemini-3.1-pro
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                Đánh Giá Năng Lực Toàn Diện 3 Parts (Native Audio)
              </h1>
              <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                {liveAudioReport?.examinerSummaryVi ||
                  evaluationResult?.examinerOverallSummaryVi ||
                  'Phân tích audio hiện không khả dụng.'}
              </p>

              {/* Disclaimer Vi directly adjacent to Band Score */}
              <div className="pt-2">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-semibold">
                  <ShieldCheck className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>
                    {liveAudioReport?.disclaimerVi ||
                      'Đây là điểm AI ước tính để tham khảo, không phải kết quả thi chính thức.'}
                  </span>
                </div>
              </div>
            </div>

            {/* Big Overall Band Score Stamp */}
            <div className="flex items-center gap-6 bg-slate-900/80 p-5 rounded-2xl border border-indigo-700/40 shrink-0">
              <div className="text-center">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Overall Band
                </span>
                <span className="text-5xl font-black text-amber-300 tracking-tight">
                  {liveAudioReport?.overallSpeakingBand?.toFixed(1) ?? 'unavailable'}
                </span>
              </div>
              <div className="h-12 w-px bg-slate-700" />
              <div className="text-left space-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <Flame className="w-4 h-4" /> +75 XP Đạt Được
                </div>
                <div className="text-slate-400">
                  Thời lượng: <strong>{formatTime(totalSessionSeconds)}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Official Criteria Score Cards (Live Audio Evaluated) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Fluency & Coherence */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Fluency & Coherence
                  </span>
                  <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                    Band{' '}
                    {liveAudioReport?.fluencyAndCoherence?.band?.toFixed(1) ?? 'unavailable'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {liveAudioReport?.fluencyAndCoherence?.feedbackVi ||
                    evaluationResult?.criteriaScores?.fluencyCoherence?.feedback}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                <div>
                  ⚡ Raw WPM: <strong>{liveAudioReport?.telemetry?.rawWpm ?? 'unavailable'}</strong>
                </div>
                <div>
                  ⚠️ Từ đệm: <strong>{liveAudioReport?.telemetry?.fillerCount ?? 'unavailable'} lần</strong>
                </div>
              </div>
            </div>

            {/* 2. Lexical Resource */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Lexical Resource
                  </span>
                  <span className="text-lg font-black text-sky-600 dark:text-sky-400">
                    Band{' '}
                    {liveAudioReport?.lexicalResource?.band?.toFixed(1) ?? 'unavailable'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {liveAudioReport?.lexicalResource?.feedbackVi ||
                    evaluationResult?.criteriaScores?.lexicalResource?.feedback}
                </p>
              </div>

              {liveAudioReport?.lexicalResource?.idiomaticPhrasesUsed &&
                liveAudioReport.lexicalResource.idiomaticPhrasesUsed.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase block mb-1">
                      Cụm Idiomatic đã dùng:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {liveAudioReport.lexicalResource.idiomaticPhrasesUsed.map((phrase, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 text-[10px] font-bold"
                        >
                          {phrase}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
            </div>

            {/* 3. Grammatical Range & Accuracy */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Grammar Range & Acc.
                  </span>
                  <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                    Band{' '}
                    {liveAudioReport?.grammaticalRange?.band?.toFixed(1) ?? 'unavailable'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {liveAudioReport?.grammaticalRange?.feedbackVi ||
                    evaluationResult?.criteriaScores?.grammaticalRangeAccuracy?.feedback}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-600 dark:text-slate-400">
                💎 Cấu trúc phức: <strong>{liveAudioReport?.grammaticalRange?.complexStructuresUsed ?? 'unavailable'} lần</strong>
              </div>
            </div>

            {/* 4. Pronunciation (Audio-Evaluated) */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Pronunciation (Audio Track)
                  </span>
                  <span className="text-lg font-black text-rose-600 dark:text-rose-400">
                    Band{' '}
                    {liveAudioReport?.pronunciation?.band?.toFixed(1) ?? 'unavailable'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {liveAudioReport?.pronunciation?.feedbackVi ||
                    evaluationResult?.criteriaScores?.pronunciation?.feedback}
                </p>
              </div>

              {liveAudioReport?.pronunciation?.intonationIssues &&
                liveAudioReport.pronunciation.intonationIssues.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase block mb-1">
                      Điểm ngữ điệu cần lưu ý:
                    </span>
                    <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5">
                      {liveAudioReport.pronunciation.intonationIssues.map((issue, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-rose-500">•</span> {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          </div>

          {liveAudioReport?.telemetry && (
            <div className="p-5 rounded-3xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="font-bold text-sm text-indigo-950 dark:text-indigo-100">Voice Analytics coaching</h3>
                <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-300">
                  {liveAudioReport.telemetry.acousticStatus === 'measured' ? 'Silero VAD measured' : 'Acoustic metrics unavailable'}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                {[
                  ['Raw WPM', liveAudioReport.telemetry.rawWpm],
                  ['Articulation rate', liveAudioReport.telemetry.articulationRate],
                  ['Filler / 100 words', liveAudioReport.telemetry.fillerRatePer100Words],
                  ['Average pause', liveAudioReport.telemetry.averagePauseDuration == null ? null : `${liveAudioReport.telemetry.averagePauseDuration}s`],
                  ['Long pauses', liveAudioReport.telemetry.longPauses],
                  ['Speech ratio', liveAudioReport.telemetry.speechRatio == null ? null : `${Math.round(liveAudioReport.telemetry.speechRatio * 100)}%`],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-xl bg-white/80 dark:bg-slate-900/70 border border-indigo-100 dark:border-indigo-900 p-2.5">
                    <span className="block text-[10px] text-slate-500 dark:text-slate-400">{label}</span>
                    <strong className="text-slate-900 dark:text-slate-100">{value ?? 'unavailable'}</strong>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-slate-600 dark:text-slate-400">
                Đây là chỉ số coaching theo dữ liệu audio, không phải ngưỡng band IELTS chính thức.
              </p>
            </div>
          )}

          {/* DETECTED ERRORS TAXONOMY */}
          {liveAudioReport?.detectedErrors && liveAudioReport.detectedErrors.length > 0 && (
            <div className="p-5 rounded-3xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-900 dark:text-rose-200">
                  <BookmarkPlus className="w-5 h-5 text-rose-600" />
                  <h4 className="font-bold text-sm uppercase tracking-wider">
                    Lỗi Sai Phát Hiện Trong Buổi Nói ({liveAudioReport.detectedErrors.length} điểm cần sửa)
                  </h4>
                </div>
                <span className="text-xs text-slate-500">Đồng bộ vào Sổ tay Lỗi sai</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {liveAudioReport.detectedErrors.map((err, idx) => {
                  const isSynced = syncedMistakes[idx];
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200/80 dark:border-rose-900/40 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-mono font-bold text-[10px]">
                          {err.errorCategory}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleSyncMistake(
                              {
                                errorText: err.errorSubstring,
                                correctedText: 'Xem bản sửa gợi ý của Giám khảo',
                                explanation: err.explanationVi,
                                errorType: err.errorCategory,
                              },
                              idx
                            )
                          }
                          disabled={isSynced}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                            isSynced
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          }`}
                        >
                          {isSynced ? '✓ Đã Lưu' : '+ Lưu Sổ Tay'}
                        </button>
                      </div>
                      <p className="font-mono text-slate-900 dark:text-slate-100 font-bold">
                        "{err.errorSubstring}"
                      </p>
                      <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                        {err.explanationVi}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bottom Action CTAs */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => {
                setTestStage('welcome');
                setLiveAudioReport(null);
                setEvaluationResult(null);
                setTurns([]);
              }}
              className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>THI LẠI VỚI ĐỀ MỚI & GIÁM KHẢO DR. JONATHAN VANCE</span>
            </button>

            <button
              onClick={() =>
                openAITutorWithPrompt(
                  `Tôi vừa hoàn thành buổi thi Speaking 1:1 Giám khảo Dr. Jonathan Vance với điểm Overall Band ${
                    liveAudioReport?.overallSpeakingBand ?? evaluationResult?.overallBand ?? 'unavailable'
                  }. Hãy đóng vai Chuyên gia Luyện thi IELTS và phân tích chuyên sâu các điểm ngữ điệu Pronunciation và Fluency cho tôi.`
                )
              }
              className="px-6 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-2 transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Thảo luận chiến lược phát âm với AI Tutor</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
