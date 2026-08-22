import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));

// Initialize GoogleGenAI client lazily or safely with User-Agent telemetry
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// AI Tutor endpoint with screen context awareness
app.post("/api/gemini/tutor", async (req, res) => {
  try {
    const { messages, screenContext, currentBand, targetBand } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      // Return helpful fallback response if API key is not configured
      return res.json({
        reply: `Xin chào! Tôi là Gia sư AI Omni IELTS. 
(Gợi ý: Hệ thống đang chạy ở chế độ mô phỏng thông minh. Hãy gắn GEMINI_API_KEY trong Settings để kích hoạt toàn bộ sức mạnh mô hình Gemini).
Bạn đang ở màn hình: **${screenContext || "Dashboard"}** (Mục tiêu: Band ${targetBand || "7.0"}).
Hãy hỏi tôi bất kỳ thắc mắc nào về từ vựng, ngữ pháp, chiến thuật làm bài hay cách triển khai ý tưởng Writing/Speaking!`,
        suggestedFollowUps: [
          "Làm sao nâng cấp từ vựng bài này lên C1?",
          "Chỉ cho tôi 3 cấu trúc ngữ pháp ghi điểm band 7.5+",
          "Giải thích bẫy thường gặp trong dạng bài này"
        ]
      });
    }

    const systemInstruction = `Bạn là Gia sư AI luyện thi IELTS chuyên nghiệp của ứng dụng Omni IELTS ("Omni IELTS AI Tutor").
Phong cách: Tận tâm, sư phạm, khuyến khích, phân tích logic chuẩn mực theo tiêu chí chấm điểm IELTS chính thức của Cambridge/IDP/British Council.
Thông tin học viên:
- Band hiện tại: ${currentBand || "5.5"}
- Band mục tiêu: ${targetBand || "7.5"}
- Ngữ cảnh màn hình đang xem: "${screenContext || "Tổng quan"}"

Quy tắc trả lời:
1. Luôn trả lời ngắn gọn, súc tích, định dạng markdown đẹp (bullet points, in đậm từ khóa quan trọng).
2. Khi giải thích từ vựng hoặc ngữ pháp, luôn kèm phiên âm IPA, giải nghĩa tiếng Việt, ví dụ câu học thuật IELTS (Academic context) và từ đồng nghĩa/collocation liên quan.
3. Khi chữa bài hoặc gợi ý câu, hãy đưa ra phiên bản câu hiện tại -> phiên bản nâng cấp Band 7.5+ kèm lý do nâng cấp.
4. Đưa ra 2-3 gợi ý câu hỏi tiếp theo (gắn trong format JSON hoặc cuối câu) để người học dễ tương tác tiếp.`;

    const userLastMessage = messages && messages.length > 0 ? messages[messages.length - 1].content : "Xin chào";
    
    // Construct prompt with history context
    let historyContext = "";
    if (messages && messages.length > 1) {
      historyContext = messages.slice(-5, -1).map((m: any) => `${m.role === 'user' ? 'Học viên' : 'Gia sư'}: ${m.content}`).join("\n");
    }

    const prompt = `${historyContext ? `Lịch sử hội thoại gần nhất:\n${historyContext}\n\n` : ""}Học viên đang ở màn hình [${screenContext || "Chung"}].
Câu hỏi của học viên: ${userLastMessage}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const replyText = response.text || "Tôi đã nhận được câu hỏi của bạn. Hãy cùng phân tích nhé!";

    res.json({
      reply: replyText,
      suggestedFollowUps: [
        "Cho tôi ví dụ ứng dụng trong IELTS Writing Task 2",
        "Có cấu trúc nâng cao nào đồng nghĩa không?",
        "Tạo một câu hỏi trắc nghiệm để tôi kiểm tra kiến thức"
      ]
    });
  } catch (error: any) {
    console.error("Tutor API Error:", error);
    res.status(500).json({ error: error.message || "Lỗi xử lý AI Tutor" });
  }
});

// Helper to clean HTML text
function extractCleanTextFromHtml(html: string): string {
  // Remove scripts, styles, noscript, svg, nav, footer, header
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

  // Replace block tags with newlines
  text = text.replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|article|section|blockquote)>/gi, '\n');
  // Strip remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Collapse multiple whitespaces and excessive newlines
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 25) // Filter out short menu items
    .join('\n\n')
    .slice(0, 15000);
}

// Fetch Article / Webpage Content
app.post("/api/fetch-url", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL không hợp lệ." });
    }

    const targetUrl = url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`;
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OmniIELTS/1.0",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });

    if (!response.ok) {
      return res.status(400).json({ error: `Không thể tải trang (HTTP ${response.status}). Vui lòng kiểm tra lại đường dẫn hoặc dán trực tiếp nội dung văn bản.` });
    }

    const html = await response.text();
    const cleanText = extractCleanTextFromHtml(html);

    // Extract title from <title> or <h1>
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i) || html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const extractedTitle = titleMatch ? titleMatch[1].replace(/[\n\r\t]/g, '').trim() : "Bài báo trích xuất từ URL";

    if (!cleanText || cleanText.length < 50) {
      return res.json({
        title: extractedTitle,
        content: `Nội dung từ trang web ${targetUrl}: Trang web này có thể chặn truy cập tự động hoặc sử dụng render phía client. Bạn có thể sao chép trực tiếp văn bản vào ô nhập.`,
        url: targetUrl
      });
    }

    res.json({
      title: extractedTitle,
      content: cleanText,
      url: targetUrl
    });
  } catch (error: any) {
    console.error("Fetch URL Error:", error);
    res.status(500).json({ error: error.message || "Lỗi khi trích xuất nội dung từ URL" });
  }
});

