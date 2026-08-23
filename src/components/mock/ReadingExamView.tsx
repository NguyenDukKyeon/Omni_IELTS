import React, { useState, useRef, useEffect, MouseEvent as ReactMouseEvent } from 'react';
import { splitTextByAnnotations } from '../../lib/readingAnnotations';
import {
  BookOpen,
  Highlighter,
  Search,
  CheckCircle2,
  Bookmark,
  HelpCircle,
  StickyNote,
  Trash2,
  Plus,
  X,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Sliders,
  Eye,
  Edit3
} from 'lucide-react';
import { FullMockTestPackage, ExamColorScheme, ExamPassageNote } from '../../types';

interface ReadingExamViewProps {
  mockAttemptId: string;
  testPackage: FullMockTestPackage;
  currentQuestionNumber: number;
  userAnswers: Record<number, string>;
  onAnswerChange: (questionNumber: number, answer: string) => void;
  textSize: 'normal' | 'large' | 'xlarge';
  activePassageIndex: number;
  onSelectPassage: (index: number) => void;
  colorScheme?: ExamColorScheme;
}

export const ReadingExamView: React.FC<ReadingExamViewProps> = ({
  mockAttemptId,
  testPackage,
  currentQuestionNumber,
  userAnswers,
  onAnswerChange,
  textSize,
  activePassageIndex,
  onSelectPassage,
  colorScheme = 'standard',
}) => {
  // Split-Screen Width ratio state (percentage of left passage pane: 30% to 75%, default 50%)
  const [leftWidthPercent, setLeftWidthPercent] = useState<number>(50);
  const [isDraggingDivider, setIsDraggingDivider] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Highlighting state: Array of objects { text: string, color: 'yellow' | 'green' }
  const [highlights, setHighlights] = useState<Array<{ id: string; color: 'yellow' | 'green'; passageIndex: number; passageId: string; paragraphId: string; startOffset: number; endOffset: number }>>([]);
  
  // Sticky Notes state
  const [notes, setNotes] = useState<ExamPassageNote[]>([]);
  const [activeNoteModal, setActiveNoteModal] = useState<{ show: boolean; selectedText: string; paragraphLabel?: string; startOffset: number; endOffset: number } | null>(null);
  const [newNoteInput, setNewNoteInput] = useState<string>('');
  const [showNotesDrawer, setShowNotesDrawer] = useState<boolean>(false);

  // Floating selection context toolbar state
  const [selectionPopup, setSelectionPopup] = useState<{
    show: boolean;
    x: number;
    y: number;
    selectedText: string;
    paragraphLabel?: string;
    startOffset: number;
    endOffset: number;
  } | null>(null);

  const passages = testPackage.reading.passages;
  const currentPassage = passages[activePassageIndex] || passages[0];
  const annotationStorageKey = `omni_reading_annotations_${mockAttemptId}`;
  const [annotationLoadedKey, setAnnotationLoadedKey] = useState<string>('');

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(annotationStorageKey) || '{}');
      setHighlights(Array.isArray(saved.highlights) ? saved.highlights : []);
      setNotes(Array.isArray(saved.notes) ? saved.notes : []);
    } catch {
      setHighlights([]);
      setNotes([]);
    }
    setAnnotationLoadedKey(annotationStorageKey);
  }, [annotationStorageKey]);

  useEffect(() => {
    if (annotationLoadedKey !== annotationStorageKey) return;
    localStorage.setItem(annotationStorageKey, JSON.stringify({ highlights, notes }));
  }, [annotationLoadedKey, annotationStorageKey, highlights, notes]);

  // Font typography scale
  const fontClass =
    textSize === 'xlarge' ? 'text-lg leading-relaxed' : textSize === 'large' ? 'text-base leading-normal' : 'text-sm leading-normal';

  const fontClassPassage =
    textSize === 'xlarge' ? 'text-base leading-loose' : textSize === 'large' ? 'text-[15px] leading-relaxed' : 'text-[13.5px] leading-relaxed';

  // Handle Dragging Divider for Resizable Split-Screen
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingDivider || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
      if (newWidth >= 28 && newWidth <= 72) {
        setLeftWidthPercent(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingDivider(false);
    };

    if (isDraggingDivider) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingDivider]);

  // Handle Text Selection in Passage Pane
  const handlePassageMouseUp = (e: ReactMouseEvent<HTMLDivElement>, paragraphLabel?: string) => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    const paragraph = e.currentTarget.querySelector<HTMLElement>('[data-passage-paragraph]');
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    if (text && text.length > 2 && paragraph && range && paragraph.contains(range.commonAncestorContainer)) {
      const beforeStart = document.createRange();
      beforeStart.selectNodeContents(paragraph);
      beforeStart.setEnd(range.startContainer, range.startOffset);
      const startOffset = beforeStart.toString().length;
      const selectedLength = range.toString().length;
      setSelectionPopup({
        show: true,
        x: Math.min(e.clientX, window.innerWidth - 240),
        y: Math.max(e.clientY - 45, 60),
        selectedText: text,
        paragraphLabel,
        startOffset,
        endOffset: startOffset + selectedLength,
      });
    } else {
      // Delay clear slightly to allow button click
      setTimeout(() => {
        if (!selection?.toString().trim()) {
          setSelectionPopup(null);
        }
      }, 150);
    }
  };

  // Add Highlight
  const handleAddHighlight = (color: 'yellow' | 'green') => {
    if (!selectionPopup?.selectedText) return;
    const newHighlight = {
      id: `hl_${Date.now()}`,
      color,
      passageIndex: activePassageIndex,
      passageId: `${testPackage.id}:passage:${currentPassage.passageNumber}`,
      paragraphId: selectionPopup.paragraphLabel || '',
      startOffset: selectionPopup.startOffset,
      endOffset: selectionPopup.endOffset,
    };
    setHighlights((prev) => [...prev, newHighlight]);
    setSelectionPopup(null);
    window.getSelection()?.removeAllRanges();
  };

  // Remove Highlight
  const handleRemoveHighlight = () => {
    if (!selectionPopup?.selectedText) return;
    setHighlights((prev) => prev.filter((highlight) => !(
      highlight.passageIndex === activePassageIndex
      && highlight.paragraphId === selectionPopup.paragraphLabel
      && highlight.startOffset < selectionPopup.endOffset
      && highlight.endOffset > selectionPopup.startOffset
    )));
    setSelectionPopup(null);
    window.getSelection()?.removeAllRanges();
  };

  // Open Take Note Modal
  const handleOpenTakeNote = () => {
    if (!selectionPopup?.selectedText) return;
    setActiveNoteModal({
      show: true,
      selectedText: selectionPopup.selectedText,
      paragraphLabel: selectionPopup.paragraphLabel,
      startOffset: selectionPopup.startOffset,
      endOffset: selectionPopup.endOffset,
    });
    setNewNoteInput('');
    setSelectionPopup(null);
  };

  // Save Sticky Note
  const handleSaveNote = () => {
    if (!activeNoteModal || !newNoteInput.trim()) return;
    const newNote: ExamPassageNote = {
      id: `note_${Date.now()}`,
      passageIndex: activePassageIndex,
      paragraphLabel: activeNoteModal.paragraphLabel,
      selectedText: activeNoteModal.selectedText,
      noteText: newNoteInput.trim(),
      color: '#fef08a',
      createdAt: new Date().toLocaleTimeString(),
      mockAttemptId,
      passageId: `${testPackage.id}:passage:${currentPassage.passageNumber}`,
      paragraphId: activeNoteModal.paragraphLabel,
      startOffset: activeNoteModal.startOffset,
      endOffset: activeNoteModal.endOffset,
    };
    setNotes((prev) => [...prev, newNote]);
    setActiveNoteModal(null);
    setNewNoteInput('');
  };

  const handleDeleteNote = (noteId: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  // Theme Styles
  const themeBgClass =
    colorScheme === 'high_contrast'
      ? 'bg-black text-yellow-300'
      : colorScheme === 'inverted'
      ? 'bg-slate-50 text-slate-900'
      : 'bg-slate-900 text-slate-100';

  const passagePaneBg =
    colorScheme === 'high_contrast'
      ? 'bg-black border-yellow-500/40 text-yellow-200'
      : colorScheme === 'inverted'
      ? 'bg-white border-slate-300 text-slate-800'
      : 'bg-slate-950/50 border-slate-800 text-slate-300';

  const questionsPaneBg =
    colorScheme === 'high_contrast'
      ? 'bg-black text-yellow-300'
      : colorScheme === 'inverted'
      ? 'bg-slate-100 text-slate-900'
      : 'bg-slate-900/70 text-slate-200';

  const passageNotes = notes.filter((n) => n.passageIndex === activePassageIndex);

  // Helper to render paragraph with highlighted substrings
  const renderParagraphWithHighlights = (paraText: string, paraLabel: string) => {
    const currentPassageHighlights = highlights.filter((h) => h.passageIndex === activePassageIndex && h.paragraphId === paraLabel);
    if (currentPassageHighlights.length === 0) {
      return paraText;
    }

    const parts = splitTextByAnnotations(paraText, currentPassageHighlights);

    return parts.map((part, pIdx) => {
      if (part.highlightIds.length > 0) {
        return (
          <mark
            key={pIdx}
            className={`rounded px-1 font-semibold ${
              part.color === 'green'
                ? 'bg-emerald-400/90 text-slate-950'
                : 'bg-amber-300/95 text-slate-950 shadow-sm'
            }`}
          >
            {part.text}
          </mark>
        );
      }
      return <span key={pIdx}>{part.text}</span>;
    });
  };

  return (
    <div className={`flex-1 flex flex-col h-full ${themeBgClass} overflow-hidden relative select-text`}>
      {/* Passage Selector Bar */}
      <div className={`px-4 py-2 flex flex-wrap items-center justify-between gap-3 border-b ${
        colorScheme === 'high_contrast'
          ? 'bg-black border-yellow-500'
          : colorScheme === 'inverted'
          ? 'bg-slate-200 border-slate-300'
          : 'bg-slate-950 border-slate-800'
      }`}>
        {/* Left: Passage Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg border border-slate-700/60">
          {passages.map((p, idx) => (
            <button data-ux-flow="mock.exam"
              key={p.passageNumber}
              onClick={() => onSelectPassage(idx)}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                activePassageIndex === idx
                  ? colorScheme === 'high_contrast'
                    ? 'bg-yellow-400 text-black font-bold shadow'
                    : 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Passage {p.passageNumber} (Q{p.questions[0]?.number}-{p.questions[p.questions.length - 1]?.number})
            </button>
          ))}
        </div>

        {/* Right: Quick Split-Screen Presets & Notes Badge */}
        <div className="flex items-center gap-2">
          {/* Split presets */}
          <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-slate-400">
            <span className="mr-1">Tỷ lệ chia:</span>
            <button data-ux-flow="mock.exam"
              onClick={() => setLeftWidthPercent(35)}
              className={`px-2 py-0.5 rounded border ${leftWidthPercent <= 38 ? 'bg-slate-700 text-white font-bold border-slate-500' : 'border-slate-800 hover:bg-slate-800'}`}
              title="35% Bài đọc - 65% Câu hỏi"
            >
              35:65
            </button>
            <button data-ux-flow="mock.exam"
              onClick={() => setLeftWidthPercent(50)}
              className={`px-2 py-0.5 rounded border ${leftWidthPercent >= 45 && leftWidthPercent <= 55 ? 'bg-slate-700 text-white font-bold border-slate-500' : 'border-slate-800 hover:bg-slate-800'}`}
              title="50% Bài đọc - 50% Câu hỏi (Chuẩn IDP)"
            >
              50:50
            </button>
            <button data-ux-flow="mock.exam"
              onClick={() => setLeftWidthPercent(65)}
              className={`px-2 py-0.5 rounded border ${leftWidthPercent >= 62 ? 'bg-slate-700 text-white font-bold border-slate-500' : 'border-slate-800 hover:bg-slate-800'}`}
              title="65% Bài đọc - 35% Câu hỏi"
            >
              65:35
            </button>
          </div>

          {/* Sticky Notes Drawer Trigger */}
          <button data-ux-flow="mock.exam"
            onClick={() => setShowNotesDrawer(!showNotesDrawer)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              passageNotes.length > 0
                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <StickyNote className="w-3.5 h-3.5" />
            <span>Ghi chú ({passageNotes.length})</span>
          </button>
        </div>
      </div>

      {/* Main Split-Screen Workspace with Resizable Divider */}
      <div ref={containerRef} className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Column: Academic Reading Passage */}
        <div
          id="reading-passage-pane"
          style={{ width: window.innerWidth >= 1024 ? `${leftWidthPercent}%` : '100%' }}
          className={`h-full overflow-y-auto p-4 sm:p-6 lg:p-7 space-y-6 ${passagePaneBg} transition-all`}
        >
          {/* Passage Header */}
          <div className="border-b border-slate-800/80 pb-4">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider ${colorScheme === 'high_contrast' ? 'text-yellow-400' : 'text-emerald-400'}`}>
                READING PASSAGE {currentPassage.passageNumber}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {currentPassage.wordCount} words
              </span>
            </div>
            <h1 className={`text-lg sm:text-xl font-bold mt-1.5 ${colorScheme === 'high_contrast' ? 'text-yellow-300' : 'text-white'}`}>
              {currentPassage.title}
            </h1>
            {currentPassage.subtitle && (
              <p className="text-xs sm:text-sm text-slate-400 mt-1 italic">
                {currentPassage.subtitle}
              </p>
            )}
          </div>

          {/* Optional Headings List */}
          {currentPassage.headingsList && (
            <div className={`rounded-xl p-4 space-y-2 border ${colorScheme === 'high_contrast' ? 'bg-black border-yellow-500' : colorScheme === 'inverted' ? 'bg-slate-100 border-slate-300' : 'bg-slate-900 border-slate-700/80'}`}>
              <h3 className={`text-xs font-bold uppercase tracking-wider ${colorScheme === 'high_contrast' ? 'text-yellow-300' : 'text-emerald-400'}`}>
                List of Headings (Danh sách Tiêu đề)
              </h3>
              <div className="grid grid-cols-1 gap-1.5 text-xs font-mono">
                {currentPassage.headingsList.map((h) => (
                  <div key={h.id} className="flex items-start gap-2 p-1.5 rounded bg-black/40 border border-slate-800/80">
                    <span className="font-bold text-emerald-400 min-w-[24px]">[{h.id}]</span>
                    <span className="text-slate-300">{h.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Paragraphs with Clear Label Markers [A], [B], [C]... and text selection */}
          <div className="space-y-6">
            {currentPassage.paragraphs.map((para) => {
              const paraNotes = notes.filter((n) => n.passageIndex === activePassageIndex && n.paragraphLabel === para.label);

              return (
                <div
                  key={para.label}
                  className="relative group rounded-xl transition-all"
                  onMouseUp={(e) => handlePassageMouseUp(e, para.label)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <span className={`sticky top-2 px-2.5 py-1 rounded font-mono font-bold text-xs shadow-sm border ${
                        colorScheme === 'high_contrast'
                          ? 'bg-yellow-400 text-black border-yellow-300'
                          : 'bg-emerald-950 border-emerald-700/80 text-emerald-300'
                      }`}>
                        [{para.label}]
                      </span>
                      {paraNotes.length > 0 && (
                        <span
                          onClick={() => setShowNotesDrawer(true)}
                          className="cursor-pointer text-[10px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400 font-bold"
                          title="Xem ghi chú đoạn này"
                        >
                          📝 {paraNotes.length}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p data-passage-paragraph={para.label} className={`text-justify tracking-normal font-sans ${fontClassPassage}`}>
                        {renderParagraphWithHighlights(para.text, para.label)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resizable Divider Handle (Kéo thả để chia độ rộng) */}
        <div
          onMouseDown={() => setIsDraggingDivider(true)}
          className="hidden lg:flex w-2.5 bg-slate-800 hover:bg-blue-500 cursor-col-resize items-center justify-center transition-colors group relative z-10 select-none shadow-md"
          title="Kéo sang trái hoặc phải để điều chỉnh kích thước bài đọc & câu hỏi"
        >
          <div className="w-1 h-8 bg-slate-600 group-hover:bg-white rounded-full transition-colors" />
        </div>

        {/* Right Column: Questions List */}
        <div
          id="reading-questions-pane"
          style={{ width: window.innerWidth >= 1024 ? `${100 - leftWidthPercent}%` : '100%' }}
          className={`h-full overflow-y-auto p-4 sm:p-6 lg:p-7 space-y-5 ${questionsPaneBg}`}
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${colorScheme === 'high_contrast' ? 'text-yellow-300' : 'text-slate-200'}`}>
              <BookOpen className="w-4 h-4 text-emerald-400" />
              Câu hỏi ({currentPassage.questions.length} câu)
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              Passage {currentPassage.passageNumber} (Q{currentPassage.questions[0]?.number} - Q{currentPassage.questions[currentPassage.questions.length - 1]?.number})
            </span>
          </div>

          {/* Render Questions for Current Passage */}
          <div className="space-y-4">
            {currentPassage.questions.map((q) => {
              const isCurrent = q.number === currentQuestionNumber;
              const currentAns = userAnswers[q.number] || '';

              return (
                <div
                  key={q.id}
                  id={`reading-question-${q.number}`}
                  className={`p-4 rounded-xl border transition-all ${
                    isCurrent
                      ? colorScheme === 'high_contrast'
                        ? 'bg-black border-yellow-400 ring-2 ring-yellow-400 shadow-lg'
                        : 'bg-slate-950 border-emerald-500 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/50'
                      : colorScheme === 'high_contrast'
                      ? 'bg-black border-yellow-500/40 text-yellow-300'
                      : colorScheme === 'inverted'
                      ? 'bg-white border-slate-300 text-slate-900 shadow-sm'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`w-7 h-7 rounded text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                        isCurrent
                          ? colorScheme === 'high_contrast'
                            ? 'bg-yellow-400 text-black font-bold'
                            : 'bg-emerald-600 text-white'
                          : currentAns
                          ? 'bg-slate-800 text-slate-200 border border-slate-600'
                          : 'bg-slate-900 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {q.number}
                    </span>

                    <div className="flex-1 min-w-0">
                      <p className={`font-medium mb-3 ${fontClass}`}>
                        {q.prompt}
                      </p>

                      {/* 1. True / False / Not Given & Yes / No / Not Given */}
                      {(q.type === 'true_false_not_given' || q.type === 'yes_no_not_given') && (
                        <div className="flex flex-wrap gap-2">
                          {(q.type === 'true_false_not_given'
                            ? ['TRUE', 'FALSE', 'NOT GIVEN']
                            : ['YES', 'NO', 'NOT GIVEN']
                          ).map((val) => {
                            const isSelected = currentAns.toUpperCase() === val;
                            return (
                              <button data-ux-flow="mock.exam"
                                key={val}
                                onClick={() => onAnswerChange(q.number, val)}
                                className={`px-4 py-2 rounded-lg font-mono font-bold text-xs border transition-all ${
                                  isSelected
                                    ? colorScheme === 'high_contrast'
                                      ? 'bg-yellow-400 text-black border-yellow-300 font-bold'
                                      : 'bg-emerald-600 border-emerald-400 text-white shadow-sm scale-[1.02]'
                                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                                }`}
                              >
                                {val}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* 2. Matching Headings / Roman Numeral Buttons */}
                      {q.type === 'matching_headings' && (
                        <div className="flex flex-wrap gap-1.5">
                          {['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii'].map((roman) => {
                            const isSelected = currentAns.toLowerCase() === roman;
                            return (
                              <button data-ux-flow="mock.exam"
                                key={roman}
                                onClick={() => onAnswerChange(q.number, roman)}
                                className={`w-9 h-9 rounded-lg font-mono font-bold text-xs border transition-all flex items-center justify-center ${
                                  isSelected
                                    ? colorScheme === 'high_contrast'
                                      ? 'bg-yellow-400 text-black font-bold'
                                      : 'bg-emerald-600 border-emerald-400 text-white shadow-sm'
                                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                                }`}
                              >
                                {roman}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* 3. Multiple Choice */}
                      {q.type === 'multiple_choice' && q.options && (
                        <div className="space-y-2">
                          {q.options.map((opt, oIdx) => {
                            const optionLetter = opt.charAt(0);
                            const isSelected = currentAns.toUpperCase() === optionLetter;

                            return (
                              <label
                                key={oIdx}
                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                  isSelected
                                    ? colorScheme === 'high_contrast'
                                      ? 'bg-yellow-950/80 border-yellow-400 text-yellow-200'
                                      : 'bg-emerald-950/60 border-emerald-500 text-white shadow-sm'
                                    : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900 text-slate-300'
                                }`}
                              >
                                <input data-ux-flow="mock.exam"
                                  type="radio"
                                  name={`reading-q-${q.number}`}
                                  value={optionLetter}
                                  checked={isSelected}
                                  onChange={() => onAnswerChange(q.number, optionLetter)}
                                  className="w-4 h-4 text-emerald-500 focus:ring-emerald-500 bg-slate-800 border-slate-700"
                                />
                                <span className={fontClass}>{opt}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {/* 4. Gap Fill / Sentence Completion */}
                      {(q.type === 'gap_fill' || q.type === 'sentence_completion') && (
                        <div className="flex items-center gap-2 max-w-md">
                          <input data-ux-flow="mock.exam"
                            type="text"
                            value={currentAns}
                            onChange={(e) => onAnswerChange(q.number, e.target.value)}
                            placeholder="Nhập từ chính xác trong bài đọc..."
                            className={`w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono ${fontClass}`}
                          />
                          {currentAns && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating Selection Action Toolbar for Highlight & Take Note */}
      {selectionPopup?.show && (
        <div
          style={{ top: `${selectionPopup.y}px`, left: `${selectionPopup.x}px` }}
          className="fixed z-50 flex items-center gap-1 p-1 bg-slate-950 border border-slate-700 rounded-xl shadow-2xl animate-fadeIn"
        >
          {/* Yellow Highlight Button */}
          <button data-ux-flow="mock.exam"
            onClick={() => handleAddHighlight('yellow')}
            className="flex items-center gap-1 px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg shadow-sm"
            title="Bôi màu vàng"
          >
            🟡 Highlight
          </button>

          {/* Green Highlight Button */}
          <button data-ux-flow="mock.exam"
            onClick={() => handleAddHighlight('green')}
            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg shadow-sm"
            title="Bôi màu xanh lá"
          >
            🟢 Xanh
          </button>

          {/* Take Note Button */}
          <button data-ux-flow="mock.exam"
            onClick={handleOpenTakeNote}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs rounded-lg border border-slate-700"
            title="Ghi chú đoạn văn này"
          >
            <StickyNote className="w-3 h-3 text-amber-300" />
            <span>Note</span>
          </button>

          {/* Remove Highlight */}
          <button data-ux-flow="mock.exam"
            onClick={handleRemoveHighlight}
            className="p-1 text-slate-400 hover:text-rose-300 rounded hover:bg-slate-800"
            title="Xóa Highlight"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Take Note Modal */}
      {activeNoteModal?.show && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 text-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-amber-400" />
                Gắn Ghi Chú (Sticky Note) {activeNoteModal.paragraphLabel ? `— Đoạn [${activeNoteModal.paragraphLabel}]` : ''}
              </h3>
              <button data-ux-flow="mock.exam"
                onClick={() => setActiveNoteModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-slate-400 italic">
              "{activeNoteModal.selectedText.length > 120 ? activeNoteModal.selectedText.substring(0, 120) + '...' : activeNoteModal.selectedText}"
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                Nội dung ghi chú của bạn:
              </label>
              <textarea data-ux-flow="mock.exam"
                value={newNoteInput}
                onChange={(e) => setNewNoteInput(e.target.value)}
                placeholder="VD: Từ khóa chính là 'solar radiation', liên quan đến câu 14..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button data-ux-flow="mock.exam"
                onClick={() => setActiveNoteModal(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg font-medium"
              >
                Hủy
              </button>
              <button data-ux-flow="mock.exam"
                onClick={handleSaveNote}
                disabled={!newNoteInput.trim()}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-lg shadow-sm"
              >
                Lưu Ghi Chú
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Notes Side Drawer */}
      {showNotesDrawer && (
        <div className="fixed top-0 right-0 bottom-0 w-80 bg-slate-900 border-l border-slate-700 shadow-2xl z-40 flex flex-col p-5 animate-slideLeft">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <StickyNote className="w-4 h-4 text-amber-400" />
              Danh sách Ghi chú ({notes.length})
            </h3>
            <button data-ux-flow="mock.exam"
              onClick={() => setShowNotesDrawer(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            {notes.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center mt-10">
                Chưa có ghi chú nào. Hãy bôi đen văn bản trong bài đọc và chọn "Note" để gắn ghi chú.
              </p>
            ) : (
              notes.map((n) => (
                <div key={n.id} className="p-3 bg-amber-400/10 border border-amber-400/40 rounded-xl space-y-1.5 relative group">
                  <div className="flex items-center justify-between text-[10px] text-amber-300 font-mono font-bold">
                    <span>Passage {n.passageIndex + 1} {n.paragraphLabel ? `• Đoạn [${n.paragraphLabel}]` : ''}</span>
                    <span>{n.createdAt}</span>
                  </div>
                  <p className="text-xs text-white font-medium">
                    {n.noteText}
                  </p>
                  <p className="text-[11px] text-slate-400 italic line-clamp-1 border-t border-slate-800/80 pt-1">
                    "{n.selectedText}"
                  </p>
                  <button data-ux-flow="mock.exam"
                    onClick={() => handleDeleteNote(n.id)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-300 p-1"
                    title="Xóa ghi chú"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
