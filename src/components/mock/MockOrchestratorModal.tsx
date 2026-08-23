import React, { useState, useEffect } from 'react';
import {
  X,
  Layers,
  Sparkles,
  BookOpen,
  Headphones,
  PenTool,
  Mic,
  Award,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sliders,
  Check,
  ArrowRight,
  ShieldAlert,
  Compass,
  Play,
  TrendingUp,
  FileCheck2,
} from 'lucide-react';
import {
  MockAssemblerPackage,
  MockSynthesizerResult,
  FullMockTestPackage,
} from '../../types';
import {
  assembleFullMockPackageApi,
  synthesizeFinalMockReportApi,
} from '../../services/practiceService';
import { useApp } from '../../context/AppContext';
import { XP_REWARDS } from '../../services/gamification';

interface MockOrchestratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartExam?: (pkg: FullMockTestPackage) => boolean;
}

export const MockOrchestratorModal: React.FC<MockOrchestratorModalProps> = ({
  isOpen,
  onClose,
  onStartExam,
}) => {
  const { profile, mistakes, mockResults, awardXP } = useApp();

  const [activeTab, setActiveTab] = useState<'assemble' | 'synthesize'>('assemble');
  const [targetBand, setTargetBand] = useState<number>(profile.targetBand || 7.0);

  // Assemble State
  const [isAssembling, setIsAssembling] = useState<boolean>(false);
  const [buildProgress, setBuildProgress] = useState<string>('');
  const [assembleError, setAssembleError] = useState<string | null>(null);
  const [assembledPackage, setAssembledPackage] = useState<MockAssemblerPackage | null>(null);

  // Synthesizer State
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [synthesizeError, setSynthesizeError] = useState<string | null>(null);
  const [skillScores, setSkillScores] = useState({
    reading: 6.5,
    listening: 7.0,
    writing: 6.0,
    speaking: 6.5,
  });
  const [synthesizeResult, setSynthesizeResult] = useState<MockSynthesizerResult | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setAssembledPackage(null);
      setAssembleError(null);
      setSynthesizeResult(null);
      setSynthesizeError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const weakestAxes: string[] = [];
  const recentMistakeTags = (Array.from(new Set(mistakes.flatMap((m) => m.tags || []))) as string[]).slice(0, 5);
  const recentPromptIds = mockResults.map((m) => m.testId).slice(0, 10);

  const handleAssemble = async () => {
    setIsAssembling(true);
    setAssembleError(null);
    setAssembledPackage(null);

    try {
      const pendingSource = sessionStorage.getItem('omni_pending_mock_source');
      const data = await assembleFullMockPackageApi({
        targetBand,
        recentPromptIds,
        learnerProfile: {
          targetBand,
          weakestAxes: weakestAxes.length > 0 ? weakestAxes : undefined,
          recentMistakeTags: recentMistakeTags.length > 0 ? recentMistakeTags : undefined,
        },
        sourceItem: pendingSource ? JSON.parse(pendingSource) : undefined,
      }, (skill, state) => {
        const labels = { listening: 'Listening', reading: 'Reading', writing: 'Writing', speaking: 'Speaking', finalize: 'kiểm định toàn bộ đề' };
        setBuildProgress(state === 'building' ? `Đang tạo ${labels[skill]}…` : `${labels[skill]} đã đạt quality gate`);
      });

      if (pendingSource) sessionStorage.removeItem('omni_pending_mock_source');
      setAssembledPackage(data);
      awardXP(XP_REWARDS.EXERCISE_COMPLETED, 'Lắp ráp bộ đề thi 4 kỹ năng với Mock Test Orchestrator');
    } catch (err: any) {
      setAssembleError(err?.message || 'Không thể lắp ráp đề thi từ gemini-3.1-pro.');
    } finally {
      setIsAssembling(false);
      setBuildProgress('');
    }
  };

  const handleSynthesize = async () => {
    setIsSynthesizing(true);
    setSynthesizeError(null);
    setSynthesizeResult(null);

    try {
      const data = await synthesizeFinalMockReportApi({
        skillBands: skillScores,
        learnerProfile: {
          targetBand,
          weakestAxes: weakestAxes.length > 0 ? weakestAxes : undefined,
          recentMistakeTags: recentMistakeTags.length > 0 ? recentMistakeTags : undefined,
        },
      });

      setSynthesizeResult(data);
      awardXP(XP_REWARDS.MOCK_TEST_COMPLETED, 'Tổng hợp báo cáo thi thử chuẩn Cambridge');
    } catch (err: any) {
      console.error('Synthesize failed:', err);
      setSynthesizeError(err?.message || 'Không thể tổng hợp báo cáo từ gemini-3.1-pro.');
    } finally {
      setIsSynthesizing(false);
    }
  };

  return (
    <div
      id="mock-orchestrator-modal"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden my-4 sm:my-8 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 text-white flex items-center justify-between shrink-0 shadow-md border-b border-teal-900/50">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-teal-600/30 border border-teal-400/40 flex items-center justify-center text-2xl shadow-inner shrink-0">
              🧭
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  Mock Test Orchestrator & Assembler
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-teal-400/20 text-teal-200 border border-teal-300/30">
                  mock-assembler-v1
                </span>
              </div>
              <p className="text-xs text-teal-200/90 mt-0.5">
                Điều phối lắp ráp trọn bộ 4 kỹ năng (40 câu Reading + 40 câu Listening + 2 Task Writing + Speaking Mock)
              </p>
            </div>
          </div>
          <button data-ux-flow="mock.exam"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center gap-2 text-xs">
          <button data-ux-flow="mock.exam"
            type="button"
            onClick={() => setActiveTab('assemble')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
              activeTab === 'assemble'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Lắp Ráp Bộ Đề 4 Kỹ Năng Mới</span>
          </button>
          <button data-ux-flow="mock.exam"
            type="button"
            onClick={() => setActiveTab('synthesize')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
              activeTab === 'synthesize'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Tổng Hợp Báo Cáo Kết Quả Thi</span>
          </button>
        </div>

        {/* Dynamic Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {activeTab === 'assemble' && (
            <div className="space-y-6">
              {/* Configuration Section */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Cấu Hình Lắp Ráp Đề Thi Thử Tự Động
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Orchestrator tự động kết nối các Engine khảo thí Cambridge để sinh trọn vẹn 4 bài thi không trùng lặp
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Band mục tiêu:</span>
                    <div className="flex gap-1">
                      {[6.0, 6.5, 7.0, 7.5, 8.0].map((b) => (
                        <button data-ux-flow="mock.exam"
                          key={b}
                          type="button"
                          onClick={() => setTargetBand(b)}
                          className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all ${
                            targetBand === b
                              ? 'bg-teal-600 text-white'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 4 Skill Specs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-blue-600">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Reading (40 câu)</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      3 Passages học thuật, trộn tối thiểu 4 dạng câu hỏi (Headings, TFNG, MCQ, Gap-fill).
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-purple-600">
                      <Headphones className="w-3.5 h-3.5" />
                      <span>Listening (40 câu)</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      4 Sections độ khó tăng dần từ hội thoại xã hội đến bài giảng học thuật.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-600">
                      <PenTool className="w-3.5 h-3.5" />
                      <span>Writing (2 Tasks)</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      1 Task 1 biểu đồ + 1 Task 2 nghị luận xã hội (kiểm tra lịch sử tránh lặp đề).
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-rose-600">
                      <Mic className="w-3.5 h-3.5" />
                      <span>Speaking (3 Parts)</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Phỏng vấn với giám khảo AI, chỉ chấm phát âm khi có audio thật.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button data-ux-flow="mock.exam"
                    type="button"
                    onClick={handleAssemble}
                    disabled={isAssembling}
                    className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    {isAssembling ? (
                      <RotateCcw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    <span>{isAssembling ? (buildProgress || 'Đang khởi tạo Mock Build…') : 'Lắp Ráp Bộ Đề 4 Kỹ Năng (Orchestrator)'}</span>
                  </button>
                </div>
              </div>

              {/* Error Alert */}
              {assembleError && (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Lỗi lắp ráp đề thi</p>
                    <p className="mt-0.5 text-rose-700 dark:text-rose-300">{assembleError}</p>
                    <button
                      data-ux-flow="mock.exam"
                      type="button"
                      onClick={handleAssemble}
                      disabled={isAssembling}
                      className="mt-3 px-3 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white font-bold inline-flex items-center gap-2"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${isAssembling ? 'animate-spin' : ''}`} />
                      <span>Thử lại đúng phần bị lỗi</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Assembled Results */}
              {assembledPackage && (
                <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white space-y-5 shadow-xl border border-teal-800/40">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-teal-800/50 pb-4">
                    <div>
                      <span className="text-xs uppercase font-bold text-teal-300">
                        Bộ Đề Đã Lắp Ráp Thành Công
                      </span>
                      <h4 className="text-lg sm:text-xl font-black text-white mt-0.5">
                        {assembledPackage.testTitle || 'Cambridge IELTS Custom Mock Exam'}
                      </h4>
                      <p className="text-xs text-slate-300">Mã đề: {assembledPackage.testId}</p>
                    </div>

                    <button data-ux-flow="mock.exam"
                      type="button"
                      onClick={() => {
                        if (!assembledPackage.fullPackage || !assembledPackage.validation?.ready) {
                          setAssembleError('Bộ đề chưa vượt qua validator nên chưa thể mở phòng thi.');
                          return;
                        }
                        if (!onStartExam) {
                          setAssembleError('Phòng thi chưa được kết nối với Orchestrator.');
                          return;
                        }
                        const persisted = onStartExam(assembledPackage.fullPackage);
                        if (!persisted) {
                          setAssembleError('Không thể lưu đề và lượt thi trên thiết bị này. Hãy kiểm tra quyền lưu trữ của trình duyệt rồi thử lại.');
                          return;
                        }
                        onClose();
                      }}
                      className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer whitespace-nowrap"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>Vào Phòng Thi Thử Ngay</span>
                    </button>
                  </div>

                  {/* Assembled Breakdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10 space-y-1.5">
                      <strong className="text-teal-300 block">📖 Reading Package:</strong>
                      <p className="text-slate-200">
                        {assembledPackage.readingPackage?.passages?.length || 3} Passages • Tổng{' '}
                        {assembledPackage.readingPackage?.totalQuestions || 40} câu hỏi
                      </p>
                      <ul className="text-[11px] text-slate-300 list-disc list-inside">
                        {assembledPackage.readingPackage?.passages?.map((p, idx) => (
                          <li key={idx}>
                            Passage {p.passageIndex || idx + 1}: {p.title || 'Academic Reading'}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10 space-y-1.5">
                      <strong className="text-teal-300 block">✍️ Writing Package:</strong>
                      <p className="text-slate-200">
                        Task 1: {assembledPackage.writingPackage?.task1?.type || 'Report'}
                      </p>
                      <p className="text-slate-300 text-[11px]">
                        Task 2: {assembledPackage.writingPackage?.task2?.prompt?.slice(0, 90)}...
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'synthesize' && (
            <div className="space-y-6">
              {/* Input Scores Section */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Nhập Điểm Số 4 Kỹ Năng Để Tổng Hợp Báo Cáo
                  </h3>
                  <p className="text-slate-500 mt-0.5">
                    Hệ thống sẽ tính điểm tổng Overall Band theo công thức làm tròn chuẩn xác của Cambridge và đưa ra lộ trình tối ưu tiếp theo
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(['reading', 'listening', 'writing', 'speaking'] as const).map((skillKey) => (
                    <div key={skillKey} className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1.5">
                      <label className="block font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        {skillKey}:
                      </label>
                      <input data-ux-flow="mock.exam"
                        type="number"
                        step="0.5"
                        min="0"
                        max="9"
                        value={skillScores[skillKey]}
                        onChange={(e) =>
                          setSkillScores((prev) => ({
                            ...prev,
                            [skillKey]: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex justify-end">
                  <button data-ux-flow="mock.exam"
                    type="button"
                    onClick={handleSynthesize}
                    disabled={isSynthesizing}
                    className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    {isSynthesizing ? (
                      <RotateCcw className="w-4 h-4 animate-spin" />
                    ) : (
                      <TrendingUp className="w-4 h-4" />
                    )}
                    <span>{isSynthesizing ? 'Đang tổng hợp báo cáo...' : 'Tổng Hợp Báo Cáo Thi Thử (Synthesizer)'}</span>
                  </button>
                </div>
              </div>

              {/* Synthesize Result Display */}
              {synthesizeResult && (
                <div className="p-6 rounded-3xl bg-gradient-to-r from-teal-950 via-slate-900 to-slate-900 text-white space-y-5 shadow-xl border border-teal-800/40">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-teal-800/50 pb-4">
                    <div className="space-y-1 text-center sm:text-left">
                      <span className="text-xs font-bold uppercase text-teal-300">
                        Điểm Tổng Thể Toàn Bài Thi (Overall Band):
                      </span>
                      <div className="flex items-baseline justify-center sm:justify-start gap-2">
                        <span className="text-5xl font-black text-amber-300">
                          {synthesizeResult.overallBand.toFixed(1)}
                        </span>
                        <span className="text-xs text-teal-200">
                          / 9.0 (Làm tròn chuẩn Cambridge)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1">
                        {synthesizeResult.disclaimerVi}
                      </p>
                    </div>

                    <div className="flex gap-2 text-xs">
                      <div className="px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-center">
                        <span className="text-[10px] uppercase font-bold block">Kỹ năng mạnh nhất</span>
                        <strong className="text-sm font-black uppercase text-white">
                          {synthesizeResult.strongestSkill}
                        </strong>
                      </div>
                      <div className="px-3 py-2 rounded-xl bg-rose-500/20 border border-rose-400/30 text-rose-200 text-center">
                        <span className="text-[10px] uppercase font-bold block">Kỹ năng cần cải thiện</span>
                        <strong className="text-sm font-black uppercase text-white">
                          {synthesizeResult.weakestSkill}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="space-y-2.5">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5" />
                      <span>Đề Xuất Lộ Trình Luyện Tập Tiếp Theo (Actionable Recommendations):</span>
                    </h5>

                    <div className="space-y-2">
                      {synthesizeResult.recommendedNextStepsVi.map((step, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-2xl bg-white/10 border border-white/10 text-xs text-slate-200 flex items-start gap-2.5"
                        >
                          <span className="w-5 h-5 rounded-full bg-teal-500/30 border border-teal-300/40 text-teal-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                            {idx + 1}
                          </span>
                          <p className="leading-relaxed">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