// Analyze Learning Source & Generate Comprehensive 4-Skill Lesson Pack
app.post("/api/gemini/analyze-source", async (req, res) => {
  try {
    const { content, title, sourceType, targetBand, customInstruction } = req.body;
    const cleanBand = targetBand ? Number(targetBand) : 7.0;
    const ai = getGeminiClient();

    if (!ai) {
      // Offline fallback with rich 4-skill lesson pack
      return res.json({
        summary: `Tóm tắt nội dung "${title || "Tài liệu học liệu"}": Bài viết cung cấp các luận điểm và số liệu học thuật hữu ích cho chủ đề IELTS. Đã được chuẩn hóa tương thích mục tiêu Band ${cleanBand}.`,
        estimatedCEFR: cleanBand >= 8.0 ? "C2" : cleanBand >= 7.0 ? "C1" : "B2",
        topicVi: "Khoa học, Xã hội & Môi trường Đương đại",
        keyVocab: [
          {
            word: "ubiquitous",
            phonetic: "/juːˈbɪk.wə.təs/",
            pos: "adj",
            definitionVi: "phổ biến ở khắp mọi nơi",
            definitionEn: "present, appearing, or found everywhere",
            exampleEn: "Smartphones and automated algorithms have become ubiquitous in modern urban life.",
            exampleVi: "Điện thoại thông minh và các thuật toán tự động đã trở nên phổ biến ở khắp mọi nơi trong đời sống đô thị hiện đại.",
            collocations: ["ubiquitous presence", "become ubiquitous"],
            cefrLevel: "C1"
          },
          {
            word: "detrimental",
            phonetic: "/ˌdet.rɪˈmen.təl/",
            pos: "adj",
            definitionVi: "gây hại, có hại",
            definitionEn: "tending to cause harm",
            exampleEn: "Excessive consumption of unprocessed digital information exerts a detrimental impact on cognitive focus.",
            exampleVi: "Tiêu thụ quá mức thông tin số chưa qua xử lý gây ra tác động có hại tới khả năng tập trung nhận thức.",
            collocations: ["detrimental effect", "detrimental impact on"],
            cefrLevel: "C1"
          },
          {
            word: "mitigate",
            phonetic: "/ˈmɪt.ɪ.ɡeɪt/",
            pos: "verb",
            definitionVi: "giảm nhẹ, xoa dịu (tác động tiêu cực)",
            definitionEn: "to make something less severe or harmful",
            exampleEn: "Proactive policymaking is indispensable to mitigate potential economic shocks.",
            exampleVi: "Hoạch định chính sách chủ động là không thể thiếu để giảm nhẹ các cú sốc kinh tế tiềm tàng.",
            collocations: ["mitigate risks", "mitigate the impact"],
            cefrLevel: "C1"
          }
        ],
        grammarPoints: [
          {
            pattern: "Inversion with Negative Adverbials",
            formula: "Not only + Auxiliary + S + V, but S + also + V",
            example: "Not only does sustainable innovation reduce operational overheads, but it also bolsters environmental longevity.",
            explanation: "Cấu trúc đảo ngữ nhấn mạnh hai vế song song, nâng cao điểm Grammatical Range & Accuracy trong Writing & Speaking."
          }
        ],
        lessonPack: {
          targetBand: cleanBand,
          topicVi: "Chủ đề học thuật: Phát triển Bền vững & Công nghệ",
          estimatedCEFR: cleanBand >= 8.0 ? "C2" : cleanBand >= 7.0 ? "C1" : "B2",
          reading: {
            title: `Academic Discourse: ${title || "Modern Scientific Perspectives"}`,
            adaptedPassage: `Recent empirical investigations have demonstrated that sustainable methodologies are fundamental to future industrial growth. In contemporary socio-economic frameworks, policy analysts emphasize that technological adaptation must proceed in tandem with ecological conservation. While conventional models prioritized rapid short-term yield, modern perspectives underline that neglecting environmental equilibrium entails catastrophic long-term expenditures. Consequently, proactive investments in carbon neutrality and digitized monitoring systems are becoming ubiquitous across both developed and developing economies.`,
            wordCount: 78,
            questions: [
              {
                id: "rq_1",
                type: "true_false_not_given",
                question: "Modern economic frameworks prioritize immediate short-term financial returns over ecological equilibrium.",
                correctAnswer: "FALSE",
                explanation: "Đoạn văn nêu rõ: 'conventional models prioritized rapid short-term yield, modern perspectives underline that neglecting environmental equilibrium entails catastrophic long-term expenditures' (mô hình truyền thống mới ưu tiên lợi nhuận ngắn hạn, còn quan điểm hiện đại nhấn mạnh tính cân bằng sinh thái).",
                paragraphReference: "Đoạn 1, câu 3"
              },
              {
                id: "rq_2",
                type: "multiple_choice",
                question: "According to the passage, proactive investments in digitized monitoring systems are:",
                options: [
                  "Exclusively observed in developing nations",
                  "Becoming widespread in both developing and developed nations",
                  "Causing unexpected macroeconomic instability",
                  "Discarded due to exorbitant maintenance costs"
                ],
                correctAnswer: "Becoming widespread in both developing and developed nations",
                explanation: "Câu cuối khẳng định: 'becoming ubiquitous across both developed and developing economies'."
              },
              {
                id: "rq_3",
                type: "sentence_completion",
                question: "Neglecting environmental equilibrium will inevitably result in catastrophic ________ expenditures.",
                correctAnswer: "long-term",
                explanation: "Từ cần điền trong bài là 'long-term' (chi phí dài hạn thảm khốc)."
              }
            ]
          },
          listening: {
            audioScript: "Hello everyone, and welcome to this week's Academic Perspectives seminar. Today, Dr. Watson and I are examining how technological integration reshapes modern sustainability initiatives. Let us first review why proactive investment mitigates catastrophic risks.",
            isDialogue: true,
            dialogueTurns: [
              {
                speaker: "Host (Emma)",
                gender: "female",
                text: "Welcome Dr. Watson. Could you elaborate on why proactive sustainable investment has become such a critical priority?",
                translationVi: "Chào mừng Tiến sĩ Watson. Thầy có thể làm rõ tại sao việc đầu tư bền vững chủ động lại trở thành ưu tiên then chốt không ạ?"
              },
              {
                speaker: "Dr. Watson (Expert)",
                gender: "male",
                text: "Certainly, Emma. Failing to act now leads to irreversible environmental degradation. By implementing clean technologies, we mitigate both economic and ecological vulnerabilities.",
                translationVi: "Chắc chắn rồi Emma. Không hành động ngay sẽ dẫn tới sự suy thoái môi trường không thể phục hồi. Bằng cách áp dụng công nghệ sạch, chúng ta giảm nhẹ cả rủi ro kinh tế lẫn sinh thái."
              }
            ],
            questions: [
              {
                id: "lq_1",
                type: "multiple_choice",
                question: "What is the primary benefit of implementing clean technologies mentioned by Dr. Watson?",
                options: [
                  "It eliminates all operational workforce",
                  "It mitigates both economic and ecological vulnerabilities",
                  "It triples short-term commercial profits",
                  "It replaces traditional university faculties"
                ],
                correctAnswer: "It mitigates both economic and ecological vulnerabilities",
                explanation: "Dr. Watson phát biểu: 'we mitigate both economic and ecological vulnerabilities'."
              },
              {
                id: "lq_2",
                type: "gap_fill",
                question: "According to the speaker, failing to act now will lead to irreversible ________ degradation.",
                correctAnswer: "environmental",
                explanation: "Từ còn thiếu trong đoạn thoại là 'environmental'."
              }
            ]
          },
          speaking: {
            discussionQuestions: [
              {
                id: "sq_1",
                question: "To what extent do you agree that governments should subsidize clean energy over traditional fossil fuel industries?",
                suggestedIdeasVi: [
                  "Giảm thiểu lượng khí thải carbon và đạt mục tiêu Net Zero",
                  "Tạo công ăn việc làm mới trong ngành công nghệ xanh (green jobs)",
                  "Cần cân đối ngân sách để tránh lạm phát và bảo đảm an ninh năng lượng trong giai đoạn chuyển đổi"
                ],
                bandBoostVocab: ["subsidize", "carbon neutrality", "paradigm shift", "fiscal allocation", "mitigate risks"]
              },
              {
                id: "sq_2",
                question: "How can educational curricula be improved to prepare the younger generation for future environmental challenges?",
                suggestedIdeasVi: [
                  "Lồng ghép giáo dục môi trường vào các môn học thực hành",
                  "Tập trung rèn luyện tư duy phản biện và giải quyết vấn đề thực tế"
                ],
                bandBoostVocab: ["pedagogical reform", "indispensable", "foster awareness", "holistic approach"]
              }
            ],
            geminiLivePrompt: `Hãy đóng vai Giám khảo IELTS Speaking Part 3 thân thiện nhưng chuẩn mực. Bạn đang thảo luận với học viên về chủ đề: "${title || "Sustainable Innovation & Policy"}". Hãy đặt lần lượt từng câu hỏi, lắng nghe câu trả lời của học viên và phản hồi bằng giọng điệu học thuật tự nhiên, chỉ ra 1 điểm xuất sắc và 1 gợi ý nâng cấp từ vựng band ${cleanBand}.`
          },
          writing: {
            taskType: "Task 2 Opinion / Discussion",
            prompt: `Some people believe that governments should bear the primary responsibility for tackling global environmental challenges, while others argue that individuals and private corporations must take the lead. Discuss both views and give your own opinion. (Target Band: ${cleanBand})`,
            sampleOutline: [
              "Introduction: Paraphrase topic & thesis statement (Both government regulation and corporate/individual initiatives are indispensable).",
              "Body 1: The crucial role of governmental policy (statutory enforcement, infrastructure subsidies, international treaties).",
              "Body 2: The power of consumer behavior & corporate innovation (sustainable purchasing, ESG compliance).",
              "Conclusion: Reiterate balanced synthesis for enduring impact."
            ],
            bandDescriptorsFocus: "Chú trọng tiêu chí Lexical Resource (dùng đúng collocations chuyên đề) và Task Response (phát triển luận điểm đa chiều)."
          }
        },
        exercises: [
          {
            question: "Choose the correct academic synonym for 'widespread and present everywhere':",
            options: ["ubiquitous", "detrimental", "transient", "scarce"],
            correctAnswer: "ubiquitous",
            explanation: "'Ubiquitous' = có mặt ở khắp mọi nơi."
          }
        ]
      });
    }

    const prompt = `Bạn là Chuyên gia Khảo thí Ngôn ngữ & Giám khảo IELTS Cambridge. Hãy tiếp nhận tài liệu học tập sau từ nguồn "${sourceType || 'văn bản'}" với tiêu đề "${title || 'Chưa đặt tên'}":
Văn bản gốc:
"""
${content.slice(0, 6000)}
"""

YÊU CẦU:
1. Xác định chủ đề, ước lượng độ khó CEFR (B2, C1, C2) và Band IELTS tương ứng.
2. Viết lại/phỏng theo (adapt) nội dung này thành "GÓI BÀI HỌC 4 KỸ NĂNG" (Four-Skill Lesson Pack) chuẩn văn phong bài thi IELTS Academic với mức độ khó phù hợp với Band mục tiêu của học viên là Band ${cleanBand}.
${customInstruction ? `Ghi chú bổ sung từ học viên: "${customInstruction}"` : ''}

Hãy trả về duy nhất 1 JSON hợp lệ theo đúng cấu trúc sau:
{
  "summary": "Tóm tắt 2-3 câu súc tích bằng tiếng Việt",
  "estimatedCEFR": "B2 hoặc C1 hoặc C2",
  "topicVi": "Tên chủ đề tiếng Việt ngắn gọn",
  "keyVocab": [
    {
      "word": "từ vựng học thuật 1",
      "phonetic": "/phiên âm IPA chuẩn/",
      "pos": "noun/verb/adj/adv",
      "definitionVi": "Nghĩa tiếng Việt chuẩn học thuật",
      "definitionEn": "Định nghĩa tiếng Anh súc tích",
      "exampleEn": "Câu ví dụ thực tế trong bài",
      "exampleVi": "Dịch câu ví dụ",
      "collocations": ["collocation 1", "collocation 2"],
      "cefrLevel": "B2 hoặc C1 hoặc C2"
    }
  ],
  "grammarPoints": [
    {
      "pattern": "Tên cấu trúc ngữ pháp ghi điểm",
      "formula": "Công thức tổng quát",
      "example": "Câu ví dụ minh họa",
      "explanation": "Giải thích cách ứng dụng vào bài thi"
    }
  ],
  "lessonPack": {
    "targetBand": ${cleanBand},
    "topicVi": "Chủ đề bài học tiếng Việt",
    "estimatedCEFR": "B2 hoặc C1 hoặc C2",
    "reading": {
      "title": "Tiêu đề bài đọc IELTS Reading Academic",
      "adaptedPassage": "Đoạn văn đọc học thuật khoảng 150-250 từ viết lại chuẩn band ${cleanBand}",
      "wordCount": 180,
      "questions": [
        {
          "id": "rq_1",
          "type": "true_false_not_given",
          "question": "Câu hỏi T/F/NG 1",
          "correctAnswer": "TRUE hoặc FALSE hoặc NOT GIVEN",
          "explanation": "Giải thích chi tiết vì sao",
          "paragraphReference": "Vị trí trong bài"
        },
        {
          "id": "rq_2",
          "type": "multiple_choice",
          "question": "Câu hỏi trắc nghiệm 4 lựa chọn",
          "options": ["A", "B", "C", "D"],
          "correctAnswer": "Đáp án đúng",
          "explanation": "Giải thích chi tiết"
        },
        {
          "id": "rq_3",
          "type": "sentence_completion",
          "question": "Câu điền từ (ví dụ: The primary catalyst for change is ________.)",
          "correctAnswer": "từ cần điền",
          "explanation": "Giải thích chi tiết"
        }
      ]
    },
    "listening": {
      "audioScript": "Toàn bộ bài nghe (dạng bài giảng hoặc hội thoại thảo luận 2 người)",
      "isDialogue": true,
      "dialogueTurns": [
        {
          "speaker": "Speaker 1 (e.g. Professor / Host)",
          "gender": "male hoặc female",
          "text": "Lời thoại tiếng Anh",
          "translationVi": "Dịch nghĩa tiếng Việt"
        },
        {
          "speaker": "Speaker 2 (e.g. Student / Expert)",
          "gender": "female hoặc male",
          "text": "Lời thoại tiếng Anh",
          "translationVi": "Dịch nghĩa tiếng Việt"
        }
      ],
      "questions": [
        {
          "id": "lq_1",
          "type": "multiple_choice",
          "question": "Câu hỏi nghe trắc nghiệm",
          "options": ["A", "B", "C", "D"],
          "correctAnswer": "Đáp án đúng",
          "explanation": "Giải thích chi tiết"
        },
        {
          "id": "lq_2",
          "type": "gap_fill",
          "question": "Câu hỏi nghe điền từ",
          "correctAnswer": "từ cần điền",
          "explanation": "Giải thích chi tiết"
        }
      ]
    },
    "speaking": {
      "discussionQuestions": [
        {
          "id": "sq_1",
          "question": "Câu hỏi thảo luận IELTS Speaking Part 3 sâu sắc liên quan chủ đề",
          "suggestedIdeasVi": ["Ý tưởng triển khai 1", "Ý tưởng triển khai 2"],
          "bandBoostVocab": ["từ C1 nâng band 1", "từ 2", "từ 3"]
        },
        {
          "id": "sq_2",
          "question": "Câu hỏi thảo luận 2",
          "suggestedIdeasVi": ["Ý tưởng triển khai 1", "Ý tưởng triển khai 2"],
          "bandBoostVocab": ["từ C1 nâng band 1", "từ 2"]
        },
        {
          "id": "sq_3",
          "question": "Câu hỏi thảo luận 3",
          "suggestedIdeasVi": ["Ý tưởng triển khai 1", "Ý tưởng triển khai 2"],
          "bandBoostVocab": ["từ C1 nâng band 1", "từ 2"]
        }
      ],
      "geminiLivePrompt": "Prompt định hướng cho phiên thảo luận thoại Gemini Live"
    },
    "writing": {
      "taskType": "Task 1 Summary hoặc Task 2 Opinion / Discussion",
      "prompt": "Đề bài IELTS Writing gắn liền nội dung nguồn",
      "sampleOutline": [
        "Mở bài: Paraphrase đề bài & Thesis Statement",
        "Thân bài 1: Luận điểm chính 1 & ví dụ",
        "Thân bài 2: Luận điểm chính 2 & ví dụ",
        "Kết bài: Khẳng định lại quan điểm tổng thể"
      ],
      "bandDescriptorsFocus": "Trọng tâm cần lưu ý để đạt band ${cleanBand}"
    }
  },
  "exercises": [
    {
      "question": "Câu hỏi trắc nghiệm củng cố",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
      "explanation": "Giải thích chi tiết"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    const jsonText = response.text || "{}";
    const parsed = JSON.parse(jsonText);
    res.json(parsed);
  } catch (error: any) {
    console.error("Analyze Source Error:", error);
    res.status(500).json({ error: error.message || "Lỗi phân tích nguồn học liệu" });
  }
});

// Evaluate Writing Essay
app.post("/api/gemini/evaluate-writing", async (req, res) => {
  try {
    const { promptTopic, essayContent, taskType, targetBand } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        estimatedBand: 6.5,
        criteriaScores: {
          taskResponse: 6.5,
          coherenceCohesion: 6.5,
          lexicalResource: 6.5,
          grammaticalAccuracy: 6.5
        },
        generalFeedback: "Bài viết có bố cục rõ ràng, lập luận cơ bản chặt chẽ. Cần phát triển thêm ví dụ cụ thể và nâng cấp từ vựng học thuật ít phổ biến hơn (less common lexical items).",
        mistakesFound: [
          {
            errorText: "Many people believes that...",
            correctedText: "Many people believe that...",
            type: "grammar",
            explanation: "Chủ ngữ 'Many people' là số nhiều, động từ không thêm 's'."
          },
          {
            errorText: "have a big impact to the environment",
            correctedText: "exert a profound impact on the environment",
            type: "vocab",
            explanation: "Collocation chuẩn là 'impact on' thay vì 'impact to', và thay từ 'big' bằng tính từ học thuật 'profound/substantial'."
          }
        ],
        upgradedSentences: [
          {
            original: "Technology has changed how we communicate every day.",
            upgraded: "Technological advancements have fundamentally revolutionized contemporary interpersonal communication.",
            bandLevel: "8.0+"
          }
        ]
      });
    }

    const prompt = `Bạn là Giám khảo chấm thi IELTS Writing chuyên nghiệp (Examiner certified).
Hãy chấm bài viết sau theo 4 tiêu chí chuẩn IELTS: Task Response (TR), Coherence & Cohesion (CC), Lexical Resource (LR), Grammatical Range and Accuracy (GRA).

Đề bài: "${promptTopic || "IELTS Writing Prompt"}" (Loại bài: ${taskType || "Task 2"})
Mục tiêu của học viên: Band ${targetBand || "7.0"}

Bài viết của học viên:
"""
${essayContent}
"""

Trả về kết quả dưới dạng JSON:
{
  "estimatedBand": 6.5,
  "criteriaScores": {
    "taskResponse": 6.5,
    "coherenceCohesion": 6.5,
    "lexicalResource": 6.5,
    "grammaticalAccuracy": 6.5
  },
  "generalFeedback": "Nhận xét tổng quan súc tích, mang tính định hướng sư phạm",
  "mistakesFound": [
    {
      "errorText": "Đoạn bị lỗi",
      "correctedText": "Đoạn đã sửa đúng",
      "type": "grammar hoặc vocab hoặc cohesion",
      "explanation": "Giải thích ngắn gọn quy tắc"
    }
  ],
  "upgradedSentences": [
    {
      "original": "Câu gốc của học viên",
      "upgraded": "Câu nâng cấp chuẩn band 8+",
      "bandLevel": "8.0+"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (error: any) {
    console.error("Evaluate Writing Error:", error);
    res.status(500).json({ error: error.message || "Lỗi chấm bài Writing" });
  }
});

// Auto-generate rich IELTS Vocab Card from a single word/phrase
app.post("/api/gemini/generate-vocab-card", async (req, res) => {
  try {
    const { word, contextHint, targetBand, userInterest } = req.body;
    if (!word || typeof word !== "string" || !word.trim()) {
      return res.status(400).json({ error: "Vui lòng cung cấp từ hoặc cụm từ cần sinh." });
    }

    const cleanWord = word.trim();
    const ai = getGeminiClient();

    if (!ai) {
      // Smart offline fallback
      return res.json({
        word: cleanWord,
        ukPhonetic: `/${cleanWord.toLowerCase()}/`,
        usPhonetic: `/${cleanWord.toLowerCase()}/`,
        pos: cleanWord.endsWith("tion") || cleanWord.endsWith("ity") ? "noun" : cleanWord.endsWith("ive") || cleanWord.endsWith("al") ? "adj" : "noun",
        definitionVi: `Khái niệm học thuật liên quan đến ${cleanWord}.`,
        definitionEn: `Academic term describing a fundamental concept in ${contextHint || "IELTS subjects"}.`,
        definitionAcademicEn: `A structured academic principle or phenomenon frequently utilized in academic discourse.`,
        exampleEn: `The implementation of ${cleanWord} has proven vital in contemporary policy formulation.`,
        exampleVi: `Việc thực thi ${cleanWord} đã chứng minh là tối quan trọng trong việc xây dựng chính sách đương đại.`,
        examples: [
          {
            en: `The implementation of ${cleanWord} has proven vital in contemporary policy formulation.`,
            vi: `Việc thực thi ${cleanWord} đã chứng minh là tối quan trọng trong việc xây dựng chính sách đương đại.`,
            context: "IELTS Task 2"
          },
          {
            en: `From my perspective, ${cleanWord} plays an indispensable role in individual career growth.`,
            vi: `Theo quan điểm của tôi, ${cleanWord} đóng vai trò không thể thiếu trong sự phát triển sự nghiệp cá nhân.`,
            context: "Speaking"
          }
        ],
        collocations: [`profound ${cleanWord}`, `${cleanWord} in practice`, `concept of ${cleanWord}`],
        synonyms: [{ word: `counterpart`, nuance: "tương đương" }],
        antonyms: [],
        mnemonic: `Liên tưởng ${cleanWord} gắn với bối cảnh ${contextHint || "học thuật"} để ghi nhớ lâu hơn.`,
        cefrLevel: "C1",
        topicDeck: contextHint || "Academic Word List (AWL)",
        imageUrl: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&auto=format&fit=crop&q=80"
      });
    }

    const prompt = `Bạn là chuyên gia ngôn ngữ học & Giám khảo IELTS Cambridge. Hãy xây dựng một THẺ TỪ VỰNG IELTS HOÀN CHỈNH (IELTS Flashcard Card) cho từ hoặc cụm từ: "${cleanWord}".
Ngữ cảnh bổ sung nếu có: "${contextHint || 'IELTS General Academic'}"
Mục tiêu điểm của học viên: Band ${targetBand || '7.5+'}
${userInterest ? `Sở thích/Bối cảnh học viên: ${userInterest}` : ''}

Hãy trả về định dạng JSON DUY NHẤT theo schema sau:
{
  "word": "${cleanWord}",
  "ukPhonetic": "/phiên âm Anh - Anh chuẩn IPA/",
  "usPhonetic": "/phiên âm Anh - Mỹ chuẩn IPA/",
  "pos": "noun/verb/adj/adv/phrase",
  "cefrLevel": "B2 hoặc C1 hoặc C2",
  "definitionVi": "Nghĩa tiếng Việt ngắn gọn, súc tích, chuẩn học thuật",
  "definitionEn": "Định nghĩa tiếng Anh tự nhiên, dễ hiểu",
  "definitionAcademicEn": "Định nghĩa học thuật chuyên sâu (Academic Definition) theo chuẩn từ điển Oxford/Cambridge",
  "exampleEn": "Câu ví dụ chính chuẩn văn phong IELTS Task 2/Reading",
  "exampleVi": "Bản dịch câu ví dụ chính",
  "examples": [
    {
      "en": "Câu ví dụ 1 trong bối cảnh IELTS Writing Task 2",
      "vi": "Dịch nghĩa tiếng Việt câu 1",
      "context": "IELTS Task 2"
    },
    {
      "en": "Câu ví dụ 2 trong bối cảnh IELTS Speaking Part 3 hoặc đời sống",
      "vi": "Dịch nghĩa tiếng Việt câu 2",
      "context": "Speaking"
    },
    {
      "en": "Câu ví dụ 3 trong bối cảnh Academic / Reading",
      "vi": "Dịch nghĩa tiếng Việt câu 3",
      "context": "Academic"
    }
  ],
  "collocations": ["cụm collocation 1 ăn điểm Lexical Resource", "cụm collocation 2", "cụm collocation 3", "cụm collocation 4"],
  "synonyms": [
    { "word": "từ đồng nghĩa 1", "nuance": "sắc thái khác biệt ngắn gọn" },
    { "word": "từ đồng nghĩa 2", "nuance": "sắc thái khác biệt ngắn gọn" }
  ],
  "antonyms": ["từ trái nghĩa 1", "từ trái nghĩa 2"],
  "mnemonic": "Mẹo ghi nhớ (Mnemonic) cực kỳ trực quan, vui vẻ hoặc liên tưởng âm thanh/hình ảnh ngắn gọn giúp não nhớ ngay",
  "topicDeck": "Tên chủ đề IELTS phù hợp (ví dụ: Environment & Climate, Science & AI, Academic Word List (AWL), Education & Society, Economy & Trade, Health & Psychology, Crime & Law)",
  "imageUrl": "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&auto=format&fit=crop&q=80"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    // Ensure essential fallbacks
    parsed.word = parsed.word || cleanWord;
    parsed.phonetic = parsed.ukPhonetic || parsed.phonetic || `/${cleanWord}/`;
    parsed.pos = parsed.pos || "noun";
    parsed.exampleEn = parsed.exampleEn || (parsed.examples?.[0]?.en) || `The concept of ${cleanWord} is prevalent.`;
    parsed.exampleVi = parsed.exampleVi || (parsed.examples?.[0]?.vi) || `Khái niệm về ${cleanWord} rất phổ biến.`;
    parsed.collocations = parsed.collocations || [`profound ${cleanWord}`, `${cleanWord} in practice`];

    res.json(parsed);
  } catch (error: any) {
    console.error("Generate Vocab Card Error:", error);
    res.status(500).json({ error: error.message || "Lỗi tự động sinh thẻ từ vựng với AI" });
  }
});

// Evaluate Pronunciation / Speaking Drill
app.post("/api/gemini/evaluate-pronunciation", async (req, res) => {
  try {
    const { targetWord, targetPhonetic, userTranscript } = req.body;
    const ai = getGeminiClient();

    const target = (targetWord || "").trim().toLowerCase();
    const transcript = (userTranscript || "").trim().toLowerCase();

    const isExactMatch = target === transcript;
    const accuracy = isExactMatch ? 98 : transcript.includes(target) ? 88 : Math.max(35, Math.floor(75 - Math.abs(target.length - transcript.length) * 8));

    if (!ai) {
      return res.json({
        accuracy,
        phoneticMatch: isExactMatch,
        feedback: isExactMatch
          ? `Phát âm rất chuẩn xác từ "${targetWord}"! Trọng âm và âm đuôi đã rõ ràng.`
          : `Bạn đã nói "${userTranscript}". Hãy chú ý nhấn trọng âm chuẩn ${targetPhonetic || ""} và phát âm rõ phụ âm cuối.`,
        syllableBreakdown: target.split("").map((char: string) => ({ char, accurate: isExactMatch || transcript.includes(char) }))
      });
    }

    const prompt = `Đánh giá phát âm từ vựng IELTS của học viên:
- Từ chuẩn: "${targetWord}" (Phiên âm: ${targetPhonetic || ""})
- Học viên vừa đọc được nhận diện thành chữ: "${userTranscript}"

Hãy trả về JSON:
{
  "accuracy": điểm từ 0 đến 100,
  "phoneticMatch": true/false,
  "feedback": "Nhận xét sư phạm ngắn 1-2 câu tiếng Việt chỉ ra lỗi sai khẩu hình/âm đuôi nếu có",
  "tips": "Mẹo đặt lưỡi hoặc nhấn trọng âm cho từ này"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (error: any) {
    console.error("Pronunciation Eval Error:", error);
    res.status(500).json({ error: error.message || "Lỗi chấm phát âm" });
  }
});

// TTS audio generation proxy
app.post("/api/gemini/tts", async (req, res) => {
  try {
    const { text, voice } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({ status: "fallback", message: "Client Web Speech API recommended for local preview." });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: text || "Hello, welcome to Omni IELTS" }] }],
      config: {
        responseModalities: ["AUDIO" as any],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice || "Kore" }
          }
        }
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      res.json({ audioBase64: base64Audio, mimeType: "audio/pcm;rate=24000" });
    } else {
      res.json({ status: "fallback" });
    }
  } catch (error: any) {
    console.error("TTS API Error:", error);
    res.status(500).json({ error: error.message || "Lỗi tạo audio phát âm" });
  }
});

