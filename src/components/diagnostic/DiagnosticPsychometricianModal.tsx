import React, { useState, useRef } from 'react';
import {
  X,
  Compass,
  CheckCircle2,
  AlertCircle,
  Mic,
  Square,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Calendar,
  Layers,
  Upload,
  Clock,
  ShieldAlert,
  Target,
  FileText,
  Volume2,
  CheckSquare,
  Square as EmptySquare,
} from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from 'recharts';
import {
  DiagnosticMultiSkillInput,
  DiagnosticPsychometricianReport,
  DiagnosticSkillType,
  EightAxisKey,
} from '../../types';
import { diagnoseMultiSkillAssessmentApi } from '../../services/aiTutor';
import { useApp } from '../../context/AppContext';
import { XP_REWARDS } from '../../services/gamification';

interface DiagnosticPsychometricianModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AXIS_LABELS: Record<EightAxisKey, { name: string; short: string; desc: string }> = {
  taskResponse: {
    name: 'Task Response',
    short: 'TR',
    desc: 'Khả năng trả lời trọng tâm, phát triển ý tưởng đầy đủ và nhất quán.',
  },
  coherence: {
    name: 'Coherence & Cohesion',
    short: 'CC',
    desc: 'Tính liên kết đoạn, sử dụng từ nối tự nhiên và bố cục mạch lạc.',
  },
  lexicalResource: {
    name: 'Lexical Resource',
    short: 'LR',
    desc: 'Vốn từ học thuật C1/C2, độ chuẩn xác của collocations và ít lặp từ.',
  },
  grammaticalAccuracy: {
    name: 'Grammatical Accuracy',
    short: 'GRA',
    desc: 'Độ đa dạng cấu trúc phức, kiểm soát lỗi chia động từ và mạo từ.',
  },
  pronunciationAndFluency: {
    name: 'Pronunciation & Fluency',
    short: 'PF',
    desc: 'Tốc độ nhịp nói (WPM), phát âm chuẩn IPA, ngữ điệu và trọng âm câu.',
  },
  readingDistractorFilter: {
    name: 'Reading Distractor Filter',
    short: 'RDF',
    desc: 'Khả năng nhận diện bẫy thông tin và phân biệt False vs Not Given.',
  },
  listeningComprehension: {
    name: 'Listening Comprehension',
    short: 'LC',
    desc: 'Khả năng bám sát mạch nói nhanh, nhận diện nối âm và bẫy phát âm.',
  },
  criticalHedging: {
    name: 'Critical Hedging',
    short: 'CH',
    desc: 'Kỹ thuật dùng ngôn từ dè dặt học thuật, tránh tuyệt đối hóa phiến diện.',
  },
};

