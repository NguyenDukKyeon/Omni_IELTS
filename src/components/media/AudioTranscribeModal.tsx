import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Mic,
  MicOff,
  Upload,
  Sparkles,
  RotateCcw,
  Play,
  Pause,
  Volume2,
  Check,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  BookmarkPlus,
  ShieldAlert,
  Sliders,
  FileAudio,
  Radio,
  Layers,
} from 'lucide-react';
import {
  AudioTranscribeResult,
  AudioTranscribeSegment,
  AudioTranscribeVocabItem,
  MediaSession,
  MediaTranscriptSegment,
  VocabCard,
} from '../../types';
import { transcribeAudioAndSegmentApi } from '../../services/mediaService';
import { segmentUntimedTranscript } from '../../lib/mediaImport';
import { parseTimedCaptionText } from '../../lib/transcriptNormalizer';
import { speakExaminerText } from '../../services/practiceService';
import { useApp } from '../../context/AppContext';
import { XP_REWARDS } from '../../services/gamification';

interface AudioTranscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionCreated?: (session: MediaSession) => void;
}

export const AudioTranscribeModal: React.FC<AudioTranscribeModalProps> = ({
  isOpen,
  onClose,
  onSessionCreated,
}) => {
  const { addVocabCard, awardXP } = useApp();

  const [inputMode, setInputMode] = useState<'upload' | 'record' | 'captions'>('upload');
  const [topicContext, setTopicContext] = useState<string>('IELTS Academic Audio');

  // File Upload State
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioBase64, setAudioBase64] = useState<string>('');
  const [audioMimeType, setAudioMimeType] = useState<string>('audio/mp3');
  const [captionText, setCaptionText] = useState('');
  const [captionFileName, setCaptionFileName] = useState('');

  // Mic Recording State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Processing & Results
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<AudioTranscribeResult | null>(null);

  // Audio Playback
  const [playingSegmentIndex, setPlayingSegmentIndex] = useState<number | null>(null);
  const [syncedVocab, setSyncedVocab] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!isOpen) {
      setResult(null);
      setErrorMessage(null);
      setAudioFile(null);
      setAudioBase64('');
      setCaptionText('');
      setCaptionFileName('');
      setIsRecording(false);
      setPlayingSegmentIndex(null);
      setSyncedVocab({});
      if (timerRef.current) clearInterval(timerRef.current);
      window.speechSynthesis?.cancel();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAudioFile(file);
    setAudioMimeType(file.type || 'audio/mp3');

    const reader = new FileReader();
    reader.onload = () => {
      const base64Str = reader.result as string;
      setAudioBase64(base64Str);
    };
    reader.readAsDataURL(file);
  };

  const handleCaptionFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage('File phụ đề vượt giới hạn 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCaptionText(String(reader.result || ''));
      setCaptionFileName(file.name);
      setErrorMessage(null);
    };
    reader.readAsText(file);
  };

  // Start Mic Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioMimeType('audio/webm');
        const reader = new FileReader();
        reader.onloadend = () => {
          setAudioBase64(reader.result as string);
        };
        reader.readAsDataURL(audioBlob);

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      setErrorMessage('Không thể truy cập Microphone: ' + (err?.message || 'Lỗi quyền truy cập.'));
    }
  };

  // Stop Mic Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  // Submit to Engine
  const handleTranscribe = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setResult(null);
    setSyncedVocab({});

    try {
      if (inputMode === 'captions') {
        const segments = captionText.includes('-->')
          ? parseTimedCaptionText(captionText)
          : segmentUntimedTranscript(captionText);
        if (!segments.length) throw new Error('Hãy tải VTT/SRT hoặc dán transcript có nội dung trước.');
        setResult({
          promptVersion: captionText.includes('-->') ? 'user-caption-v1' : 'user-transcript-v1',
          segments: segments.map((segment) => ({
            startSec: segment.start,
            endSec: segment.end,
            speaker: 'Original audio',
            text: segment.text,
            confidence: captionText.includes('-->') ? 'high' : 'medium',
          })),
          detectedVocabulary: [],
        });
        awardXP(XP_REWARDS.EXERCISE_COMPLETED, 'Nhập transcript do người học sở hữu');
        return;
      }

      let b64 = audioBase64;
      let mime = audioMimeType;
      let ctx = topicContext;

      if (!b64) throw new Error('Hãy upload hoặc thu âm audio thật trước khi phiên âm.');

      const data = await transcribeAudioAndSegmentApi({
        audioBase64: b64 || undefined,
        mimeType: mime,
        topicContext: ctx,
      });

      setResult(data);
      awardXP(XP_REWARDS.EXERCISE_COMPLETED, 'Phiên âm & đồng bộ timestamp bài nghe với AI Transcription Engine');
    } catch (err: any) {
      console.error('Audio Transcribe failed:', err);
      setErrorMessage(err?.message || 'Lỗi kết nối khi gọi gemini-3.1-pro.');
    } finally {
      setIsLoading(false);
    }
  };

  // Play sentence audio via British TTS
  const handlePlaySentence = (text: string, index: number) => {
    if (playingSegmentIndex === index) {
      window.speechSynthesis?.cancel();
      setPlayingSegmentIndex(null);
      return;
    }

    setPlayingSegmentIndex(index);
    speakExaminerText(text, 0.95, 'British', () => {
      setPlayingSegmentIndex(null);
    });
  };

  // Save Vocab Item to SRS
  const handleSaveVocab = (item: AudioTranscribeVocabItem, index: number) => {
    const newCard: VocabCard = {
      id: `vc_audio_${Date.now()}_${index}`,
      word: item.word,
      phonetic: '',
      pos: 'noun',
      definitionVi: item.meaningVi,
      definitionEn: item.meaningVi,
      exampleEn: item.word,
      exampleVi: '',
      collocations: [],
      examples: [],
      topicDeck: topicContext || 'Audio Transcription',
      cefrLevel: 'C1',
      originModule: 'media',
      srsStage: 0,
      intervalDays: 1,
      easeFactor: 2.5,
      repetitions: 0,
      nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      mastered: false,
    };

    addVocabCard(newCard);
    setSyncedVocab((prev) => ({ ...prev, [index]: true }));
  };

  // Convert to MediaSession for Shadowing / Dictation
  const handleCreateMediaSession = () => {
    if (!result || result.segments.length === 0) return;

    const segments: MediaTranscriptSegment[] = result.segments.map((seg, idx) => ({
      id: `seg_${Date.now()}_${idx}`,
      start: seg.startSec,
      end: seg.endSec,
      text: seg.text,
      translation: '',
      speaker: seg.speaker,
    }));

    const newSession: MediaSession = {
      id: `media_audio_${Date.now()}`,
      title: `${inputMode === 'captions' ? 'Bài Luyện Transcript' : 'Bài Luyện Audio'}: ${topicContext || 'Học Thuật IELTS'}`,
      mediaType: inputMode === 'captions' ? 'article_audio' : 'audio',
      mediaUrl: audioBase64 || '',
      topic: topicContext || 'Academic Listening',
      level: 'Band 7.0-8.0',
      durationSeconds: Math.ceil(result.segments[result.segments.length - 1]?.endSec || 60),
      currentTimestamp: 0,
      transcriptSegments: segments,
      mode: 'shadowing',
      completed: false,
      extractedVocab: result.detectedVocabulary.map((v) => ({
        word: v.word,
        meaningVi: v.meaningVi,
        phonetic: '',
        cefrLevel: 'C1',
      })),
      transcriptVersion: inputMode === 'captions'
        ? { rawSource: 'user-upload', normalizerVersion: result.promptVersion, importedAt: new Date().toISOString() }
        : undefined,
    };

    if (onSessionCreated) {
      onSessionCreated(newSession);
    }
    onClose();
  };

  return (
    <div
      id="audio-transcribe-modal"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden my-4 sm:my-8 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-violet-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 shadow-md border-b border-violet-900/50">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-violet-600/30 border border-violet-400/40 flex items-center justify-center text-2xl shadow-inner shrink-0">
              🎙️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  AI Audio Transcription & Segmentation Engine
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-violet-400/20 text-violet-200 border border-violet-300/30">
                  media-transcribe-v1
                </span>
              </div>
              <p className="text-xs text-violet-200/90 mt-0.5">
                Phiên âm âm thanh đa người nói, chia câu chuẩn xác 0.1s phục vụ Shadowing & Dictation
              </p>
            </div>
          </div>
          <button data-ux-flow="media.learning"
            onClick={() => {
              window.speechSynthesis?.cancel();
              onClose();
            }}
            className="p-2 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Mode Selector */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center gap-2 overflow-x-auto text-xs">
          <button data-ux-flow="media.learning"
            type="button"
            onClick={() => setInputMode('upload')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all ${
              inputMode === 'upload'
                ? 'bg-violet-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            📁 Tải File Audio (MP3 / WAV / WebM)
          </button>
          <button data-ux-flow="media.learning"
            type="button"
            onClick={() => setInputMode('record')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 ${
              inputMode === 'record'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Thu Âm Trực Tiếp (Mic)</span>
          </button>
          <button data-ux-flow="media.learning"
            type="button"
            onClick={() => setInputMode('captions')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all ${
              inputMode === 'captions'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            VTT / SRT / Dán transcript
          </button>
        </div>

        {/* Dynamic Input Body */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          {inputMode === 'upload' && (
            <div className="p-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-center space-y-3 bg-slate-50 dark:bg-slate-950">
              <FileAudio className="w-10 h-10 mx-auto text-violet-600" />
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  {audioFile ? `Đã chọn: ${audioFile.name}` : 'Kéo thả file âm thanh hoặc bấm để chọn'}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Hỗ trợ định dạng MP3, WAV, WebM, M4A, OGG
                </p>
              </div>
              <input data-ux-flow="media.learning"
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
                id="audio-file-input"
              />
              <label
                htmlFor="audio-file-input"
                className="inline-block px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                Chọn File Âm Thanh
              </label>
            </div>
          )}

          {inputMode === 'record' && (
            <div className="p-6 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-center space-y-3">
              <div className="flex items-center justify-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${
                    isRecording ? 'bg-rose-600 animate-ping' : 'bg-slate-400'
                  }`}
                />
                <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                  {isRecording
                    ? `Đang thu âm: ${recordingDuration}s`
                    : audioBase64
                    ? 'Đã thu xong đoạn âm thanh!'
                    : 'Sẵn sàng thu âm'}
                </span>
              </div>

              <div className="flex justify-center gap-2">
                {!isRecording ? (
                  <button data-ux-flow="media.learning"
                    type="button"
                    onClick={startRecording}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all"
                  >
                    <Mic className="w-4 h-4" />
                    <span>Bắt Đầu Thu Âm</span>
                  </button>
                ) : (
                  <button data-ux-flow="media.learning"
                    type="button"
                    onClick={stopRecording}
                    className="px-5 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all"
                  >
                    <MicOff className="w-4 h-4 text-rose-500" />
                    <span>Dừng Thu Âm</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {inputMode === 'captions' && (
            <div className="space-y-3 rounded-2xl border border-sky-200 bg-sky-50/60 p-4 dark:border-sky-900/50 dark:bg-sky-950/30">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  data-ux-flow="media.learning"
                  id="caption-file-input"
                  type="file"
                  accept=".vtt,.srt,.txt,text/vtt,application/x-subrip,text/plain"
                  onChange={handleCaptionFileUpload}
                  className="hidden"
                />
                <label htmlFor="caption-file-input" className="cursor-pointer rounded-xl bg-sky-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-sky-800">
                  Tải VTT / SRT / TXT
                </label>
                {captionFileName && <span className="text-xs text-sky-800 dark:text-sky-200">{captionFileName}</span>}
              </div>
              <textarea
                data-ux-flow="media.learning"
                aria-label="Dán transcript hoặc nội dung VTT SRT"
                value={captionText}
                onChange={(event) => setCaptionText(event.target.value)}
                rows={7}
                placeholder="Dán transcript, VTT hoặc SRT tại đây..."
                className="w-full rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-sky-900 dark:bg-slate-950 dark:text-white"
              />
              <p className="text-[11px] text-slate-500">
                VTT/SRT giữ timestamp gốc. Transcript thuần sẽ được chia câu với mốc thời gian ước tính để bạn có thể bắt đầu luyện ngay.
              </p>
            </div>
          )}

          {/* Context Topic Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Gợi ý ngữ cảnh / Chủ đề bài nghe (Context Hint):
            </label>
            <input data-ux-flow="media.learning"
              type="text"
              value={topicContext}
              onChange={(e) => setTopicContext(e.target.value)}
              placeholder="Ví dụ: Urban Architecture, Bioethics, IELTS Speaking Mock..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end">
            <button data-ux-flow="media.learning"
              type="button"
              onClick={handleTranscribe}
              disabled={isLoading}
              className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all"
            >
              {isLoading ? (
                <RotateCcw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>{isLoading
                ? 'Đang xử lý & chia câu...'
                : inputMode === 'captions'
                  ? 'Tạo bài học từ transcript'
                  : 'Phiên Âm & Phân Đoạn Timestamp'}</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="m-5 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Lỗi xử lý âm thanh</p>
              <p className="mt-0.5 text-rose-700 dark:text-rose-300">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-violet-100 dark:bg-violet-950/60 flex items-center justify-center text-2xl mx-auto animate-pulse">
              🎙️
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              AI Transcription Engine đang lắng nghe và trích xuất timestamp...
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Đang nhận diện từng speaker, tính toán khoảng thời gian (startSec - endSec) chính xác tới 0.1s và đánh giá độ tin cậy.
            </p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
            {/* Action Bar: Create Media Session */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-900 to-indigo-950 text-white flex items-center justify-between flex-wrap gap-3 shadow-md">
              <div>
                <span className="text-xs font-black block">
                  Đã phân đoạn thành công {result.segments.length} câu thoại
                </span>
                <span className="text-[11px] text-violet-200">
                  Đồng bộ sẵn sàng cho phòng luyện Shadowing & Dictation
                </span>
              </div>

              <button data-ux-flow="media.learning"
                type="button"
                onClick={handleCreateMediaSession}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <span>Vào Phòng Shadowing & Dictation</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Segment Cards */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-violet-600" />
                <span>Danh Sách Câu Thoại & Mốc Thời Gian (Timestamps):</span>
              </h4>

              {result.segments.map((seg, idx) => {
                const isPlaying = playingSegmentIndex === idx;
                const confColor =
                  seg.confidence === 'high'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : seg.confidence === 'medium'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';

                return (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2 shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 font-mono font-bold text-[10px]">
                          [{seg.startSec.toFixed(1)}s - {seg.endSec.toFixed(1)}s]
                        </span>
                        <span className="text-slate-500 font-semibold">
                          Speaker {seg.speaker}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${confColor}`}>
                          Độ tin cậy: {seg.confidence}
                        </span>

                        <button data-ux-flow="media.learning"
                          type="button"
                          onClick={() => handlePlaySentence(seg.text, idx)}
                          className={`p-1.5 rounded-lg transition-all ${
                            isPlaying
                              ? 'bg-rose-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-violet-50'
                          }`}
                          title="Phát câu thoại mẫu (TTS)"
                        >
                          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm font-serif text-slate-900 dark:text-white leading-relaxed font-semibold">
                      "{seg.text}"
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Detected Vocabulary */}
            {result.detectedVocabulary && result.detectedVocabulary.length > 0 && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Từ vựng học thuật ghi nhận từ Audio ({result.detectedVocabulary.length} từ):
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {result.detectedVocabulary.map((v, vIdx) => {
                    const isSaved = syncedVocab[vIdx];
                    return (
                      <div
                        key={vIdx}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <strong className="text-violet-700 dark:text-violet-300">{v.word}</strong>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400">{v.meaningVi}</p>
                        </div>

                        <button data-ux-flow="media.learning"
                          type="button"
                          onClick={() => handleSaveVocab(v, vIdx)}
                          disabled={isSaved}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all ${
                            isSaved
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-violet-50'
                          }`}
                        >
                          {isSaved ? <Check className="w-3 h-3" /> : <BookmarkPlus className="w-3 h-3" />}
                          <span>{isSaved ? 'Đã Lưu' : 'Lưu SRS'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