// Dynamic Unlimited Grammar Exercise Generator
app.post("/api/gemini/generate-grammar-exercises", async (req, res) => {
  try {
    const { topicId, topicTitle, topicVi, count = 3, targetBand = 7.5, category } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        exercises: [
          {
            id: `ai_gen_${Date.now()}_1`,
            type: 'sentence_transformation',
            question: `Rewrite using academic ${topicTitle}:`,
            promptVi: `Viết lại câu sau sử dụng cấu trúc ${topicVi}:`,
            baseSentenceToTransform: "Because local governments failed to regulate vehicle emissions, urban air quality deteriorated rapidly.",
            correctAnswer: "Had local governments regulated vehicle emissions, urban air quality would not have deteriorated rapidly.",
            explanation: "Sử dụng cấu trúc câu điều kiện đảo ngữ loại 3 để nhấn mạnh nguyên nhân và hệ quả trong quá khứ.",
            hint: "Bắt đầu với Had local governments..."
          },
          {
            id: `ai_gen_${Date.now()}_2`,
            type: 'error_correction',
            question: `Identify and fix the grammatical error in this IELTS Task 2 sentence:`,
            promptVi: `Tìm và sửa lỗi sai ngữ pháp liên quan đến ${topicVi}:`,
            originalSentenceWithMistake: "Rarely people realize the catastrophic consequences of plastic pollution in oceanic ecosystems.",
            correctAnswer: "Rarely do people realize the catastrophic consequences of plastic pollution in oceanic ecosystems.",
            explanation: "Khi trạng từ phủ định 'Rarely' đứng đầu câu, phải đảo trợ động từ 'do' lên trước chủ ngữ 'people'.",
          },
          {
            id: `ai_gen_${Date.now()}_3`,
            type: 'gap_fill',
            question: `Complete the sentence with the accurate grammatical structure: "Not only ________ (public transit / be) cost-effective, but it also alleviates urban congestion."`,
            promptVi: `Điền dạng đảo ngữ thích hợp vào chỗ trống:`,
            correctAnswer: "is public transit",
            alternativeAnswers: ["is public transportation"],
            explanation: "Đảo to be 'is' lên trước chủ ngữ 'public transit' sau cụm từ 'Not only'.",
          }
        ]
      });
    }

    const prompt = `Bạn là Chuyên gia Khảo thí Ngôn ngữ Cambridge IELTS.
Hãy sinh ${count} bài tập ngữ pháp mới toanh, chất lượng cao và sát đề thi thật IELTS Writing Task 1/2 & Speaking Part 3 cho chủ đề:
- Tên cấu trúc: "${topicTitle}" (${topicVi || ''})
- Danh mục: ${category || 'Ngữ pháp nâng cao'}
- Target Band: ${targetBand}

YÊU CẦU:
Tạo bài tập đa dạng thuộc 4 dạng sau:
1. 'gap_fill' (Điền từ/cụm từ ngữ pháp vào chỗ trống)
2. 'error_correction' (Phát hiện lỗi sai và sửa lại câu đúng)
3. 'sentence_transformation' (Viết lại câu nâng band sử dụng cấu trúc đích)
4. 'multiple_choice' (Trắc nghiệm 4 lựa chọn)

Trả về duy nhất 1 JSON hợp lệ theo format sau:
{
  "exercises": [
    {
      "id": "gen_unique_id",
      "type": "gap_fill" | "error_correction" | "sentence_transformation" | "multiple_choice",
      "question": "Nội dung câu hỏi tiếng Anh",
      "promptVi": "Hướng dẫn làm bài tiếng Việt",
      "options": ["A", "B", "C", "D"], // nếu là multiple_choice
      "correctIndex": 0, // nếu là multiple_choice
      "correctAnswer": "Đáp án chuẩn xác",
      "alternativeAnswers": ["Đáp án chấp nhận được 1", "Đáp án 2"],
      "explanation": "Giải thích chi tiết TẠI SAO đáp án này đúng và quy tắc ngữ pháp áp dụng",
      "hint": "Gợi ý ngắn",
      "originalSentenceWithMistake": "Câu có lỗi sai nếu là error_correction",
      "baseSentenceToTransform": "Câu gốc cần chuyển đổi nếu là sentence_transformation"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (error: any) {
    console.error("Generate Grammar Exercise Error:", error);
    res.status(500).json({ error: error.message || "Lỗi tạo bài tập ngữ pháp" });
  }
});

// Deep AI Grammar Evaluation & "Why" Explanation
app.post("/api/gemini/evaluate-grammar-exercise", async (req, res) => {
  try {
    const { exercise, userAnswer, topicTitle } = req.body;
    const ai = getGeminiClient();

    const cleanUser = (userAnswer || "").trim().toLowerCase();
    const cleanCorrect = (exercise.correctAnswer || "").trim().toLowerCase();
    const altMatches = (exercise.alternativeAnswers || []).some((alt: string) => alt.trim().toLowerCase() === cleanUser);
    const directMatch = cleanUser === cleanCorrect || altMatches;

    if (!ai) {
      return res.json({
        isCorrect: directMatch,
        score: directMatch ? 100 : 0,
        feedbackVi: directMatch 
          ? "Chính xác tuyệt đối! Bạn đã áp dụng chuẩn quy tắc ngữ pháp."
          : `Đáp án của bạn: "${userAnswer}". Đáp án chuẩn: "${exercise.correctAnswer}".`,
        whyExplanation: exercise.explanation || "Hãy chú ý cấu trúc chuẩn và các quy tắc hòa hợp thì/đảo ngữ.",
        bandBoostTips: "Áp dụng cấu trúc này vào câu luận điểm trong Writing Task 2 sẽ giúp tăng tiêu chí Grammatical Range & Accuracy lên Band 7.5+."
      });
    }

    const prompt = `Bạn là Giám khảo IELTS Chuyên chấm thi tiêu chí Grammatical Range & Accuracy.
