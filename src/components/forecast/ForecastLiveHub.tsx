import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Sparkles,
  Globe2,
  Calendar,
  Flame,
  TrendingUp,
  Award,
  Layers,
  BookOpen,
  PenTool,
  Mic,
  Copy,
  Check,
  Volume2,
  VolumeX,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Filter,
  RefreshCw,
  PlusCircle,
  MessageSquareQuote,
  ShieldCheck,
  Target,
  FileCheck2,
  ArrowRight,
  Zap,
} from 'lucide-react';
import {
  RealExamForecastItem,
  RealExamSkillType,
  RealExamCouncilType,
  ForecastGroundingResponse,
  VocabCard,
  LiveHubPracticeArtifact,
  LiveHubMockBuildResponse,
  ConsentAction,
  ContentOrigin,
  CompletenessCheckResult,
} from '../../types';
import {
  checkPracticeCompleteness,
  checkMockCompleteness,
  getContentOriginBadge,
  filterSupportedCitations,
} from '../../lib/contentOrigin';
import {
  createLiveHubMockBuildApi,
  createLiveHubPracticeArtifactApi,
  fetchRealExamForecastApi,
  playTextToSpeech,
} from '../../services/practiceService';
import { useApp } from '../../context/AppContext';
import { ApiResponseError, classifyApiFailure } from '../../lib/apiFailure';
import { loadForecastSnapshot, saveForecastSnapshot } from '../../lib/forecastSnapshot';

interface ForecastLiveHubProps {
  onSelectPromptForPractice?: (item: RealExamForecastItem) => void;
  onMockBuildReady?: (item: RealExamForecastItem, result: LiveHubMockBuildResponse) => void;
  usageContext?: 'practice' | 'mock';
}

