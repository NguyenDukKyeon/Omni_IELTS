import React, { useState } from 'react';
import { PenTool, BarChart3, FileText, CheckCircle2, AlertCircle, Info, Sparkles, Clock } from 'lucide-react';
import { FullMockTestPackage } from '../../types';

interface WritingExamViewProps {
  testPackage: FullMockTestPackage;
  writingAnswers: { task1: string; task2: string };
  onUpdateWriting: (task: 'task1' | 'task2', text: string) => void;
  textSize: 'normal' | 'large' | 'xlarge';
}

export const WritingExamView: React.FC<WritingExamViewProps> = ({
  testPackage,
  writingAnswers,
  onUpdateWriting,
  textSize,
}) => {
  const [activeTask, setActiveTask] = useState<'task1' | 'task2'>('task1');
  const [scratchpad, setScratchpad] = useState('');
  const [showScratchpad, setShowScratchpad] = useState(false);

  const task1 = testPackage.writing.task1;
  const task2 = testPackage.writing.task2;

  const countWords = (text: string) => {
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  const t1WordCount = countWords(writingAnswers.task1);
  const t2WordCount = countWords(writingAnswers.task2);

  const currentWordCount = activeTask === 'task1' ? t1WordCount : t2WordCount;
  const currentMinWords = activeTask === 'task1' ? task1.minWords : task2.minWords;
  const isWordTargetMet = currentWordCount >= currentMinWords;

  const fontClass =
    textSize === 'xlarge' ? 'text-lg leading-relaxed' : textSize === 'large' ? 'text-base leading-normal' : 'text-sm leading-normal';

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 text-slate-100 overflow-hidden">
      {/* Task Switcher Bar */}
      <div className="bg-slate-950 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between gap-4">
        {/* Left: Task Tabs */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-lg">
          <button data-ux-flow="mock.exam"
            onClick={() => setActiveTask('task1')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTask === 'task1'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Task 1 ({task1.category})</span>
            <span
              className={`text-[11px] px-1.5 py-0.2 rounded font-mono ${
                t1WordCount >= 150 ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {t1WordCount} words
            </span>
          </button>

          <button data-ux-flow="mock.exam"
            onClick={() => setActiveTask('task2')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTask === 'task2'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Task 2 ({task2.category})</span>
            <span
              className={`text-[11px] px-1.5 py-0.2 rounded font-mono ${
                t2WordCount >= 250 ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {t2WordCount} words
            </span>
          </button>
        </div>

        {/* Right: Word Count Live Monitor */}
        <div className="flex items-center gap-3">
          <button data-ux-flow="mock.exam"
            onClick={() => setShowScratchpad(!showScratchpad)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              showScratchpad ? 'bg-amber-950/80 border-amber-600 text-amber-300' : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            {showScratchpad ? 'Ẩn nháp dàn ý' : 'Mở nháp dàn ý'}
          </button>

          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all ${
              isWordTargetMet
                ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300'
                : 'bg-slate-900 border-slate-700 text-amber-300'
            }`}
          >
            <span>
              {currentWordCount} / {currentMinWords} từ
            </span>
            {isWordTargetMet ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <span className="text-[10px] font-sans font-normal text-slate-400">
                (còn thiếu {currentMinWords - currentWordCount} từ)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Split: Left Prompt & Visuals (45%) / Right Text Editor (55%) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800 overflow-hidden">
        {/* Left Pane: Prompt and Chart Data (5 Cols) */}
        <div className="lg:col-span-5 h-full overflow-y-auto p-5 sm:p-6 bg-slate-950/50 space-y-5">
          {activeTask === 'task1' ? (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Writing Task 1 — {task1.category}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5" /> 20 phút gợi ý
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-slate-200 mt-2 leading-relaxed">
                  {task1.prompt}
                </h3>
              </div>

              {/* Chart Visualizer / Data Table */}
              {task1.chartData && (
                <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-slate-300">
                      {task1.chartData.description}
                    </span>
                    <span className="text-[11px] text-slate-400">TWh</span>
                  </div>

                  {/* Visual Data Matrix */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left text-slate-300 font-mono">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="py-2 px-2.5">Nguồn năng lượng</th>
                          {task1.chartData.labels.map((year) => (
                            <th key={year} className="py-2 px-2.5 text-center">
                              {year}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {task1.chartData.datasets.map((dataset) => (
                          <tr key={dataset.label} className="hover:bg-slate-800/40">
                            <td className="py-2 px-2.5 font-sans font-medium text-white flex items-center gap-1.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full inline-block"
                                style={{ backgroundColor: dataset.color || '#38bdf8' }}
                              />
                              {dataset.label}
                            </td>
                            {dataset.data.map((val, dIdx) => (
                              <td key={dIdx} className="py-2 px-2.5 text-center font-bold text-slate-200">
                                {val}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-2.5 bg-slate-950/60 rounded-lg text-[11px] text-slate-400 leading-relaxed">
                    💡 <em>Gợi ý chiến thuật Task 1:</em> Viết đoạn Tổng quan (Overview) nêu 2 xu hướng chính (ví dụ: Wind & Solar tăng mạnh nhất, Hydro duy trì ổn định), sau đó chia 2 đoạn Thân bài để so sánh số liệu cụ thể.
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Writing Task 2 — {task2.category}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5" /> 40 phút gợi ý
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-slate-200 mt-2 leading-relaxed bg-slate-900 border border-slate-700/80 p-4 rounded-xl">
                  {task2.prompt}
                </h3>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 text-xs space-y-2.5 text-slate-300">
                <h4 className="font-bold text-amber-400 uppercase tracking-wider">
                  Tiêu chí chấm điểm chính thức (4 Criteria):
                </h4>
                <p>• <strong>Task Response (25%):</strong> Trả lời trọn vẹn câu hỏi, có quan điểm rõ ràng xuyên suốt và mở rộng luận điểm với ví dụ cụ thể.</p>
                <p>• <strong>Coherence & Cohesion (25%):</strong> Chia 4 đoạn mạch lạc (Mở bài, Thân bài 1, Thân bài 2, Kết luận), sử dụng từ nối tự nhiên.</p>
                <p>• <strong>Lexical Resource (25%):</strong> Sử dụng từ vựng học thuật C1/C2, collocations chính xác, tránh lặp từ.</p>
                <p>• <strong>Grammatical Range & Accuracy (25%):</strong> Kết hợp câu đơn, câu ghép, câu phức (Inversion, Conditionals, Relative Clauses) chính xác.</p>
              </div>
            </div>
          )}

          {/* Collapsible Scratchpad */}
          {showScratchpad && (
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase text-amber-300">
                Nháp Dàn ý (Scratchpad - không tính điểm)
              </h4>
              <textarea data-ux-flow="mock.exam"
                value={scratchpad}
                onChange={(e) => setScratchpad(e.target.value)}
                placeholder="Ghi chú nhanh dàn ý 4 đoạn, từ vựng hay muốn dùng..."
                rows={5}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
              />
            </div>
          )}
        </div>

        {/* Right Pane: Live Text Editor (7 Cols) */}
        <div className="lg:col-span-7 h-full flex flex-col bg-slate-900 p-4 sm:p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-3 text-xs text-slate-400">
            <span className="font-medium flex items-center gap-1.5">
              <PenTool className="w-3.5 h-3.5 text-amber-400" />
              Khung viết bài thi trực tiếp ({activeTask === 'task1' ? 'Task 1' : 'Task 2'})
            </span>
            <span className="font-mono text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Đang tự động lưu
            </span>
          </div>

          <textarea data-ux-flow="mock.exam"
            value={activeTask === 'task1' ? writingAnswers.task1 : writingAnswers.task2}
            onChange={(e) => onUpdateWriting(activeTask, e.target.value)}
            placeholder={
              activeTask === 'task1'
                ? "Bắt đầu viết Task 1 tại đây (Mở bài paraphrase đề, Tổng quan overview, Thân bài so sánh chi tiết...)"
                : "Bắt đầu viết Task 2 tại đây (Mở bài Introduction, Thân bài 1 Body 1, Thân bài 2 Body 2, Kết luận Conclusion...)"
            }
            className={`flex-1 w-full bg-slate-950 border border-slate-700 rounded-xl p-5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/80 font-sans resize-none scrollbar-thin ${fontClass}`}
          />
        </div>
      </div>
    </div>
  );
};