Hãy chấm bài tập ngữ pháp sau của học viên:
- Chủ đề ngữ pháp: "${topicTitle || 'IELTS Grammar'}"
- Dạng bài: "${exercise.type}"
- Câu hỏi: "${exercise.question}"
- Câu gốc / Câu có lỗi (nếu có): "${exercise.baseSentenceToTransform || exercise.originalSentenceWithMistake || ''}"
- Đáp án mẫu chuẩn: "${exercise.correctAnswer}"
- Các phương án thay thế: ${JSON.stringify(exercise.alternativeAnswers || [])}
- Câu trả lời của học viên: "${userAnswer}"

YÊU CẦU:
1. Đánh giá tính đúng đắn về ngữ pháp (xét cả các biến thể tương đương đúng nghĩa và đúng ngữ pháp học thuật).
2. Phân tích chi tiết TẠI SAO đúng hoặc sai (Why it is wrong/correct).
3. Đưa ra mẹo nâng cấp Band 8.0+ cho câu này.

Trả về duy nhất 1 JSON hợp lệ:
{
  "isCorrect": true/false,
  "score": 100 (nếu đúng) hoặc 0 (nếu sai) hoặc 50-80 (nếu đúng một phần),
  "feedbackVi": "Nhận xét súc tích bằng tiếng Việt",
  "whyExplanation": "Giải thích cặn kẽ nguyên nhân đúng/sai, chỉ rõ quy tắc ngữ pháp bị vi phạm hoặc được áp dụng chuẩn xác",
  "bandBoostTips": "Gợi ý cách áp dụng vào Writing Task 2 hoặc Speaking Part 3 để tối ưu điểm số"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (error: any) {
    console.error("Evaluate Grammar Exercise Error:", error);
    res.status(500).json({ error: error.message || "Lỗi chấm bài tập ngữ pháp" });
  }
});

