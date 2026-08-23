import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Zap,
  Timer,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Layers,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  Puzzle,
  Flame,
  Award,
  Check,
  RefreshCw,
} from 'lucide-react';
import {
  ChallengeType,
  SpeedDrillChallenge,
  ParaphraseBlitzChallenge,
  CohesiveJigsawChallenge,
  CollocationMatchChallenge,
  SpeedDrillEvaluationResult,
} from '../../types';
import {
  generateSpeedDrillApi,
  evaluateSpeedDrillApi,
} from '../../services/practiceService';
import { useApp } from '../../context/AppContext';
import { XP_REWARDS } from '../../services/gamification';

interface SpeedDrillArenaModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialChallengeType?: ChallengeType;
}

export const SpeedDrillArenaModal: React.FC<SpeedDrillArenaModalProps> = ({
  isOpen,
  onClose,
  initialChallengeType = 'paraphrase_blitz',
}) => {
  const { awardXP } = useApp();

  const [activeType, setActiveType] = useState<ChallengeType>(initialChallengeType);
  const [challenge, setChallenge] = useState<SpeedDrillChallenge | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<SpeedDrillEvaluationResult | null>(null);

  // Timer State (60s)
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);

  // User input states
  const [paraphraseInput, setParaphraseInput] = useState<string>('');
  const [jigsawSelections, setJigsawSelections] = useState<Record<number, string>>({});
  const [collocationSelections, setCollocationSelections] = useState<Record<number, string>>({});

  useEffect(() => {
    if (isOpen) {
      setActiveType(initialChallengeType);
      handleLoadChallenge(initialChallengeType);
    } else {
      setChallenge(null);
      setEvaluation(null);
      setErrorMessage(null);
      setIsTimerActive(false);
    }
  }, [isOpen, initialChallengeType]);

  // Timer Countdown
  useEffect(() => {
    let interval: any = null;
    if (isTimerActive && timeLeft > 0 && !evaluation) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isTimerActive && !evaluation) {
      setIsTimerActive(false);
      // Auto-submit when time runs out
      handleSubmit();
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timeLeft, evaluation]);

  if (!isOpen) return null;

  const handleLoadChallenge = async (type: ChallengeType) => {
    setIsLoading(true);
    setErrorMessage(null);
    setEvaluation(null);
    setParaphraseInput('');
    setJigsawSelections({});
    setCollocationSelections({});
    setTimeLeft(60);
    setIsTimerActive(false);

    try {
      const data = await generateSpeedDrillApi(type);
      setChallenge(data);
      setTimeLeft(data.timeLimitSeconds || 60);
      setIsTimerActive(true);
    } catch (err: any) {
      console.error('Failed to load Speed Drill:', err);
      setErrorMessage(err?.message || 'Không thể tạo bài tập Speed Drill từ gemini-3.1-pro.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!challenge || isEvaluating) return;

    setIsEvaluating(true);
    setIsTimerActive(false);

    let userSubmission: any = null;
    if (challenge.challengeType === 'paraphrase_blitz') {
      userSubmission = { rewrittenSentence: paraphraseInput };
    } else if (challenge.challengeType === 'cohesive_jigsaw') {
      userSubmission = {
        placements: Object.entries(jigsawSelections).map(([idx, connector]) => ({
          sentenceIndex: Number(idx),
          connector,
        })),
      };
    } else if (challenge.challengeType === 'collocation_match') {
      userSubmission = {
        matchedPairs: (challenge as CollocationMatchChallenge).pairs.map((p, idx) => ({
          word: p.word,
          selectedPartner: collocationSelections[idx] || '',
        })),
      };
    }

    try {
      const result = await evaluateSpeedDrillApi({
        challenge,
        userSubmission,
        targetBand: 7.5,
      });

      setEvaluation(result);
      if (result.scorePercentage >= 70) {
        awardXP(XP_REWARDS.EXERCISE_COMPLETED, 'Hoàn thành 60s Speed Drill xuất sắc');
      }
    } catch (err: any) {
      console.error('Evaluation failed:', err);
      setErrorMessage(err?.message || 'Lỗi khi chấm điểm Speed Drill.');
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div
      id="speed-drill-arena-modal"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden my-4 sm:my-8 flex flex-col max-h-[92vh]">
        {/* Header with Mode Switcher */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-2xl shadow-inner">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  IELTS 60-Second Speed Drill Arena
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                  gemini-3.1-pro
                </span>
              </div>
              <p className="text-xs text-amber-100 mt-0.5">
                Rèn luyện phản xạ học thuật đỉnh cao trong 60 giây
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="px-5 pt-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveType('paraphrase_blitz');
              handleLoadChallenge('paraphrase_blitz');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeType === 'paraphrase_blitz'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-900 shadow-sm'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>⚡ Paraphrase Blitz (60s)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveType('cohesive_jigsaw');
              handleLoadChallenge('cohesive_jigsaw');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeType === 'cohesive_jigsaw'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-900 shadow-sm'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Puzzle className="w-4 h-4" />
            <span>🧩 Cohesive Jigsaw (60s)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveType('collocation_match');
              handleLoadChallenge('collocation_match');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeType === 'collocation_match'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-900 shadow-sm'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>🎯 Collocation Match (60s)</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {/* Timer & Controls Bar */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold text-base ${
                  timeLeft <= 15
                    ? 'bg-rose-500 text-white animate-bounce'
                    : 'bg-amber-500 text-slate-950'
                }`}
              >
                {timeLeft}s
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Thời Gian Làm Bài
                </span>
                <span className="text-xs font-semibold text-slate-200">
                  {evaluation
                    ? 'Đã kết thúc lượt thi'
                    : isTimerActive
                    ? 'Đang đếm ngược tốc độ'
                    : 'Đã dừng thời gian'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleLoadChallenge(activeType)}
                disabled={isLoading}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Đổi Đề Mới</span>
              </button>
            </div>
          </div>

          {/* Error Notice */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs sm:text-sm flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Lỗi bài tập Speed Drill</p>
                <p className="mt-0.5 text-rose-700 dark:text-rose-300">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Loading Animation */}
          {isLoading && (
            <div className="py-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-2xl mx-auto animate-pulse">
                ⚡
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                gemini-3.1-pro đang khởi tạo bài tập 60s Speed Drill...
              </p>
            </div>
          )}

          {/* CHALLENGE 1: PARAPHRASE BLITZ */}
          {!isLoading && challenge && challenge.challengeType === 'paraphrase_blitz' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  Câu gốc cần Paraphrase nâng band:
                </span>
                <p className="text-sm sm:text-base font-serif font-bold text-slate-900 dark:text-white leading-relaxed">
                  "{(challenge as ParaphraseBlitzChallenge).promptSentence}"
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-200/60 dark:border-amber-900/40">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Kỹ thuật bắt buộc:
                  </span>
                  {(challenge as ParaphraseBlitzChallenge).targetTechniques.map((tech, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-xs font-bold"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {!evaluation ? (
                <div className="space-y-3">
                  <textarea
                    value={paraphraseInput}
                    onChange={(e) => setParaphraseInput(e.target.value)}
                    placeholder="Viết lại câu trên bằng các kỹ thuật học thuật tự nhiên (Band 8.5+)..."
                    rows={3}
                    className="w-full p-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm leading-relaxed focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isEvaluating || !paraphraseInput.trim()}
                    className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isEvaluating ? (
                      <RotateCcw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    <span>{isEvaluating ? 'Đang chấm điểm phản xạ...' : 'Nộp Bài Chấm Điểm 60s'}</span>
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {/* CHALLENGE 2: COHESIVE JIGSAW */}
          {!isLoading && challenge && challenge.challengeType === 'cohesive_jigsaw' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                  Từ nối học thuật có sẵn:
                </span>
                <div className="flex flex-wrap gap-2">
                  {(challenge as CohesiveJigsawChallenge).missingConnectors.map((conn, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-sm"
                    >
                      {conn}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {(challenge as CohesiveJigsawChallenge).sentences.map((sent, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-500">Câu {idx + 1}:</span>
                      <select
                        value={jigsawSelections[idx] || ''}
                        onChange={(e) =>
                          setJigsawSelections((prev) => ({ ...prev, [idx]: e.target.value }))
                        }
                        disabled={!!evaluation}
                        className="px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">-- Chọn từ nối cho câu này --</option>
                        {(challenge as CohesiveJigsawChallenge).missingConnectors.map(
                          (conn, cIdx) => (
                            <option key={cIdx} value={conn}>
                              {conn}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                      "{sent}"
                    </p>
                  </div>
                ))}
              </div>

              {!evaluation && (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isEvaluating}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isEvaluating ? (
                    <RotateCcw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>{isEvaluating ? 'Đang chấm điểm nối mạch...' : 'Nộp Bài Chấm Điểm 60s'}</span>
                </button>
              )}
            </div>
          )}

          {/* CHALLENGE 3: COLLOCATION MATCH */}
          {!isLoading && challenge && challenge.challengeType === 'collocation_match' && (
            <div className="space-y-4 animate-fadeIn">
              {(challenge as CollocationMatchChallenge).pairs.map((pair, pIdx) => {
                const options = [pair.correctPartner, ...pair.distractorPartners].sort();
                return (
                  <div
                    key={pIdx}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-bold">Cặp {pIdx + 1}:</span>
                      <span className="text-sm font-black text-amber-600 dark:text-amber-400">
                        {pair.word} + [ ? ]
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {options.map((opt, oIdx) => {
                        const isSelected = collocationSelections[pIdx] === opt;
                        return (
                          <button
                            key={oIdx}
                            type="button"
                            onClick={() =>
                              setCollocationSelections((prev) => ({ ...prev, [pIdx]: opt }))
                            }
                            disabled={!!evaluation}
                            className={`p-2.5 rounded-xl text-xs font-bold transition-all border ${
                              isSelected
                                ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {!evaluation && (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isEvaluating}
                  className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isEvaluating ? (
                    <RotateCcw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>{isEvaluating ? 'Đang chấm Collocation...' : 'Nộp Bài Chấm Điểm 60s'}</span>
                </button>
              )}
            </div>
          )}

          {/* EVALUATION RESULTS BANNER */}
          {evaluation && (
            <div className="p-6 rounded-3xl bg-slate-900 text-white border-2 border-amber-500/40 shadow-2xl space-y-5 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-amber-950 via-slate-900 to-slate-950 border border-amber-500/30">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-2xl shrink-0">
                    🏆
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">
                      Kết Quả 60-Second Speed Drill
                    </span>
                    <h3 className="text-xl font-black text-white">
                      Điểm: {evaluation.scorePercentage}% • Ước tính Band {evaluation.bandEstimate.toFixed(1)}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Feedback text */}
              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 text-xs sm:text-sm text-slate-200 leading-relaxed">
                💡 <strong>Nhận xét phản xạ:</strong> {evaluation.feedbackVi}
              </div>

              {/* Expected Answers (if Paraphrase Blitz) */}
              {challenge?.challengeType === 'paraphrase_blitz' && (
                <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Bản Paraphrase Band 8.5+ Mẫu Chuẩn:
                  </span>
                  <div className="space-y-1.5">
                    {(challenge as ParaphraseBlitzChallenge).expectedBand85Answers.map((ans, idx) => (
                      <p key={idx} className="text-xs font-serif italic text-slate-200">
                        • "{ans}"
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Detailed Breakdown Items */}
              {evaluation.detailedBreakdown && evaluation.detailedBreakdown.length > 0 && (
                <div className="space-y-2.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Chi Tiết Từng Câu:
                  </span>
                  {evaluation.detailedBreakdown.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-300">{item.item}</span>
                        <span
                          className={`font-bold ${
                            item.isCorrect ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {item.isCorrect ? '✓ Chính xác' : '✗ Chưa chuẩn'}
                        </span>
                      </div>
                      <p className="text-slate-400">
                        Lựa chọn của bạn: <span className="text-white font-mono">{item.userResponse || '(Bỏ trống)'}</span>
                      </p>
                      <p className="text-amber-300">
                        Đáp án chuẩn: <span className="font-mono">{item.correctTarget}</span>
                      </p>
                      <p className="text-slate-300 italic pt-1">{item.explanationVi}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Action: Play Again */}
              <button
                type="button"
                onClick={() => handleLoadChallenge(activeType)}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Thử Thách Lại Với Đề Mới (60s)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
