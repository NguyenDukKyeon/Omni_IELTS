import React, { useEffect, useState } from 'react';
import {
  X,
  Youtube,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { getMediaCapabilities, processYouTubeUrl } from '../../services/mediaService';
import { MediaCapabilities, MediaImportJob, MediaSession } from '../../types';

interface YouTubeUrlInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionCreated: (session: MediaSession) => void;
  onFallbackRequested?: () => void;
}

const IMPORT_PHASE_LABELS: Record<MediaImportJob['phase'], string> = {
  probing: 'Đang kiểm tra video và metadata...',
  captions: 'Đang lấy phụ đề tiếng Anh đầy đủ...',
  normalizing: 'Đang khử caption lặp và chuẩn hóa từng câu...',
  transcribing: 'Video không có caption; đang chép lời từ audio thật...',
  validating: 'Đang kiểm tra timestamp và độ phủ transcript...',
  ready: 'Transcript đã sẵn sàng.',
  failed: 'Không thể hoàn tất tác vụ nhập media.',
};

const PRESET_VIDEOS = [
  {
    title: 'TED-Ed: Urban Planning & Climate Resilience',
    url: 'https://www.youtube.com/watch?v=0k7yF_Ggq40',
    topic: 'Environment & Urban Architecture',
    desc: 'Luyện cấu trúc học thuật C1 về quy hoạch không gian xanh và đảo nhiệt đô thị.',
  },
  {
    title: 'IELTS Speaking Part 3 Mock: Artificial Intelligence & Workforce',
    url: 'https://www.youtube.com/watch?v=sR2E_j_gO1A',
    topic: 'Labor Economics & AI Ethics',
    desc: 'Luyện phản xạ lập luận đa chiều và các collocation học thuật theo ngữ cảnh.',
  },
];

export const YouTubeUrlInputModal: React.FC<YouTubeUrlInputModalProps> = ({
  isOpen,
  onClose,
  onSessionCreated,
  onFallbackRequested,
}) => {
  const [url, setUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [capabilities, setCapabilities] = useState<MediaCapabilities | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    getMediaCapabilities()
      .then((value) => active && setCapabilities(value))
      .catch(() => active && setCapabilities(null));
    return () => { active = false; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);
    setProgress(0);
    setLoadingStep('Đang tạo tác vụ nhập media...');

    try {
      const session = await processYouTubeUrl(url.trim(), (job) => {
        setLoadingStep(IMPORT_PHASE_LABELS[job.phase]);
        setProgress(job.progress);
      });

      onSessionCreated(session);
      setUrl('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể xử lý URL YouTube. Vui lòng kiểm tra lại đường dẫn.');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleSelectPreset = (presetUrl: string) => {
    setUrl(presetUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fadeIn">
      <div
        id="youtube-import-modal"
        className="w-full max-w-2xl bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Youtube className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-stone-900 dark:text-stone-100 font-display">
                Nhập Video YouTube Bất Kỳ
              </h2>
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                Hệ thống lấy transcript đầy đủ; dịch và từ vựng AI chỉ chạy khi bạn yêu cầu
              </p>
            </div>
          </div>
          <button data-ux-flow="media.learning"
            aria-label="Close"
            onClick={onClose}
            disabled={isLoading}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <form data-ux-flow="media.learning" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                Đường dẫn URL Video YouTube
              </label>
              <div className="relative">
                <input data-ux-flow="media.learning"
                  type="text"
                  aria-label="Đường dẫn URL Video YouTube"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... hoặc https://youtu.be/..."
                  className="w-full pl-3.5 pr-10 py-3 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-xs sm:text-sm text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                  disabled={isLoading}
                />
                <Youtube className="w-4 h-4 text-stone-400 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <span>{errorMsg}</span>
                  {onFallbackRequested && (
                    <button
                      type="button"
                      data-ux-flow="media.learning"
                      onClick={onFallbackRequested}
                      className="block rounded-lg border border-rose-300 px-2.5 py-1.5 font-bold hover:bg-rose-100 dark:border-rose-800 dark:hover:bg-rose-950"
                    >
                      Dùng audio, VTT/SRT hoặc transcript
                    </button>
                  )}
                </div>
              </div>
            )}

            {capabilities && !capabilities.youtubeImport.available && (
              <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                {capabilities.youtubeImport.reason} Bạn vẫn có thể dùng file audio của mình.
              </div>
            )}

            {isLoading && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 space-y-2 animate-fadeIn">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-200">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                  <span>Hệ thống đang xử lý bài học...</span>
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-400">{loadingStep}</p>
                <div className="h-1.5 overflow-hidden rounded-full bg-amber-100 dark:bg-amber-900/50">
                  <div className="h-full bg-amber-600 transition-[width]" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            <button data-ux-flow="media.learning"
              type="submit"
              disabled={isLoading || !url.trim() || capabilities?.youtubeImport.available === false}
              className="w-full py-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xử lý & phân tích AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Tạo Bài Luyện Shadowing & Dictation</span>
                </>
              )}
            </button>
          </form>

          {/* Presets Section */}
          <div className="pt-4 border-t border-stone-100 dark:border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>Hoặc chọn video mẫu có sẵn</span>
              </span>
            </div>

            <div className="space-y-2">
              {PRESET_VIDEOS.map((preset, idx) => (
                <button
                  type="button"
                  data-ux-flow="media.learning"
                  key={idx}
                  onClick={() => handleSelectPreset(preset.url)}
                  className="w-full p-3 rounded-2xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 hover:border-rose-400 dark:hover:border-rose-700 transition-all cursor-pointer flex items-center justify-between gap-3 group text-left"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-stone-900 dark:text-stone-100 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                      {preset.title}
                    </div>
                    <div className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-1 mt-0.5">
                      {preset.desc}
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 shrink-0">
                    {preset.topic}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-stone-100 dark:bg-stone-800/60 text-[11px] text-stone-600 dark:text-stone-400 flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
            <span>
              <strong>Lưu ý bản quyền:</strong> Hệ thống chỉ trích xuất phụ đề và mốc thời gian phục vụ mục đích học tập cá nhân phi thương mại, tôn trọng điều khoản của YouTube.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
