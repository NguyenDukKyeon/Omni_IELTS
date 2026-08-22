import React, { useState } from 'react';
import {
  X,
  Compass,
  CheckCircle2,
  Volume2,
  FileText,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Award,
  Layers,
  Mic,
  Target,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { playTextToSpeech } from '../services/aiTutor';
import { XP_REWARDS } from '../services/gamification';

export const OnboardingModal: React.FC = () => {
  const { isOnboardingOpen, setIsOnboardingOpen, profile, updateProfile, awardXP, addMockResult } = useApp();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form states
  const [targetBand, setTargetBand] = useState<number>(profile.targetBand || 7.5);
  const [examMonths, setExamMonths] = useState<number>(3);
  const [dailyMinutes, setDailyMinutes] = useState<number>(45);

  // Diagnostic Test answers
  const [listeningAnswer1, setListeningAnswer1] = useState<string>('');
  const [listeningAnswer2, setListeningAnswer2] = useState<string>('');
  const [readingAnswer1, setReadingAnswer1] = useState<string>('');
  const [readingAnswer2, setReadingAnswer2] = useState<string>('');

  // Diagnostic outcome
  const [diagnosticResult, setDiagnosticResult] = useState<{
    estimatedBand: number;
    listening: number;
    reading: number;
    writing: number;
    speaking: number;
  } | null>(null);

  if (!isOnboardingOpen) return null;

  const listeningAudioScript =
    'Welcome to the City Sustainability Center. Please note that all visitor passes must be validated at the main reception before accessing the rooftop solar garden.';

  const handleFinishDiagnostic = () => {
    // Evaluate scores
    let correctCount = 0;
    if (listeningAnswer1 === 'reception') correctCount += 1;
    if (listeningAnswer2 === 'solar') correctCount += 1;
    if (readingAnswer1 === 'mitigate') correctCount += 1;
    if (readingAnswer2 === 'equilibrium') correctCount += 1;

    let baseBand = 5.0;
    if (correctCount === 4) baseBand = 6.5;
    else if (correctCount === 3) baseBand = 6.0;
    else if (correctCount === 2) baseBand = 5.5;
    else baseBand = 5.0;

    const res = {
      estimatedBand: baseBand,
      listening: Math.min(9.0, baseBand + 0.5),
      reading: Math.min(9.0, baseBand + 0.5),
      writing: Math.max(4.5, baseBand - 0.5),
      speaking: baseBand,
    };

    setDiagnosticResult(res);

    // Update Profile
    updateProfile({
      currentBand: res.estimatedBand,
      targetBand: targetBand,
      dailyStudyMinutes: dailyMinutes,
      completedDiagnostic: true,
      skillBands: {
        listening: res.listening,
        reading: res.reading,
        writing: res.writing,
        speaking: res.speaking,
      },
    });

    // Add Mock Result history
    addMockResult({
      id: `diag_${Date.now()}`,
      testTitle: 'Bài Test Chẩn Đoán Đầu Vào Nhanh (Diagnostic)',
      overallBand: res.estimatedBand,
      listeningBand: res.listening,
      readingBand: res.reading,
      writingBand: res.writing,
      speakingBand: res.speaking,
      completedDate: new Date().toISOString(),
      timeSpentMinutes: 5,
      breakdown: [
        `Nghe & Đọc: Trả lời đúng ${correctCount}/4 câu hỏi chẩn đoán.`,
        `Đề xuất lộ trình: Tập trung nâng cao kỹ năng Viết & Nói qua 7 module Omni IELTS.`,
      ],
    });

    awardXP(XP_REWARDS.DIAGNOSTIC_COMPLETED, 'Hoàn thành bài test chẩn đoán đầu vào!');
    setStep(4);
  };

  return (
    <div
      id="onboarding-diagnostic-modal"
      className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-6">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-indigo-600 to-sky-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Compass className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Chẩn Đoán Nhanh & Thiết Lập Lộ Trình</h2>
              <p className="text-xs text-indigo-100">
                Ước lượng Band điểm xuất phát & cá nhân hóa 7 module học tập
              </p>
            </div>
          </div>
          <button
            id="close-onboarding-modal-btn"
            onClick={() => setIsOnboardingOpen(false)}
            className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="px-6 pt-4 pb-2 flex items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-300">
          <span className={step >= 1 ? 'text-indigo-600 dark:text-indigo-400' : ''}>1. Mục tiêu</span>
          <span>➔</span>
          <span className={step >= 2 ? 'text-indigo-600 dark:text-indigo-400' : ''}>2. Nghe nhanh</span>
          <span>➔</span>
          <span className={step >= 3 ? 'text-indigo-600 dark:text-indigo-400' : ''}>3. Đọc nhanh</span>
          <span>➔</span>
          <span className={step >= 4 ? 'text-emerald-600 dark:text-emerald-400' : ''}>4. Lộ trình AI</span>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {/* STEP 1: Goal Setting */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  Thiết lập mục tiêu IELTS của bạn
                </h3>
                <p className="text-xs text-stone-700 dark:text-stone-300 mt-0.5">
                  AI sẽ dựa vào mục tiêu này để chọn lọc từ vựng C1 và tiêu chuẩn chấm điểm phù hợp.
                </p>
              </div>

              {/* Target Band Picker */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2">
                  Band Điểm Mục Tiêu (Overall Target)
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[5.5, 6.0, 6.5, 7.0, 7.5, 8.0].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setTargetBand(b)}
                      className={`py-3 rounded-xl text-center font-bold text-sm transition-all border ${
                        targetBand === b
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/30'
                          : 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-indigo-300'
                      }`}
                    >
                      Band {b.toFixed(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time to Exam */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                    Thời gian dự kiến thi:
                  </label>
                  <select
                    value={examMonths}
                    onChange={(e) => setExamMonths(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={1}>Trong 1 tháng tới (Gấp rút)</option>
                    <option value={3}>Trong 3 tháng tới (Tiêu chuẩn)</option>
                    <option value={6}>Trong 6 tháng tới (Dài hạn)</option>
                    <option value={12}>Trong 1 năm tới (Xây nền tảng)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                    Thời gian luyện tập mỗi ngày:
                  </label>
                  <select
                    value={dailyMinutes}
                    onChange={(e) => setDailyMinutes(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={30}>30 phút / ngày</option>
                    <option value={45}>45 phút / ngày (Khuyên dùng)</option>
                    <option value={60}>60 phút / ngày</option>
                    <option value={90}>90+ phút / ngày (Cường độ cao)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20"
                >
                  <span>Bắt đầu Test Nghe (1 Phút)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Quick Listening */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <span>Phần 1: Khảo Sát Khả Năng Nghe (Listening)</span>
                  </h3>
                  <p className="text-xs text-stone-700 dark:text-stone-300">
                    Bấm nút nghe bên dưới và điền từ khóa hoặc chọn đáp án chính xác.
                  </p>
                </div>
                <button
                  onClick={() => playTextToSpeech(listeningAudioScript)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 text-xs font-bold"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Phát Audio mẫu</span>
                </button>
              </div>

              {/* Audio Box */}
              <div className="p-3.5 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200 dark:border-stone-700 text-xs text-stone-700 dark:text-stone-300 italic">
                "{listeningAudioScript}"
              </div>

              {/* Question 1 */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-stone-800 dark:text-stone-200">
                  Câu 1: Where must visitor passes be validated?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'security', label: 'At the security gate' },
                    { id: 'reception', label: 'At the main reception' },
                    { id: 'garden', label: 'In the solar garden' },
                    { id: 'parking', label: 'At the car parking lot' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setListeningAnswer1(opt.id)}
                      className={`p-2.5 rounded-xl text-left text-xs font-medium border transition-all ${
                        listeningAnswer1 === opt.id
                          ? 'bg-indigo-600 text-white border-indigo-600 font-semibold'
                          : 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question 2 */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-stone-800 dark:text-stone-200">
                  Câu 2: What type of garden is located on the rooftop?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'botanical', label: 'Botanical garden' },
                    { id: 'solar', label: 'Solar garden' },
                    { id: 'vegetable', label: 'Organic vegetable garden' },
                    { id: 'rain', label: 'Rainwater garden' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setListeningAnswer2(opt.id)}
                      className={`p-2.5 rounded-xl text-left text-xs font-medium border transition-all ${
                        listeningAnswer2 === opt.id
                          ? 'bg-indigo-600 text-white border-indigo-600 font-semibold'
                          : 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-stone-700 dark:text-stone-300"
                >
                  Quay lại
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!listeningAnswer1 || !listeningAnswer2}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs"
                >
                  <span>Tiếp tục sang Test Đọc</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Quick Reading */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  Phần 2: Khảo Sát Khả Năng Đọc & Từ Vựng Học Thuật
                </h3>
                <p className="text-xs text-stone-700 dark:text-stone-300">
                  Đọc đoạn văn ngắn sau và trả lời câu hỏi để AI đo độ rộng từ vựng C1.
                </p>
              </div>

              <div className="p-3.5 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200 dark:border-stone-700 text-xs text-stone-800 dark:text-stone-200 leading-relaxed font-serif">
                "Implementing stringent urban emissions limits serves to <strong>mitigate</strong> air pollution
                and preserves the delicate ecological <strong>equilibrium</strong> of metropolis surroundings."
              </div>

              {/* Question 1 */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-stone-800 dark:text-stone-200">
                  Câu 1: In the passage, what does the word "mitigate" most nearly mean?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'exacerbate', label: 'To worsen or escalate' },
                    { id: 'mitigate', label: 'To reduce or lessen the severity' },
                    { id: 'ignore', label: 'To disregard completely' },
                    { id: 'monitor', label: 'To observe without action' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setReadingAnswer1(opt.id)}
                      className={`p-2.5 rounded-xl text-left text-xs font-medium border transition-all ${
                        readingAnswer1 === opt.id
                          ? 'bg-indigo-600 text-white border-indigo-600 font-semibold'
                          : 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question 2 */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-stone-800 dark:text-stone-200">
                  Câu 2: Which word in the passage refers to a state of balance?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'stringent', label: 'Stringent' },
                    { id: 'equilibrium', label: 'Equilibrium' },
                    { id: 'metropolis', label: 'Metropolis' },
                    { id: 'emissions', label: 'Emissions' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setReadingAnswer2(opt.id)}
                      className={`p-2.5 rounded-xl text-left text-xs font-medium border transition-all ${
                        readingAnswer2 === opt.id
                          ? 'bg-indigo-600 text-white border-indigo-600 font-semibold'
                          : 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-stone-700 dark:text-stone-300"
                >
                  Quay lại
                </button>
                <button
                  onClick={handleFinishDiagnostic}
                  disabled={!readingAnswer1 || !readingAnswer2}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-emerald-600/20"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Hoàn Tất & Xem Lộ Trình AI</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: AI Diagnostic Result & 7-Module Roadmap */}
          {step === 4 && diagnosticResult && (
            <div className="space-y-5">
              <div className="text-center p-4 bg-gradient-to-b from-indigo-50 to-white dark:from-indigo-950/40 dark:to-stone-900 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/80 px-2.5 py-0.5 rounded-full">
                  Kết quả chẩn đoán ban đầu
                </span>
                <div className="mt-3 flex items-center justify-center gap-4">
                  <div>
                    <div className="text-xs text-stone-700 dark:text-stone-300 font-medium">Band Hiện Tại (Ước Tính)</div>
                    <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                      Band {diagnosticResult.estimatedBand.toFixed(1)}
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-stone-400" />
                  <div>
                    <div className="text-xs text-stone-700 dark:text-stone-300 font-medium">Band Mục Tiêu</div>
                    <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                      Band {targetBand.toFixed(1)}
                    </div>
                  </div>
                </div>

                {/* Sub-bands */}
                <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-stone-200/60 dark:border-stone-700/60 text-xs">
                  <div className="p-1.5 bg-white dark:bg-stone-800 rounded-lg">
                    <span className="text-stone-700 dark:text-stone-300 block">Listening</span>
                    <strong className="text-stone-900 dark:text-stone-100">{diagnosticResult.listening.toFixed(1)}</strong>
                  </div>
                  <div className="p-1.5 bg-white dark:bg-stone-800 rounded-lg">
                    <span className="text-stone-700 dark:text-stone-300 block">Reading</span>
                    <strong className="text-stone-900 dark:text-stone-100">{diagnosticResult.reading.toFixed(1)}</strong>
                  </div>
                  <div className="p-1.5 bg-white dark:bg-stone-800 rounded-lg">
                    <span className="text-stone-700 dark:text-stone-300 block">Writing</span>
                    <strong className="text-amber-600 dark:text-amber-400">{diagnosticResult.writing.toFixed(1)}</strong>
                  </div>
                  <div className="p-1.5 bg-white dark:bg-stone-800 rounded-lg">
                    <span className="text-stone-700 dark:text-stone-300 block">Speaking</span>
                    <strong className="text-stone-900 dark:text-stone-100">{diagnosticResult.speaking.toFixed(1)}</strong>
                  </div>
                </div>
              </div>

              {/* 7-Module Personalized Roadmap recommendation */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Lộ Trình Cá Nhân Hóa 7 Module Được AI Đề Xuất</span>
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2 p-2.5 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200/70 dark:border-stone-700/70">
                    <Layers className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-stone-900 dark:text-stone-100">Module 2 (Từ Vựng) & Module 3 (Ngữ Pháp):</strong> Nâng cấp từ vựng C1 theo phương pháp lặp lại ngắt quãng (SRS) và cấu trúc câu ghép để kéo band Writing lên {targetBand}.
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2.5 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200/70 dark:border-stone-700/70">
                    <Mic className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-stone-900 dark:text-stone-100">Module 4 (Media Shadowing):</strong> Luyện phát âm và nối âm qua các bản tin học thuật 15 phút mỗi ngày.
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2.5 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200/70 dark:border-stone-700/70">
                    <Target className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-stone-900 dark:text-stone-100">Sổ Tay Lỗi Sai Hợp Nhất:</strong> Tự động gom lỗi từ bài thi để ôn tập theo thuật toán SuperMemo SM-2.
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  id="start-omni-ielts-journey-btn"
                  onClick={() => setIsOnboardingOpen(false)}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs tracking-wide shadow-lg shadow-indigo-600/30"
                >
                  Bắt Đầu Hành Trình Luyện Thi Ngay
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