export const ForecastLiveHub: React.FC<ForecastLiveHubProps> = ({ onSelectPromptForPractice, onMockBuildReady, usageContext = 'practice' }) => {
  const { awardXP, addVocabCard, openAITutorWithPrompt, setActiveModule, profile } = useApp();
  const [initialSnapshot] = useState<ForecastGroundingResponse | null>(() =>
    typeof window === 'undefined' ? null : loadForecastSnapshot(window.localStorage),
  );

  const [forecastItems, setForecastItems] = useState<RealExamForecastItem[]>(initialSnapshot?.forecastItems || []);
  const [isGroundingLoading, setIsGroundingLoading] = useState<boolean>(false);
  const [groundingSources, setGroundingSources] = useState<Array<{ title: string; url: string }>>(initialSnapshot?.groundingSources || []);
  const [activeSearchQueries, setActiveSearchQueries] = useState<string[]>(initialSnapshot?.searchQueries || []);
  const [summaryOverview, setSummaryOverview] = useState<string>(initialSnapshot?.summaryOverviewVi || 'Chưa có snapshot đã xác minh. Bấm “Cập nhật” để tra cứu nguồn live.');
  const [snapshotStatus, setSnapshotStatus] = useState<ForecastGroundingResponse['status']>(initialSnapshot?.status || 'unavailable');
  const [activeProvider, setActiveProvider] = useState<ForecastGroundingResponse['provider']>(initialSnapshot?.provider);
  const [fallbackReason, setFallbackReason] = useState<ForecastGroundingResponse['fallbackReason']>(initialSnapshot?.fallbackReason);
  const [lastUpdated, setLastUpdated] = useState<string | null>(initialSnapshot?.lastUpdated || null);
  const [hubError, setHubError] = useState<string | null>(null);
  const [hubFailure, setHubFailure] = useState<ApiResponseError['failure']>();

  // Filters
  const [selectedSkill, setSelectedSkill] = useState<string>('all');
  const [selectedCouncil, setSelectedCouncil] = useState<string>('all');
  const [selectedTrend, setSelectedTrend] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [customSearchQuery, setCustomSearchQuery] = useState<string>('');

  // UI state
  const [expandedItemId, setExpandedItemId] = useState<string>('');
  const [activeTabPerItem, setActiveTabPerItem] = useState<{
    [itemId: string]: 'peel' | 'vocab' | 'model' | 'tips';
  }>({});
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);
  const [addedVocabPhrases, setAddedVocabPhrases] = useState<{ [key: string]: boolean }>({});
  const [isPlayingAudio, setIsPlayingAudio] = useState<string | null>(null);
  const [artifactAction, setArtifactAction] = useState<{ itemId: string; kind: 'practice' | 'mock' } | null>(null);
  const [artifactError, setArtifactError] = useState<{ itemId: string; message: string } | null>(null);
  const [consentModal, setConsentModal] = useState<{
    isOpen: boolean;
    item: RealExamForecastItem;
    target: 'practice' | 'mock';
    completeness: CompletenessCheckResult;
  } | null>(null);

  const triggerElementRef = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!consentModal?.isOpen) return;

    const modalEl = modalRef.current;
    if (!modalEl) return;
    const focusable = modalEl.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length > 0) {
      focusable[0].focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeConsentModal();
        return;
      }
      if (e.key === 'Tab') {
        const focusableElements = Array.from(modalEl.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ));
        if (focusableElements.length === 0) return;
        const first = focusableElements[0] as HTMLElement | undefined;
        const last = focusableElements[focusableElements.length - 1] as HTMLElement | undefined;
        if (e.shiftKey) {
          if (document.activeElement === first && last) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last && first) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [consentModal?.isOpen]);

  const closeConsentModal = () => {
    setConsentModal(null);
    if (triggerElementRef.current) {
      triggerElementRef.current.focus();
      triggerElementRef.current = null;
    }
  };

  // Preset search tags
  const currentYear = new Date().getFullYear();
  const PRESET_SEARCH_QUERIES = [
    { label: '🔥 Nguồn & dự báo mới nhất tuần này', query: `IELTS real exam reports this week ${currentYear} IDP British Council Vietnam` },
    { label: '🤖 AI & Tự động hóa việc làm', query: `IELTS Writing Task 2 AI automation employment forecast ${currentYear}` },
    { label: '🌱 Môi trường & Thuế Carbon', query: `IELTS Task 2 environment carbon tax green energy ${currentYear}` },
    { label: '🎙️ Speaking Part 2 Dự đoán Quý', query: `IELTS Speaking Part 2 cue cards latest quarter ${currentYear} IDP BC` },
    { label: '📊 Task 1 Biểu đồ Năng lượng', query: `IELTS Writing Task 1 renewable energy line graph chart ${currentYear}` },
  ];

  // Perform Google Search Grounding Fetch
  const handleTriggerGroundingSearch = async (overrideQuery?: string) => {
    const queryToUse = overrideQuery !== undefined ? overrideQuery : customSearchQuery;
    setIsGroundingLoading(true);
    setHubError(null);
    setHubFailure(undefined);
    try {
      const response: ForecastGroundingResponse = await fetchRealExamForecastApi({
        skill: selectedSkill,
        council: selectedCouncil,
        customQuery: queryToUse,
        timeframe: 'latest',
      });

      if (response && response.forecastItems && response.forecastItems.length > 0) {
        // Merge with existing unique items
        const newIds = new Set(response.forecastItems.map((i) => i.id));
        const filteredOld = forecastItems.filter((i) => !newIds.has(i.id));
        const updatedList = [...response.forecastItems, ...filteredOld];
        setForecastItems(updatedList);
        setExpandedItemId(response.forecastItems[0].id);
      }

      if (response.groundingSources && response.groundingSources.length > 0) {
        setGroundingSources(response.groundingSources);
      }
      if (response.searchQueries && response.searchQueries.length > 0) {
        setActiveSearchQueries(response.searchQueries);
      }
      if (response.summaryOverviewVi) {
        setSummaryOverview(response.summaryOverviewVi);
      }
      setSnapshotStatus(response.status);
      setActiveProvider(response.provider);
      setFallbackReason(response.fallbackReason);
      setLastUpdated(response.lastUpdated);
      if (response.status === 'stale' && response.failure) {
        setHubFailure(response.failure);
        setHubError(`${response.failure.messageVi} Đang hiển thị snapshot đã lưu.`);
      }
      if (typeof window !== 'undefined') saveForecastSnapshot(window.localStorage, response);
      if (response.forecastItems.length > 0) {
        awardXP(25, 'Tra cứu nguồn IELTS có citation');
      }
    } catch (err: any) {
      const failure = err instanceof ApiResponseError && err.failure
        ? err.failure
        : classifyApiFailure(err, 'forecast');
      setHubFailure(failure);
      setHubError(failure?.messageVi || err?.message || 'Search Grounding không khả dụng; snapshot hiện tại được giữ nguyên.');
      if (forecastItems.length > 0) setSnapshotStatus('stale');
    } finally {
      setIsGroundingLoading(false);
    }
  };

  const formatSnapshotTime = (value: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString('vi-VN');
  };

  // Copy prompt
  const handleCopyPrompt = (item: RealExamForecastItem) => {
    navigator.clipboard.writeText(item.promptStatement);
    setCopiedItemId(item.id);
    setTimeout(() => setCopiedItemId(null), 2500);
  };

  // Save Vocab to Flashcard SRS
  const handleSaveVocabToSRS = (
    vocab: { phrase: string; phonetic?: string; pos: string; meaningVi: string; exampleSentence: string; cefrLevel: string },
    itemId: string
  ) => {
    const cardKey = `${itemId}_${vocab.phrase}`;
    if (addedVocabPhrases[cardKey]) return;

    const newCard: VocabCard = {
      id: `vocab_forecast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      word: vocab.phrase,
      phonetic: vocab.phonetic || '',
      pos: vocab.pos,
      definitionVi: vocab.meaningVi,
      definitionEn: `Academic IELTS collocation used in high band response.`,
      exampleEn: vocab.exampleSentence,
      exampleVi: vocab.meaningVi,
      examples: [
        {
          en: vocab.exampleSentence,
          vi: vocab.meaningVi,
          context: 'IELTS Task 2',
        },
      ],
      collocations: [vocab.phrase],
      synonyms: [],
      topicDeck: 'IELTS Real Exam Forecast 2026',
      originModule: 'practice',
      originSourceTitle: 'IELTS Real Exam & Forecast Live Hub',
      srsStage: 1,
      intervalDays: 1,
      nextReviewDate: new Date().toISOString(),
      easeFactor: 2.5,
      repetitions: 0,
      mastered: false,
    };

    addVocabCard(newCard);
    setAddedVocabPhrases((prev) => ({ ...prev, [cardKey]: true }));
    awardXP(10, `Lưu từ vựng C1/C2: "${vocab.phrase}" vào Flashcard`);
  };

  // Play Model Answer Text-to-Speech
  const handlePlayModelAudio = (text: string, itemId: string) => {
    if (isPlayingAudio === itemId) {
      window.speechSynthesis?.cancel();
      setIsPlayingAudio(null);
      return;
    }
    setIsPlayingAudio(itemId);
    playTextToSpeech(text, 1.0, 'British', () => {
      setIsPlayingAudio(null);
    });
  };

  // Practice this prompt now
  const openPracticeArtifact = (item: RealExamForecastItem, artifact: LiveHubPracticeArtifact) => {
    sessionStorage.setItem('omni_pending_practice_artifact', JSON.stringify(artifact));
    if (onSelectPromptForPractice) {
      onSelectPromptForPractice(item);
      return;
    }

    // Default router behavior
    if (item.skill.startsWith('writing')) {
      // Store in session storage so WritingQuestionModule or EssayBandUpgrader can read it
      sessionStorage.setItem(
        'omni_pending_writing_prompt',
        JSON.stringify({
          id: item.id,
          promptStatement: item.promptStatement,
          title: item.title,
          category: item.subCategory || 'Opinion Essay',
          taskType: item.skill === 'writing_task1' ? 'task1_academic' : 'task2_essay',
          artifactId: artifact.id,
          provenance: artifact.provenance,
        })
      );
      window.dispatchEvent(
        new CustomEvent('omni_load_writing_prompt', {
          detail: {
            id: item.id,
            promptStatement: item.promptStatement,
            title: item.title,
            category: item.subCategory || 'Opinion Essay',
            taskType: item.skill === 'writing_task1' ? 'task1_academic' : 'task2_essay',
            artifactId: artifact.id,
            provenance: artifact.provenance,
          },
        })
      );
      setActiveModule('practice');
    } else {
      // Speaking
      sessionStorage.setItem(
        'omni_pending_speaking_prompt',
        JSON.stringify({
          id: item.id,
          promptStatement: item.promptStatement,
          title: item.title,
          cueCardPoints: item.cueCardPoints,
          part: item.skill,
          artifactId: artifact.id,
          provenance: artifact.provenance,
        })
      );
      window.dispatchEvent(
        new CustomEvent('omni_load_speaking_prompt', {
          detail: {
            id: item.id,
            promptStatement: item.promptStatement,
            title: item.title,
            cueCardPoints: item.cueCardPoints,
            part: item.skill,
            artifactId: artifact.id,
            provenance: artifact.provenance,
          },
        })
      );
      setActiveModule('practice');
    }
  };

  const handlePracticeNow = async (item: RealExamForecastItem, consentAction?: ConsentAction) => {
    const completeness = checkPracticeCompleteness(item.skill, item);
    if (!completeness.isComplete && !consentAction) {
      triggerElementRef.current = (document.activeElement as HTMLElement) || null;
      setConsentModal({
        isOpen: true,
        item,
        target: 'practice',
        completeness,
      });
      return;
    }

    setArtifactAction({ itemId: item.id, kind: 'practice' });
    setArtifactError(null);
    try {
      const artifact = await createLiveHubPracticeArtifactApi(item, lastUpdated, consentAction || 'direct');
      if (artifact.requiresGeneration || artifact.status === 'draft_generation_required') {
        setArtifactError({
          itemId: item.id,
          message: 'Bản nháp yêu cầu bổ sung AI đã được ghi nhận. Bài luyện chỉ mở và tính điểm sau khi nội dung được tạo hoàn chỉnh.',
        });
      } else {
        openPracticeArtifact(item, artifact);
        if (artifact.isGradeable) {
          awardXP(10, 'Tạo bài luyện có nguồn từ Live Hub');
        }
      }
    } catch (error: unknown) {
      const apiError = error as { code?: string; completeness?: CompletenessCheckResult; message?: string };
      if (apiError.code === 'INCOMPLETE_SOURCE_CONSENT_REQUIRED' && apiError.completeness) {
        triggerElementRef.current = (document.activeElement as HTMLElement) || null;
        setConsentModal({
          isOpen: true,
          item,
          target: 'practice',
          completeness: apiError.completeness,
        });
      } else {
        setArtifactError({ itemId: item.id, message: apiError.message || 'Không thể tạo bài luyện từ nguồn này.' });
      }
    } finally {
      setArtifactAction(null);
    }
  };

  const handleCreateMock = async (item: RealExamForecastItem, consentAction?: ConsentAction) => {
    const mockCompleteness = checkMockCompleteness(item);
    if (!mockCompleteness.isComplete && !consentAction) {
      triggerElementRef.current = (document.activeElement as HTMLElement) || null;
      setConsentModal({
        isOpen: true,
        item,
        target: 'mock',
        completeness: mockCompleteness,
      });
      return;
    }

    const effectiveConsent = consentAction || (mockCompleteness.isComplete ? 'direct' : undefined);
    if (!effectiveConsent) {
      triggerElementRef.current = (document.activeElement as HTMLElement) || null;
      setConsentModal({
        isOpen: true,
        item,
        target: 'mock',
        completeness: mockCompleteness,
      });
      return;
    }

    setArtifactAction({ itemId: item.id, kind: 'mock' });
    setArtifactError(null);
    try {
      const result = await createLiveHubMockBuildApi(item, profile.targetBand || 7, lastUpdated, effectiveConsent);
      if (effectiveConsent === 'create_ai_variant') {
        sessionStorage.removeItem('omni_pending_mock_source');
      } else {
        sessionStorage.setItem('omni_pending_mock_source', JSON.stringify(item));
      }
      localStorage.setItem('omni_pending_mock_build', JSON.stringify({
        id: result.mockBuild.id,
        createdAt: result.mockBuild.createdAt,
        params: {
          targetBand: profile.targetBand || 7,
          sourceItem: effectiveConsent === 'create_ai_variant' ? undefined : item,
          sourceArtifactId: result.artifact.id,
          provenance: result.artifact.provenance,
        },
        skillData: {},
        sourceArtifactId: result.artifact.id,
      }));
      if (onMockBuildReady) onMockBuildReady(item, result);
      else {
        sessionStorage.setItem('omni_open_mock_orchestrator', '1');
        setActiveModule('mock_test');
      }
      if (!result.artifact.requiresGeneration && result.mockBuild.status === 'ready') {
        awardXP(15, 'Tạo MockBuild có nguồn từ Live Hub');
      }
    } catch (error: unknown) {
      const apiError = error as { message?: string };
      setArtifactError({ itemId: item.id, message: apiError.message || 'Không thể tạo Full Mock từ nguồn này.' });
    } finally {
      setArtifactAction(null);
    }
  };

  const handleExecuteConsent = (action: ConsentAction) => {
    if (!consentModal) return;
    const { item, target } = consentModal;
    closeConsentModal();

    if (action === 'search_more') {
      setCustomSearchQuery(item.topicDomain || item.title);
      handleTriggerGroundingSearch(item.topicDomain || item.title);
      return;
    }

    if (target === 'practice') {
      void handlePracticeNow(item, action);
    } else {
      if (action === 'practice_available') {
        void handlePracticeNow(item, 'practice_available');
      } else {
        void handleCreateMock(item, action);
      }
    }
  };

  // Ask AI Tutor about this prompt
  const handleAskAITutor = (item: RealExamForecastItem) => {
    openAITutorWithPrompt(
      `Hãy phân tích chuyên sâu ${item.evidenceType === 'verified_report'
        ? 'nguồn IELTS đã xác minh'
        : item.evidenceType === 'reported_recall'
          ? 'nguồn hồi tưởng IELTS có dẫn chứng'
          : 'chủ đề dự báo/luyện tập IELTS chưa được xác minh là đề thi thật'} [${item.councilLabel} - ${item.examDate}]:
"${item.promptStatement}"
Chủ đề: ${item.topicDomain} (${item.subCategory || item.skill})
Vui lòng hướng dẫn tôi cách brainstorm ý tưởng độc đáo, chỉ ra 3 bẫy tư duy dễ mất điểm và 5 cụm Collocations C1/C2 tự nhiên nhất!`
    );
  };

  // Filtering
  const filteredItems = forecastItems.filter((item) => {
    if (selectedSkill !== 'all' && item.skill !== selectedSkill) return false;
    if (selectedCouncil !== 'all' && item.council !== selectedCouncil) return false;
    if (selectedTrend !== 'all' && item.trendStatus !== selectedTrend) return false;
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(kw);
      const matchPrompt = item.promptStatement.toLowerCase().includes(kw);
      const matchTopic = item.topicDomain.toLowerCase().includes(kw);
      const matchCouncil = item.councilLabel.toLowerCase().includes(kw);
      if (!matchTitle && !matchPrompt && !matchTopic && !matchCouncil) return false;
    }
    return true;
  });

  return (
    <div id="forecast-live-hub-module" className="space-y-6 animate-fadeIn pb-12">
      {/* Hero Grounding Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 border border-indigo-800/40 p-6 md:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                <Globe2 className="w-3.5 h-3.5 text-blue-400 animate-spin-slow" />
                {activeProvider === 'groq'
                  ? 'Groq Web Search Live'
                  : activeProvider === 'brave'
                    ? 'Brave Search Live'
                    : 'Google Search Grounding Live'}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2.5 py-0.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Evidence-aware source hub
              </span>
            </div>

            <button
              onClick={() => handleTriggerGroundingSearch()}
              disabled={isGroundingLoading}
              data-ux-flow="live-hub.refresh"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-indigo-600/30 active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGroundingLoading ? 'animate-spin' : ''}`} />
              <span>{isGroundingLoading ? 'Đang tra cứu thời gian thực...' : 'Làm mới nguồn & dự báo'}</span>
            </button>
          </div>

          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              IELTS Real Exam & Forecast Live Hub
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-3xl mt-1 leading-relaxed">
              Google Grounding là nguồn chính; Groq và Brave Search tự động tiếp quản khi nguồn trước không khả dụng. Citation được ánh xạ bằng Evidence ID, không lấy URL do AI tự viết.
            </p>
            {activeProvider === 'groq' && fallbackReason === 'quota_exhausted' && (
              <p className="mt-2 text-xs font-semibold text-amber-300">
                Gemini hết quota ngày; dữ liệu này được tra cứu bằng Groq.
              </p>
            )}
            {activeProvider === 'brave' && (
              <p className="mt-2 text-xs font-semibold text-amber-300">
                Dữ liệu này được tra cứu bằng Brave Search; Gemini Web chỉ chuyển evidence thành bài luyện.
              </p>
            )}
          </div>

          {hubError && (
            <div role="alert" className="rounded-xl border border-amber-400/40 bg-amber-950/40 px-4 py-3 text-xs text-amber-100 space-y-2">
              <p>{hubError}</p>
              {hubFailure?.requestId && <p className="font-mono text-[10px] text-amber-200/80">Mã yêu cầu: {hubFailure.requestId}</p>}
              <div className="flex flex-wrap gap-2">
                {hubFailure?.retryable && (
                  <button
                    type="button"
                    data-ux-flow="live-hub.retry"
                    onClick={() => handleTriggerGroundingSearch()}
                    className="rounded-lg border border-amber-300/50 px-2.5 py-1 font-bold hover:bg-amber-300/10"
                  >
                    Thử lại
                  </button>
                )}
                {hubFailure?.action === 'open_api_settings' && (
                  <button
                    type="button"
                    data-ux-flow="live-hub.open-api-settings"
                    onClick={() => setActiveModule('profile')}
                    className="rounded-lg border border-amber-300/50 px-2.5 py-1 font-bold hover:bg-amber-300/10"
                  >
                    Mở cài đặt API key
                  </button>
                )}
                {hubFailure?.action === 'open_quota' && hubFailure.provider === 'bifrost' && (
                  <button
                    type="button"
                    data-ux-flow="live-hub.open-quota"
                    onClick={() => setActiveModule('profile')}
                    className="rounded-lg border border-amber-300/50 px-2.5 py-1 font-bold hover:bg-amber-300/10"
                  >
                    Kiểm tra API Gateway Pool
                  </button>
                )}
                {hubFailure?.action === 'open_quota' && hubFailure.provider !== 'bifrost' && (
                  <a
                    data-ux-flow="live-hub.open-quota"
                    href={hubFailure.provider === 'groq'
                      ? 'https://console.groq.com/settings/limits'
                      : hubFailure.provider === 'brave'
                        ? 'https://api-dashboard.search.brave.com/app/keys'
                        : 'https://aistudio.google.com/app/apikey'}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-amber-300/50 px-2.5 py-1 font-bold hover:bg-amber-300/10"
                  >
                    Kiểm tra quota {hubFailure.provider === 'groq' ? 'Groq' : hubFailure.provider === 'brave' ? 'Brave Search' : 'Gemini'}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* AI Grounding Summary Overview */}
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-xs text-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-300 mr-1.5">Xu hướng khảo thí mới nhất:</span>
                <span>{summaryOverview}</span>
              </div>
            </div>
          </div>

          {/* Quick Preset Search Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-bold text-indigo-200">Tra cứu nhanh:</span>
            {PRESET_SEARCH_QUERIES.map((preset, idx) => (
              <button data-ux-flow="live-hub.refresh"
                key={idx}
                onClick={() => {
                  setCustomSearchQuery(preset.query);
                  handleTriggerGroundingSearch(preset.query);
                }}
                disabled={isGroundingLoading}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-[11px] font-medium text-slate-200 hover:text-white transition-all whitespace-nowrap"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Live Custom Search Grounding Input */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input data-ux-flow="live-hub.refresh"
              type="text"
              value={customSearchQuery}
              onChange={(e) => setCustomSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTriggerGroundingSearch()}
              placeholder="Nhập từ khóa tìm kiếm đề thi thật (ví dụ: 'Writing Task 2 IDP Vietnam August 2026', 'Speaking Cue card Q3 2026')..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button data-ux-flow="live-hub.refresh"
            onClick={() => handleTriggerGroundingSearch()}
            disabled={isGroundingLoading}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all shrink-0"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{isGroundingLoading ? 'Đang tìm kiếm...' : 'Tra cứu Grounding'}</span>
            </button>
          </div>

          {lastUpdated && (
            <p className="text-[11px] text-slate-300">
              {snapshotStatus === 'stale' ? 'Snapshot đã lưu' : 'Cập nhật trực tiếp'}: {formatSnapshotTime(lastUpdated)}
            </p>
          )}

        {/* Citations / Grounding Sources Chips */}
        {groundingSources && groundingSources.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Nguồn trích dẫn thời gian thực:
            </span>
            {groundingSources.map((src, idx) => (
              <a data-ux-flow="live-hub.refresh"
                key={idx}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 transition-colors truncate max-w-xs"
              >
                <span className="truncate">{src.title}</span>
                <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Filter Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Skill Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: 'Tất cả kỹ năng' },
            { id: 'writing_task2', label: 'Writing Task 2', icon: PenTool },
            { id: 'writing_task1', label: 'Writing Task 1', icon: FileCheck2 },
            { id: 'speaking_part2', label: 'Speaking Part 2 & 3', icon: Mic },
            { id: 'speaking_part1', label: 'Speaking Part 1', icon: Mic },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = selectedSkill === tab.id;
            return (
              <button data-ux-flow="live-hub.refresh"
                key={tab.id}
                onClick={() => setSelectedSkill(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Secondary Council & Trend Dropdowns & Local Search */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Council Filter */}
          <select data-ux-flow="live-hub.refresh"
            aria-label="Lọc theo hội đồng thi"
            value={selectedCouncil}
            onChange={(e) => setSelectedCouncil(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Hội đồng thi: Tất cả</option>
            <option value="both_vietnam">IDP & BC Việt Nam</option>
            <option value="idp_vietnam">IDP Việt Nam</option>
            <option value="bc_vietnam">British Council Việt Nam</option>
            <option value="idp_global">Hội đồng Quốc tế</option>
          </select>

          {/* Trend Filter */}
          <select data-ux-flow="live-hub.refresh"
            aria-label="Lọc theo trạng thái đề"
            value={selectedTrend}
            onChange={(e) => setSelectedTrend(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Trạng thái: Tất cả</option>
            <option value="recent_real_exam">🔥 Đề Thi Thật Vừa Ra</option>
            <option value="quarter_forecast">⭐ Trọng Tâm Quý</option>
            <option value="high_frequency">📈 Tần Suất Cao</option>
          </select>

          {/* Quick Filter Keyword */}
          <div className="relative">
            <input data-ux-flow="live-hub.refresh"
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Lọc từ khóa..."
              className="w-36 sm:w-44 pl-7 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>

      {/* Real Exam Forecast Cards List */}
      <div className="space-y-5">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Không tìm thấy đề thi phù hợp với bộ lọc
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Hãy thử chọn lại kỹ năng, đặt lại bộ lọc hoặc nhấn nút "Tra cứu Grounding" để AI tìm kiếm thêm các đề mới nhất từ internet.
            </p>
            <button data-ux-flow="live-hub.refresh"
              onClick={() => {
                setSelectedSkill('all');
                setSelectedCouncil('all');
                setSelectedTrend('all');
                setSearchKeyword('');
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
            >
              Đặt lại bộ lọc
            </button>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isExpanded = expandedItemId === item.id;
            const currentTab = activeTabPerItem[item.id] || 'peel';
            const isCopied = copiedItemId === item.id;
            const isAudioActive = isPlayingAudio === item.id;
            const hasEnrichment = item.enrichmentStatus === 'ready'
              || Boolean(item.outlinePEEL || item.band8ModelAnswer || item.topicVocabularyC1C2?.length);
            const hasDirectEvidence = (item.evidenceType === 'verified_report' || item.evidenceType === 'reported_recall') &&
              Boolean(item.groundingSourceUrl || (item.citations && item.citations.some(c => Boolean(c.url))));
            const itemOrigin: ContentOrigin = item.origin || 'authentic_source';
            const originBadge = getContentOriginBadge(
              itemOrigin,
              usageContext,
              itemOrigin === 'authentic_source'
                ? (hasDirectEvidence ? (item.evidenceType || 'reported_recall') : 'forecast')
                : undefined
            );

            return (
              <div
                key={item.id}
                id={`forecast-card-${item.id}`}
                className={`bg-white dark:bg-slate-900 rounded-3xl border transition-all duration-200 overflow-hidden ${
                  isExpanded
                    ? 'border-indigo-500/60 dark:border-indigo-500/40 shadow-lg ring-1 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                }`}
              >
                {/* Card Header Bar */}
                <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Trend Badge */}
                      <span
                        className={`text-[11px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 ${
                          item.trendStatus === 'recent_real_exam'
                            ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40'
                            : item.trendStatus === 'hot_trend'
                            ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40'
                            : 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40'
                        }`}
                      >
                        <Flame className="w-3 h-3" />
                        {item.trendBadge}
                      </span>

                      {/* Origin Badge */}
                      <span
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 ${originBadge.badgeClass}`}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        {originBadge.labelVi}
                      </span>

                      {/* Council Badge */}
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                        <Globe2 className="w-3 h-3 text-blue-500" />
                        {item.councilLabel}
                      </span>

                      {/* Exam Date */}
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {item.examDate}
                      </span>
                    </div>

                    {/* Frequency Meter Bar */}
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 px-3 py-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        Độ phổ biến:
                      </span>
                      <div className="w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        {typeof item.frequencyScore === 'number' && <div
                          className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full"
                          style={{ width: `${item.frequencyScore}%` }}
                        />}
                      </div>
                      <span className="text-[11px] font-black text-slate-800 dark:text-slate-200">
                        {typeof item.frequencyScore === 'number' ? `${item.frequencyScore}%` : 'Chưa có số liệu tần suất'}
                      </span>
                    </div>
                  </div>

                  {/* Title & Domain */}
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      {item.topicDomain} • {item.subCategory || item.skill}
                    </div>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-snug">
                      {item.title}
                    </h2>
                  </div>

                  {/* Full Prompt Statement Box */}
                  <div className="mt-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/60 relative group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 leading-relaxed font-serif italic">
                          "{item.promptStatement}"
                        </p>

                        {/* Speaking Cue Card points if any */}
                        {item.cueCardPoints && item.cueCardPoints.length > 0 && (
                          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1">
                            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                              You should say:
                            </span>
                            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside">
                              {item.cueCardPoints.map((pt, idx) => (
                                <li key={idx}>{pt}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      <button data-ux-flow="live-hub.refresh"
                        onClick={() => handleCopyPrompt(item)}
                        className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm transition-all shrink-0"
                        title="Sao chép đề bài"
                      >
                        {isCopied ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Quick Action Toolbar */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button data-ux-flow="live-hub.practice"
                        onClick={() => void handlePracticeNow(item)}
                        disabled={artifactAction?.itemId === item.id}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-500/20 active:scale-95 transition-all"
                      >
                        {artifactAction?.itemId === item.id && artifactAction.kind === 'practice'
                          ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          : <Zap className="w-3.5 h-3.5 text-amber-300" />}
                        <span>{artifactAction?.itemId === item.id && artifactAction.kind === 'practice' ? 'Đang tạo bài luyện…' : 'Luyện riêng kỹ năng này'}</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                      </button>

                      <button data-ux-flow="live-hub.mock"
                        onClick={() => void handleCreateMock(item)}
                        disabled={artifactAction?.itemId === item.id}
                        className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-50 ${
                          usageContext === 'mock'
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                            : 'bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white'
                        }`}
                      >
                        {artifactAction?.itemId === item.id && artifactAction.kind === 'mock'
                          ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          : <Layers className="w-3.5 h-3.5" />}
                        <span>{artifactAction?.itemId === item.id && artifactAction.kind === 'mock' ? 'Đang tạo MockBuild…' : 'Tạo Full Mock từ nguồn này'}</span>
                      </button>

                      <button data-ux-flow="live-hub.refresh"
                        onClick={() => handleAskAITutor(item)}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Hỏi AI Tutor</span>
                      </button>
                    </div>

                    {hasEnrichment ? (
                      <button
                        data-ux-flow="live-hub.toggle-enrichment"
                        onClick={() => setExpandedItemId(isExpanded ? '' : item.id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors flex items-center gap-1"
                      >
                        <span>{isExpanded ? 'Thu gọn phân tích' : 'Xem Dàn ý & Bài mẫu'}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Phân tích chuyên sâu sẽ được tạo trong bài luyện để tiết kiệm quota.
                      </span>
                    )}
                  </div>
                  {artifactError?.itemId === item.id && (
                    <div role="alert" className="mt-3 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
                      {artifactError.message}
                    </div>
                  )}
                </div>

                {/* Expanded Deep Analysis Tabs */}
                {isExpanded && (
                  <div className="p-5 sm:p-6 bg-slate-50/60 dark:bg-slate-900/60 space-y-4">
                    {/* 4 Deep Tabs */}
                    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                      {[
                        { id: 'peel', label: 'Dàn ý chuẩn PEEL', icon: Target, count: '4 Bước' },
                        {
                          id: 'vocab',
                          label: 'Từ vựng C1/C2',
                          icon: Award,
                          count: `${item.topicVocabularyC1C2?.length || 0} từ`,
                        },
                        {
                          id: 'model',
                          label: 'Bài mẫu Band 8.0+',
                          icon: BookOpen,
                          count: `${item.modelAnswerWordCount || 300} từ`,
                        },
                        { id: 'tips', label: 'Chiến thuật Giám khảo', icon: ShieldCheck },
                      ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = currentTab === tab.id;
                        return (
                          <button data-ux-flow="live-hub.refresh"
                            key={tab.id}
                            onClick={() =>
                              setActiveTabPerItem((prev) => ({
                                ...prev,
                                [item.id]: tab.id as any,
                              }))
                            }
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                              isActive
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            <span>{tab.label}</span>
                            {tab.count && (
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                                  isActive
                                    ? 'bg-white/20 text-white'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                }`}
                              >
                                {tab.count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Tab 1: Dàn ý chuẩn PEEL */}
                    {currentTab === 'peel' && item.outlinePEEL && (
                      <div className="space-y-4 animate-fadeIn">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {/* [P] Point */}
                          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 shadow-sm space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center font-mono">
                                P
                              </span>
                              <h4 className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                                Point • Luận Điểm Trọng Tâm
                              </h4>
                            </div>
                            <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                              {item.outlinePEEL.point}
                            </p>
                          </div>

                          {/* [E] Explanation */}
                          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-sky-200 dark:border-sky-900/60 shadow-sm space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-sky-600 text-white font-black text-xs flex items-center justify-center font-mono">
                                E
                              </span>
                              <h4 className="text-xs font-black uppercase tracking-wider text-sky-700 dark:text-sky-300">
                                Explanation • Cơ Chế & Nguyên Nhân
                              </h4>
                            </div>
                            <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                              {item.outlinePEEL.explanation}
                            </p>
                          </div>

                          {/* [E] Evidence */}
                          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 shadow-sm space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center font-mono">
                                E
                              </span>
                              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                                Evidence • Dẫn Chứng Thực Tế
                              </h4>
                            </div>
                            <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                              {item.outlinePEEL.evidence}
                            </p>
                          </div>

                          {/* [L] Link */}
                          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/60 shadow-sm space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-amber-600 text-white font-black text-xs flex items-center justify-center font-mono">
                                L
                              </span>
                              <h4 className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
                                Link • Móc Nối & Hàm Ý Vĩ Mô
                              </h4>
                            </div>
                            <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                              {item.outlinePEEL.link}
                            </p>
                          </div>
                        </div>

                        {/* Suggested Paragraph Breakdown if available */}
                        {item.outlinePEEL.suggestedParagraphs && (
                          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              Cấu trúc phân đoạn đề xuất:
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {item.outlinePEEL.suggestedParagraphs.map((p, idx) => (
                                <div
                                  key={idx}
                                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-1.5"
                                >
                                  <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                    {p.heading}
                                  </div>
                                  <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside">
                                    {p.keyPoints.map((kp, kIdx) => (
                                      <li key={kIdx}>{kp}</li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tab 2: Từ vựng C1/C2 */}
                    {currentTab === 'vocab' && (
                      <div className="space-y-3 animate-fadeIn">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {item.topicVocabularyC1C2.map((vocab, vIdx) => {
                            const cardKey = `${item.id}_${vocab.phrase}`;
                            const isAdded = !!addedVocabPhrases[cardKey];

                            return (
                              <div
                                key={vIdx}
                                className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between space-y-2.5"
                              >
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                                        {vocab.phrase}
                                      </span>
                                      {vocab.phonetic && (
                                        <span className="text-[11px] font-mono text-slate-400">
                                          {vocab.phonetic}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                      {vocab.cefrLevel || 'C1'}
                                    </span>
                                  </div>

                                  <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                                    {vocab.pos} • {vocab.meaningVi}
                                  </div>

                                  <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-900/60 p-2 rounded-xl border border-slate-200/60 dark:border-slate-800">
                                    "{vocab.exampleSentence}"
                                  </p>
                                </div>

                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                  <button data-ux-flow="live-hub.refresh"
                                    onClick={() => playTextToSpeech(vocab.phrase, 1.0, 'British')}
                                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
                                    title="Phát âm"
                                  >
                                    <Volume2 className="w-3.5 h-3.5" />
                                  </button>

                                  <button data-ux-flow="live-hub.refresh"
                                    onClick={() => handleSaveVocabToSRS(vocab, item.id)}
                                    disabled={isAdded}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                                      isAdded
                                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                        : 'bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40'
                                    }`}
                                  >
                                    {isAdded ? (
                                      <>
                                        <Check className="w-3.5 h-3.5" />
                                        <span>Đã lưu vào SRS</span>
                                      </>
                                    ) : (
                                      <>
                                        <PlusCircle className="w-3.5 h-3.5" />
                                        <span>+ Thêm Flashcard</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Tab 3: Bài mẫu Band 8.0+ */}
                    {currentTab === 'model' && (
                      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3 animate-fadeIn">
                        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/80">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs font-mono">
                              BAND 8.0 - 8.5+ MODEL
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              Độ dài: {item.modelAnswerWordCount || 320} từ
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button data-ux-flow="live-hub.refresh"
                              onClick={() => handlePlayModelAudio(item.band8ModelAnswer, item.id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                                isAudioActive
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200'
                              }`}
                            >
                              {isAudioActive ? (
                                <>
                                  <VolumeX className="w-3.5 h-3.5" />
                                  <span>Dừng đọc</span>
                                </>
                              ) : (
                                <>
                                  <Volume2 className="w-3.5 h-3.5" />
                                  <span>Nghe audio mẫu</span>
                                </>
                              )}
                            </button>

                            <button data-ux-flow="live-hub.refresh"
                              onClick={() => {
                                navigator.clipboard.writeText(item.band8ModelAnswer);
                                awardXP(5, 'Sao chép bài mẫu');
                              }}
                              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                              title="Sao chép toàn bộ bài mẫu"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Essay paragraphs formatted */}
                        <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-serif leading-relaxed space-y-3 whitespace-pre-line select-text">
                          {item.band8ModelAnswer}
                        </div>
                      </div>
                    )}

                    {/* Tab 4: Lời khuyên Giám khảo */}
                    {currentTab === 'tips' && (
                      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3 animate-fadeIn">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                          <ShieldCheck className="w-4 h-4" />
                          <span>Chiến thuật khảo thí từ Giám khảo chấm thi:</span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                          {item.examinerTipsVi}
                        </p>

                        {item.groundingSourceTitle && (
                          <div className="pt-3 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                            <span>Nguồn xác thực khảo thí: {item.groundingSourceTitle}</span>
                            {item.groundingSourceUrl && (
                              <a data-ux-flow="live-hub.refresh"
                                href={item.groundingSourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                              >
                                <span>Xem bản gốc</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Explicit Consent Action Modal for Incomplete Source or Mock */}
      {consentModal?.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="consent-modal-title"
          aria-describedby="consent-modal-description"
          ref={modalRef}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full shadow-2xl p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold text-xs border border-amber-300 dark:border-amber-800">
                    Kiểm tra tính hoàn chỉnh
                  </span>
                </div>
                <h3 id="consent-modal-title" className="text-lg font-black text-slate-900 dark:text-white">
                  {consentModal.target === 'mock'
                    ? 'Tùy chọn tạo Mock Test từ nguồn Live Hub'
                    : 'Xác nhận xử lý nguồn chưa hoàn chỉnh'}
                </h3>
              </div>
              <button
                data-ux-control="live-hub.consent.close-button"
                data-ux-flow="live-hub.consent.dismiss"
                onClick={closeConsentModal}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                aria-label="Đóng hộp thoại"
              >
                ✕
              </button>
            </div>

            <div id="consent-modal-description" className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-2 text-xs text-amber-900 dark:text-amber-200">
              <p className="font-semibold">{consentModal.completeness.summaryVi}</p>
              {consentModal.completeness.missingComponents.length > 0 && (
                <p className="text-[11px] text-amber-800 dark:text-amber-300">
                  <strong>Phần còn thiếu:</strong> {consentModal.completeness.missingComponents.join(', ')}
                </p>
              )}
            </div>

            <div className="space-y-2.5">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Vui lòng chọn hướng xử lý (Omni IELTS không tự động gọi AI khi chưa có sự đồng ý):
              </p>

              <div className="grid grid-cols-1 gap-2.5">
                {/* Action 1: Search More */}
                <button
                  data-ux-control="live-hub.consent.search-more-button"
                  data-ux-flow="live-hub.consent.search-more"
                  onClick={() => handleExecuteConsent('search_more')}
                  className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-left transition-all group flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Search className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      🔍 Tra cứu thêm từ Live Hub
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Tìm kiếm thêm nguồn tài liệu đầy đủ hơn từ các nguồn khảo thí và đề thi thực tế đã ghi nhận trong Live Hub.
                    </p>
                  </div>
                </button>

                {/* Action 2: Practice Available Portion (only shown when availableComponents has usable content) */}
                {consentModal.completeness.availableComponents && consentModal.completeness.availableComponents.length > 0 && (
                  <button
                    data-ux-control="live-hub.consent.practice-available-button"
                    data-ux-flow="live-hub.consent.practice-available"
                    onClick={() => handleExecuteConsent('practice_available')}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-left transition-all group flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                        📖 {consentModal.target === 'mock'
                          ? `Luyện riêng kỹ năng có sẵn (${consentModal.item.evidenceType === 'verified_report' ? 'nguồn đã xác minh' : consentModal.item.evidenceType === 'reported_recall' ? 'nguồn hồi tưởng có dẫn chứng' : 'nguồn Live Hub chưa xác minh'})`
                          : 'Luyện phần có sẵn (Không chấm điểm phần thiếu)'}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Luyện trực tiếp phần nội dung đã tìm được, không biến đổi hoặc thêm thắt; mức độ xác minh vẫn giữ đúng theo citation của item.
                      </p>
                    </div>
                  </button>
                )}

                {/* Action 3: AI Fill Missing */}
                <button
                  data-ux-control="live-hub.consent.ai-fill-missing-button"
                  data-ux-flow="live-hub.consent.ai-fill-missing"
                  onClick={() => handleExecuteConsent('ai_fill_missing')}
                  className="p-3.5 rounded-2xl border border-amber-300 dark:border-amber-800/80 bg-amber-50/60 dark:bg-amber-950/20 hover:bg-amber-100/80 dark:hover:bg-amber-950/40 text-left transition-all group flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-200 dark:bg-amber-900/80 text-amber-800 dark:text-amber-200 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-300">
                      🤖 {consentModal.item.evidenceType === 'verified_report'
                        ? 'Nguồn đã xác minh'
                        : consentModal.item.evidenceType === 'reported_recall'
                          ? 'Nguồn hồi tưởng có dẫn chứng'
                          : 'Nguồn Live Hub chưa xác minh'} + AI bổ sung ({consentModal.target === 'mock' ? 'Ghép đề 4 kỹ năng' : 'Bổ sung phần thiếu'})
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Giữ nguyên phần lấy từ nguồn và citation hiện có; AI chỉ tạo phần còn thiếu. Artifact sẽ ghi riêng provenance của nguồn và phần AI.
                    </p>
                  </div>
                </button>

                {/* Action 4: Create AI Variant */}
                <button
                  data-ux-control="live-hub.consent.create-ai-variant-button"
                  data-ux-flow="live-hub.consent.create-ai-variant"
                  onClick={() => handleExecuteConsent('create_ai_variant')}
                  className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-left transition-all group flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      ✨ {consentModal.target === 'mock' ? 'Tạo Full Mock hoàn toàn mới bằng AI' : 'Tạo bài AI riêng biệt'}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Tạo bài luyện/mock test mới chuẩn IELTS bằng AI, giữ nguyên bài nguồn gốc độc lập. Gắn nhãn: <em>AI-generated IELTS-style Practice/Mock</em>.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
