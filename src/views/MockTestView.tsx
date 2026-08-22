import React, { useState } from 'react';
import {
  GraduationCap,
  Clock,
  CheckCircle2,
  Play,
  Award,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MockResult } from '../types';
import { XP_REWARDS } from '../services/gamification';

export const MockTestView: React.FC = () => {
  const { mockResults, addMockResult, profile, updateProfile, awardXP } = useApp();

  const [activeTab, setActiveTab] = useState<'available' | 'history'>('available');
  const [isTestRunning, setIsTestRunning] = useState<boolean>(false);
  const [timeRemainingSeconds] = useState<number>(1800); // 30 mins for mini test

  // Mini Mock question answers
  const [q1, setQ1] = useState<string>('');
  const [q2, setQ2] = useState<string>('');
  const [q3, setQ3] = useState<string>('');

  const handleStartMiniTest = () => {
    setIsTestRunning(true);
  };

  const handleFinishMiniTest = () => {
    setIsTestRunning(false);

    let lScore = 7.0;
    let rScore = 7.5;
    let wScore = 6.5;
    let sScore = 7.0;

    if (q1 === 'b') lScore += 0.5;
    if (q2 === 'c') rScore += 0.5;
    if (q3 === 'a') wScore += 0.5;

    const overall = (lScore + rScore + wScore + sScore) / 4;
    const roundedOverall = Math.round(overall * 2) / 2;

    const result: MockResult = {
      id: `mock_${Date.now()}`,
      testTitle: 'Mini Mock Test (Listening + Reading Quick + Writing Task 2)',
      overallBand: roundedOverall,
      listeningBand: lScore,
      readingBand: rScore,
      writingBand: wScore,
      speakingBand: sScore,
      completedDate: new Date().toISOString(),
      timeSpentMinutes: 30,
      breakdown: [
        `Listening: Hoàn thành tốt Section 1 & 2. (Band ${lScore})`,
        `Reading: Xử lý dạng bài T/F/NG chính xác. (Band ${rScore})`,
        `Writing: Dàn ý mạch lạc, cần mở rộng từ vựng C1. (Band ${wScore})`,
      ],
    };

    addMockResult(result);

    // Update Profile current band if improved
    if (roundedOverall > profile.currentBand) {
      updateProfile({
        currentBand: roundedOverall,
        skillBands: {
          listening: lScore,
          reading: rScore,
          writing: wScore,
          speaking: sScore,
        },
      });
    }

    awardXP(XP_REWARDS.MOCK_TEST_COMPLETED, 'Hoàn thành bài thi thử IELTS Mini Mock Test!');
    setActiveTab('history');
  };

  return (
    <div id="mock-test-module" className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-stone-900 dark:text-stone-100 font-display flex items-center gap-2.5">
            <GraduationCap className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            <span>Thi Thử IELTS (Mock Tests & Diagnostics)</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 mt-1">
            Đánh giá chính xác tiến độ tăng Band qua các bài thi rút gọn (Mini Mock) hoặc bài thi chuẩn áp lực phòng thi thật.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="bg-stone-100 dark:bg-stone-800 p-1 rounded-xl flex items-center gap-1 border border-stone-200 dark:border-stone-700 shrink-0">
          <button
            onClick={() => setActiveTab('available')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'available'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-stone-700 dark:text-stone-300 hover:text-stone-900'
            }`}
          >
            Đề Thi Khả Dụng
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-stone-700 dark:text-stone-300 hover:text-stone-900'
            }`}
          >
            Lịch Sử Thi ({mockResults.length})
          </button>
        </div>
      </div>

      {/* ACTIVE RUNNING TEST WORKSPACE */}
      {isTestRunning ? (
        <div className="p-6 rounded-3xl bg-white dark:bg-stone-800 border-2 border-rose-500 shadow-xl space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-700 pb-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                Đang Thi Thử • Mini Mock Test 30 Phút
              </span>
              <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 mt-1">
                Phần 1: Khảo Sát Năng Lực Toàn Diện
              </h2>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 font-mono font-bold text-sm border border-rose-200 dark:border-rose-900">
              <Clock className="w-4 h-4" />
              <span>
                {Math.floor(timeRemainingSeconds / 60)}:
                {(timeRemainingSeconds % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {/* Mock Question 1 */}
            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 space-y-2">
              <label className="block text-xs font-bold text-stone-900 dark:text-stone-100">
                Câu 1 (Listening Section 2): According to the speaker, what is the primary prerequisite for grant approval?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'a', text: 'Submitting three physical references' },
                  { id: 'b', text: 'Demonstrating environmental feasibility metrics' },
                  { id: 'c', text: 'Holding a master degree in engineering' },
                  { id: 'd', text: 'Paying the statutory registration fee' },
                ].map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setQ1(o.id)}
                    className={`p-2.5 rounded-xl border text-left font-medium transition-all cursor-pointer ${
                      q1 === o.id
                        ? 'bg-rose-600 text-white border-rose-600 font-bold'
                        : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    {o.text}
                  </button>
                ))}
              </div>
            </div>

            {/* Mock Question 2 */}
            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 space-y-2">
              <label className="block text-xs font-bold text-stone-900 dark:text-stone-100">
                Câu 2 (Reading Academic Passage): What underlying premise supports the argument for renewable carbon taxation?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'a', text: 'It completely eliminates all industrial fossil consumption' },
                  { id: 'b', text: 'It generates short-term speculative market returns' },
                  { id: 'c', text: 'It internalizes negative environmental externalities' },
                  { id: 'd', text: 'It is mandated unanimously by all sovereign governments' },
                ].map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setQ2(o.id)}
                    className={`p-2.5 rounded-xl border text-left font-medium transition-all cursor-pointer ${
                      q2 === o.id
                        ? 'bg-rose-600 text-white border-rose-600 font-bold'
                        : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    {o.text}
                  </button>
                ))}
              </div>
            </div>

            {/* Mock Question 3 */}
            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 space-y-2">
              <label className="block text-xs font-bold text-stone-900 dark:text-stone-100">
                Câu 3 (Writing Cohesion): Which linking adverbial best conveys an unexpected concession in Task 2?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'a', text: 'Notwithstanding this empirical evidence...' },
                  { id: 'b', text: 'Moreover, furthermore...' },
                  { id: 'c', text: 'In direct addition to...' },
                  { id: 'd', text: 'Consequently and therefore...' },
                ].map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setQ3(o.id)}
                    className={`p-2.5 rounded-xl border text-left font-medium transition-all cursor-pointer ${
                      q3 === o.id
                        ? 'bg-rose-600 text-white border-rose-600 font-bold'
                        : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    {o.text}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-stone-200 dark:border-stone-700">
            <button
              onClick={() => setIsTestRunning(false)}
              className="text-xs text-stone-700 hover:text-stone-800 cursor-pointer"
            >
              Hủy bài thi
            </button>
            <button
              id="finish-mock-test-btn"
              onClick={handleFinishMiniTest}
              className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/30 cursor-pointer"
            >
              Nộp Bài & Tính Band Điểm Ngay
            </button>
          </div>
        </div>
      ) : null}

      {/* AVAILABLE MOCK TESTS */}
      {activeTab === 'available' && !isTestRunning && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Mini Mock Test */}
          <div className="p-6 rounded-3xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                  Khuyên Dùng Hàng Tuần
                </span>
                <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-stone-400" />
                  <span>30 Phút</span>
                </span>
              </div>

              <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                Mini Mock Test (Rút Gọn 4 Kỹ Năng)
              </h2>

              <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                Gồm 1 Section Listening, 1 Passage Reading học thuật và 1 câu hỏi nghị luận Writing. Giúp bạn cập nhật ước tính Band mà không mất quá nhiều thời gian.
              </p>

              <div className="space-y-1.5 text-xs text-stone-700 dark:text-stone-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Đo lường độ nhạy đề thi</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Trả điểm Overall & 4 kỹ năng tức thì</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100 dark:border-stone-700">
              <button
                id="start-mini-mock-test-btn"
                onClick={handleStartMiniTest}
                className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Bắt Đầu Làm Mini Mock (30 Phút)</span>
              </button>
            </div>
          </div>

          {/* Card 2: Full Academic Mock Test */}
          <div className="p-6 rounded-3xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  Chuẩn Phòng Thi Thật
                </span>
                <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-stone-400" />
                  <span>2 Giờ 45 Phút</span>
                </span>
              </div>

              <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                Full Academic Mock Test (Cambridge Standard)
              </h2>

              <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                Đầy đủ 4 phần thi liên tục: Listening (40 câu), Reading (40 câu), Writing Task 1 & 2 (60 phút) và Speaking 3 phần.
              </p>

              <div className="space-y-1.5 text-xs text-stone-700 dark:text-stone-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Rèn luyện thể lực và sự tập trung cao độ</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Báo cáo phân tích điểm mù chi tiết từ AI</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100 dark:border-stone-700">
              <button
                onClick={handleStartMiniTest}
                className="w-full py-3 rounded-xl bg-stone-900 dark:bg-stone-700 hover:bg-stone-800 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4" />
                <span>Bắt Đầu Thi Thử Full Đề</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOCK TEST HISTORY */}
      {activeTab === 'history' && (
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-4">
          <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
            Lịch Sử Các Bài Thi Thử ({mockResults.length})
          </h2>

          <div className="space-y-3">
            {mockResults.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-700/80 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                      {item.testTitle}
                    </h3>
                    <span className="text-[11px] text-stone-700 dark:text-stone-300">
                      Hoàn thành ngày {new Date(item.completedDate).toLocaleDateString()} • Thời gian làm: {item.timeSpentMinutes} phút
                    </span>
                  </div>

                  <div className="px-3 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold text-sm flex items-center gap-1.5 self-start sm:self-auto">
                    <Award className="w-4 h-4" />
                    <span>Overall Band {item.overallBand.toFixed(1)}</span>
                  </div>
                </div>

                {/* Sub bands */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700">
                    <span className="text-[10px] text-stone-700 dark:text-stone-300 block">Listening</span>
                    <strong className="text-stone-900 dark:text-stone-100">{item.listeningBand.toFixed(1)}</strong>
                  </div>
                  <div className="p-2 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700">
                    <span className="text-[10px] text-stone-700 dark:text-stone-300 block">Reading</span>
                    <strong className="text-stone-900 dark:text-stone-100">{item.readingBand.toFixed(1)}</strong>
                  </div>
                  <div className="p-2 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700">
                    <span className="text-[10px] text-stone-700 dark:text-stone-300 block">Writing</span>
                    <strong className="text-amber-600 dark:text-amber-400">{item.writingBand.toFixed(1)}</strong>
                  </div>
                  <div className="p-2 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700">
                    <span className="text-[10px] text-stone-700 dark:text-stone-300 block">Speaking</span>
                    <strong className="text-stone-900 dark:text-stone-100">{item.speakingBand.toFixed(1)}</strong>
                  </div>
                </div>

                {/* Breakdown comments */}
                {item.breakdown && item.breakdown.length > 0 && (
                  <div className="text-xs text-stone-700 dark:text-stone-300 pt-1 space-y-1">
                    {item.breakdown.map((b, bi) => (
                      <div key={bi} className="flex items-center gap-1.5">
                        <ChevronRight className="w-3 h-3 text-rose-500 shrink-0" />
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
