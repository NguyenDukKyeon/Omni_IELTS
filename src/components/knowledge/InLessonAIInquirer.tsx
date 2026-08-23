import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  Bot,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface InLessonAIInquirerProps {
  contextTopicTitle: string;
  contextSkill?: string;
  quickPrompts?: string[];
}

export const InLessonAIInquirer: React.FC<InLessonAIInquirerProps> = ({
  contextTopicTitle,
  contextSkill,
  quickPrompts = [
    'Vì sao câu này được điểm Coherence cao?',
    'Cho tôi ví dụ áp dụng thực tế ở Band 8.5+',
    'Giải thích rõ hơn bẫy giám khảo hay gài ở dạng này',
    'Làm sao để paraphrase cấu trúc này mượt mà nhất?',
  ],
}) => {
  const { profile, awardXP } = useApp();
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [inputQuery, setInputQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [conversation, setConversation] = useState<
    Array<{ role: 'user' | 'assistant'; text: string; timestamp: string }>
  >([]);

  const handleAskAI = async (queryText: string) => {
    if (!queryText.trim()) return;

    const userMessage = {
      role: 'user' as const,
      text: queryText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setConversation((prev) => [...prev, userMessage]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/gemini/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...conversation.map((c) => ({
              role: c.role,
              content: c.text,
            })),
            { role: 'user', content: queryText.trim() },
          ],
          screenContext: `IELTS Masterclass: "${contextTopicTitle}" (${contextSkill || 'Tổng quan'})`,
          currentBand: profile.currentBand || 6.0,
          targetBand: profile.targetBand || 7.5,
        }),
      });

      if (!response.ok) {
        throw new Error('Lỗi kết nối AI Tutor');
      }

      const data = await response.json();
      const aiReply = data.reply || 'Tôi đã nhận được câu hỏi. Hãy cùng đào sâu chiến thuật này nhé!';

      setConversation((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: aiReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);

      // Award small gamification XP for asking analytical questions
      awardXP(5, 'Đặt câu hỏi phân tích chiến thuật cùng AI Tutor');
    } catch (err) {
      console.error('Error asking AI in lesson:', err);
      // Helpful fallback response
      setConversation((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `**Phân tích từ Giám khảo AI cho bài học "${contextTopicTitle}":**

1. **Về tiêu chí Coherence & Cohesion (Tính mạch lạc):** Điểm số cao đạt được khi người viết/nói không chỉ dùng các liên từ đơn giản (Firstly, Secondly) mà sử dụng kỹ thuật *Theme-Rheme progression* (lấy thông tin cuối câu trước làm chủ ngữ câu sau) và đại từ chỉ định thay thế (*This phenomenon, Such measures*).

2. **Bẫy cần tránh tuyệt đối:** Không bao giờ liệt kê ý tưởng vụn vặt. Hãy phát triển 1 luận điểm theo đầy đủ chuỗi: *Luận điểm -> Cơ chế tại sao -> Ví dụ cụ thể -> Kết quả tác động*.

*(Bạn có thể gắn GEMINI_API_KEY trong Settings để kích hoạt phản hồi thời gian thực từ Gemini Flash!)*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="in-lesson-ai-inquirer"
      className="rounded-3xl bg-gradient-to-br from-blue-50/90 via-indigo-50/50 to-purple-50/70 dark:from-slate-900 dark:via-blue-950/30 dark:to-slate-900 border border-blue-200/80 dark:border-blue-800/60 p-5 sm:p-6 space-y-4 shadow-sm"
    >
      {/* Collapsible Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Hỏi Đáp Chuyên Sâu Cùng Giám Khảo AI</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-extrabold">
                Live Analysis
              </span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Đào sâu case study, giải mã tiêu chí chấm hoặc yêu cầu gợi ý câu trả lời Band 8.5+.
            </p>
          </div>
        </div>

        <button data-ux-flow="knowledge.learn"
          aria-label={isOpen ? 'Thu gọn hỏi đáp AI' : 'Mở hỏi đáp AI'}
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800 transition-all cursor-pointer"
        >
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isOpen && (
        <div className="space-y-4 pt-1">
          {/* Quick Prompts Carousel */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {quickPrompts.map((qp, idx) => (
              <button data-ux-flow="knowledge.learn"
                key={idx}
                onClick={() => handleAskAI(qp)}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-800/80 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white border border-blue-200/60 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-all shrink-0 cursor-pointer shadow-2xs hover:shadow-xs active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                <Lightbulb className="w-3 h-3 text-amber-500 shrink-0" />
                <span>{qp}</span>
              </button>
            ))}
          </div>

          {/* Conversation History Area */}
          {conversation.length > 0 && (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
              {conversation.map((msg, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-2.5 ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-xs'
                        : 'bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-xs whitespace-pre-line shadow-2xs'
                    }`}
                  >
                    {msg.text}
                    <span
                      className={`block text-[9px] mt-1.5 text-right font-mono ${
                        msg.role === 'user'
                          ? 'text-blue-200'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-medium animate-pulse p-2">
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>Giám khảo AI đang phân tích bài học...</span>
                </div>
              )}
            </div>
          )}

          {/* Input Box */}
          <form data-ux-flow="knowledge.learn"
            onSubmit={(e) => {
              e.preventDefault();
              handleAskAI(inputQuery);
            }}
            className="relative flex items-center"
          >
            <input data-ux-flow="knowledge.learn"
              type="text"
              placeholder={`Hỏi AI về chiến thuật "${contextTopicTitle}"...`}
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              disabled={isLoading}
              className="w-full pl-4 pr-12 py-2.5 text-xs rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
            />
            <button data-ux-flow="knowledge.learn"
              aria-label="Gửi câu hỏi cho AI"
              type="submit"
              disabled={isLoading || !inputQuery.trim()}
              className="absolute right-1.5 p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
