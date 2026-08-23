import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, Type, HelpCircle, Pause, Play, LogOut, CheckCircle, Shield, Palette, Bell, BellRing } from 'lucide-react';
import { MockExamSkill, ExamColorScheme } from '../../types';

interface ExamHeaderProps {
  testCode: string;
  testTitle: string;
  currentSkill: MockExamSkill;
  timeRemainingSeconds: number;
  isPaused: boolean;
  onTogglePause: () => void;
  onSubmitSection: () => void;
  onExitExam: () => void;
  currentSectionLabel?: string;
  textSize: 'normal' | 'large' | 'xlarge';
  onChangeTextSize: (size: 'normal' | 'large' | 'xlarge') => void;
  colorScheme?: ExamColorScheme;
  onChangeColorScheme?: (scheme: ExamColorScheme) => void;
}

export const ExamHeader: React.FC<ExamHeaderProps> = ({
  testCode,
  testTitle,
  currentSkill,
  timeRemainingSeconds,
  isPaused,
  onTogglePause,
  onSubmitSection,
  onExitExam,
  currentSectionLabel,
  textSize,
  onChangeTextSize,
  colorScheme = 'standard',
  onChangeColorScheme,
}) => {
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [timeWarningAlert, setTimeWarningAlert] = useState<{ show: boolean; message: string; type: '10min' | '5min' }>({
    show: false,
    message: '',
    type: '10min',
  });
  const [hasWarned10Min, setHasWarned10Min] = useState(false);
  const [hasWarned5Min, setHasWarned5Min] = useState(false);

  // Monitor 10min (600s) and 5min (300s) warnings
  useEffect(() => {
    if (timeRemainingSeconds === 600 && !hasWarned10Min) {
      setHasWarned10Min(true);
      setTimeWarningAlert({
        show: true,
        message: 'Cảnh báo 10 phút còn lại! Hãy bắt đầu rà soát và kiểm tra lại toàn bộ các câu trả lời.',
        type: '10min',
      });
    } else if (timeRemainingSeconds === 300 && !hasWarned5Min) {
      setHasWarned5Min(true);
      setTimeWarningAlert({
        show: true,
        message: 'Cảnh báo 5 phút cuối cùng! Thời gian sắp hết, vui lòng hoàn tất và chuẩn bị nộp bài.',
        type: '5min',
      });
    }
  }, [timeRemainingSeconds, hasWarned10Min, hasWarned5Min]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isCriticalLowTime = timeRemainingSeconds <= 300 && timeRemainingSeconds > 0; // Under 5 mins
  const isWarningTime = timeRemainingSeconds <= 600 && timeRemainingSeconds > 300; // 5-10 mins

  const getSkillBadge = () => {
    switch (currentSkill) {
      case 'listening':
        return { label: 'LISTENING TEST', color: 'bg-sky-500/20 text-sky-400 border-sky-500/30', total: '40 câu hỏi' };
      case 'reading':
        return { label: 'ACADEMIC READING TEST', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', total: '40 câu hỏi • 3 Passages' };
      case 'writing':
        return { label: 'ACADEMIC WRITING TEST', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', total: 'Task 1 & Task 2' };
      case 'speaking':
        return { label: 'SPEAKING INTERVIEW', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', total: '3 Parts • Gemini Live' };
    }
  };

  const badge = getSkillBadge();

  // Color scheme based header styling
  const headerBgClass =
    colorScheme === 'high_contrast'
      ? 'bg-black border-yellow-500 text-yellow-300'
      : colorScheme === 'inverted'
      ? 'bg-slate-100 border-slate-300 text-slate-900 shadow-sm'
      : 'bg-slate-950 border-slate-800 text-slate-100';

  return (
    <>
      <header className={`${headerBgClass} border-b px-4 sm:px-6 py-2.5 flex items-center justify-between select-none sticky top-0 z-30 shadow-md transition-colors duration-200`}>
        {/* Left: Test Info & Section */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 ${colorScheme === 'high_contrast' ? 'bg-black border-yellow-400 text-yellow-300' : colorScheme === 'inverted' ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-700/80 text-slate-300'} border px-2.5 py-1 rounded text-xs font-mono`}>
            <Shield className={`w-3.5 h-3.5 ${colorScheme === 'high_contrast' ? 'text-yellow-400' : 'text-blue-400'}`} />
            <span className="font-semibold">{testCode}</span>
          </div>

          <div className="hidden md:flex flex-col">
            <span className={`text-xs ${colorScheme === 'high_contrast' ? 'text-yellow-200' : colorScheme === 'inverted' ? 'text-slate-600' : 'text-slate-400'} font-medium truncate max-w-[260px]`}>
              {testTitle}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${colorScheme === 'high_contrast' ? 'bg-yellow-950/60 border-yellow-400 text-yellow-300' : badge.color}`}>
                {badge.label}
              </span>
              {currentSectionLabel && (
                <span className={`text-[11px] ${colorScheme === 'high_contrast' ? 'text-yellow-400' : colorScheme === 'inverted' ? 'text-slate-500' : 'text-slate-400'}`}>
                  {currentSectionLabel}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Live Real Countdown Timer & 10m/5m Alert Indicator */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border font-mono font-bold tracking-wider text-base sm:text-lg transition-all ${
              isCriticalLowTime
                ? 'bg-rose-950/90 border-rose-600 text-rose-300 animate-pulse shadow-lg shadow-rose-900/40'
                : isWarningTime
                ? 'bg-amber-950/80 border-amber-500 text-amber-300 shadow-md'
                : colorScheme === 'high_contrast'
                ? 'bg-black border-yellow-400 text-yellow-300 ring-1 ring-yellow-400'
                : colorScheme === 'inverted'
                ? 'bg-white border-slate-400 text-slate-900 shadow-inner'
                : 'bg-slate-900 border-slate-700 text-amber-300'
            }`}
          >
            <Clock className={`w-4 h-4 ${isCriticalLowTime ? 'text-rose-400 animate-spin' : isWarningTime ? 'text-amber-400 animate-bounce' : 'text-amber-400'}`} />
            <span>{formatTime(timeRemainingSeconds)}</span>
          </div>

          {/* Pause Button */}
          <button
            onClick={onTogglePause}
            title={isPaused ? 'Tiếp tục làm bài' : 'Tạm dừng đồng hồ'}
            className={`p-2 rounded-lg border transition-colors ${
              colorScheme === 'high_contrast'
                ? 'bg-black border-yellow-500 text-yellow-300 hover:bg-yellow-950'
                : colorScheme === 'inverted'
                ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-200'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4" />}
          </button>
        </div>

        {/* Right: Controls (Font size, Color Schemes, Help, Exit, Submit) */}
        <div className="flex items-center gap-2">
          {/* Text Size Control */}
          <div className={`hidden sm:flex items-center border rounded-lg p-0.5 text-xs ${colorScheme === 'high_contrast' ? 'bg-black border-yellow-500 text-yellow-300' : colorScheme === 'inverted' ? 'bg-white border-slate-300 text-slate-700' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
            <button
              onClick={() => onChangeTextSize('normal')}
              className={`px-2 py-1 rounded transition-colors ${textSize === 'normal' ? (colorScheme === 'high_contrast' ? 'bg-yellow-400 text-black font-bold' : 'bg-slate-700 text-white font-bold') : 'hover:opacity-80'}`}
              title="Cỡ chữ tiêu chuẩn (Standard)"
            >
              A
            </button>
            <button
              onClick={() => onChangeTextSize('large')}
              className={`px-2 py-1 rounded transition-colors ${textSize === 'large' ? (colorScheme === 'high_contrast' ? 'bg-yellow-400 text-black font-bold' : 'bg-slate-700 text-white font-bold') : 'hover:opacity-80'}`}
              title="Cỡ chữ lớn (Large)"
            >
              A+
            </button>
            <button
              onClick={() => onChangeTextSize('xlarge')}
              className={`px-2 py-1 rounded transition-colors ${textSize === 'xlarge' ? (colorScheme === 'high_contrast' ? 'bg-yellow-400 text-black font-bold' : 'bg-slate-700 text-white font-bold') : 'hover:opacity-80'}`}
              title="Cỡ chữ cực lớn (Extra Large)"
            >
              A++
            </button>
          </div>

          {/* Color Schemes Switcher (IDP/BC standard) */}
          {onChangeColorScheme && (
            <div className={`hidden md:flex items-center border rounded-lg p-0.5 text-xs ${colorScheme === 'high_contrast' ? 'bg-black border-yellow-500' : colorScheme === 'inverted' ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-800'}`}>
              <button
                onClick={() => onChangeColorScheme('standard')}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${colorScheme === 'standard' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                title="Chế độ màu Chuẩn (Standard Dark)"
              >
                Chuẩn
              </button>
              <button
                onClick={() => onChangeColorScheme('high_contrast')}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${colorScheme === 'high_contrast' ? 'bg-yellow-400 text-black font-bold' : 'text-yellow-400 hover:bg-yellow-950/40'}`}
                title="Chế độ Tương phản cao: Chữ vàng trên nền đen (High Contrast - Yellow on Black)"
              >
                Tương phản
              </button>
              <button
                onClick={() => onChangeColorScheme('inverted')}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${colorScheme === 'inverted' ? 'bg-slate-300 text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
                title="Chế độ Đảo màu: Nền sáng (Inverted Light Paper)"
              >
                Nền sáng
              </button>
            </div>
          )}

          {/* Help Info */}
          <button
            onClick={() => setShowHelpModal(true)}
            title="Quy chế & Hướng dẫn làm bài thi máy"
            className={`p-2 rounded-lg border transition-colors ${colorScheme === 'high_contrast' ? 'bg-black border-yellow-500 text-yellow-300 hover:bg-yellow-950' : colorScheme === 'inverted' ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-200' : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-slate-200'}`}
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Exit Exam */}
          <button
            onClick={() => setShowExitConfirm(true)}
            title="Thoát phòng thi"
            className={`p-2 rounded-lg border transition-colors ${colorScheme === 'high_contrast' ? 'bg-black border-yellow-500 text-yellow-400 hover:bg-red-950' : 'bg-slate-900 hover:bg-rose-950/50 border-slate-800 hover:border-rose-800 text-slate-400 hover:text-rose-300'}`}
          >
            <LogOut className="w-4 h-4" />
          </button>

          {/* Submit Section Button */}
          <button
            onClick={onSubmitSection}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95 ml-1 ${
              colorScheme === 'high_contrast'
                ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nộp phần thi</span>
            <span className="sm:hidden">Nộp</span>
          </button>
        </div>
      </header>

      {/* 10-Minute and 5-Minute Time Alert Popup */}
      {timeWarningAlert.show && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border ${
            timeWarningAlert.type === '5min'
              ? 'bg-rose-950 border-rose-500 text-rose-100 shadow-rose-950/50'
              : 'bg-amber-950 border-amber-500 text-amber-100 shadow-amber-950/50'
          }`}>
            <BellRing className={`w-5 h-5 ${timeWarningAlert.type === '5min' ? 'text-rose-400 animate-spin' : 'text-amber-400 animate-pulse'}`} />
            <div className="text-xs font-semibold">
              <span className="font-bold underline block">{timeWarningAlert.type === '5min' ? '🚨 CẢNH BÁO 5 PHÚT CUỐI' : '⚠️ THÔNG BÁO 10 PHÚT'}</span>
              <span>{timeWarningAlert.message}</span>
            </div>
            <button
              onClick={() => setTimeWarningAlert({ ...timeWarningAlert, show: false })}
              className="ml-2 px-2 py-1 bg-white/20 hover:bg-white/30 rounded text-[11px] font-bold"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 text-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-400" />
                Hướng dẫn & Quy chế Thi IELTS trên Máy (CD-IELTS)
              </h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              <p>• <strong>Bố cục Split-Screen linh hoạt:</strong> Kéo thả thanh chia tỷ lệ độ rộng giữa bài đọc và câu hỏi theo thói quen đọc.</p>
              <p>• <strong>Highlight văn bản & Ghi chú (Take Note):</strong> Quét chuột trên bất kỳ đoạn văn nào trong bài đọc để bôi vàng/xanh hoặc gắn Sticky Note ghi chú.</p>
              <p>• <strong>Đổi chế độ màu & Cỡ chữ:</strong> Nhấp vào nút [Tương phản] (Chữ vàng nền đen) hoặc [Nền sáng] và điều chỉnh cỡ chữ A / A+ / A++ trên thanh công cụ.</p>
              <p>• <strong>Đánh dấu xem lại (Review Flag):</strong> Nhấn vào nút cờ để đánh dấu những câu còn phân vân và quay lại trước khi hết giờ.</p>
              <p>• <strong>Trình phát Listening & Dictation:</strong> Tùy chỉnh tốc độ 0.75x, 1.0x, 1.25x, tua -5s/+5s và luyện chép chính tả A-B Loop bắt âm.</p>
            </div>
            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-lg transition-colors"
            >
              Đã hiểu, quay lại làm bài
            </button>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 text-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-white">Bạn có chắc chắn muốn rời phòng thi?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Nếu bạn thoát bây giờ, phiên làm bài thi thử này sẽ kết thúc. Tiến trình hiện tại sẽ được bảo lưu nếu bạn chọn nộp bài và chấm điểm ngay.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors"
              >
                Tiếp tục làm bài
              </button>
              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  onExitExam();
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Thoát phòng thi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

