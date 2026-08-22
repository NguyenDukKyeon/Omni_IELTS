import React from 'react';
import { ArrowRight, Lightbulb, CheckCircle2, Play } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ModuleId } from '../types';

interface ActionConfig {
  title: string;
  recommendation: string;
  actionText: string;
  targetModule?: ModuleId;
  onClickCustom?: () => void;
}

export const NextActionBanner: React.FC = () => {
  const {
    activeModule,
    setActiveModule,
    vocabCards,
    mistakes,
    sources,
    setIsMistakeNotebookOpen,
    openAITutorWithPrompt,
  } = useApp();

  const dueVocab = vocabCards.filter((c) => !c.mastered);
  const dueMistakes = mistakes.filter((m) => !m.mastered);

  const getActionConfig = (): ActionConfig => {
    switch (activeModule) {
      case 'dashboard':
        if (dueVocab.length > 0) {
          return {
            title: 'Bước tiếp theo tối ưu cho hôm nay',
            recommendation: `Bạn có ${dueVocab.length} từ vựng trong lịch ôn tập Spaced Repetition (SRS). Hãy hoàn thành để củng cố trí nhớ dài hạn.`,
            actionText: 'Ôn tập từ vựng ngay',
            targetModule: 'vocabulary',
          };
        }
        if (dueMistakes.length > 0) {
          return {
            title: 'Khắc phục điểm yếu',
            recommendation: `Sổ tay có ${dueMistakes.length} lỗi sai ngữ pháp & từ vựng cần bạn làm lại để tránh lặp lại trong bài thi.`,
            actionText: 'Mở Sổ tay lỗi sai',
            onClickCustom: () => setIsMistakeNotebookOpen(true),
          };
        }
        return {
          title: 'Nạp thêm kiến thức mới',
          recommendation: 'Hãy nạp một tài liệu mới (PDF/bài báo/video YouTube) để AI sinh bài học cá nhân hóa cho bạn.',
          actionText: 'Nạp học liệu mới',
          targetModule: 'sources',
        };

      case 'sources':
        return {
          title: 'Cách nạp học liệu hiệu quả',
          recommendation: 'Chọn định dạng bài viết có tính học thuật cao (Economics, Science, Education) để AI trích xuất được từ vựng C1/C2 chất lượng nhất.',
          actionText: 'Hỏi AI gợi ý nguồn hay',
          onClickCustom: () => openAITutorWithPrompt('Gợi ý cho tôi 3 nguồn bài đọc học thuật IELTS C1 về chủ đề Môi trường và Đô thị hóa'),
        };

      case 'vocabulary':
        return {
          title: 'Nguyên tắc ôn tập Flashcard',
          recommendation: 'Đọc to câu ví dụ và cố gắng nhớ nghĩa trước khi lật mặt sau. Tự đánh giá trung thực để thuật toán SRS xếp lịch ôn.',
          actionText: 'Hỏi AI đặt câu đố',
          onClickCustom: () => openAITutorWithPrompt('Hãy tạo một câu hỏi trắc nghiệm kiểm tra từ vựng C1 từ danh sách từ vựng của tôi'),
        };

      case 'grammar':
        return {
          title: 'Tối ưu ngữ pháp Band 7.5+',
          recommendation: 'Tập trung vào 3 cấu trúc cốt lõi: Đảo ngữ (Inversion), Câu chẻ (Cleft sentences) và Mệnh đề phân từ (Participle clauses).',
          actionText: 'Luyện tập cấu trúc ngay',
          targetModule: 'practice',
        };

      case 'media':
        return {
          title: 'Bí quyết Shadowing chuẩn giọng',
          recommendation: 'Bắt chước ngữ điệu (intonation), nhịp dừng và nối âm (connected speech) của người bản xứ trước khi ghi âm lại.',
          actionText: 'Hỏi AI phân tích phát âm',
          onClickCustom: () => openAITutorWithPrompt('Chỉ cho tôi các quy tắc nối âm (linking words) quan trọng nhất trong IELTS Speaking'),
        };

      case 'practice':
        return {
          title: 'Luyện tập thực chiến',
          recommendation: 'Sau khi nộp bài Writing hoặc Speaking, AI sẽ tự động phân tích 4 tiêu chí và lưu lỗi sai vào Sổ tay để bạn ôn tập.',
          actionText: 'Xem bảng tiêu chí chấm thi',
          targetModule: 'knowledge',
        };

      case 'mock_test':
        return {
          title: 'Kiểm tra tiến độ',
          recommendation: 'Nên làm bài thi thử mỗi 2 tuần để theo dõi sự thay đổi ước tính Band điểm và điều chỉnh thời gian biểu học.',
          actionText: 'Xem lịch sử thi thử',
          targetModule: 'profile',
        };

      case 'knowledge':
        return {
          title: 'Vận dụng chiến thuật',
          recommendation: 'Đọc kỹ cấu trúc PEEL cho Writing Task 2 và công thức PPF cho Speaking Part 2, sau đó thực hành ngay ở mục Luyện tập.',
          actionText: 'Sang phần Luyện tập',
          targetModule: 'practice',
        };

      case 'profile':
        return {
          title: 'Theo dõi mục tiêu',
          recommendation: 'Đảm bảo duy trì thời lượng học tối thiểu 30-45 phút mỗi ngày để đạt mục tiêu band điểm trước ngày thi.',
          actionText: 'Về trang chủ hôm nay',
          targetModule: 'dashboard',
        };

      default:
        return {
          title: 'Bước tiếp theo',
          recommendation: 'Tiếp tục lộ trình luyện tập hàng ngày.',
          actionText: 'Tiếp tục',
        };
    }
  };

  const config = getActionConfig();

  const handleActionClick = () => {
    if (config.onClickCustom) {
      config.onClickCustom();
    } else if (config.targetModule) {
      setActiveModule(config.targetModule);
    }
  };

  return (
    <div
      id="next-action-banner"
      className="w-full mb-6 p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all"
    >
      <div className="flex items-start gap-3.5 min-w-0">
        <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200/60 dark:border-blue-800/60 mt-0.5">
          <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/80 px-2.5 py-0.5 rounded-full border border-blue-200/50 dark:border-blue-800/40">
              Bước tiếp theo nên làm
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 hidden md:inline">
              • {config.title}
            </span>
          </div>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-1.5 leading-snug">
            {config.recommendation}
          </p>
        </div>
      </div>

      <button
        id="next-action-trigger-btn"
        onClick={handleActionClick}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold tracking-wide shadow-xs hover:shadow-sm transition-all shrink-0 cursor-pointer active:scale-95"
      >
        <span>{config.actionText}</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};
