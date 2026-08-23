import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  ModuleId,
  UserProfile,
  LearningSource,
  VocabCard,
  MistakeEntry,
  MediaSession,
  GrammarTopic,
  IELTSKnowledgeArticle,
  PracticeAttempt,
  MockResult,
  AITutorMessage,
} from '../types';
import {
  initialProfile,
  initialSources,
  initialVocabCards,
  initialMistakes,
  initialMediaSessions,
  initialGrammarTopics,
  initialKnowledgeArticles,
  initialPracticeAttempts,
  initialMockResults,
} from '../data/initialData';
import { curatedIELTSDecks } from '../data/curatedDecks';
import { calculateNextSRS, ReviewRating } from '../services/srsScheduler';
import { calculateLevel, updateStreak, XP_REWARDS } from '../services/gamification';
import { askAITutor } from '../services/aiTutor';

interface NotificationState {
  id: string;
  message: string;
  type: 'success' | 'info' | 'xp' | 'warning';
}

interface AppContextType {
  activeModule: ModuleId;
  setActiveModule: (mod: ModuleId) => void;
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  sources: LearningSource[];
  addSource: (source: LearningSource) => void;
  deleteSource: (id: string) => void;
  vocabCards: VocabCard[];
  addVocabCard: (card: VocabCard) => void;
  bulkAddVocabCards: (cards: VocabCard[]) => void;
  updateVocabCard: (card: VocabCard) => void;
  reviewVocabCard: (cardId: string, rating: ReviewRating) => void;
  resetVocabSRS: (cardId: string) => void;
  deleteVocabCard: (cardId: string) => void;
  importCuratedDeck: (deckId: string) => void;
  mistakes: MistakeEntry[];
  addMistake: (entry: MistakeEntry) => void;
  reviewMistake: (mistakeId: string, rating: ReviewRating) => void;
  deleteMistake: (id: string) => void;
  mediaSessions: MediaSession[];
  addMediaSession: (session: MediaSession) => void;
  updateMediaSession: (session: MediaSession) => void;
  deleteMediaSession: (id: string) => void;
  grammarTopics: GrammarTopic[];
  updateGrammarMastery: (id: string, newPercent: number) => void;
  knowledgeArticles: IELTSKnowledgeArticle[];
  practiceAttempts: PracticeAttempt[];
  addPracticeAttempt: (attempt: PracticeAttempt) => void;
  mockResults: MockResult[];
  addMockResult: (result: MockResult) => void;
  isAITutorOpen: boolean;
  setIsAITutorOpen: (open: boolean) => void;
  openAITutorWithPrompt: (promptText: string) => void;
  tutorMessages: AITutorMessage[];
  sendTutorMessage: (text: string) => Promise<void>;
  isTutorLoading: boolean;
  isMistakeNotebookOpen: boolean;
  setIsMistakeNotebookOpen: (open: boolean) => void;
  isOnboardingOpen: boolean;
  setIsOnboardingOpen: (open: boolean) => void;
  isDiagnosticOpen: boolean;
  setIsDiagnosticOpen: (open: boolean) => void;
  isSentenceStylistOpen: boolean;
  setIsSentenceStylistOpen: (open: boolean) => void;
  sentenceStylistData: { sentence: string; topic?: string };
  openSentenceStylist: (sentence?: string, topic?: string) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  awardXP: (amount: number, reason?: string) => void;
  notification: NotificationState | null;
  clearNotification: () => void;
  isExamModeActive: boolean;
  setIsExamModeActive: (active: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PROFILE: 'omni_ielts_profile_v1',
  SOURCES: 'omni_ielts_sources_v1',
  VOCAB: 'omni_ielts_vocab_v1',
  MISTAKES: 'omni_ielts_mistakes_v1',
  MEDIA: 'omni_ielts_media_v1',
  GRAMMAR: 'omni_ielts_grammar_v1',
  PRACTICE: 'omni_ielts_practice_v1',
  MOCKS: 'omni_ielts_mocks_v1',
  DARK_MODE: 'omni_ielts_dark_v1',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeModule, setActiveModule] = useState<ModuleId>('dashboard');
  const [isAITutorOpen, setIsAITutorOpen] = useState<boolean>(false);
  const [isMistakeNotebookOpen, setIsMistakeNotebookOpen] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState<boolean>(false);
  const [isSentenceStylistOpen, setIsSentenceStylistOpen] = useState<boolean>(false);
  const [sentenceStylistData, setSentenceStylistData] = useState<{ sentence: string; topic?: string }>({
    sentence: '',
    topic: '',
  });
  const [isTutorLoading, setIsTutorLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<NotificationState | null>(null);
  const [isExamModeActive, setIsExamModeActive] = useState<boolean>(false);

  // Dark mode state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DARK_MODE);
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  // Profile State
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
      return saved ? JSON.parse(saved) : initialProfile;
    } catch {
      return initialProfile;
    }
  });

  // Sources State
  const [sources, setSources] = useState<LearningSource[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SOURCES);
      return saved ? JSON.parse(saved) : initialSources;
    } catch {
      return initialSources;
    }
  });

  // Vocab Cards State
  const [vocabCards, setVocabCards] = useState<VocabCard[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.VOCAB);
      return saved ? JSON.parse(saved) : initialVocabCards;
    } catch {
      return initialVocabCards;
    }
  });

  // Mistakes Notebook State with smart schema migration & initial merge
  const [mistakes, setMistakes] = useState<MistakeEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MISTAKES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge initial items so updated trap fields & explanations are always preserved
          const initialMap = new Map(initialMistakes.map((m) => [m.id, m]));
          const merged: MistakeEntry[] = parsed.map((m: any) => {
            const init = initialMap.get(m.id);
            if (init) {
              return {
                ...init,
                ...m,
                trapCategory: m.trapCategory || init.trapCategory,
                trapCategoryTitleVi: m.trapCategoryTitleVi || init.trapCategoryTitleVi,
                trapBreakdownVi: m.trapBreakdownVi || init.trapBreakdownVi,
                examinerTipVi: m.examinerTipVi || init.examinerTipVi,
                questionContext: m.questionContext || init.questionContext,
                userAttemptAnswer: m.userAttemptAnswer || init.userAttemptAnswer,
                options: m.options || init.options,
                srsStage: typeof m.srsStage === 'number' ? m.srsStage : init.srsStage,
                nextReviewDate: m.nextReviewDate || init.nextReviewDate,
                tags: Array.isArray(m.tags) ? m.tags : init.tags,
              };
            }
            return {
              ...m,
              tags: Array.isArray(m.tags) ? m.tags : [],
              explanation: m.explanation || '',
              errorText: m.errorText || '',
            };
          });

          // Add any new initial mistakes that weren't in saved
          initialMistakes.forEach((init) => {
            if (!merged.some((m) => m.id === init.id)) {
              merged.push(init);
            }
          });

          return merged;
        }
      }
      return initialMistakes;
    } catch {
      return initialMistakes;
    }
  });

  // Media Sessions with seamless schema migration & fallback
  const [mediaSessions, setMediaSessions] = useState<MediaSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MEDIA);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge initial sessions with saved sessions
          const initialIds = new Set(initialMediaSessions.map((s) => s.id));
          const userCustomSessions = parsed.filter((p: any) => p && !initialIds.has(p.id));
          const updatedInitial = initialMediaSessions.map((initS) => {
            const savedMatch = parsed.find((p: any) => p && p.id === initS.id);
            if (savedMatch) {
              return {
                ...initS,
                ...savedMatch,
                transcriptSegments: Array.isArray(savedMatch.transcriptSegments) && savedMatch.transcriptSegments.length > 0
                  ? savedMatch.transcriptSegments
                  : initS.transcriptSegments,
                extractedVocab: Array.isArray(savedMatch.extractedVocab) && savedMatch.extractedVocab.length > 0
                  ? savedMatch.extractedVocab
                  : (initS.extractedVocab || []),
              };
            }
            return initS;
          });
          return [...userCustomSessions, ...updatedInitial];
        }
      }
      return initialMediaSessions;
    } catch {
      return initialMediaSessions;
    }
  });

  // Grammar Topics with seamless schema migration & fallback
  const [grammarTopics, setGrammarTopics] = useState<GrammarTopic[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.GRAMMAR);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge with initialGrammarTopics so updated fields, exercises & tags are always present
          return initialGrammarTopics.map((initTopic) => {
            const userTopic = parsed.find((p: any) => p && p.id === initTopic.id);
            if (userTopic) {
              return {
                ...initTopic,
                ...userTopic,
                userMasteryPercent: typeof userTopic.userMasteryPercent === 'number' ? userTopic.userMasteryPercent : initTopic.userMasteryPercent,
                lastPracticedDate: userTopic.lastPracticedDate || initTopic.lastPracticedDate,
                relatedMistakeTags: Array.isArray(userTopic.relatedMistakeTags) && userTopic.relatedMistakeTags.length > 0
                  ? userTopic.relatedMistakeTags
                  : (initTopic.relatedMistakeTags || []),
                sampleSentences: Array.isArray(userTopic.sampleSentences) && userTopic.sampleSentences.length > 0
                  ? userTopic.sampleSentences
                  : (initTopic.sampleSentences || []),
                keyFormulas: Array.isArray(userTopic.keyFormulas) && userTopic.keyFormulas.length > 0
                  ? userTopic.keyFormulas
                  : (initTopic.keyFormulas || []),
                commonPitfalls: Array.isArray(userTopic.commonPitfalls) && userTopic.commonPitfalls.length > 0
                  ? userTopic.commonPitfalls
                  : (initTopic.commonPitfalls || []),
                exercises: Array.isArray(userTopic.exercises) && userTopic.exercises.length > 0
                  ? userTopic.exercises
                  : (initTopic.exercises || []),
              };
            }
            return initTopic;
          });
        }
      }
      return initialGrammarTopics;
    } catch {
      return initialGrammarTopics;
    }
  });

  // Knowledge Articles (static initial data)
  const [knowledgeArticles] = useState<IELTSKnowledgeArticle[]>(initialKnowledgeArticles);

  // Practice Attempts
  const [practiceAttempts, setPracticeAttempts] = useState<PracticeAttempt[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRACTICE);
      return saved ? JSON.parse(saved) : initialPracticeAttempts;
    } catch {
      return initialPracticeAttempts;
    }
  });

  // Mock Results
  const [mockResults, setMockResults] = useState<MockResult[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MOCKS);
      return saved ? JSON.parse(saved) : initialMockResults;
    } catch {
      return initialMockResults;
    }
  });

  // AI Tutor Messages
  const [tutorMessages, setTutorMessages] = useState<AITutorMessage[]>([
    {
      id: 'tut_welcome',
      role: 'assistant',
      content: `Xin chào ${profile.name}! Tôi là **Omni IELTS AI Tutor**. 
Tôi có thể hỗ trợ bạn theo đúng ngữ cảnh của màn hình hiện tại:
- 💡 Trích xuất & giải thích từ vựng C1/C2 từ bài đọc/nghe
- ✍️ Sửa và nâng cấp câu Writing Task 1/2 lên Band 7.5+
- 🗣️ Gợi ý ý tưởng và phản xạ cho Speaking Part 1, 2, 3
- 🧠 Phân tích lỗi ngữ pháp & đưa bài tập khắc phục trực tiếp vào Sổ tay lỗi sai!`,
      timestamp: new Date().toISOString(),
      suggestedFollowUps: [
        'Hôm nay tôi nên ưu tiên học gì trước?',
        'Phân tích 3 cấu trúc ghi điểm trong Writing Task 2',
        'Cách tránh lỗi mất điểm trong Listening Section 3',
      ],
    },
  ]);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    } catch (e) {
      console.warn('Storage sync failed for profile', e);
    }
  }, [profile]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SOURCES, JSON.stringify(sources));
    } catch (e) {
      console.warn('Storage sync failed for sources', e);
    }
  }, [sources]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.VOCAB, JSON.stringify(vocabCards));
    } catch (e) {
      console.warn('Storage sync failed for vocab', e);
    }
  }, [vocabCards]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MISTAKES, JSON.stringify(mistakes));
    } catch (e) {
      console.warn('Storage sync failed for mistakes', e);
    }
  }, [mistakes]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MEDIA, JSON.stringify(mediaSessions));
    } catch (e) {
      console.warn('Storage sync failed for media', e);
    }
  }, [mediaSessions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.GRAMMAR, JSON.stringify(grammarTopics));
    } catch (e) {
      console.warn('Storage sync failed for grammar', e);
    }
  }, [grammarTopics]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PRACTICE, JSON.stringify(practiceAttempts));
    } catch (e) {
      console.warn('Storage sync failed for practice', e);
    }
  }, [practiceAttempts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MOCKS, JSON.stringify(mockResults));
    } catch (e) {
      console.warn('Storage sync failed for mocks', e);
    }
  }, [mockResults]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.DARK_MODE, JSON.stringify(darkMode));
    } catch (e) {
      console.warn('Storage sync failed for dark mode', e);
    }
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Initial streak check on mount
  useEffect(() => {
    setProfile((prev) => updateStreak(prev));
  }, []);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  const awardXP = (amount: number, reason?: string) => {
    setProfile((prev) => {
      const newXP = prev.xp + amount;
      const { level } = calculateLevel(newXP);
      return {
        ...prev,
        xp: newXP,
        level,
      };
    });

    setNotification({
      id: Math.random().toString(),
      message: `+${amount} XP! ${reason || 'Hoàn thành bài tập'}`,
      type: 'xp',
    });

    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  const clearNotification = () => setNotification(null);

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  };

  const addSource = (source: LearningSource) => {
    setSources((prev) => [source, ...prev]);
    awardXP(XP_REWARDS.SOURCE_INGESTED, `Nạp thành công nguồn học liệu: ${source.title}`);
  };

  const deleteSource = (id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
  };

  const addVocabCard = (card: VocabCard) => {
    setVocabCards((prev) => [card, ...prev]);
    awardXP(5, `Đã thêm từ mới "${card.word}" vào bộ nhớ SRS`);
  };

  const bulkAddVocabCards = (newCards: VocabCard[]) => {
    setVocabCards((prev) => {
      const existingIds = new Set(prev.map((c) => c.id));
      const existingWords = new Set(prev.map((c) => c.word.toLowerCase()));
      const filtered = newCards.filter(
        (c) => !existingIds.has(c.id) && !existingWords.has(c.word.toLowerCase())
      );
      return [...filtered, ...prev];
    });
    awardXP(newCards.length * 5, `Đã nạp ${newCards.length} thẻ từ vựng vào kho SRS`);
  };

  const updateVocabCard = (updatedCard: VocabCard) => {
    setVocabCards((prev) =>
      prev.map((card) => (card.id === updatedCard.id ? updatedCard : card))
    );
    setNotification({
      id: Math.random().toString(),
      message: `Đã cập nhật thông tin thẻ từ "${updatedCard.word}"`,
      type: 'info',
    });
  };

  const resetVocabSRS = (cardId: string) => {
    setVocabCards((prev) =>
      prev.map((card) => {
        if (card.id !== cardId) return card;
        return {
          ...card,
          srsStage: 0,
          intervalDays: 1,
          nextReviewDate: new Date().toISOString(),
          easeFactor: 2.5,
          repetitions: 0,
          mastered: false,
        };
      })
    );
    setNotification({
      id: Math.random().toString(),
      message: 'Đã đặt lại tiến độ học thẻ về Hộp 1 (Mới nạp)',
      type: 'info',
    });
  };

  const importCuratedDeck = (deckId: string) => {
    const deck = curatedIELTSDecks.find((d) => d.id === deckId);
    if (!deck) return;
    bulkAddVocabCards(deck.cards);
    setNotification({
      id: Math.random().toString(),
      message: `Đã nạp thành công bộ từ "${deck.titleVi}" (${deck.cards.length} từ)`,
      type: 'success',
    });
  };

  const reviewVocabCard = (cardId: string, rating: ReviewRating) => {
    setVocabCards((prev) =>
      prev.map((card) => {
        if (card.id !== cardId) return card;
        const srs = calculateNextSRS(
          card.srsStage,
          card.intervalDays,
          card.easeFactor,
          card.repetitions,
          rating
        );
        return {
          ...card,
          ...srs,
          lastReviewedDate: new Date().toISOString(),
        };
      })
    );
    awardXP(XP_REWARDS.VOCAB_REVIEW_CARD, 'Ôn tập thẻ từ vựng SRS');
  };

  const deleteVocabCard = (cardId: string) => {
    setVocabCards((prev) => prev.filter((c) => c.id !== cardId));
  };

  const addMistake = (entry: MistakeEntry) => {
    setMistakes((prev) => [entry, ...prev]);
    setNotification({
      id: Math.random().toString(),
      message: `Đã ghi nhận lỗi vào Sổ tay lỗi sai hợp nhất (${entry.errorType})`,
      type: 'info',
    });
  };

  const reviewMistake = (mistakeId: string, rating: ReviewRating) => {
    setMistakes((prev) =>
      prev.map((item) => {
        if (item.id !== mistakeId) return item;
        const srs = calculateNextSRS(
          item.srsStage,
          item.intervalDays || 1,
          item.easeFactor || 2.5,
          item.repetitions || item.reviewCount || 0,
          rating
        );
        return {
          ...item,
          ...srs,
          reviewCount: (item.reviewCount || 0) + 1,
          lastReviewedDate: new Date().toISOString(),
        };
      })
    );
    awardXP(XP_REWARDS.MISTAKE_REVIEWED, 'Khắc phục bẫy lỗi sai (SRS)');
  };

  const deleteMistake = (id: string) => {
    setMistakes((prev) => prev.filter((m) => m.id !== id));
  };

  const addMediaSession = (session: MediaSession) => {
    setMediaSessions((prev) => [session, ...prev]);
  };

  const updateMediaSession = (session: MediaSession) => {
    setMediaSessions((prev) => prev.map((s) => (s.id === session.id ? session : s)));
  };

  const deleteMediaSession = (id: string) => {
    setMediaSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const updateGrammarMastery = (id: string, newPercent: number) => {
    setGrammarTopics((prev) =>
      prev.map((g) => (g.id === id ? { ...g, userMasteryPercent: newPercent } : g))
    );
  };

  const addPracticeAttempt = (attempt: PracticeAttempt) => {
    setPracticeAttempts((prev) => [attempt, ...prev]);
    awardXP(XP_REWARDS.PRACTICE_COMPLETED, `Hoàn thành bài luyện tập ${attempt.taskType}`);
  };

  const addMockResult = (result: MockResult) => {
    setMockResults((prev) => [result, ...prev]);
    // update current estimated band if higher or refreshed
    updateProfile({
      currentBand: result.overallBand,
      skillBands: {
        listening: result.listeningBand,
        reading: result.readingBand,
        writing: result.writingBand,
        speaking: result.speakingBand,
      },
    });
    awardXP(XP_REWARDS.MOCK_TEST_COMPLETED, 'Hoàn thành bài thi thử IELTS!');
  };

  const sendTutorMessage = async (text: string) => {
    const userMsg: AITutorMessage = {
      id: Math.random().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
      screenContext: activeModule,
    };

    const newMessages = [...tutorMessages, userMsg];
    setTutorMessages(newMessages);
    setIsTutorLoading(true);

    try {
      const response = await askAITutor(
        newMessages,
        activeModule,
        profile.currentBand,
        profile.targetBand
      );

      const assistantMsg: AITutorMessage = {
        id: Math.random().toString(),
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toISOString(),
        screenContext: activeModule,
        suggestedFollowUps: response.suggestedFollowUps,
      };

      setTutorMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Tutor message error', err);
    } finally {
      setIsTutorLoading(false);
    }
  };

  const openAITutorWithPrompt = (promptText: string) => {
    setIsAITutorOpen(true);
    sendTutorMessage(promptText);
  };

  const openSentenceStylist = (sentence: string = '', topic: string = '') => {
    setSentenceStylistData({ sentence, topic });
    setIsSentenceStylistOpen(true);
  };

  return (
    <AppContext.Provider
      value={{
        activeModule,
        setActiveModule,
        profile,
        updateProfile,
        sources,
        addSource,
        deleteSource,
        vocabCards,
        addVocabCard,
        bulkAddVocabCards,
        updateVocabCard,
        reviewVocabCard,
        resetVocabSRS,
        deleteVocabCard,
        importCuratedDeck,
        mistakes,
        addMistake,
        reviewMistake,
        deleteMistake,
        mediaSessions,
        addMediaSession,
        updateMediaSession,
        deleteMediaSession,
        grammarTopics,
        updateGrammarMastery,
        knowledgeArticles,
        practiceAttempts,
        addPracticeAttempt,
        mockResults,
        addMockResult,
        isAITutorOpen,
        setIsAITutorOpen,
        openAITutorWithPrompt,
        tutorMessages,
        sendTutorMessage,
        isTutorLoading,
        isMistakeNotebookOpen,
        setIsMistakeNotebookOpen,
        isOnboardingOpen,
        setIsOnboardingOpen,
        isDiagnosticOpen,
        setIsDiagnosticOpen,
        isSentenceStylistOpen,
        setIsSentenceStylistOpen,
        sentenceStylistData,
        openSentenceStylist,
        darkMode,
        toggleDarkMode,
        awardXP,
        notification,
        clearNotification,
        isExamModeActive,
        setIsExamModeActive,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
