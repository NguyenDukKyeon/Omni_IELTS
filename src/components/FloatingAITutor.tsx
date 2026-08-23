import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Volume2,
  Minimize2,
  Maximize2,
  RefreshCw,
  Lightbulb,
  CornerDownLeft,
  Search,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { playTextToSpeech } from '../services/aiTutor';

export const FloatingAITutor: React.FC = () => {
  const {
    isAITutorOpen,
    setIsAITutorOpen,
    activeModule,
    profile,
    tutorMessages,
    sendTutorMessage,
    isTutorLoading,
  } = useApp();

  const [inputText, setInputText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [researchMode, setResearchMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isAITutorOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [tutorMessages, isAITutorOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isAITutorOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isAITutorOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isTutorLoading) return;
    const text = inputText.trim();
    setInputText('');
    await sendTutorMessage(text, researchMode);
  };

  const handleChipClick = async (chipText: string) => {
    if (isTutorLoading) return;
    await sendTutorMessage(chipText, researchMode);
  };

  const getContextLabel = (mod: string) => {
    switch (mod) {
      case 'dashboard':
        return 'Trang chủ & Lộ trình';
      case 'sources':
        return 'Nguồn học liệu (Đa nguồn)';
      case 'vocabulary':
        return 'Từ vựng (SRS Flashcards)';
      case 'grammar':
        return 'Ngữ pháp IELTS';
      case 'media':
        return 'Media Lab (Shadowing/Dictation)';
      case 'practice':
        return 'Luyện tập 4 Kỹ năng';
      case 'mock_test':
        return 'Thi thử IELTS';
      case 'knowledge':
        return 'Kiến thức & Chiến thuật';
      case 'profile':
        return 'Hồ sơ người học';
      default:
        return 'Chung';
    }
  };

  const getQuickContextChips = (mod: string): string[] => {
    switch (mod) {
      case 'sources':
        return [
          'Trích xuất thêm 3 từ vựng C1 từ tài liệu này',
          'Tóm tắt bài này thành 3 ý chính cho Speaking',
          'Chỉ ra điểm ngữ pháp đắt giá trong bài',
        ];
      case 'vocabulary':
        return [
          'Đặt câu đố trắc nghiệm về từ vựng tôi đang ôn',
          'Cho ví dụ áp dụng từ này vào Speaking Part 3',
          'Tìm 3 cụm collocations thông dụng nhất',
        ];
      case 'grammar':
        return [
          'Giải thích cách đảo ngữ ghi điểm trong Writing Task 2',
          'Phân biệt khi nào dùng câu chẻ (Cleft sentences)',
          'Cho ví dụ sửa lỗi ngữ pháp thường gặp',
        ];
      case 'media':
        return [
          'Giải thích hiện tượng nối âm trong câu này',
          'Làm thế nào để phát âm âm đuôi (ending sounds) tự nhiên?',
          'Gợi ý cách luyện Shadowing không bị hụt hơi',
        ];
      case 'practice':
        return [
          'Nâng cấp câu văn này lên chuẩn Band 8.0+',
          'Phản biện luận điểm Task 2 này giúp tôi',
          'Gợi ý dàn ý 4 bước theo phương pháp PEEL',
        ];
      case 'mock_test':
        return [
          'Chiến thuật xử lý bẫy trong Listening Section 3',
          'Cách phân bổ thời gian 60 phút cho Reading',
          'Làm sao tránh bẫy Not Given trong Reading?',
        ];
      default:
        return [
          'Hôm nay tôi nên tập trung vào kỹ năng nào nhất?',
          'Chỉ cho tôi 3 cấu trúc ăn điểm IELTS Writing',
          'Giải thích tiêu chí Lexical Resource Band 7.5',
        ];
    }
  };

  const quickChips = getQuickContextChips(activeModule);

  return (
    <>
      {/* Floating Button (always visible across all screens) */}
      {!isAITutorOpen && (
        <button
          id="floating-ai-tutor-trigger"
          onClick={() => setIsAITutorOpen(true)}
          className="fixed bottom-16 md:bottom-6 right-4 sm:right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-full bg-slate-900 dark:bg-blue-600 text-white font-bold text-sm shadow-xl shadow-slate-900/25 dark:shadow-blue-600/30 hover:scale-105 active:scale-95 transition-all duration-200 group border border-white/20 cursor-pointer"
          title="Hỏi Gia sư AI về nội dung màn hình này"
          aria-label="Open AI Tutor"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-amber-300" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-slate-900 dark:ring-blue-600 animate-ping" />
          </div>
          <span className="tracking-wide">Hỏi AI Tutor</span>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-semibold hidden sm:inline">
            Band {profile.targetBand.toFixed(1)}
          </span>
        </button>
      )}

      {/* Floating AI Chat Window / Drawer */}
      {isAITutorOpen && (
        <div
          id="ai-tutor-drawer"
          className={`fixed z-50 transition-all duration-300 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl overflow-hidden ${
            isExpanded
              ? 'inset-4 md:inset-10'
              : 'bottom-4 right-4 w-[calc(100vw-2rem)] sm:w-[420px] md:w-[460px] h-[580px] max-h-[calc(100vh-2rem)]'
          }`}
        >
          {/* Header */}
          <div className="p-4 bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-between shadow-xs shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-blue-600 flex items-center justify-center border border-white/20 shadow-xs">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 font-bold text-sm">
                  <span>Omni IELTS AI Tutor</span>
                  <span className="text-[10px] bg-emerald-400 text-slate-900 font-extrabold px-1.5 py-0.2 rounded-full">
                    Active
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 flex items-center gap-1">
                  <span>Ngữ cảnh:</span>
                  <strong className="underline decoration-blue-400">
                    {getContextLabel(activeModule)}
                  </strong>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                id="ai-tutor-expand-btn"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-xl hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer"
                title={isExpanded ? 'Thu nhỏ' : 'Mở rộng'}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                id="ai-tutor-close-btn"
                onClick={() => setIsAITutorOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer"
                title="Đóng cửa sổ"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Context Header Pill Bar */}
          <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/50 flex items-center justify-between text-xs text-blue-900 dark:text-blue-200">
            <div className="flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="truncate">
                AI trả lời thích ứng theo mục tiêu <strong>Band {profile.currentBand} ➔ {profile.targetBand}</strong>
              </span>
            </div>
          </div>

          {/* Messages Thread */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-950/40 custom-scrollbar">
            {tutorMessages.map((msg) => {
              const isAssistant = msg.role === 'assistant';

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isAssistant ? 'items-start' : 'items-start flex-row-reverse'}`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isAssistant
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed shadow-xs ${
                      isAssistant
                        ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80'
                        : 'bg-blue-600 text-white font-medium rounded-tr-sm'
                    }`}
                  >
                    <div className="whitespace-pre-wrap space-y-1.5">{msg.content}</div>

                    {/* Audio TTS button for assistant */}
                    {isAssistant && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <button
                          onClick={() => playTextToSpeech(msg.content)}
                          className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                          title="Đọc to phát âm bằng tiếng Anh chuẩn"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Nghe phát âm</span>
                        </button>
                        <span className="text-[10px]">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}

                    {/* Follow up suggestions */}
                    {isAssistant && msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/60 space-y-1.5">
                        <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          <span>Gợi ý hỏi tiếp:</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.suggestedFollowUps.map((chip, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleChipClick(chip)}
                              className="text-left text-[11px] px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors cursor-pointer"
                            >
                              {chip}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {isAssistant && msg.citations && msg.citations.length > 0 && (
                      <details className="mt-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/40 p-2.5">
                        <summary className="cursor-pointer text-[11px] font-bold text-blue-700 dark:text-blue-300">
                          Nguồn tra cứu ({msg.citations.length}) · {msg.retrievedAt ? new Date(msg.retrievedAt).toLocaleString() : ''}
                        </summary>
                        <div className="mt-2 space-y-1.5">
                          {msg.citations.map((citation) => (
                            <a
                              key={`${citation.claimId}-${citation.url}`}
                              href={citation.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-start gap-1.5 text-[11px] text-blue-700 dark:text-blue-300 hover:underline"
                            >
                              <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" />
                              <span>{citation.title}</span>
                            </a>
                          ))}
                          <p className="text-[10px] text-amber-700 dark:text-amber-300">
                            Hãy kiểm tra lại nguồn trước khi dùng dẫn chứng trong Writing.
                          </p>
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              );
            })}

            {isTutorLoading && (
              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400" />
                  <span>AI Tutor đang phân tích ngữ cảnh và phản hồi...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Context Prompt Chips */}
          <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 overflow-x-auto flex items-center gap-1.5 no-scrollbar shrink-0">
            <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 whitespace-nowrap">
              Hỏi nhanh:
            </span>
            {quickChips.map((chip, i) => (
              <button
                key={i}
                onClick={() => handleChipClick(chip)}
                disabled={isTutorLoading}
                className="whitespace-nowrap text-[11px] font-medium px-2.5 py-1 rounded-full bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors shadow-2xs cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleSend}
            className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2 shrink-0"
          >
            <button
              type="button"
              onClick={() => setResearchMode((enabled) => !enabled)}
              aria-pressed={researchMode}
              className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-[11px] font-bold transition-colors ${researchMode ? 'border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}
              title="Dùng Google Search Grounding và quota Gemini BYOK"
            >
              <Search className="h-3.5 w-3.5" />
              Tra cứu dẫn chứng
            </button>
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Hỏi về ${getContextLabel(activeModule)}...`}
              disabled={isTutorLoading}
              className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isTutorLoading}
              className="p-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white transition-all shrink-0 cursor-pointer"
              title="Gửi câu hỏi"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