export const DiagnosticPsychometricianModal: React.FC<DiagnosticPsychometricianModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { profile, updateProfile, awardXP, addMockResult } = useApp();

  // Active step: 'input' | 'submitting' | 'result'
  const [stage, setStage] = useState<'input' | 'submitting' | 'result'>('input');
  const [selectedSkills, setSelectedSkills] = useState<DiagnosticSkillType[]>([
    'writing',
    'speaking',
    'reading',
    'listening',
  ]);

  // Skill Inputs
  const [writingSample, setWritingSample] = useState<string>(
    'In contemporary society, some scholars advocate that unpaid community service should become a mandatory component of the secondary education curriculum. From my perspective, whilst compulsory volunteering instills civic responsibility and enhances empathetic awareness among adolescents, enforcement may induce resentment; thus, an incentive-driven approach remains substantially more efficacious.'
  );

  // Speaking Audio Recording state (Strict: only audio accepted)
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioMime, setAudioMime] = useState<string>('audio/webm');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Reading Diagnostic Answers
  const [readingQ1, setReadingQ1] = useState<string>('FALSE');
  const [readingQ2, setReadingQ2] = useState<string>('B');

  // Listening Diagnostic Answers
  const [listeningQ1, setListeningQ1] = useState<string>('reception');
  const [listeningQ2, setListeningQ2] = useState<string>('A');

  // Target Band
  const [targetBand, setTargetBand] = useState<number>(profile.targetBand || 7.5);

  // Result & Error States
  const [report, setReport] = useState<DiagnosticPsychometricianReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedQuests, setCompletedQuests] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const toggleSkill = (skill: DiagnosticSkillType) => {
    if (selectedSkills.includes(skill)) {
      if (selectedSkills.length === 1) return; // Must keep at least 1
      setSelectedSkills(selectedSkills.filter((s) => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  // Start Audio Recording
  const startRecording = async () => {
    try {
      setErrorMessage(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);
        setAudioMime('audio/webm');

        // Convert to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          setAudioBase64(reader.result as string);
        };

        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone access error:', err);
      setErrorMessage(
        'Không thể truy cập microphone. Vui lòng cấp quyền ghi âm trên trình duyệt hoặc tải lên file âm thanh (.mp3, .wav, .webm).'
      );
    }
  };

  // Stop Audio Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      setErrorMessage('Vui lòng chọn tệp định dạng âm thanh (.mp3, .wav, .m4a, .webm).');
      return;
    }

    setErrorMessage(null);
    const url = URL.createObjectURL(file);
    setRecordedAudioUrl(url);
    setAudioMime(file.type);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      setAudioBase64(reader.result as string);
    };
  };

  // Submit Diagnostic Request
  const handleSubmit = async () => {
    setErrorMessage(null);

    // Validation
    if (selectedSkills.includes('speaking') && !audioBase64) {
      setErrorMessage(
        'Kỹ năng Speaking bắt buộc phải có file ghi âm giọng nói thực tế. Vui lòng bấm "Ghi âm" hoặc tải lên tệp âm thanh.'
      );
      return;
    }

    if (selectedSkills.includes('writing') && (!writingSample || writingSample.trim().length < 20)) {
      setErrorMessage('Vui lòng nhập bài viết Writing mẫu (tối thiểu 20 từ).');
      return;
    }

    const payload: DiagnosticMultiSkillInput = {
      submittedSkills: selectedSkills,
      writingSample: selectedSkills.includes('writing') ? writingSample : null,
      speakingAudioRef: selectedSkills.includes('speaking') ? audioBase64 : null,
      readingAnswers: selectedSkills.includes('reading')
        ? [
            {
              questionId: 'rq_1',
              questionText: 'Is compulsory volunteering universally beneficial according to author?',
              userAnswer: readingQ1,
              correctAnswer: 'FALSE',
            },
            {
              questionId: 'rq_2',
              questionText: 'What is the primary distractor in paragraph 2 regarding fiscal gain?',
              userAnswer: readingQ2,
              correctAnswer: 'B',
            },
          ]
        : null,
      listeningAnswers: selectedSkills.includes('listening')
        ? [
            {
              questionId: 'lq_1',
              questionText: 'Visitor passes must be validated at main ________.',
              userAnswer: listeningQ1,
              correctAnswer: 'reception',
            },
            {
              questionId: 'lq_2',
              questionText: 'What dual effect do environmental policies achieve?',
              userAnswer: listeningQ2,
              correctAnswer: 'A',
            },
          ]
        : null,
      targetBand: Number(targetBand),
    };

    setStage('submitting');

    try {
      const result = await diagnoseMultiSkillAssessmentApi(payload);
      setReport(result);
      setStage('result');
    } catch (err: any) {
      console.error('Diagnostic error:', err);
      setErrorMessage(
        err.message ||
          'Không thể hoàn tất chẩn đoán với mô hình gemini-3.1-pro. Vui lòng kiểm tra lại kết nối và API Key.'
      );
      setStage('input');
    }
  };

  // Apply to profile
  const handleApplyToProfile = () => {
    if (!report) return;

    updateProfile({
      currentBand: report.overallEstimatedBand,
      targetBand: Number(targetBand),
      completedDiagnostic: true,
      skillBands: {
        listening: report.competencyRadar.listeningComprehension || profile.skillBands.listening || 6.0,
        reading: report.competencyRadar.readingDistractorFilter || profile.skillBands.reading || 6.0,
        writing: report.competencyRadar.taskResponse || profile.skillBands.writing || 6.0,
        speaking: report.competencyRadar.pronunciationAndFluency || profile.skillBands.speaking || 6.0,
      },
    });

    addMockResult({
      id: `psychometric_${Date.now()}`,
      testTitle: 'Chẩn Đoán Năng Lực 8 Trục (Chief Psychometrician)',
      overallBand: report.overallEstimatedBand,
      listeningBand: report.competencyRadar.listeningComprehension || 6.0,
      readingBand: report.competencyRadar.readingDistractorFilter || 6.0,
      writingBand: report.competencyRadar.taskResponse || 6.0,
      speakingBand: report.competencyRadar.pronunciationAndFluency || 6.0,
      completedDate: new Date().toISOString(),
      timeSpentMinutes: 10,
      breakdown: [
        `Dải tin cậy: ${report.confidenceInterval}`,
        `Dự phóng 60 ngày: Band ${report.projectedBandIn60Days}`,
        ...report.primaryBottlenecks.map((b) => `Điểm nghẽn: ${b}`),
      ],
    });

    awardXP(XP_REWARDS.DIAGNOSTIC_COMPLETED, 'Hoàn thành chẩn đoán chuyên sâu 8 trục năng lực!');
    onClose();
  };

  // Format chart data for Recharts
  const chartData = report
    ? (Object.keys(AXIS_LABELS) as EightAxisKey[]).map((key) => {
        const val = report.competencyRadar[key];
        const isInsufficient = report.insufficientDataAxes.includes(key) || val === null;
        return {
          axis: AXIS_LABELS[key].short,
          fullName: AXIS_LABELS[key].name,
          score: isInsufficient ? 0 : val,
          displayScore: isInsufficient ? 'N/A' : (val ?? 'N/A'),
          isInsufficient,
        };
      })
    : [];

  return (
    <div
      id="diagnostic-psychometrician-modal"
      className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden my-4 sm:my-8 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-indigo-900 via-indigo-800 to-sky-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              <Compass className="w-6 h-6 text-sky-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                  Chief IELTS Assessment Psychometrician
                </h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-sky-400/20 text-sky-200 border border-sky-300/30">
                  gemini-3.1-pro
                </span>
              </div>
              <p className="text-xs text-sky-100/90 mt-0.5">
                Chẩn đoán đa kỹ năng • Radar 8 trục năng lực chuyên sâu • Lộ trình bứt phá 30 ngày
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {/* ERROR NOTIFICATION (Strict error handling - no fake numbers) */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 flex items-start gap-3 text-rose-900 dark:text-rose-200 animate-fadeIn">
              <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm">
                <p className="font-bold">Không thể thực hiện chẩn đoán</p>
                <p className="mt-0.5 text-rose-700 dark:text-rose-300">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* STAGE 1: INPUT COLLECTION */}
          {stage === 'input' && (
            <div className="space-y-6">
              {/* Skill Selector Tabs */}
              <div className="bg-stone-50 dark:bg-stone-800/50 p-4 rounded-2xl border border-stone-200/80 dark:border-stone-700/80">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Chọn kỹ năng nộp bằng chứng chẩn đoán:</span>
                  </label>
                  <span className="text-[11px] text-stone-700 dark:text-stone-300">
                    Chỉ những trục có bằng chứng thực tế mới được chấm điểm
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(['writing', 'speaking', 'reading', 'listening'] as DiagnosticSkillType[]).map(
                    (skill) => {
                      const active = selectedSkills.includes(skill);
                      return (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => toggleSkill(skill)}
                          className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between ${
                            active
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                              : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:border-stone-300'
                          }`}
                        >
                          <span className="capitalize">{skill}</span>
                          {active ? (
                            <CheckCircle2 className="w-4 h-4 text-white" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-stone-300 dark:border-stone-600" />
                          )}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* TARGET BAND SELECTOR */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-800/60">
                <Target className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-sky-900 dark:text-sky-200">Band mục tiêu kỳ vọng:</p>
                  <p className="text-[11px] text-sky-700 dark:text-sky-300">
                    Dùng để Director tính toán khoảng cách năng lực và lộ trình 30 ngày.
                  </p>
                </div>
                <select
                  value={targetBand}
                  onChange={(e) => setTargetBand(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-stone-800 border border-sky-300 dark:border-sky-700 text-xs font-bold text-sky-900 dark:text-sky-100"
                >
                  {[6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0].map((b) => (
                    <option key={b} value={b}>
                      Band {b.toFixed(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* WRITING INPUT */}
              {selectedSkills.includes('writing') && (
                <div className="p-4 rounded-2xl bg-white dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Writing Sample (Task 2 / Đoạn văn học thuật)</span>
                    </h3>
                    <span className="text-[11px] text-stone-700 dark:text-stone-300">
                      {writingSample.trim().split(/\s+/).filter(Boolean).length} từ
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-700 dark:text-stone-300">
                    Đề bài mẫu: <em>"Should unpaid community service be compulsory for high school students?"</em>
                  </p>
                  <textarea
                    rows={4}
                    value={writingSample}
                    onChange={(e) => setWritingSample(e.target.value)}
                    placeholder="Nhập hoặc dán bài viết học thuật của bạn..."
                    className="w-full p-3 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:border-indigo-500 font-mono leading-relaxed"
                  />
                </div>
              )}

              {/* SPEAKING INPUT (STRICT REAL AUDIO ONLY) */}
              {selectedSkills.includes('speaking') && (
                <div className="p-4 rounded-2xl bg-white dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                      <Mic className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      <span>Speaking Audio (Bắt buộc tệp ghi âm giọng nói thật)</span>
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                      Chỉ nhận Audio
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong>Yêu cầu nghiêm ngặt:</strong> Để đánh giá chính xác trục{' '}
                      <em>Pronunciation & Fluency (PF)</em> và <em>Spoken Grammar</em>, hệ thống chỉ
                      tiếp nhận dữ liệu sóng âm thực tế, không chấp nhận gõ văn bản transcript.
                    </div>
                  </div>

                  <p className="text-[11px] text-stone-700 dark:text-stone-300">
                    Chủ đề: <em>"Describe a time when you used technology to solve an academic problem (1-2 phút)."</em>
                  </p>

                  <div className="flex flex-wrap items-center gap-3">
                    {!isRecording ? (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all"
                      >
                        <Mic className="w-4 h-4 animate-pulse" />
                        <span>Bắt đầu Ghi Âm Giọng Nói</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-bold shadow-md transition-all animate-bounce"
                      >
                        <Square className="w-4 h-4 text-rose-500 fill-rose-500" />
                        <span>Dừng Ghi Âm ({recordingSeconds}s)</span>
                      </button>
                    )}

                    <div className="text-xs text-stone-700 dark:text-stone-300">hoặc</div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-bold border border-stone-200 dark:border-stone-700"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Tải file Audio (.mp3, .wav)</span>
                    </button>
                  </div>

                  {/* Audio Preview */}
                  {recordedAudioUrl && (
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Đã nạp file âm thanh thành công ({audioMime})</span>
                      </div>
                      <audio src={recordedAudioUrl} controls className="h-8 max-w-[220px]" />
                    </div>
                  )}
                </div>
              )}

              {/* READING & LISTENING QUICK QUESTIONS */}
              {(selectedSkills.includes('reading') || selectedSkills.includes('listening')) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {selectedSkills.includes('reading') && (
                    <div className="p-4 rounded-2xl bg-white dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 space-y-3">
                      <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                        <Compass className="w-4 h-4 text-emerald-600" />
                        <span>Reading Distractor Diagnostic</span>
                      </h3>
                      <div className="text-[11px] text-stone-700 dark:text-stone-300 space-y-2">
                        <p>
                          <strong>Câu 1:</strong> "Proactive ecological investment guarantees zero fiscal
                          risk."
                        </p>
                        <div className="flex gap-2">
                          {['TRUE', 'FALSE', 'NOT GIVEN'].map((ans) => (
                            <button
                              key={ans}
                              type="button"
                              onClick={() => setReadingQ1(ans)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                                readingQ1 === ans
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700'
                              }`}
                            >
                              {ans}
                            </button>
                          ))}
                        </div>

                        <p className="pt-1">
                          <strong>Câu 2:</strong> Bẫy phổ biến trong bài đọc là gì?
                        </p>
                        <select
                          value={readingQ2}
                          onChange={(e) => setReadingQ2(e.target.value)}
                          className="w-full p-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs text-stone-800 dark:text-stone-200"
                        >
                          <option value="A">A. Quá nhiều từ đồng nghĩa hiển nhiên</option>
                          <option value="B">B. Từ ngữ mang tính tuyệt đối hóa (Over-generalization)</option>
                          <option value="C">C. Không có câu chủ đề</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {selectedSkills.includes('listening') && (
                    <div className="p-4 rounded-2xl bg-white dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 space-y-3">
                      <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-indigo-600" />
                        <span>Listening Comprehension Check</span>
                      </h3>
                      <div className="text-[11px] text-stone-700 dark:text-stone-300 space-y-2">
                        <p>
                          <strong>Câu 1:</strong> "All visitors must check in at the main [_________]."
                        </p>
                        <input
                          type="text"
                          value={listeningQ1}
                          onChange={(e) => setListeningQ1(e.target.value)}
                          placeholder="Điền từ nghe được..."
                          className="w-full px-3 py-1.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs text-stone-800 dark:text-stone-200"
                        />

                        <p className="pt-1">
                          <strong>Câu 2:</strong> Người nói khẳng định chính sách xanh có tác dụng gì?
                        </p>
                        <select
                          value={listeningQ2}
                          onChange={(e) => setListeningQ2(e.target.value)}
                          className="w-full p-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs text-stone-800 dark:text-stone-200"
                        >
                          <option value="A">A. Vừa giảm khí thải vừa kích thích kinh tế</option>
                          <option value="B">B. Làm tăng thuế doanh nghiệp</option>
                          <option value="C">C. Thay thế toàn bộ xe công cộng</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SUBMIT BUTTON */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white text-sm font-bold shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Tiến Hành Chẩn Đoán 8 Trục (gemini-3.1-pro)</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          )}

          {/* STAGE 2: SUBMITTING / ANALYZING STATE */}
          {stage === 'submitting' && (
            <div className="py-16 text-center space-y-5 animate-fadeIn">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 animate-spin" />
                <div className="absolute inset-2 rounded-full bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center">
                  <Compass className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                </div>
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  Chief IELTS Assessment Psychometrician đang phân tích...
                </h3>
                <p className="text-xs text-stone-700 dark:text-stone-300 mt-1 max-w-md mx-auto">
                  Đang khởi chạy mô hình <strong>gemini-3.1-pro</strong> để đối chiếu dữ liệu với tiêu
                  chuẩn Band Descriptors chính thức và tạo bản đồ năng lực 8 trục.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
                <Clock className="w-3.5 h-3.5 animate-spin" />
                <span>Kiểm định Psychometrics & Xây dựng Lộ trình 30 ngày</span>
              </div>
            </div>
          )}

          {/* STAGE 3: RESULT REPORT */}
          {stage === 'result' && report && (
            <div className="space-y-6 animate-fadeIn">
              {/* TOP SCORE CARD & ADJACENT DISCLAIMER (Constraint: disclaimerVi right next to band score) */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white shadow-xl border border-indigo-800/80">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  {/* Left: Band Score Numbers */}
                  <div className="md:col-span-6 flex items-center gap-5">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-sky-400 to-indigo-500 p-0.5 shadow-lg shadow-indigo-500/30 shrink-0">
                      <div className="w-full h-full rounded-2xl bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center">
                        <span className="text-[10px] uppercase tracking-wider font-extrabold text-sky-300">
                          Estimated
                        </span>
                        <span className="text-3xl font-black text-white leading-none mt-0.5">
                          {report.overallEstimatedBand.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-slate-300 font-semibold mt-1">
                          IELTS Band
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-300 font-bold">Dải tin cậy:</span>
                        <span className="px-2.5 py-0.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-400/30 text-xs font-bold">
                          {report.confidenceInterval}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-300 font-bold">Dự phóng 60 ngày:</span>
                        <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          <span>Band {report.projectedBandIn60Days.toFixed(1)}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: ADJACENT DISCLAIMER (Strict requirement) */}
                  <div className="md:col-span-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-400/30 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                        Khuyến nghị Psychometrician
                      </h4>
                      <p className="text-xs text-amber-100/90 mt-0.5 leading-relaxed font-medium">
                        {report.disclaimerVi}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* INSUFFICIENT DATA WARNING (If any) */}
              {report.insufficientDataAxes.length > 0 && (
                <div className="p-4 rounded-2xl bg-stone-100 dark:bg-stone-800/80 border border-stone-300 dark:border-stone-700 flex items-start gap-3 text-xs text-stone-700 dark:text-stone-300">
                  <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-stone-900 dark:text-stone-100">
                      Trục năng lực chưa đủ bằng chứng thực tế ({report.insufficientDataAxes.length}):
                    </strong>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {report.insufficientDataAxes.map((axis) => (
                        <span
                          key={axis}
                          className="px-2 py-0.5 rounded-md bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 font-mono text-[11px]"
                        >
                          {AXIS_LABELS[axis as EightAxisKey]?.name || axis} (null)
                        </span>
                      ))}
                    </div>
                    <p className="text-[11px] text-stone-700 dark:text-stone-300 mt-1">
                      * Nguyên tắc Psychometrics: Hệ thống tuyệt đối không ước tính điểm cho kỹ năng
                      chưa được nộp bằng chứng.
                    </p>
                  </div>
                </div>
              )}

              {/* 8-AXIS RADAR CHART & BREAKDOWN */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Radar Chart */}
                <div className="lg:col-span-6 bg-stone-50 dark:bg-stone-800/50 p-4 sm:p-5 rounded-3xl border border-stone-200 dark:border-stone-700 flex flex-col items-center">
                  <div className="flex items-center justify-between w-full mb-2">
                    <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-indigo-600" />
                      <span>Bản Đồ Năng Lực 8 Trục (8-Axis Radar)</span>
                    </h4>
                    <span className="text-[10px] text-stone-700 dark:text-stone-300">Thang điểm 0 - 9.0</span>
                  </div>

                  <div className="w-full h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
                        <PolarGrid stroke="#cbd5e1" strokeDasharray="3 3" />
                        <PolarAngleAxis
                          dataKey="axis"
                          tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                        />
                        <PolarRadiusAxis angle={30} domain={[0, 9]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <Radar
                          name="Competency Band"
                          dataKey="score"
                          stroke="#4f46e5"
                          fill="#6366f1"
                          fillOpacity={0.45}
                        />
                        <Tooltip
                          formatter={(value: any, name: any, item: any) => [
                            item.payload.isInsufficient ? 'Chưa đủ dữ liệu (null)' : `Band ${value}`,
                            item.payload.fullName,
                          ]}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 8 Axes Details List */}
                <div className="lg:col-span-6 space-y-2 max-h-80 overflow-y-auto pr-1">
                  {(Object.keys(AXIS_LABELS) as EightAxisKey[]).map((key) => {
                    const score = report.competencyRadar[key];
                    const isNull = report.insufficientDataAxes.includes(key) || score === null;
                    return (
                      <div
                        key={key}
                        className="p-2.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700/80 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-stone-900 dark:text-stone-100">
                              {AXIS_LABELS[key].name}
                            </span>
                            <span className="text-[10px] text-stone-700 dark:text-stone-300 font-mono">
                              ({AXIS_LABELS[key].short})
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-700 dark:text-stone-300 line-clamp-1">
                            {AXIS_LABELS[key].desc}
                          </p>
                        </div>
                        <div className="shrink-0 ml-3">
                          {isNull ? (
                            <span className="px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300 text-[10px] font-bold">
                              Chưa có dữ liệu
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-black text-xs">
                              {score?.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* PRIMARY BOTTLENECKS */}
              <div className="p-5 rounded-3xl bg-rose-50/70 dark:bg-rose-950/25 border border-rose-200 dark:border-rose-800/60 space-y-3">
                <h4 className="text-xs sm:text-sm font-bold text-rose-900 dark:text-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span>Điểm Nghẽn Năng Lực Cần Khai Thông (Primary Bottlenecks)</span>
                </h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {report.primaryBottlenecks.map((item, idx) => (
                    <li
                      key={idx}
                      className="p-3 rounded-xl bg-white dark:bg-stone-800 border border-rose-200/80 dark:border-rose-900/40 text-xs text-stone-800 dark:text-stone-200 flex items-start gap-2"
                    >
                      <span className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 30-DAY PERSONALIZED ROADMAP */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Lộ Trình Bứt Phá Cá Nhân Hóa 30 Ngày (4 Tuần)</span>
                  </h4>
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                    Mục tiêu: Band {report.projectedBandIn60Days.toFixed(1)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {report.personalized30DayRoadmap.map((wk) => (
                    <div
                      key={wk.week}
                      className="p-4 rounded-2xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-2.5 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                          Tuần {wk.week}
                        </span>
                        <span className="text-[11px] font-bold text-stone-600 dark:text-stone-400">
                          Focus 7 ngày
                        </span>
                      </div>
                      <p className="text-xs font-bold text-stone-900 dark:text-stone-100 leading-snug">
                        {wk.coreFocus}
                      </p>
                      <div className="pt-1 space-y-1.5">
                        <span className="text-[10px] font-extrabold uppercase text-stone-700 dark:text-stone-300 tracking-wider">
                          Daily Quests:
                        </span>
                        {wk.dailyQuests.map((quest, qIdx) => {
                          const qKey = `w${wk.week}_q${qIdx}`;
                          const isDone = !!completedQuests[qKey];
                          return (
                            <div
                              key={qIdx}
                              onClick={() =>
                                setCompletedQuests((prev) => ({ ...prev, [qKey]: !isDone }))
                              }
                              className={`p-2 rounded-lg text-xs cursor-pointer flex items-start gap-2 transition-all ${
                                isDone
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 line-through opacity-70'
                                  : 'bg-stone-50 dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-100'
                              }`}
                            >
                              {isDone ? (
                                <CheckSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              ) : (
                                <EmptySquare className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                              )}
                              <span className="leading-snug">{quest}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ACTION FOOTER */}
              <div className="pt-3 flex items-center justify-between gap-3 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setStage('input')}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-bold transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Chẩn Đoán Lại Với Bằng Chứng Khác</span>
                </button>

                <button
                  type="button"
                  onClick={handleApplyToProfile}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Lưu Hồ Sơ & Kích Hoạt Lộ Trình</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
