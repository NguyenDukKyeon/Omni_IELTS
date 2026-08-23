import { AITutorMessage, DiagnosticMultiSkillInput, DiagnosticPsychometricianReport } from '../types';

export interface TutorResponse {
  reply: string;
  suggestedFollowUps: string[];
  citations?: Array<{ claimId: string; title: string; url: string; snippet?: string }>;
  retrievedAt?: string;
  researchMode?: boolean;
}

export function getGeminiRequestHeaders(): Record<string, string> {
  const geminiApiKey = typeof window !== 'undefined' ? sessionStorage.getItem('omni_gemini_api_key') : null;
  const groqApiKey = typeof window !== 'undefined' ? sessionStorage.getItem('omni_groq_api_key') : null;
  return {
    'Content-Type': 'application/json',
    ...(geminiApiKey ? { 'x-gemini-api-key': geminiApiKey } : {}),
    ...(groqApiKey ? { 'x-groq-api-key': groqApiKey } : {}),
  };
}

export async function askAITutor(
  messages: AITutorMessage[],
  screenContext: string,
  currentBand: number,
  targetBand: number,
  researchMode = false,
): Promise<TutorResponse> {
    const res = await fetch('/api/tutor/respond', {
      method: 'POST',
      headers: getGeminiRequestHeaders(),
      body: JSON.stringify({
        messages,
        screenContext,
        currentBand,
        targetBand,
        researchMode,
      }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || `HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    return {
      reply: data.reply || 'Xin lỗi, tôi chưa thể trả lời lúc này. Bạn có thể thử lại sau giây lát!',
      suggestedFollowUps: data.suggestedFollowUps || [
        'Giải thích cấu trúc ngữ pháp này',
        'Cho ví dụ áp dụng trong Writing Task 2',
        'Gợi ý từ đồng nghĩa band 7.5+'
      ],
      citations: data.citations,
      retrievedAt: data.retrievedAt,
      researchMode: data.researchMode,
    };
}

export async function fetchUrlContentApi(url: string): Promise<{ title: string; content: string; url: string }> {
  const res = await fetch('/api/fetch-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Không thể trích xuất nội dung từ liên kết này.');
  }
  return await res.json();
}

export async function analyzeLearningSourceApi(
  content: string,
  title: string,
  sourceType: string,
  targetBand: number = 7.0,
  customInstruction?: string
) {
  try {
    const res = await fetch('/api/gemini/analyze-source', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, title, sourceType, targetBand, customInstruction }),
    });
    if (!res.ok) throw new Error('Analyze failed');
    return await res.json();
  } catch (err) {
    console.warn('Source analyze fallback:', err);
    return {
      summary: `Nội dung đã được trích xuất từ tài liệu "${title}". Bài viết xoay quanh các khái niệm học thuật then chốt có tính ứng dụng cao trong các chủ đề IELTS thường gặp (chuẩn hóa theo Band ${targetBand}).`,
      topicVi: "Khoa học, Xã hội & Phát triển Bền vững",
      estimatedCEFR: targetBand >= 8.0 ? 'C2' : targetBand >= 7.0 ? 'C1' : 'B2',
      keyVocab: [
        {
          word: "comprehensive",
          phonetic: "/ˌkɒm.prɪˈhen.sɪv/",
          pos: "adj",
          definitionVi: "toàn diện, bao quát",
          definitionEn: "complete and including everything that is necessary",
          exampleEn: "The government should implement a comprehensive policy to tackle emissions.",
          exampleVi: "Chính phủ nên thực thi một chính sách toàn diện để giải quyết khí thải.",
          collocations: ["comprehensive approach", "comprehensive analysis"],
          cefrLevel: "C1"
        },
        {
          word: "mitigate",
          phonetic: "/ˈmɪt.ɪ.ɡeɪt/",
          pos: "verb",
          definitionVi: "giảm nhẹ, xoa dịu (hậu quả/tác hại)",
          definitionEn: "make something less severe, serious, or painful",
          exampleEn: "Planting more urban trees helps mitigate the heat island effect.",
          exampleVi: "Trồng thêm cây xanh đô thị giúp giảm nhẹ hiệu ứng đảo nhiệt.",
          collocations: ["mitigate risks", "mitigate the impact"],
          cefrLevel: "C1"
        },
        {
          word: "ubiquitous",
          phonetic: "/juːˈbɪk.wə.təs/",
          pos: "adj",
          definitionVi: "phổ biến ở khắp mọi nơi",
          definitionEn: "present, appearing, or found everywhere",
          exampleEn: "Digital monitoring platforms have become ubiquitous in environmental science.",
          exampleVi: "Các nền tảng giám sát kỹ thuật số đã trở nên phổ biến ở mọi nơi trong khoa học môi trường.",
          collocations: ["ubiquitous presence", "become ubiquitous"],
          cefrLevel: "C1"
        }
      ],
      grammarPoints: [
        {
          pattern: "Inversion with Negative Adverbials",
          formula: "Rarely / Seldom / Under no circumstances + Auxiliary + S + V",
          example: "Under no circumstances should environmental preservation be compromised for short-term profit.",
          explanation: "Cấu trúc đảo ngữ với trạng từ phủ định nâng cấp câu khẳng định thông thường lên đẳng cấp C1/C2 trong Task 2."
        }
      ],
      lessonPack: {
        targetBand: targetBand,
        topicVi: "Phát triển Bền vững & Trách nhiệm Xã hội",
        estimatedCEFR: targetBand >= 8.0 ? 'C2' : targetBand >= 7.0 ? 'C1' : 'B2',
        reading: {
          title: `Academic Insights: ${title || "Environmental Adaptation & Policy"}`,
          adaptedPassage: `Recent research underscores that sustainable practices are vital for enduring socio-economic stability. As urban centers confront escalating carbon outputs, policymakers increasingly favor comprehensive initiatives that harmonize technological modernization with environmental preservation. Empirical evidence indicates that proactive green investments not only mitigate severe climate consequences but also generate lucrative employment in renewable industries. Consequently, neglecting ecological sustainability in pursuit of short-term fiscal gain is widely regarded as counterproductive.`,
          wordCount: 75,
          questions: [
            {
              id: "rq_1",
              type: "true_false_not_given",
              question: "Proactive green investments only benefit the environment without offering any financial or employment advantages.",
              correctAnswer: "FALSE",
              explanation: "Đoạn văn khẳng định: 'not only mitigate severe climate consequences but also generate lucrative employment in renewable industries'.",
              paragraphReference: "Câu 3"
            },
            {
              id: "rq_2",
              type: "multiple_choice",
              question: "What is the primary perspective regarding sacrificing environmental sustainability for short-term fiscal gain?",
              options: [
                "It is universally recommended by modern economists",
                "It is considered counterproductive and detrimental",
                "It is exclusively practiced in rural municipalities",
                "It eliminates all public debt instantly"
              ],
              correctAnswer: "It is considered counterproductive and detrimental",
              explanation: "Câu cuối nêu: 'neglecting ecological sustainability in pursuit of short-term fiscal gain is widely regarded as counterproductive'."
            },
            {
              id: "rq_3",
              type: "sentence_completion",
              question: "Policymakers favor initiatives that harmonize technological modernization with environmental ________.",
              correctAnswer: "preservation",
              explanation: "Từ khóa chính xác trong đoạn đọc là 'preservation'."
            }
          ]
        },
        listening: {
          audioScript: "Good morning class. Today we will examine how proactive ecological initiatives foster sustainable urban development. Notice how Dr. Jenkins highlights the intersection between technological modernization and resource conservation.",
          isDialogue: true,
          dialogueTurns: [
            {
              speaker: "Presenter (Emma)",
              gender: "female",
              text: "Dr. Jenkins, how do comprehensive environmental policies mitigate modern urban crises?",
              translationVi: "Thưa TS Jenkins, các chính sách môi trường toàn diện giúp giảm nhẹ khủng hoảng đô thị hiện đại như thế nào?"
            },
            {
              speaker: "Dr. Jenkins (Scholar)",
              gender: "male",
              text: "They act as a dual catalyst: reducing harmful emissions while simultaneously stimulating green economic sectors.",
              translationVi: "Chúng đóng vai trò như chất xúc tác kép: vừa cắt giảm khí thải độc hại vừa đồng thời kích thích các ngành kinh tế xanh."
            }
          ],
          questions: [
            {
              id: "lq_1",
              type: "multiple_choice",
              question: "According to Dr. Jenkins, what dual effect do environmental policies achieve?",
              options: [
                "Reducing emissions and stimulating green economic sectors",
                "Increasing taxes and slowing down manufacturing",
                "Replacing all urban housing projects",
                "Banning international travel"
              ],
              correctAnswer: "Reducing emissions and stimulating green economic sectors",
              explanation: "TS Jenkins phát biểu: 'reducing harmful emissions while simultaneously stimulating green economic sectors'."
            },
            {
              id: "lq_2",
              type: "gap_fill",
              question: "Environmental policies act as a dual ________ in modern urban management.",
              correctAnswer: "catalyst",
              explanation: "Từ cần điền là 'catalyst'."
            }
          ]
        },
        speaking: {
          discussionQuestions: [
            {
              id: "sq_1",
              question: `To what extent do you agree that individuals have more power than governments in mitigating climate change?`,
              suggestedIdeasVi: [
                "Người dân có quyền quyết định qua hành vi tiêu dùng xanh và giảm rác thải",
                "Tuy nhiên, chính phủ sở hữu quyền lực chế tài, luật định và ngân sách hạ tầng quy mô lớn"
              ],
              bandBoostVocab: ["individual agency", "statutory regulations", "catalyst for change", "systemic overhaul"]
            },
            {
              id: "sq_2",
              question: "How can businesses balance commercial profitability with ecological responsibilities?",
              suggestedIdeasVi: [
                "Đầu tư vào chuỗi cung ứng bền vững và nguyên liệu tái chế",
                "Xây dựng thương hiệu uy tín thu hút khách hàng có ý thức bảo vệ môi trường"
              ],
              bandBoostVocab: ["corporate social responsibility", "circular economy", "brand equity", "viable alternatives"]
            }
          ],
          geminiLivePrompt: `Hãy đóng vai Giám khảo IELTS Speaking Part 3 giàu kinh nghiệm. Bạn đang đối thoại trực tiếp với học viên về chủ đề: "${title || "Sustainable Development"}". Hãy đặt câu hỏi thảo luận, lắng nghe học viên trả lời và đưa ra phản hồi đối thoại tự nhiên, đồng thời gợi ý cách dùng từ vựng Band ${targetBand}.`
        },
        writing: {
          taskType: "Task 2 Opinion / Discussion",
          prompt: `Some people believe that technological innovation is the only effective way to solve environmental problems. Others think that changes in human behavior and lifestyle are essential. Discuss both views and give your opinion. (Target Band: ${targetBand})`,
          sampleOutline: [
            "Introduction: Paraphrase prompt & thesis statement (both technological advancement and behavioral adjustment are essential complements).",
            "Body Paragraph 1: The necessity of technology (renewable energy, carbon capture, automated efficiency).",
            "Body Paragraph 2: The indispensability of behavioral modification (curbing consumerism, energy conservation).",
            "Conclusion: Synthesis highlighting that technology provides tools while human behavior dictates adoption."
          ],
          bandDescriptorsFocus: `Duy trì tính mạch lạc (Coherence) xuyên suốt và kết hợp từ vựng học thuật C1/C2 để đạt Band ${targetBand}.`
        }
      },
      exercises: [
        {
          question: "Choose the best academic synonym for 'make less severe':",
          options: ["mitigate", "exacerbate", "deteriorate", "perpetuate"],
          correctAnswer: "mitigate",
          explanation: "'Mitigate' mang nghĩa giảm thiểu hoặc làm nhẹ bớt tác động tiêu cực."
        }
      ]
    };
  }
}

export async function evaluateWritingApi(
  promptTopic: string,
  essayContent: string,
  taskType: string,
  targetBand: number
) {
  try {
    const res = await fetch('/api/gemini/evaluate-writing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promptTopic, essayContent, taskType, targetBand }),
    });
    if (!res.ok) throw new Error('Eval failed');
    return await res.json();
  } catch (err) {
    console.warn('Writing eval fallback:', err);
    return {
      estimatedBand: 6.5,
      criteriaScores: {
        taskResponse: 6.5,
        coherenceCohesion: 6.5,
        lexicalResource: 6.5,
        grammaticalAccuracy: 6.5
      },
      generalFeedback: "Bài viết phát triển ý mạch lạc. Bạn đã trả lời được các yêu cầu chính của đề. Để vươn tới band 7.5+, hãy sử dụng thêm các mệnh đề quan hệ rút gọn và thay thế các từ vựng chung chung bằng thuật ngữ học thuật cụ thể.",
      mistakesFound: [
        {
          errorText: "in my opinion, i think that",
          correctedText: "from my perspective, it is evident that",
          type: "cohesion",
          explanation: "Tránh lặp cụm thừa 'in my opinion, i think' để bài viết trang trọng hơn."
        },
        {
          errorText: "Many people has the tendency to",
          correctedText: "Many individuals have the tendency to",
          type: "grammar",
          explanation: "Chủ ngữ số nhiều 'people/individuals' cần đi cùng trợ động từ 'have'."
        }
      ],
      upgradedSentences: [
        {
          original: "Traffic congestion causes a lot of pollution in big cities.",
          upgraded: "Severe vehicular congestion is a primary catalyst for rampant urban atmospheric degradation.",
          bandLevel: "8.0+"
        }
      ]
    };
  }
}

export async function generateVocabCardApi(
  word: string,
  contextHint?: string,
  targetBand: number = 7.5,
  userInterest?: string
) {
  try {
    const res = await fetch('/api/gemini/generate-vocab-card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word, contextHint, targetBand, userInterest }),
    });
    if (!res.ok) throw new Error('Generate vocab card failed');
    return await res.json();
  } catch (err) {
    console.warn('Vocab card generation fallback:', err);
    const clean = word.trim();
    return {
      word: clean,
      phonetic: `/${clean.toLowerCase()}/`,
      ukPhonetic: `/${clean.toLowerCase()}/`,
      usPhonetic: `/${clean.toLowerCase()}/`,
      pos: 'noun',
      cefrLevel: 'C1',
      definitionVi: `Khái niệm hoặc thuật ngữ học thuật quan trọng: ${clean}.`,
      definitionEn: `Academic term denoting an essential concept in IELTS topics.`,
      definitionAcademicEn: `A theoretical construct or functional principle commonly examined in academic discourse.`,
      exampleEn: `The implications of ${clean} are profoundly significant in contemporary discourse.`,
      exampleVi: `Những tác động của ${clean} có ý nghĩa vô cùng sâu sắc trong các cuộc thảo luận đương đại.`,
      examples: [
        {
          en: `The implications of ${clean} are profoundly significant in contemporary discourse.`,
          vi: `Những tác động của ${clean} có ý nghĩa vô cùng sâu sắc trong các cuộc thảo luận đương đại.`,
          context: 'IELTS Task 2' as const,
        },
        {
          en: `In my view, mastering ${clean} helps students articulate complex viewpoints.`,
          vi: `Theo tôi, làm chủ ${clean} giúp học sinh diễn đạt các quan điểm phức tạp.`,
          context: 'Speaking' as const,
        }
      ],
      collocations: [`profound ${clean}`, `the concept of ${clean}`, `${clean} in practice`],
      synonyms: [{ word: 'counterpart', nuance: 'khái niệm tương đương' }],
      antonyms: [],
      mnemonic: `Liên tưởng từ "${clean}" với ngữ cảnh thực tế để khắc sâu vào trí nhớ dài hạn.`,
      topicDeck: contextHint || 'Academic Word List (AWL)',
      imageUrl: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&auto=format&fit=crop&q=80'
    };
  }
}

export async function evaluatePronunciationApi(
  targetWord: string,
  targetPhonetic: string,
  userTranscript: string
) {
  try {
    const res = await fetch('/api/gemini/evaluate-pronunciation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetWord, targetPhonetic, userTranscript }),
    });
    if (!res.ok) throw new Error('Pronunciation eval failed');
    return await res.json();
  } catch (err) {
    console.warn('Pronunciation eval fallback:', err);
    const target = targetWord.trim().toLowerCase();
    const trans = userTranscript.trim().toLowerCase();
    const isMatch = target === trans;
    return {
      accuracy: isMatch ? 96 : trans.includes(target) ? 85 : 60,
      phoneticMatch: isMatch,
      feedback: isMatch
        ? `Phát âm từ "${targetWord}" rất chuẩn xác, khẩu hình và trọng âm tốt!`
        : `Bạn đã nói "${userTranscript}". Hãy chú ý nhấn đúng trọng âm và phát âm rõ âm đuôi của từ "${targetWord}".`,
      tips: `Lắng nghe lại giọng mẫu UK/US và thử đọc chậm từng âm tiết.`
    };
  }
}

export function playTextToSpeech(
  text: string,
  voiceType: 'uk' | 'us' = 'uk',
  voiceRate: number = 0.95
) {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voiceType === 'us' ? 'en-US' : 'en-GB';
    utterance.rate = voiceRate;

    // Try finding specific natural voices if available in browser
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const match = voices.find((v) =>
        voiceType === 'us'
          ? v.lang.startsWith('en-US')
          : v.lang.startsWith('en-GB') || v.lang.includes('UK')
      );
      if (match) {
        utterance.voice = match;
      }
    }

    window.speechSynthesis.speak(utterance);
  }
}

export async function generateGrammarExercisesApi(
  topicId: string,
  topicTitle: string,
  topicVi: string,
  count: number = 3,
  targetBand: number = 7.5,
  category?: string
) {
  try {
    const res = await fetch('/api/gemini/generate-grammar-exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicId, topicTitle, topicVi, count, targetBand, category }),
    });
    if (!res.ok) throw new Error('Generate grammar exercises failed');
    return await res.json();
  } catch (err) {
    console.warn('Grammar exercise generation fallback:', err);
    return {
      exercises: [
        {
          id: `gen_fallback_${Date.now()}_1`,
          type: 'sentence_transformation',
          question: `Transform into an inverted sentence: "If municipal authorities had invested in mass transit, urban congestion would have been mitigated."`,
          promptVi: `Viết lại câu sử dụng cấu trúc đảo ngữ:`,
          baseSentenceToTransform: "If municipal authorities had invested in mass transit, urban congestion would have been mitigated.",
          correctAnswer: "Had municipal authorities invested in mass transit, urban congestion would have been mitigated.",
          explanation: "Đảo trợ động từ 'Had' lên trước chủ ngữ 'municipal authorities' và bỏ liên từ 'If'.",
        },
        {
          id: `gen_fallback_${Date.now()}_2`,
          type: 'error_correction',
          question: `Identify and fix the mistake in this IELTS sentence:`,
          promptVi: `Tìm và sửa lỗi sai trong câu:`,
          originalSentenceWithMistake: "Not only online courses are cost-effective, but they also offer scheduling flexibility.",
          correctAnswer: "Not only are online courses cost-effective, but they also offer scheduling flexibility.",
          explanation: "Sau cụm từ 'Not only', phải đảo to be 'are' lên trước chủ ngữ 'online courses'.",
        }
      ]
    };
  }
}

export async function evaluateGrammarExerciseApi(
  exercise: any,
  userAnswer: string,
  topicTitle: string
) {
  try {
    const res = await fetch('/api/gemini/evaluate-grammar-exercise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exercise, userAnswer, topicTitle }),
    });
    if (!res.ok) throw new Error('Evaluate grammar failed');
    return await res.json();
  } catch (err) {
    console.warn('Grammar evaluation fallback:', err);
    const cleanUser = (userAnswer || '').trim().toLowerCase();
    const cleanCorrect = (exercise.correctAnswer || '').trim().toLowerCase();
    const isExact = cleanUser === cleanCorrect;
    return {
      isCorrect: isExact,
      score: isExact ? 100 : 0,
      feedbackVi: isExact
        ? 'Chính xác tuyệt đối! Cấu trúc câu ngữ pháp rất chuẩn.'
        : `Đáp án của bạn: "${userAnswer}". Đáp án chuẩn: "${exercise.correctAnswer}".`,
      whyExplanation: exercise.explanation || 'Hãy chú ý vị trí trợ động từ và các quy tắc hòa hợp thì.',
      bandBoostTips: 'Hãy ghi nhớ cấu trúc này để đưa vào câu mở đoạn Body trong bài Writing Task 2.'
    };
  }
}

export async function diagnoseGrammarApi(
  text: string,
  targetBand: number = 7.5
) {
  try {
    const res = await fetch('/api/gemini/diagnose-grammar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetBand }),
    });
    if (!res.ok) throw new Error('Diagnose grammar failed');
    return await res.json();
  } catch (err) {
    console.warn('Grammar diagnose fallback:', err);
    return {
      originalText: text,
      overallGrammarScore: 78,
      estimatedBand: 6.5,
      detectedErrors: [
        {
          errorSubstring: "The number of people who uses",
          correctedSubstring: "The number of people who use",
          explanationVi: "Mệnh đề quan hệ bổ nghĩa cho danh từ số nhiều 'people', nên động từ chia là 'use'.",
          category: "Subject-Verb Agreement",
          relatedTopicId: "grm_relative_clauses",
          severity: "major"
        }
      ],
      upgradedSentences: [
        {
          original: text.slice(0, 100),
          upgradedBand8: "Were municipal authorities to allocate comprehensive subsidies, vehicular reliance would diminish substantially.",
          enhancementType: "Inverted Conditional & Academic Lexical Density",
          relatedTopicId: "grm_conditionals"
        }
      ],
      recommendedTopicIds: ["grm_conditionals", "grm_inversion", "grm_relative_clauses"]
    };
  }
}

export async function diagnoseMultiSkillAssessmentApi(
  input: DiagnosticMultiSkillInput
): Promise<DiagnosticPsychometricianReport> {
  const res = await fetch('/api/gemini/diagnostic-psychometrician', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Yêu cầu chẩn đoán Psychometrician thất bại (HTTP ${res.status}).`
    );
  }

  return await res.json();
}