// Grammar Diagnostician: Analyzes free-form essays/sentences & links to curriculum
app.post("/api/gemini/diagnose-grammar", async (req, res) => {
  try {
    const { text, targetBand = 7.5 } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
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
      });
    }

    const prompt = `Bạn là Giám khảo IELTS Master Chuyên gia Phân tích Ngữ pháp (Grammar Diagnostician).
Hãy đọc đoạn văn sau của học viên và thực hiện chẩn đoán toàn diện:
"""
${text.slice(0, 3000)}
"""

Target Band của học viên: Band ${targetBand}

YÊU CẦU:
1. Phát hiện TẤT CẢ các lỗi ngữ pháp (thì, hòa hợp chủ-vị, giới từ, mạo từ, phân từ treo, câu thiếu vị ngữ, liên từ).
2. Đề xuất phiên bản nâng cấp lên Band 8.0 - 8.5 cho các câu đơn/câu vụng về (sử dụng đảo ngữ, câu chẻ, danh từ hóa, mệnh đề phân từ).
3. Đề xuất các chủ đề ngữ pháp học viên cần ôn tập ngay (từ danh sách ID: grm_tenses, grm_conditionals, grm_relative_clauses, grm_passive, grm_inversion, grm_cohesion, grm_nominalization, grm_cleft, grm_comparison, grm_subjunctive, grm_parallelism, grm_verb_forms).

Trả về duy nhất 1 JSON hợp lệ theo cấu trúc:
{
  "originalText": "${text.replace(/"/g, '\\"')}",
  "overallGrammarScore": 82,
  "estimatedBand": 6.5,
  "detectedErrors": [
    {
      "errorSubstring": "cụm từ sai",
      "correctedSubstring": "cụm từ đã sửa đúng",
      "explanationVi": "Giải thích chi tiết vì sao sai",
      "category": "Tên loại lỗi (ví dụ: Subject-Verb Agreement, Punctuation, Dangling Participle)",
      "relatedTopicId": "grm_tenses hoặc grm_conditionals...",
      "severity": "minor" | "major" | "critical"
    }
  ],
  "upgradedSentences": [
    {
      "original": "Câu gốc của học viên",
      "upgradedBand8": "Câu viết lại chuẩn Band 8.5+",
      "enhancementType": "Cấu trúc nâng cấp (ví dụ: Inversion with Negative Adverbials, Nominalization)",
      "relatedTopicId": "grm_inversion"
    }
  ],
  "recommendedTopicIds": ["grm_inversion", "grm_conditionals"]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (error: any) {
    console.error("Diagnose Grammar Error:", error);
    res.status(500).json({ error: error.message || "Lỗi chẩn đoán ngữ pháp" });
  }
});

// ==========================================
// MEDIA LAB: YOUTUBE, SHADOWING & DICTATION
// ==========================================

// Helper: Extract YouTube ID from various URL patterns
function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regExp);
  return match && match[1] ? match[1] : null;
}

// Process YouTube URL: metadata, timed transcript, Vietnamese translations & extracted vocabulary
app.post("/api/media/process-youtube", async (req, res) => {
  try {
    const { url, topic, level } = req.body;
    if (!url) {
      return res.status(400).json({ error: "Vui lòng cung cấp URL YouTube hợp lệ." });
    }

    const videoId = extractYouTubeId(url);
    if (!videoId) {
      return res.status(400).json({ error: "Không nhận diện được YouTube Video ID từ đường dẫn này." });
    }

    const ai = getGeminiClient();
    let videoTitle = "IELTS Academic Video Lesson";
    let channelTitle = "YouTube Channel";
    let durationSeconds = 180;
    const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    // 1. Fetch metadata via oEmbed
    try {
      const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      if (oembedRes.ok) {
        const oembedData = await oembedRes.json() as any;
        if (oembedData.title) videoTitle = oembedData.title;
        if (oembedData.author_name) channelTitle = oembedData.author_name;
      }
    } catch (e) {
      console.warn("oEmbed fetch warning:", e);
    }

    // 2. Fetch transcript using youtube-transcript library or multi-lang fallback
    let rawTranscript: Array<{ text: string; duration: number; offset: number }> = [];
    try {
      const { YoutubeTranscript } = await import("youtube-transcript");
      try {
        rawTranscript = await YoutubeTranscript.fetchTranscript(videoId, { lang: "en" });
      } catch {
        // Try without explicit lang filter (auto-generated English or default)
        try {
          rawTranscript = await YoutubeTranscript.fetchTranscript(videoId);
        } catch {
          // Subtitles may be disabled or restricted on YouTube
          rawTranscript = [];
        }
      }
    } catch {
      rawTranscript = [];
    }

    // 3. Process into sentence-aligned segments & Vietnamese translations with Gemini
    if (ai) {
      const rawText = rawTranscript.length > 0
        ? rawTranscript.map((t) => `[${(t.offset / 1000).toFixed(1)}s - ${((t.offset + t.duration) / 1000).toFixed(1)}s] ${t.text}`).join("\n")
        : `Video Title: ${videoTitle}. Channel: ${channelTitle}. Video ID: ${videoId}`;

      const prompt = `Bạn là Chuyên gia Khảo thí Ngôn ngữ Cambridge IELTS kiêm Kỹ sư Xử lý Âm thanh (Audio & Speech Alignment Specialist).
