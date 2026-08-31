import React, { useState, useEffect } from 'react';
import {
  Headphones,
  Volume2,
  VolumeX,
  Play,
  Square,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  HelpCircle,
  MapPin,
  FileText,
  Zap,
} from 'lucide-react';
import { ListeningQuestionType, ListeningPracticeExercise, TrapCategory } from '../../types';
import { generateListeningPracticeApi, speakExaminerText } from '../../services/practiceService';
import { useApp } from '../../context/AppContext';

const LISTENING_TYPES: Array<{
  type: ListeningQuestionType;
  title: string;
  desc: string;
  badge: string;
}> = [
  {
    type: 'form_note_table_completion',
    title: 'Form / Note / Table Completion',
    desc: 'Nghe thông tin cá nhân, đăng ký dịch vụ hoặc tóm tắt bảng biểu với giới hạn từ.',
    badge: 'Section 1 & 4',
  },
  {
    type: 'multiple_choice',
    title: 'Multiple Choice',
    desc: 'Lựa chọn phương án chính xác A, B, C trong cuộc thảo luận hoặc bài giảng.',
    badge: 'Bẫy Distractor',
  },
  {
    type: 'map_plan_diagram_labelling',
    title: 'Map / Plan / Diagram Labelling',
    desc: 'Xác định các phòng, tòa nhà, thiết bị trên sơ đồ theo chỉ dẫn phương hướng.',
    badge: 'Section 2 Bản đồ',
  },
  {
    type: 'matching',
    title: 'Matching Information',
    desc: 'Nối các tiêu chí, ý kiến hoặc kế hoạch với danh sách đặc điểm tương ứng.',
    badge: 'Section 3 Thảo luận',
  },
];

const INITIAL_LISTENING_EXERCISE: ListeningPracticeExercise = {
  id: 'listen_init_map_1',
  type: 'map_plan_diagram_labelling',
  title: 'Westwood University Environmental Campus Tour',
  topic: 'Campus Facilities & Orientation',
  difficulty: 'Band 7.0-8.0',
  section: 'Section 2 (Monologue/Map)',
  targetTimeMinutes: 8,
  instructionsVi:
    'Nghe người hướng dẫn giới thiệu khuôn viên trường và chọn chữ cái (A-E) tương ứng với từng địa điểm.',
  audioTranscript: `Tour Guide: Good afternoon everyone and welcome to Westwood University. Let's look at the campus plan. 
We are currently standing right at the South Main Entrance. 
Directly ahead of us in the middle of the courtyard is the Central Fountain. 
Now, if you take the pathway to the left of the fountain and walk northwest, you will see a large glass dome—that is the Botanical Conservatory (A). 
On the opposite side, immediately to the right of the central fountain towards the east, is the Student Advisory Hub (B). 
If you walk past the fountain straight north towards the far end of the campus, you will find the Advanced Science Complex (C) on your left hand side, while the Renewable Energy Laboratory (D) sits just opposite it on the right. 
Finally, tucked in the northeast corner behind the energy lab is the Postgraduate Library (E).`,
  mapDiagramData: {
    diagramType: 'campus_map',
    title: 'Westwood Campus Layout',
    locationsToLabel: [
      { letter: 'A', xPercent: 22, yPercent: 42, name: 'Botanical Conservatory' },
      { letter: 'B', xPercent: 78, yPercent: 48, name: 'Student Advisory Hub' },
      { letter: 'C', xPercent: 25, yPercent: 18, name: 'Advanced Science Complex' },
      { letter: 'D', xPercent: 75, yPercent: 20, name: 'Renewable Energy Laboratory' },
      { letter: 'E', xPercent: 88, yPercent: 10, name: 'Postgraduate Library' },
    ],
    fixedLandmarks: [
      { xPercent: 50, yPercent: 90, label: '📍 South Main Entrance (You are here)' },
      { xPercent: 50, yPercent: 50, label: '⛲ Central Fountain' },
    ],
  },
  questions: [
    {
      id: 'lq_1',
      questionNumber: 1,
      prompt: 'Botanical Conservatory: ________',
      correctAnswer: 'A',
      explanationVi:
        'Hướng dẫn viên nói: "pathway to the left of the fountain and walk northwest... large glass dome—that is the Botanical Conservatory" => Vị trí A.',
      spellingOrGrammarTrap: 'Chú ý hướng Tây Bắc (northwest) so với đài phun nước trung tâm.',
    },
    {
      id: 'lq_2',
      questionNumber: 2,
      prompt: 'Student Advisory Hub: ________',
      correctAnswer: 'B',
      explanationVi:
        'Hướng dẫn viên chỉ: "immediately to the right of the central fountain towards the east" => Vị trí B.',
      spellingOrGrammarTrap: 'Phía Đông (east) và nằm bên phải đài phun nước.',
    },
    {
      id: 'lq_3',
      questionNumber: 3,
      prompt: 'Renewable Energy Laboratory: ________',
      correctAnswer: 'D',
      explanationVi:
        'Hướng dẫn viên nêu: "straight north towards the far end... Renewable Energy Laboratory sits on the right opposite the Science Complex" => Vị trí D.',
      spellingOrGrammarTrap: 'Vị trí D nằm đối diện khu Science Complex ở góc Đông Bắc.',
    },
  ],
};

