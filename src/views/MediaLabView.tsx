import React, { useState } from 'react';
import {
  Mic2,
  Headphones,
  Plus,
  Youtube,
  Sparkles,
  BookOpen,
  ListOrdered,
  Radio,
  Play,
  Volume2,
  Trash2,
  ExternalLink,
  Layers,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Flame,
  Pencil,
  Save,
  X,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MediaSession, MediaTranscriptSegment } from '../types';
import { YouTubeUrlInputModal } from '../components/media/YouTubeUrlInputModal';
import { AudioTranscribeModal } from '../components/media/AudioTranscribeModal';
import { ShadowingStudio } from '../components/media/ShadowingStudio';
import { DictationStudio } from '../components/media/DictationStudio';
import { MediaVocabDrawer } from '../components/media/MediaVocabDrawer';
import { playTextToSpeech } from '../services/aiTutor';
import { saveMediaTranscript } from '../services/mediaService';

export const MediaLabView: React.FC = () => {
  const {
    mediaSessions,
    addMediaSession,
    updateMediaSession,
    deleteMediaSession,
    openAITutorWithPrompt,
  } = useApp();

  // Active state
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    mediaSessions[0]?.id || ''
  );
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'studio' | 'transcript' | 'vocab'>('studio');
  const [mode, setMode] = useState<'shadowing' | 'dictation'>('shadowing');
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isAudioTranscribeOpen, setIsAudioTranscribeOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [editedSegments, setEditedSegments] = useState<MediaTranscriptSegment[]>([]);
  const [isSavingTranscript, setIsSavingTranscript] = useState(false);
  const [transcriptNotice, setTranscriptNotice] = useState<string | null>(null);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);

  // Selected session helper
  const selectedSession =
    mediaSessions.find((s) => s.id === selectedSessionId) || mediaSessions[0];

  // Filtered sessions
  const filteredSessions = mediaSessions.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.title.toLowerCase().includes(q) ||
      s.topic.toLowerCase().includes(q)
    );
  });

  const handleSessionCreated = (newSession: MediaSession) => {
    addMediaSession(newSession);
    setSelectedSessionId(newSession.id);
    setActiveSegmentIndex(0);
    setActiveTab('studio');
  };

  const beginTranscriptEdit = () => {
    if (!selectedSession) return;
    setEditedSegments(selectedSession.transcriptSegments.map((segment) => ({ ...segment })));
    setTranscriptNotice(null);
    setTranscriptError(null);
    setIsEditingTranscript(true);
  };

  const updateEditedSegment = (index: number, patch: Partial<MediaTranscriptSegment>) => {
    setEditedSegments((segments) =>
      segments.map((segment, currentIndex) => currentIndex === index ? { ...segment, ...patch } : segment)
    );
  };

  const handleSaveTranscript = async () => {
    if (!selectedSession) return;
    const invalid = editedSegments.some((segment) =>
      !segment.text.trim() || !Number.isFinite(segment.start) || !Number.isFinite(segment.end) || segment.end < segment.start
    );
    if (invalid) {
      setTranscriptError('Mỗi câu cần có nội dung và mốc kết thúc không nhỏ hơn mốc bắt đầu.');
      return;
    }
    setIsSavingTranscript(true);
    setTranscriptError(null);
    try {
      await saveMediaTranscript(selectedSession.id, editedSegments);
      updateMediaSession({ ...selectedSession, transcriptSegments: editedSegments });
      setIsEditingTranscript(false);
      setTranscriptNotice('Đã lưu phiên bản transcript mới.');
    } catch (error: any) {
      setTranscriptError(error?.message || 'Không thể lưu transcript.');
    } finally {
      setIsSavingTranscript(false);
    }
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Bạn có chắc muốn xoá bài luyện Media này không?')) {
      deleteMediaSession(id);
      if (selectedSessionId === id) {
        const remaining = mediaSessions.filter((s) => s.id !== id);
        if (remaining.length > 0) {
          setSelectedSessionId(remaining[0].id);
        }
      }
    }
  };

  return (
    <div id="media-lab-module" className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 font-display flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Headphones className="w-6 h-6" />
            </div>
            <span>Media Lab: Shadowing & Nghe Chép Chính Tả (Dictation)</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1 max-w-2xl">
            Luyện ngữ điệu, nối âm (Connected Speech), trọng âm câu và phản xạ tai nghe từ video YouTube học thuật bất kỳ qua công nghệ AI.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <button data-ux-flow="media.learning"
            id="audio-transcribe-btn"
            onClick={() => setIsAudioTranscribeOpen(true)}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-violet-600/20 flex items-center gap-2 cursor-pointer transition-all hover:scale-102"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>🎙️ AI Audio Transcription (media-transcribe-v1)</span>
          </button>

          <button data-ux-flow="media.learning"
            id="import-youtube-btn"
            onClick={() => setIsImportModalOpen(true)}
            className="px-5 py-3 rounded-2xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-rose-600/20 flex items-center gap-2 cursor-pointer transition-all hover:scale-102"
          >
            <Youtube className="w-4 h-4" />
            <span>+ Nhập URL YouTube</span>
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Session Playlist (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300 flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-500" />
                <span>Thư Viện Bài Luyện ({mediaSessions.length})</span>
              </h2>
            </div>

            {/* Search filter */}
            <div className="relative">
              <input data-ux-flow="media.learning"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo chủ đề, tiêu đề..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
              />
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3 pointer-events-none" />
            </div>

            {/* Session List */}
            <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
              {filteredSessions.map((session) => {
                const isSelected = selectedSession?.id === session.id;
                return (
                  <div
                    key={session.id}
                    onClick={() => {
                      setSelectedSessionId(session.id);
                      setActiveSegmentIndex(0);
                    }}
                    className={`p-3.5 rounded-2xl transition-all border cursor-pointer group relative flex flex-col justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-sky-50/80 dark:bg-sky-950/50 border-sky-500 dark:border-sky-600 shadow-sm'
                        : 'bg-stone-50/70 dark:bg-stone-900/40 border-stone-200/80 dark:border-stone-700/80 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Thumbnail or Icon */}
                      {session.thumbnail ? (
                        <img
                          src={session.thumbnail}
                          alt={session.title}
                          referrerPolicy="no-referrer"
                          className="w-16 h-12 rounded-xl object-cover shrink-0 border border-stone-200 dark:border-stone-700"
                        />
                      ) : (
                        <div className="w-16 h-12 rounded-xl bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-stone-500 shrink-0">
                          <Youtube className="w-6 h-6" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div
                          className={`font-bold text-xs line-clamp-2 leading-snug ${
                            isSelected
                              ? 'text-sky-900 dark:text-sky-100'
                              : 'text-stone-900 dark:text-stone-100'
                          }`}
                        >
                          {session.title}
                        </div>
                        <div className="text-[11px] text-stone-500 dark:text-stone-400 truncate mt-1">
                          {session.channelTitle || session.topic}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-stone-100 dark:border-stone-700/60 text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-stone-500 dark:text-stone-400">
                          {session.transcriptSegments.length} câu
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button data-ux-flow="media.learning"
                          onClick={(e) => handleDeleteSession(e, session.id)}
                          className="p-1 text-stone-400 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                          title="Xóa bài luyện này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredSessions.length === 0 && (
                <div className="p-6 text-center text-stone-500 dark:text-stone-400 text-xs">
                  Không tìm thấy bài luyện phù hợp.
                </div>
              )}
            </div>

            {/* AI Pronunciation Helper Card */}
            <div className="pt-3 border-t border-stone-100 dark:border-stone-700">
              <button data-ux-flow="media.learning"
                onClick={() =>
                  openAITutorWithPrompt(
                    `Hãy hướng dẫn các quy tắc nối âm (Connected Speech), nuốt âm (Elision), và trọng âm câu (Sentence Stress) trong bài nghe "${selectedSession?.title || 'IELTS Speaking'}".`
                  )
                }
                className="w-full py-3 px-3.5 rounded-2xl bg-sky-50/80 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-xs font-bold flex items-center justify-center gap-2 hover:bg-sky-100 cursor-pointer transition-all"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Hỏi AI về kỹ thuật phát âm bài này</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Studio & Tabs (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {selectedSession ? (
            <div className="space-y-5">
              {/* Session Overview Card */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 uppercase">
                        {selectedSession.mediaType}
                      </span>
                      <span className="text-xs text-stone-500 dark:text-stone-400">
                        {selectedSession.topic}
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-black text-stone-900 dark:text-stone-100 font-display leading-snug">
                      {selectedSession.title}
                    </h2>
                  </div>

                  {/* Mode Switcher */}
                  <div className="bg-stone-100 dark:bg-stone-900 p-1 rounded-2xl flex items-center gap-1 border border-stone-200 dark:border-stone-700 shrink-0">
                    <button data-ux-flow="media.learning"
                      onClick={() => setMode('shadowing')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        mode === 'shadowing'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                      }`}
                    >
                      <Mic2 className="w-3.5 h-3.5" />
                      <span>Shadowing (Nói)</span>
                    </button>
                    <button data-ux-flow="media.learning"
                      onClick={() => setMode('dictation')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        mode === 'dictation'
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                      }`}
                    >
                      <Headphones className="w-3.5 h-3.5" />
                      <span>Dictation (Nghe Chép)</span>
                    </button>
                  </div>
                </div>

                {/* Sub-tabs for the Active Session */}
                <div className="flex items-center gap-2 border-b border-stone-100 dark:border-stone-700 pt-2">
                  <button data-ux-flow="media.learning"
                    onClick={() => setActiveTab('studio')}
                    className={`pb-3 px-3 text-xs font-bold transition-all flex items-center gap-1.5 border-b-2 cursor-pointer ${
                      activeTab === 'studio'
                        ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                        : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-300'
                    }`}
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>Luyện Tập Trực Tiếp (Studio)</span>
                  </button>

                  <button data-ux-flow="media.learning"
                    onClick={() => setActiveTab('transcript')}
                    className={`pb-3 px-3 text-xs font-bold transition-all flex items-center gap-1.5 border-b-2 cursor-pointer ${
                      activeTab === 'transcript'
                        ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                        : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-300'
                    }`}
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                    <span>Toàn Bộ Transcript ({selectedSession.transcriptSegments.length})</span>
                  </button>

                  <button data-ux-flow="media.learning"
                    onClick={() => setActiveTab('vocab')}
                    className={`pb-3 px-3 text-xs font-bold transition-all flex items-center gap-1.5 border-b-2 cursor-pointer ${
                      activeTab === 'vocab'
                        ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                        : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-300'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>
                      Từ Vựng C1/C2 ({selectedSession.extractedVocab?.length || 0})
                    </span>
                  </button>
                </div>
              </div>

              {/* TAB 1: STUDIO (Shadowing or Dictation) */}
              {activeTab === 'studio' && (
                <>
                  {mode === 'shadowing' ? (
                    <ShadowingStudio
                      session={selectedSession}
                      activeSegmentIndex={activeSegmentIndex}
                      onSelectSegmentIndex={setActiveSegmentIndex}
                    />
                  ) : (
                    <DictationStudio
                      session={selectedSession}
                      activeSegmentIndex={activeSegmentIndex}
                      onSelectSegmentIndex={setActiveSegmentIndex}
                    />
                  )}
                </>
              )}

              {/* TAB 2: FULL TRANSCRIPT LIST */}
              {activeTab === 'transcript' && (
                <div className="p-6 rounded-3xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                      <ListOrdered className="w-4 h-4 text-sky-500" />
                      <span>Danh Sách Từng Câu Khớp Thời Gian</span>
                    </h3>
                    <div className="flex items-center gap-2">
                      {!isEditingTranscript ? (
                        <button
                          type="button"
                          data-ux-flow="media.learning"
                          onClick={beginTranscriptEdit}
                          className="rounded-xl border border-stone-200 px-3 py-2 text-xs font-bold text-stone-700 hover:border-sky-400 dark:border-stone-700 dark:text-stone-200"
                        >
                          <Pencil className="mr-1.5 inline h-3.5 w-3.5" />
                          Chỉnh sửa transcript
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            data-ux-flow="media.learning"
                            onClick={() => setIsEditingTranscript(false)}
                            className="rounded-xl px-3 py-2 text-xs font-bold text-stone-500"
                          >
                            <X className="mr-1 inline h-3.5 w-3.5" /> Hủy
                          </button>
                          <button
                            type="button"
                            data-ux-flow="media.learning"
                            disabled={isSavingTranscript}
                            onClick={handleSaveTranscript}
                            className="rounded-xl bg-sky-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                          >
                            <Save className="mr-1 inline h-3.5 w-3.5" /> Lưu transcript
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {transcriptNotice && (
                    <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
                      {transcriptNotice}
                    </div>
                  )}
                  {transcriptError && (
                    <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200">
                      <AlertCircle className="h-4 w-4" /> {transcriptError}
                    </div>
                  )}

                  <div className="space-y-3">
                    {(isEditingTranscript ? editedSegments : selectedSession.transcriptSegments).map((seg, idx) => {
                      const isActive = activeSegmentIndex === idx;
                      return (
                        <div
                          key={seg.id || idx}
                          onClick={() => {
                            if (isEditingTranscript) return;
                            setActiveSegmentIndex(idx);
                            setActiveTab('studio');
                          }}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                            isActive
                              ? 'bg-sky-50/80 dark:bg-sky-950/40 border-sky-500 dark:border-sky-600 shadow-xs'
                              : 'bg-stone-50/60 dark:bg-stone-900/40 border-stone-200/80 dark:border-stone-700/80 hover:border-stone-300'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
                            <span className="font-bold flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 flex items-center justify-center text-[10px]">
                                {idx + 1}
                              </span>
                              {seg.speaker && <span>{seg.speaker}</span>}
                            </span>
                            <span>
                              [{seg.start.toFixed(1)}s - {seg.end.toFixed(1)}s]
                            </span>
                          </div>

                          {isEditingTranscript ? (
                            <div className="space-y-2" onClick={(event) => event.stopPropagation()}>
                              <div className="grid grid-cols-2 gap-2">
                                <label className="text-[11px] font-semibold text-stone-500">
                                  Bắt đầu (giây)
                                  <input
                                    data-ux-flow="media.learning"
                                    aria-label={`Bắt đầu câu ${idx + 1}`}
                                    type="number"
                                    step="0.1"
                                    value={seg.start}
                                    onChange={(event) => updateEditedSegment(idx, { start: Number(event.target.value) })}
                                    className="mt-1 w-full rounded-lg border border-stone-200 bg-white p-2 text-xs dark:border-stone-700 dark:bg-stone-900"
                                  />
                                </label>
                                <label className="text-[11px] font-semibold text-stone-500">
                                  Kết thúc (giây)
                                  <input
                                    data-ux-flow="media.learning"
                                    aria-label={`Kết thúc câu ${idx + 1}`}
                                    type="number"
                                    step="0.1"
                                    value={seg.end}
                                    onChange={(event) => updateEditedSegment(idx, { end: Number(event.target.value) })}
                                    className="mt-1 w-full rounded-lg border border-stone-200 bg-white p-2 text-xs dark:border-stone-700 dark:bg-stone-900"
                                  />
                                </label>
                              </div>
                              <textarea
                                data-ux-flow="media.learning"
                                aria-label={`Nội dung câu ${idx + 1}`}
                                value={seg.text}
                                onChange={(event) => updateEditedSegment(idx, { text: event.target.value })}
                                className="w-full rounded-xl border border-stone-200 bg-white p-3 text-sm font-semibold dark:border-stone-700 dark:bg-stone-900"
                              />
                              <textarea
                                data-ux-flow="media.learning"
                                aria-label={`Bản dịch câu ${idx + 1}`}
                                value={seg.translation || ''}
                                onChange={(event) => updateEditedSegment(idx, { translation: event.target.value })}
                                placeholder="Bản dịch (không bắt buộc)"
                                className="w-full rounded-xl border border-stone-200 bg-white p-3 text-xs dark:border-stone-700 dark:bg-stone-900"
                              />
                            </div>
                          ) : (
                            <>
                              <p className="text-sm font-serif font-bold text-stone-900 dark:text-stone-100 leading-relaxed">
                                "{seg.text}"
                              </p>
                              {seg.translation && (
                                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed font-sans">
                                  {seg.translation}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: EXTRACTED VOCAB */}
              {activeTab === 'vocab' && (
                <MediaVocabDrawer
                  vocabList={selectedSession.extractedVocab}
                  sessionTitle={selectedSession.title}
                  topic={selectedSession.topic}
                  transcriptText={selectedSession.transcriptSegments.map((segment) => segment.text).join(' ')}
                  onVocabExtracted={(items) => updateMediaSession({ ...selectedSession, extractedVocab: items })}
                />
              )}
            </div>
          ) : (
            <div className="p-12 text-center bg-white dark:bg-stone-800 rounded-3xl border border-stone-200 dark:border-stone-700 space-y-4">
              <Headphones className="w-12 h-12 text-stone-400 mx-auto" />
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Chưa có bài luyện tập nào
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Bấm "+ Nhập URL YouTube Mới" để dán đường link video học thuật bất kỳ và tạo bài học tự động.
              </p>
              <button data-ux-flow="media.learning"
                onClick={() => setIsImportModalOpen(true)}
                className="px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                + Nhập URL YouTube Ngay
              </button>
            </div>
          )}
        </div>
      </div>

      {/* YouTube Import Modal */}
      <YouTubeUrlInputModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSessionCreated={handleSessionCreated}
        onFallbackRequested={() => {
          setIsImportModalOpen(false);
          setIsAudioTranscribeOpen(true);
        }}
      />

      {/* AI Audio Transcription Modal */}
      <AudioTranscribeModal
        isOpen={isAudioTranscribeOpen}
        onClose={() => setIsAudioTranscribeOpen(false)}
        onSessionCreated={handleSessionCreated}
      />
    </div>
  );
};