Chúng ta có video YouTube:
- Title: "${videoTitle}"
- Channel: "${channelTitle}"
- Video ID: "${videoId}"
- Raw Subtitle timestamps (nếu có):
"""
${rawText.slice(0, 5000)}
"""

YÊU CẦU:
1. Tạo danh sách các câu luyện tập Shadowing & Dictation (10 - 20 câu hoàn chỉnh có nghĩa học thuật, tách câu rõ ràng với dấu câu đầy đủ, không để cụm từ vụn).
2. Với mỗi câu, cung cấp:
   - "start": thời điểm bắt đầu (giây, số thực ví dụ 0.0, 4.5, 9.2...)
   - "end": thời điểm kết thúc (giây, số thực ví dụ 4.2, 8.9, 14.0...)
   - "text": nội dung câu tiếng Anh chuẩn xác, đầy đủ dấu câu
   - "translation": bản dịch tiếng Việt học thuật, mượt mà
   - "speaker": "Speaker 1" hoặc tên người nói nếu là đối thoại/phỏng vấn
3. Trích xuất 6-8 từ vựng/collocation học thuật C1/C2 xuất hiện hoặc tiêu biểu từ video:
   - "word", "pos", "definitionVi", "definitionEn", "exampleEn", "collocations" (mảng 2-3 cụm), "cefrLevel" ('B2' | 'C1' | 'C2')