export const ListeningQuestionModule: React.FC = () => {
  const { addMistake, awardXP, openAITutorWithPrompt } = useApp();

  const [selectedType, setSelectedType] = useState<ListeningQuestionType>(
    'map_plan_diagram_labelling'
  );
  const [exercise, setExercise] = useState<ListeningPracticeExercise>(INITIAL_LISTENING_EXERCISE);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [selectedTopic, setSelectedTopic] = useState<string>('Campus Facilities & Student Services');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('Band 7.0-8.0');

  // Audio Playback State
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [showTranscript, setShowTranscript] = useState<boolean>(false);
  const [stopAudioFn, setStopAudioFn] = useState<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (stopAudioFn) stopAudioFn();
    };
  }, [stopAudioFn]);

  const handlePlayAudio = () => {
    if (isPlayingAudio) {
      if (stopAudioFn) stopAudioFn();
      setIsPlayingAudio(false);
    } else {
      setIsPlayingAudio(true);
      const cancel = speakExaminerText(exercise.audioTranscript, 0.95, () => {
        setIsPlayingAudio(false);
      });
      setStopAudioFn(() => cancel);
    }
  };

  const handleGenerateNew = async (typeToGen: ListeningQuestionType = selectedType) => {
    if (stopAudioFn) stopAudioFn();
    setIsPlayingAudio(false);
    setIsGenerating(true);
    setIsSubmitted(false);
    setUserAnswers({});
    setShowTranscript(false);

    try {
      const newEx = await generateListeningPracticeApi(
        typeToGen,
        selectedTopic,
        selectedDifficulty
      );
      setExercise(newEx);
      setSelectedType(newEx.type);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectType = (t: ListeningQuestionType) => {
    setSelectedType(t);
    handleGenerateNew(t);
  };

  const handleAnswerChange = (qId: string, value: string) => {
    if (isSubmitted) return;
    setUserAnswers((prev) => ({ ...prev, [qId]: value }));
  };

  const handleSubmit = () => {
    if (isSubmitted) return;
    setIsSubmitted(true);
    setShowTranscript(true); // Reveal transcript for review

    let correctCount = 0;
    exercise.questions.forEach((q) => {
      const userAns = (userAnswers[q.id] || '').trim().toLowerCase();
      const correct = q.correctAnswer.trim().toLowerCase();
      const accepted = (q.acceptableAnswers || []).map((a) => a.trim().toLowerCase());
      const isCorrect = userAns === correct || accepted.includes(userAns);

      if (isCorrect) {
        correctCount++;
      } else {
        const isSpellingOrPlural =
          exercise.type === 'form_completion' ||
          exercise.type === 'note_table_flowchart' ||
          (q.spellingOrGrammarTrap && q.spellingOrGrammarTrap.toLowerCase().includes('plural'));
        const trapCat: TrapCategory = isSpellingOrPlural
          ? 'trap_listening_plural_spelling'
          : 'trap_distractor_numbers';

        // Tự động ghi lỗi vào MistakeEntry với phân loại bẫy
        addMistake({
          id: `mistake_listen_${Date.now()}_${q.id}`,
          errorText: `[${exercise.title} - Q${q.questionNumber}] "${q.questionText}"`,
          correctedText: `Đáp án chuẩn: "${q.correctAnswer}" (Bạn đã ghi: "${userAnswers[q.id] || 'Bỏ trống'}")`,
          explanation: `${q.explanationVi} ${q.spellingOrGrammarTrap ? `(Bẫy: ${q.spellingOrGrammarTrap})` : ''}`,
          trapCategory: trapCat,
          trapCategoryTitleVi: isSpellingOrPlural
            ? 'Bẫy Số Ít / Số Nhiều & Chính Tả (Listening Gap-Fill)'
            : 'Bẫy Đổi Ý & Từ Đánh Lạc Hướng (Listening Distractors)',
          trapBreakdownVi: isSpellingOrPlural
            ? 'Người nói phát âm đuôi -s/es hoặc nối âm (linking sounds), người học dễ bỏ quên số nhiều hoặc gõ sai chính tả.'
            : 'Người nói đưa ra phương án ban đầu nhưng dùng từ nối chuyển ý (Actually, Wait, However, No sorry) để sửa thành đáp án thật.',
          examinerTipVi:
            'Luôn kiểm tra ngữ pháp câu (mạo từ a/an/số từ) để dự đoán dạng danh từ số ít hay số nhiều trước khi audio chạy.',
          questionContext: `Listening Section: "${exercise.title}" (Q${q.questionNumber})`,
          userAttemptAnswer: userAnswers[q.id] || 'Chưa trả lời',
          options: q.options,
          drillType: q.options && q.options.length > 0 ? 'multiple_choice' : 'gap_fill',
          errorType: isSpellingOrPlural ? 'grammar' : 'task_response',
          skill: 'listening',
          originModule: 'ielts_practice_listening',
          srsStage: 0,
          intervalDays: 1,
          easeFactor: 2.4,
          repetitions: 0,
          nextReviewDate: new Date().toISOString(),
          reviewCount: 0,
          mastered: false,
          createdAt: new Date().toISOString(),
          tags: ['Listening Trap', exercise.type, ...(q.relatedVocab || [])],
          suggestedGrammarTopicId: q.relatedGrammarTopicId,
          difficulty: 'Band 6.5-7.5',
        });
      }
    });

    if (correctCount === exercise.questions.length) {
      awardXP(60, 'Hoàn thành xuất sắc bài tập IELTS Listening!');
    } else {
      awardXP(30, 'Luyện tập IELTS Listening');
    }
  };

  return (
    <div id="ielts_listening_module" className="space-y-6">
      {/* 1. Selector bar: All 4 IELTS Listening Question Types */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Headphones className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Luyện từng dạng câu hỏi IELTS Listening
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Đề thi và giọng đọc mô phỏng Cambridge Audio sinh bởi AI không giới hạn.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select data-ux-flow="practice.skills"
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="text-xs px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Campus Facilities & Student Services">🏫 Campus & Facilities</option>
              <option value="Environmental Fieldwork & Ecology">🌱 Fieldwork & Ecology</option>
              <option value="Urban Transport & Travel Inquiries">🚌 Travel & Transport</option>
              <option value="Academic Lecture: Psychology & Linguistics">
                🎓 Academic Lecture
              </option>
            </select>

            <select data-ux-flow="practice.skills"
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="text-xs px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Band 5.5-6.5">Band 5.5 - 6.5 (Standard)</option>
              <option value="Band 7.0-8.0">Band 7.0 - 8.0 (Academic)</option>
              <option value="Band 8.5+">Band 8.5+ (Mastery)</option>
            </select>

            <button data-ux-flow="practice.skills"
              onClick={() => handleGenerateNew(selectedType)}
              disabled={isGenerating}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
            >
              {isGenerating ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {isGenerating ? 'Đang sinh đề...' : 'Tạo bài AI mới'}
            </button>
          </div>
        </div>

        {/* Listening Question Type Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {LISTENING_TYPES.map((t) => {
            const isSelected = selectedType === t.type;
            return (
              <button data-ux-flow="practice.skills"
                key={t.type}
                onClick={() => handleSelectType(t.type)}
                className={`text-left p-3.5 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 font-semibold shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold truncate">{t.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                    {t.desc}
                  </p>
                </div>
                <span className="mt-2 inline-block px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300 w-fit">
                  {t.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Audio Player Header Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 border border-indigo-800/40 shadow-md">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center flex-shrink-0">
              <Headphones className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/30 text-indigo-300">
                  {exercise.section}
                </span>
                <span className="text-xs text-slate-400">{exercise.difficulty}</span>
              </div>
              <h3 className="text-base font-bold text-white mt-0.5">{exercise.title}</h3>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button data-ux-flow="practice.skills"
              onClick={handlePlayAudio}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all ${
                isPlayingAudio
                  ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {isPlayingAudio ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPlayingAudio ? 'Dừng phát Audio' : 'Phát Audio Cambridge'}
            </button>

            <button data-ux-flow="practice.skills"
              onClick={() => setShowTranscript(!showTranscript)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-all"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              {showTranscript ? 'Ẩn Transcript' : 'Xem Transcript'}
            </button>
          </div>
        </div>

        {/* Revealed Transcript Box */}
        {showTranscript && (
          <div className="mt-4 pt-4 border-t border-slate-800 text-xs leading-relaxed text-slate-300 bg-slate-950/60 p-4 rounded-xl">
            <div className="font-bold text-indigo-400 mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Toàn văn Audio Transcript:
            </div>
            <p className="whitespace-pre-line font-mono text-[11px] text-slate-300">
              {exercise.audioTranscript}
            </p>
          </div>
        )}
      </div>

      {/* 3. Main Workspace: Map Canvas or Question Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Visual Map Schematic (for Map labelling) or Form Layout */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-indigo-600" />
              {exercise.type === 'map_plan_diagram_labelling'
                ? 'Sơ đồ Bản đồ IELTS (Campus / Map Layout)'
                : 'Ngữ cảnh bài thi Listening'}
            </h4>
            {exercise.wordLimit && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300">
                {exercise.wordLimit}
              </span>
            )}
          </div>

          {/* Interactive Map Canvas if Map Labelling */}
          {exercise.type === 'map_plan_diagram_labelling' && exercise.mapDiagramData ? (
            <div className="relative w-full aspect-[16/10] bg-slate-900 rounded-2xl border-2 border-indigo-900/60 overflow-hidden p-4 select-none">
              {/* Grid Background Lines */}
              <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]" />

              {/* Compass Rose */}
              <div className="absolute top-3 right-3 bg-slate-800/80 border border-slate-700 text-[10px] text-slate-300 px-2 py-1 rounded font-mono font-bold flex flex-col items-center">
                <span>▲ N</span>
                <span>W ◄ ► E</span>
                <span>▼ S</span>
              </div>

              {/* Title overlay */}
              <div className="absolute top-3 left-4 text-xs font-bold text-indigo-300 bg-slate-800/80 px-2.5 py-1 rounded border border-indigo-800/60">
                {exercise.mapDiagramData.title}
              </div>

              {/* Fixed Landmarks */}
              {exercise.mapDiagramData.fixedLandmarks.map((lm, idx) => (
                <div
                  key={idx}
                  style={{ left: `${lm.xPercent}%`, top: `${lm.yPercent}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-800/90 text-amber-300 text-[11px] font-semibold rounded-lg border border-amber-500/40 shadow-sm whitespace-nowrap"
                >
                  {lm.label}
                </div>
              ))}

              {/* Locations to Label (A, B, C, D, E pins) */}
              {exercise.mapDiagramData.locationsToLabel.map((loc) => (
                <div
                  key={loc.letter}
                  style={{ left: `${loc.xPercent}%`, top: `${loc.yPercent}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center justify-center shadow-lg border-2 border-white ring-4 ring-indigo-500/30 transition-transform group-hover:scale-110">
                    {loc.letter}
                  </div>
                  {isSubmitted && (
                    <span className="mt-1 px-1.5 py-0.5 rounded bg-slate-900/90 text-[10px] text-emerald-300 font-bold border border-emerald-500/40 whitespace-nowrap">
                      {loc.name}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 space-y-2">
              <p>
                <strong>Hướng dẫn:</strong> {exercise.instructionsVi}
              </p>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg text-amber-900 dark:text-amber-200 text-xs">
                💡 <strong>Mẹo Listening:</strong> Chú ý các từ đánh vần ký tự, các số điện
                thoại/ngày tháng, và người nói tự sửa lời bằng các cụm như <em>"Actually,..."</em>{' '}
                hoặc <em>"No, wait..."</em>.
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Questions List */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              Câu hỏi Listening ({exercise.questions.length} câu)
            </h3>
            {isSubmitted && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                Đã nộp bài
              </span>
            )}
          </div>

          <div className="space-y-4">
            {exercise.questions.map((q) => {
              const userVal = userAnswers[q.id] || '';
              const correct = q.correctAnswer.trim().toLowerCase();
              const accepted = (q.acceptableAnswers || []).map((a) => a.trim().toLowerCase());
              const isCorrect =
                isSubmitted &&
                (userVal.trim().toLowerCase() === correct ||
                  accepted.includes(userVal.trim().toLowerCase()));

              return (
                <div
                  key={q.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isSubmitted
                      ? isCorrect
                        ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20'
                        : 'border-rose-300 bg-rose-50/50 dark:border-rose-800 dark:bg-rose-950/20'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-bold text-xs text-indigo-600 dark:text-indigo-400">
                      Câu {q.questionNumber}:
                    </span>
                    {isSubmitted && (
                      <span className="flex items-center gap-1 text-xs font-semibold">
                        {isCorrect ? (
                          <span className="text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Đúng
                          </span>
                        ) : (
                          <span className="text-rose-600 flex items-center gap-1">
                            <XCircle className="w-4 h-4" /> Sai
                          </span>
                        )}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-800 dark:text-slate-200 font-medium mb-3">
                    {q.prompt}
                  </p>

                  {/* Input form */}
                  {exercise.type === 'map_plan_diagram_labelling' ? (
                    <div className="flex items-center gap-2">
                      {['A', 'B', 'C', 'D', 'E'].map((letter) => (
                        <button data-ux-flow="practice.skills"
                          key={letter}
                          disabled={isSubmitted}
                          onClick={() => handleAnswerChange(q.id, letter)}
                          className={`w-9 h-8 rounded-lg text-xs font-bold border transition-all ${
                            userVal === letter
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {letter}
                        </button>
                      ))}
                    </div>
                  ) : q.options && q.options.length > 0 ? (
                    <div className="space-y-1.5">
                      {q.options.map((opt, idx) => (
                        <button data-ux-flow="practice.skills"
                          key={idx}
                          disabled={isSubmitted}
                          onClick={() => handleAnswerChange(q.id, opt)}
                          className={`w-full text-left p-2 rounded-lg text-xs border transition-all ${
                            userVal === opt
                              ? 'bg-indigo-600 text-white border-indigo-600 font-semibold'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div>
                      <input data-ux-flow="practice.skills"
                        type="text"
                        disabled={isSubmitted}
                        placeholder="Nhập từ bạn nghe được..."
                        value={userVal}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}

                  {/* Feedback explanation after submit */}
                  {isSubmitted && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                      <div className="text-slate-700 dark:text-slate-300">
                        <strong className="text-emerald-600 dark:text-emerald-400">
                          Đáp án đúng:
                        </strong>{' '}
                        <span className="font-bold">{q.correctAnswer}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400">
                        <strong>Phân tích:</strong> {q.explanationVi}
                      </p>
                      {q.spellingOrGrammarTrap && (
                        <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <span>
                            <strong>Bẫy chính tả / ngữ âm:</strong> {q.spellingOrGrammarTrap}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="pt-2">
            {!isSubmitted ? (
              <button data-ux-flow="practice.skills"
                onClick={handleSubmit}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Nộp bài & Xem phân tích chi tiết
              </button>
            ) : (
              <div className="flex gap-2">
                <button data-ux-flow="practice.skills"
                  onClick={() => handleGenerateNew(selectedType)}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" /> Sinh đề AI tiếp theo
                </button>
                <button data-ux-flow="practice.skills"
                  onClick={() => {
                    setIsSubmitted(false);
                    setUserAnswers({});
                  }}
                  className="px-4 py-2.5 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Làm lại
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