4. Đánh giá độ khó: "Band 5.5-6.5" | "Band 7.0-8.0" | "Band 8.0+"
5. Ước tính tổng thời lượng "durationSeconds".

Trả về duy nhất 1 JSON hợp lệ theo cấu trúc:
{
  "title": "${videoTitle.replace(/"/g, '\\"')}",
  "channelTitle": "${channelTitle.replace(/"/g, '\\"')}",
  "topic": "${topic || 'Academic Discourse & IELTS Speaking'}",
  "level": "Band 7.0-8.0",
  "durationSeconds": 180,
  "transcriptSegments": [
    {
      "id": "seg_1",
      "start": 0.0,
      "end": 4.5,
      "text": "The rapid pace of technological innovation has fundamentally transformed modern communication.",
      "translation": "Tốc độ đổi mới công nghệ nhanh chóng đã làm thay đổi căn bản phương thức giao tiếp hiện đại.",
      "speaker": "Speaker 1"
    }
  ],
  "extractedVocab": [
    {
      "word": "fundamentally",
      "pos": "adv",
      "definitionVi": "về cơ bản, một cách căn bản",
      "definitionEn": "in a basic and essential way",
      "exampleEn": "Technology has fundamentally altered educational methodologies.",
      "collocations": ["fundamentally alter", "fundamentally flawed", "differ fundamentally"],
      "cefrLevel": "C1"
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      });

      const parsed = JSON.parse(response.text || "{}");

      const parsedSegments = Array.isArray(parsed.transcriptSegments) && parsed.transcriptSegments.length > 0
        ? parsed.transcriptSegments.map((s: any, idx: number) => ({
            id: s.id || `seg_${idx + 1}`,
            start: typeof s.start === "number" ? s.start : idx * 4,
            end: typeof s.end === "number" ? s.end : (idx + 1) * 4,
            text: s.text || "",
            translation: s.translation || "",
            speaker: s.speaker || (idx % 2 === 0 ? "Examiner" : "Candidate"),
          }))
        : [
            {
              id: "seg_1",
              start: 0.0,
              end: 4.5,
              text: `Welcome to this IELTS speaking session analyzing the topic of "${videoTitle}".`,
              translation: `Chào mừng bạn đến với buổi luyện nói IELTS phân tích chủ đề "${videoTitle}".`,
              speaker: "Examiner",
            },
            {
              id: "seg_2",
              start: 4.6,
              end: 9.8,
              text: "Could you articulate your perspectives regarding the primary factors influencing this phenomenon?",
              translation: "Bạn có thể trình bày quan điểm của mình về các yếu tố chính ảnh hưởng đến hiện tượng này không?",
              speaker: "Examiner",
            },
            {
              id: "seg_3",
              start: 10.0,
              end: 15.5,
              text: "From my standpoint, technological integration and socioeconomic shifts play an indispensable role.",
              translation: "Theo quan điểm của tôi, sự tích hợp công nghệ và các biến chuyển kinh tế xã hội đóng vai trò không thể thiếu.",
              speaker: "Candidate",
            }
          ];

      const session = {
        id: `media_yt_${videoId}_${Date.now()}`,
        title: parsed.title || videoTitle,
        mediaType: "youtube" as const,
        mediaUrl: `https://www.youtube.com/watch?v=${videoId}`,
        youtubeId: videoId,
        channelTitle: parsed.channelTitle || channelTitle,
        thumbnail,
        topic: parsed.topic || topic || "Academic English",
        level: (parsed.level || level || "Band 7.0-8.0") as "Band 5.5-6.5" | "Band 7.0-8.0" | "Band 8.0+",
        durationSeconds: parsed.durationSeconds || 180,
        currentTimestamp: 0,
        transcriptSegments: parsedSegments,
        mode: "shadowing" as const,
        completed: false,
        lastPracticedDate: new Date().toISOString(),
        extractedVocab: Array.isArray(parsed.extractedVocab) ? parsed.extractedVocab : [],
      };

      return res.json({ session });
    }

    // Fallback if Gemini client is not initialized
    const fallbackSegments = rawTranscript.length > 0
      ? rawTranscript.slice(0, 10).map((t, idx) => ({
          id: `seg_${idx + 1}`,
          start: Math.round((t.offset / 1000) * 10) / 10,
          end: Math.round(((t.offset + t.duration) / 1000) * 10) / 10,
          text: t.text,
          translation: "Bản dịch nghĩa đang cập nhật.",
          speaker: "Speaker 1",
        }))
      : [
          {
            id: "seg_1",
            start: 0.0,
            end: 4.5,
            text: "Welcome to this IELTS speaking practice session on modern technology and global issues.",
            translation: "Chào mừng bạn đến với buổi luyện nói IELTS về công nghệ hiện đại và các vấn đề toàn cầu.",
            speaker: "Examiner",
          },
          {
            id: "seg_2",
            start: 4.6,
            end: 9.8,
            text: "Could you elaborate on how renewable energy sources contribute to sustainable urban development?",
            translation: "Bạn có thể nói rõ hơn về việc các nguồn năng lượng tái tạo đóng góp vào sự phát triển đô thị bền vững như thế nào không?",
            speaker: "Examiner",
          },
          {
            id: "seg_3",
            start: 10.0,
            end: 16.5,
            text: "Undoubtedly, transitioning away from fossil fuels significantly mitigates carbon emissions and enhances public health.",
            translation: "Không nghi ngờ gì nữa, việc chuyển đổi khỏi nhiên liệu hóa thạch giúp giảm đáng kể lượng khí thải carbon và nâng cao sức khỏe cộng đồng.",
            speaker: "Candidate",
          },
        ];

    const session = {
      id: `media_yt_${videoId}_${Date.now()}`,
      title: videoTitle,
      mediaType: "youtube" as const,
      mediaUrl: `https://www.youtube.com/watch?v=${videoId}`,
      youtubeId: videoId,
      channelTitle,
      thumbnail,
      topic: topic || "IELTS Academic Speaking",
      level: (level || "Band 7.0-8.0") as "Band 5.5-6.5" | "Band 7.0-8.0" | "Band 8.0+",
      durationSeconds: 180,
      currentTimestamp: 0,
      transcriptSegments: fallbackSegments,
      mode: "shadowing" as const,
      completed: false,
      lastPracticedDate: new Date().toISOString(),
      extractedVocab: [
        {
          word: "mitigate",
          pos: "verb",
          definitionVi: "làm giảm bớt, làm dịu đi (tác động tiêu cực)",
          definitionEn: "make something less severe, serious, or painful",
          exampleEn: "Subsidies for mass transit mitigate urban traffic congestion.",
          collocations: ["mitigate risks", "mitigate the effects of", "actively mitigate"],
          cefrLevel: "C1" as const,
        },
        {
          word: "undoubtedly",
          pos: "adv",
          definitionVi: "chắc chắn, không thể phủ nhận",
          definitionEn: "without doubt; certainly",
          exampleEn: "Undoubtedly, early bilingual education enhances cognitive flexibility.",
          collocations: ["undoubtedly true", "undoubtedly contribute to"],
          cefrLevel: "C1" as const,
        }
      ],
    };

    return res.json({ session });
  } catch (error: any) {
    console.error("Process YouTube Error:", error);
    res.status(500).json({ error: error.message || "Lỗi xử lý video YouTube" });
  }
});

// Evaluate Shadowing Attempt with Gemini
app.post("/api/media/evaluate-shadowing", async (req, res) => {
  try {
    const { targetSentence, userTranscript, userAudioBase64, topicTitle } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        overallScore: 89,
        fluencyScore: 92,
        intonationScore: 88,
        accuracyScore: 87,
        feedbackVi: "Phát âm khá trôi chảy và tự nhiên! Nhịp nói tương đồng 89% với người bản xứ.",
        swallowedWords: ["to", "and"],
        stressHighlights: [
          { word: "sustainable", isCorrect: true, tip: "Trọng âm rơi vào âm tiết thứ 2 chuẩn xác" },
          { word: "development", isCorrect: true, tip: "Phát âm rõ ràng" }
        ],
        actionableAdvice: "Hãy chú ý bật rõ âm đuôi /s/ và /t/ ở cuối các từ vựng học thuật để nâng điểm Tiêu chí Phát âm (Pronunciation)."
      });
    }

    const prompt = `Bạn là Giám khảo IELTS Chuyên chấm thi kỹ năng Speaking & Ngữ âm (Pronunciation Specialist).
Hãy đánh giá bài luyện Shadowing sau của học viên:
- Câu gốc của người bản xứ: "${targetSentence}"
- Nội dung học viên nói được (Speech-to-text / Transcript): "${userTranscript || '(Học viên đã nói theo câu gốc)'}"
- Chủ đề: "${topicTitle || 'IELTS Speaking'}"

YÊU CẦU ĐÁNH GIÁ CHI TIẾT:
1. "overallScore" (0-100): Điểm tổng thể
2. "fluencyScore" (0-100): Độ trôi chảy, tốc độ và ngắt nghỉ đúng cụm nghĩa (chunking)
3. "intonationScore" (0-100): Ngữ điệu lên xuống và trọng âm câu (sentence stress)
4. "accuracyScore" (0-100): Độ chính xác của từng âm vị và âm cuối (final sounds /θ/, /s/, /t/, /d/, /-ed/)
5. "feedbackVi": Lời nhận xét sư phạm súc tích, khuyến khích bằng tiếng Việt
6. "swallowedWords": Danh sách các từ bị nuốt âm, nói lướt mất âm hoặc phát âm sai
7. "stressHighlights": Mảng các từ khóa quan trọng và đánh giá trọng âm { "word": string, "isCorrect": boolean, "tip": string }
8. "actionableAdvice": Lời khuyên cụ thể để học viên lập tức nói hay hơn ở lần lặp lại tiếp theo.

Trả về duy nhất 1 JSON hợp lệ:
{
  "overallScore": 92,
  "fluencyScore": 90,
  "intonationScore": 93,
  "accuracyScore": 93,
  "feedbackVi": "Nhận xét chi tiết tiếng Việt",
  "swallowedWords": ["từ1", "từ2"],
  "stressHighlights": [
    { "word": "fundamental", "isCorrect": true, "tip": "Trọng âm âm 3 'men' chuẩn xác" }
  ],
  "actionableAdvice": "Gợi ý cụ thể..."
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (error: any) {
    console.error("Evaluate Shadowing Error:", error);
    res.status(500).json({ error: error.message || "Lỗi chấm bài Shadowing" });
  }
});

// Extract High-yield IELTS Vocabulary from Media Session
app.post("/api/media/extract-vocab", async (req, res) => {
  try {
    const { transcriptText, topic } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        vocabItems: [
          {
            word: "mitigate",
            pos: "verb",
            definitionVi: "làm giảm bớt mức độ nghiêm trọng",
            definitionEn: "make something less severe, serious, or painful",
            exampleEn: "Government policies can mitigate the adverse effects of climate change.",
            collocations: ["mitigate climate change", "mitigate risks"],
            cefrLevel: "C1"
          },
          {
            word: "sustainable",
            pos: "adj",
            definitionVi: "bền vững, thân thiện với môi trường",
            definitionEn: "able to be maintained at a certain rate or level",
            exampleEn: "Sustainable practices are essential for long-term economic prosperity.",
            collocations: ["sustainable development", "sustainable future"],
            cefrLevel: "B2"
          }
        ]
      });
    }

    const prompt = `Bạn là Chuyên gia Khảo thí Ngôn ngữ Cambridge IELTS.
Hãy trích xuất 6-10 từ vựng hoặc collocations học thuật (Academic C1/C2) đắt giá nhất từ văn bản transcript sau:
"""
${(transcriptText || "").slice(0, 4000)}
"""
Chủ đề: "${topic || 'General Academic'}"

Trả về duy nhất 1 JSON hợp lệ theo định dạng:
{
  "vocabItems": [
    {
      "word": "từ hoặc cụm từ",
      "pos": "noun" | "verb" | "adj" | "adv" | "phrase",
      "definitionVi": "định nghĩa tiếng Việt chuẩn xác",
      "definitionEn": "định nghĩa tiếng Anh học thuật",
      "exampleEn": "câu ví dụ chuẩn IELTS",
      "exampleVi": "dịch câu ví dụ",
      "collocations": ["cụm 1", "cụm 2", "cụm 3"],
      "cefrLevel": "B2" | "C1" | "C2"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (error: any) {
    console.error("Extract Vocab Error:", error);
    res.status(500).json({ error: error.message || "Lỗi trích xuất từ vựng" });
  }
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Omni IELTS] Full-Stack server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
