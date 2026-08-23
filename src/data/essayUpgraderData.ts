import { EssayPromptBankItem, EssayUpgradeResult } from '../types';

export const ESSAY_PROMPT_BANK: EssayPromptBankItem[] = [
  {
    id: 'prompt_t2_tech_education',
    taskType: 'task2_essay',
    category: 'Opinion Essay',
    title: 'Technology & Artificial Intelligence in School Education',
    topic: 'Education & Technology',
    promptStatement:
      'Some people believe that artificial intelligence and online tools will soon replace human classroom teachers entirely. To what extent do you agree or disagree? Give reasons for your answer and include relevant examples. Write at least 250 words.',
    studentEstimatedBand: 5.5,
    targetBandSuggestions: [7.0, 8.5],
    sampleStudentEssayBand55: `Nowadays, technology is developing very fast and many people thinks that artificial intelligence and computers will replace human teachers in the future. In my opinion, I totally disagree with this idea because teachers are very important for children.

Firstly, computers and AI have a lot of advantages. They can store huge information and teach students anytime they want. For example, students can search Google or ask ChatGPT to do their homework. However, machines do not have real feeling. A computer cannot know if a student is sad, tired or lazy. But human teachers can understand students emotions and encourage them when they feel bad. This is a very good thing that robot cannot do.

Secondly, teachers teach students how to behave well in society. In school, children learn discipline and moral lessons from teachers. If students only stay at home and look at screen all day, they will lack communication skills and become lonely. Furthermore, when students have difficult questions, a human teacher can explain in different easy ways, while AI only gives general answers.

In conclusion, although AI is very smart and useful in education, it can never replace teachers. I think schools should use technology as a good tool to help teachers instead of removing them.`,
  },
  {
    id: 'prompt_t2_environment_responsibility',
    taskType: 'task2_essay',
    category: 'Discussion Essay',
    title: 'Environmental Protection: Individual Actions vs Government Policies',
    topic: 'Environment & Climate Change',
    promptStatement:
      'Some people think that environmental problems are too big for individuals to solve and only governments and large corporations can make a real difference. Others believe that individual actions are essential. Discuss both views and give your own opinion. Write at least 250 words.',
    studentEstimatedBand: 5.5,
    targetBandSuggestions: [7.0, 8.5],
    sampleStudentEssayBand55: `Environmental pollution is a huge problem in the world today. Some people say that single person cannot do anything and only governments can solve climate change, while other people think individual actions are also very necessary. I will discuss both sides in this essay.

On the one hand, governments and big companies have big power and money. They can make strict laws to punish factories that pollute air and water. For instance, governments can ban plastic bags and make companies use green energy like solar or wind power. Without government rules, big corporations will only care about profit and continue destroying nature. Therefore, top-down policy is very important.

On the other hand, people also must change their daily habit. If everyone litters rubbish and drives private cars every day, the environment will get worse no matter what laws exist. When millions of citizens reduce waste, recycle plastic, and use public transport, it creates a big good impact.

In conclusion, I believe that saving the planet needs cooperation from both sides. Governments must enforce strict regulations, but normal people also need to take responsibility in their daily lives.`,
  },
  {
    id: 'prompt_t1_energy_barchart',
    taskType: 'task1_academic',
    category: 'Bar Chart',
    title: 'Renewable Energy Consumption in 4 European Countries (2010 - 2024)',
    topic: 'Energy & Environment',
    promptStatement:
      'The bar chart shows the percentage of renewable energy in total electricity generation in four European countries (Germany, France, Spain, and Poland) in 2010, 2017, and 2024. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
    studentEstimatedBand: 5.5,
    targetBandSuggestions: [7.0, 8.5],
    sampleStudentEssayBand55: `The bar chart gives information about how much renewable energy was used for electricity in four countries in Europe from 2010 to 2024.

Overall, it is clear that all countries increased their green energy, except Poland which was the lowest. Germany was always the highest country throughout the period.

Looking at Germany, in 2010 the figure was 18%. Then it went up quickly to 35% in 2017 and reached a big number of 52% in 2024. Spain also had a good rise from 15% to 42% in the end. 

In contrast, France started at 12% in 2010, and increased slowly to 24% in 2024. Poland was very small, starting with only 5% in 2010, then it grew a little bit to 8% in 2017 and ended at 14% in 2024, which was much lower than other nations.`,
  },
  {
    id: 'prompt_t1_work_letter',
    taskType: 'task1_general',
    category: 'Formal Letter',
    title: 'Formal Letter: Requesting a Flexible Working Schedule',
    topic: 'Employment & Career',
    promptStatement:
      'You are currently working full-time for an international company and would like to request a temporary flexible working arrangement to attend a professional certification course. Write a letter to your manager. In your letter: explain why you want to take the course, propose your new working hours, and suggest how your tasks will be covered without interruption. Write at least 150 words.',
    studentEstimatedBand: 5.5,
    targetBandSuggestions: [7.0, 8.5],
    sampleStudentEssayBand55: `Dear Mr. Smith,

I am writing this letter to ask you for permission to change my work schedule for the next three months because I want to join an English and Data Analysis course.

The reason is that this course will teach me many new skills about Python and financial modeling. It is very useful for our team project next quarter, so I think it will help our company do better job.

The class takes place on Tuesday and Thursday afternoons from 2 PM to 5 PM. Therefore, I want to come to the office earlier at 7:30 AM and work on Saturday morning to finish my 40 hours.

To make sure my work is not delayed, I have talked with John, and he agreed to cover my urgent client emails when I am at class. I will also check my phone to reply important messages.

I hope you will agree with my request. I look forward to hearing from you soon.

Yours sincerely,
Nguyen Van A`,
  },
];

// Pre-computed fallback upgrade for instant display / offline resiliency
export const SAMPLE_ESSAY_UPGRADE_FALLBACK: EssayUpgradeResult = {
  taskType: 'task2_essay',
  promptStatement:
    'Some people believe that artificial intelligence and online tools will soon replace human classroom teachers entirely. To what extent do you agree or disagree? Give reasons for your answer and include relevant examples. Write at least 250 words.',
  originalAnalysis: {
    estimatedBand: 5.5,
    bandRange: 'Band 5.5 - 6.0',
    wordCount: 248,
    overallCritique:
      'Bài viết có lập trường rõ ràng và bố cục đoạn văn cơ bản. Tuy nhiên, thí sinh mắc nhiều lỗi ngữ pháp hòa hợp chủ - vị, lạm dụng từ vựng khẩu ngữ (a lot of, big thing, huge information), cấu trúc câu đơn điệu và cách liên kết câu còn mang tính liệt kê cơ bản (Firstly, Secondly).',
    strengths: [
      'Xác định được lập trường phản đối (totally disagree) ngay trong phần mở bài',
      'Đưa ra được 2 luận điểm hợp lý: Trí tuệ cảm xúc & Giáo dục nhân cách/kỷ luật',
      'Có kết bài tóm lược được ý chính',
    ],
    weaknesses: [
      'Lỗi ngữ pháp cơ bản: "many people thinks", "store huge information" (information là danh từ không đếm được)',
      'Từ vựng mang tính văn nói/thông tục: "huge information", "real feeling", "good thing", "smart"',
      'Thiếu cấu trúc câu phức, câu đảo ngữ hoặc mệnh đề phân từ để đẩy band điểm Grammatical Range',
    ],
    detectedErrors: [
      {
        originalText: 'many people thinks that',
        errorType: 'grammar',
        correction: 'a growing body of commentators posits that',
        explanation:
          'Chủ ngữ số nhiều "people" không thể chia động từ thêm "s". Trong văn phong học thuật, nên paraphrase thành danh từ chỉ nhóm quan điểm.',
        severity: 'high',
      },
      {
        originalText: 'store huge information',
        errorType: 'vocabulary',
        correction: 'process vast repositories of data',
        explanation:
          '"Information" là danh từ không đếm được (uncountable), không đi với "huge" theo lối văn nói. Cụm học thuật chuẩn là "vast repositories of data/knowledge".',
        severity: 'high',
      },
      {
        originalText: 'machines do not have real feeling',
        errorType: 'style',
        correction: 'automated algorithms inherently lack emotional resonance and affective empathy',
        explanation:
          '"Real feeling" là lối diễn đạt văn nói B1. Hãy dùng các thuật ngữ tâm lý học thuật như "affective empathy" hoặc "emotional intelligence".',
        severity: 'medium',
      },
      {
        originalText: 'This is a very good thing that robot cannot do.',
        errorType: 'style',
        correction:
          'This empathetic dimension represents an irreplaceable cornerstone of pedagogical efficacy.',
        explanation:
          'Tránh dùng "very good thing" trong IELTS Writing Task 2. Cần dùng danh từ hóa (Nominalization) để tăng độ trang trọng.',
        severity: 'high',
      },
    ],
  },
  band7Upgrade: {
    bandScore: 7.0,
    wordCount: 275,
    keyImprovements: [
      'Sửa triệt để 100% lỗi chia động từ số ít/số nhiều và mạo từ',
      'Thay thế hoàn toàn các từ văn nói bằng từ vựng học thuật B2/C1 chuẩn mực (pedagogical, indispensable, cognitive development)',
      'Mượt mà hóa các liên từ chuyển tiếp (Instead of "Firstly" -> "From a cognitive standpoint")',
    ],
    grammarFixedCount: 8,
    coherenceEnhancements: [
      'Mở bài nêu rõ lập trường kèm luận điểm tóm tắt định hướng',
      'Mỗi đoạn thân bài có câu chủ đề (Topic Sentence) rõ ràng và câu liên kết logic',
      'Sử dụng mệnh đề quan hệ và cấu trúc điều kiện để đa dạng hóa câu',
    ],
    essayText: `In contemporary society, rapid advancements in artificial intelligence have prompted intense debate regarding whether autonomous digital platforms will eventually render conventional human educators obsolete. I fundamentally disagree with this viewpoint, as teaching extends far beyond mere factual dissemination to encompass emotional mentorship and moral character development.

On the one hand, AI-powered applications undeniably offer remarkable pedagogical advantages. These intelligent algorithms can synthesize vast repositories of information instantly and deliver personalized learning pathways tailored to individual student paces. However, computational models lack intrinsic emotional intelligence. An algorithm cannot detect subtle psychological distress, waning motivation, or interpersonal frustration in a struggling pupil. Conversely, human teachers possess empathetic intuition, enabling them to provide timely emotional scaffolding and genuine encouragement, which are critical elements in fostering cognitive resilience.

On the other hand, classroom educators play an indispensable role in cultivating social discipline and ethical values. Within a physical school environment, students learn vital interpersonal communication, collaborative teamwork, and conflict resolution under the guidance of mentors. Were learners confined strictly to isolated virtual screens, they would inevitably suffer from social alienation and inadequate emotional maturation. Furthermore, when students encounter complex intellectual hurdles, a dedicated educator can adapt explanations dynamically through real-world metaphors rather than delivering rigid algorithmic responses.

In conclusion, although artificial intelligence serves as an exceptionally powerful supplementary resource, it can never entirely supplant human teachers. Educational institutions should integrate digital innovations to augment teaching methodologies rather than attempting to eliminate human educators.`,
  },
  band85Upgrade: {
    bandScore: 8.5,
    wordCount: 310,
    advancedTechniquesUsed: [
      'Cấu trúc Đảo ngữ điều kiện loại 3 & Đảo ngữ giới từ (Inversion for Emphasis)',
      'Mệnh đề phân từ & Rút gọn quan hệ (Participle Clauses & Reduced Relatives)',
      'Danh từ hóa đỉnh cao (Nominalization) biến ý niệm thông thường thành luận điểm học thuật đanh thép',
      'Công thức PEEL (Point - Explanation - Evidence - Link) được triển khai sâu sắc đến từng mắt xích',
    ],
    peelBreakdown: [
      {
        paragraphIndex: 1,
        paragraphType: 'Introduction',
        point: 'Đặt vấn đề về sự bùng nổ của trí tuệ nhân tạo tạo sinh trong bối cảnh học đường hiện đại.',
        explanation: 'Khẳng định lập trường phản biện đanh thép: Máy móc không thể thay thế con người.',
        evidenceOrExample: 'Nêu bật hai trụ cột không thể thay thế: Khả năng thấu cảm sư phạm và Sự uốn nắn xã hội hóa.',
        linkOrImplication: 'Định hướng hai hướng phân tích xuyên suốt toàn bộ bài luận.',
        fullParagraphText:
          'The inexorable ascendancy of generative artificial intelligence has precipitated contentious discourse regarding whether algorithmic platforms will ultimately render pedagogical professionals redundant. I unequivocally contest this assertion; while machine learning undoubtedly revolutionizes information retrieval, the quintessential facets of education—namely socio-emotional scaffolding and holistic moral formation—remain inextricably anchored in human agency.',
      },
      {
        paragraphIndex: 2,
        paragraphType: 'Body Paragraph 1',
        point: 'AI tối ưu hóa khả năng truyền tải dữ liệu nhưng hoàn toàn bất lực trước trí tuệ cảm xúc (Affective Empathy).',
        explanation: 'Phân tích cơ chế: Thuật toán chỉ xử lý mã nhị phân và dữ liệu, không thể cảm nhận tâm lý học sinh.',
        evidenceOrExample: 'Dẫn chứng về việc học sinh trải qua khủng hoảng tâm lý hoặc mất phương hướng học tập.',
        linkOrImplication: 'Kết luận: Trực giác sư phạm nhân văn là điều kiện tiên quyết cho sự phát triển nhận thức.',
        fullParagraphText:
          'To begin with, proponents of full automation rightly emphasize that neural networks can synthesize voluminous corpora of knowledge and calibrate individualized instructional trajectories with unmatched efficiency. Nevertheless, absent from even the most sophisticated deep-learning models is the capacity for authentic affective empathy. An algorithm remains fundamentally oblivious to the subtle micro-expressions of cognitive fatigue, self-doubt, or domestic distress exhibited by a vulnerable pupil. In stark contrast, an astute educator deploys pastoral care and emotional resonance, dynamically recalibrating pedagogical friction to rekindle intrinsic motivation—an intuitive nuance that silicon architecture cannot replicate.',
      },
      {
        paragraphIndex: 3,
        paragraphType: 'Body Paragraph 2',
        point: 'Môi trường lớp học có người dẫn dắt là cái nôi rèn luyện năng lực xã hội và phẩm chất công dân.',
        explanation: 'Giải thích tác hại của việc học đơn độc qua màn hình: Xói mòn kỹ năng đàm phán và kết nối xã hội.',
        evidenceOrExample: 'Sự hình thành trí tuệ đạo đức và phản xạ giải quyết xung đột nhóm trong môi trường thực nghiệm.',
        linkOrImplication: 'Khẳng định: Nhà giáo là người bảo tồn các giá trị nhân văn cốt lõi.',
        fullParagraphText:
          'Furthermore, schools function not merely as content-delivery conduits, but as vital incubators for socialization, democratic discourse, and ethical discernment. Were pedagogical interaction to be mediated solely through digital interfaces, adolescents would be deprived of immersive collaborative friction, thereby exacerbating modern epidemics of civic alienation and communicative atrophy. Crucially, master teachers embody living exemplars of ethical fortitude, guiding students through nuanced moral dilemmas that elude binary computational logic.',
      },
      {
        paragraphIndex: 4,
        paragraphType: 'Conclusion',
        point: 'Tái khẳng định lập trường tổng quan với cấu trúc câu phức đắt giá.',
        explanation: 'Tóm lược vai trò của AI là công cụ cộng hưởng (synergistic catalyst), không phải thực thể thay thế.',
        evidenceOrExample: 'Mô hình học tập lai (Hybrid Educational Paradigm) là tương lai bền vững.',
        linkOrImplication: 'Khép lại với thông điệp triết lý sâu sắc về giáo dục thế kỷ 21.',
        fullParagraphText:
          'In conclusion, while artificial intelligence undeniably constitutes a transformative catalyst that can liberate educators from administrative tedium, it is incapable of superseding the profound human dimension of pedagogy. The future of enlightened education lies not in the obsolescence of teachers, but in a synergistic paradigm where technological precision augments, rather than eclipses, human compassion.',
      },
    ],
    essayText: `The inexorable ascendancy of generative artificial intelligence has precipitated contentious discourse regarding whether algorithmic platforms will ultimately render pedagogical professionals redundant. I unequivocally contest this assertion; while machine learning undoubtedly revolutionizes information retrieval, the quintessential facets of education—namely socio-emotional scaffolding and holistic moral formation—remain inextricably anchored in human agency.

To begin with, proponents of full automation rightly emphasize that neural networks can synthesize voluminous corpora of knowledge and calibrate individualized instructional trajectories with unmatched efficiency. Nevertheless, absent from even the most sophisticated deep-learning models is the capacity for authentic affective empathy. An algorithm remains fundamentally oblivious to the subtle micro-expressions of cognitive fatigue, self-doubt, or domestic distress exhibited by a vulnerable pupil. In stark contrast, an astute educator deploys pastoral care and emotional resonance, dynamically recalibrating pedagogical friction to rekindle intrinsic motivation—an intuitive nuance that silicon architecture cannot replicate.

Furthermore, schools function not merely as content-delivery conduits, but as vital incubators for socialization, democratic discourse, and ethical discernment. Were pedagogical interaction to be mediated solely through digital interfaces, adolescents would be deprived of immersive collaborative friction, thereby exacerbating modern epidemics of civic alienation and communicative atrophy. Crucially, master teachers embody living exemplars of ethical fortitude, guiding students through nuanced moral dilemmas that elude binary computational logic.

In conclusion, while artificial intelligence undeniably constitutes a transformative catalyst that can liberate educators from administrative tedium, it is incapable of superseding the profound human dimension of pedagogy. The future of enlightened education lies not in the obsolescence of teachers, but in a synergistic paradigm where technological precision augments, rather than eclipses, human compassion.`,
  },
  upgradedPhrasesDiff: [
    {
      id: 'diff_1',
      originalPhrase: 'technology is developing very fast',
      band7Alternative: 'rapid advancements in technology',
      band85Mastery: 'the inexorable ascendancy of generative artificial intelligence',
      category: 'lexical_upgrade',
      whyBetterVi:
        'Cụm "very fast" mang đậm khẩu ngữ. Bản 8.5 dùng "inexorable ascendancy" (sự trỗi dậy không thể ngăn cản) thể hiện tính trang trọng, chính xác và uyên bác.',
      contrastAnalysis: {
        spokenOrBasic: 'Technology is developing very fast (Văn nói B1)',
        academicC1C2: 'The inexorable ascendancy of generative AI (Học thuật C2)',
        examinerInsight:
          'Giám khảo IELTS đánh giá rất cao việc thí sinh kết hợp tính từ học thuật chuẩn xác (inexorable) với danh từ phái sinh (ascendancy) thay cho các trạng từ chỉ mức độ quen thuộc như very/really.',
      },
      exampleInSentence:
        'The inexorable ascendancy of green technology has reshaped the global industrial framework.',
    },
    {
      id: 'diff_2',
      originalPhrase: 'will replace human teachers in the future',
      band7Alternative: 'will render conventional human educators obsolete',
      band85Mastery: 'will ultimately render pedagogical professionals redundant',
      category: 'academic_precision',
      whyBetterVi:
        'Cụm "replace" được nâng cấp thành "render [something] redundant / obsolete" (khiến cho cái gì trở nên dư thừa/lỗi thời). Đây là collocations vàng của C1/C2.',
      contrastAnalysis: {
        spokenOrBasic: 'will replace human teachers (Cơ bản)',
        academicC1C2: 'render pedagogical professionals redundant (C2 Collocation)',
        examinerInsight:
          'Sử dụng cấu trúc "render + Object + Adjective" giúp câu văn súc tích, đắt giá và thoát ly hoàn toàn khỏi lối dịch thô ráp.',
      },
      exampleInSentence:
        'Automation threatens to render routine clerical positions redundant over the coming decade.',
    },
    {
      id: 'diff_3',
      originalPhrase: 'I totally disagree with this idea',
      band7Alternative: 'I fundamentally disagree with this viewpoint',
      band85Mastery: 'I unequivocally contest this assertion',
      category: 'academic_precision',
      whyBetterVi:
        '"Unequivocally contest this assertion" (tôi dứt khoát bác bỏ nhận định này) thể hiện sự tự tin học thuật tuyệt đối của một cây bút Band 8.5+.',
      contrastAnalysis: {
        spokenOrBasic: 'I totally disagree with this idea (B1)',
        academicC1C2: 'I unequivocally contest this assertion (C2)',
        examinerInsight:
          'Trạng từ "unequivocally" (rõ ràng, không mập mờ) cùng động từ "contest" (phản biện, thách thức) nâng điểm Lexical Resource lên mức tối đa.',
      },
      exampleInSentence:
        'Contemporary economists unequivocally contest the validity of trickle-down taxation models.',
    },
    {
      id: 'diff_4',
      originalPhrase: 'machines do not have real feeling',
      band7Alternative: 'computational models lack intrinsic emotional intelligence',
      band85Mastery: 'absent from deep-learning models is the capacity for authentic affective empathy',
      category: 'grammatical_inversion',
      whyBetterVi:
        'Sử dụng cấu trúc đảo ngữ tính từ "Absent from [X] is [Y]" tạo điểm nhấn ngữ pháp ngoạn mục, kết hợp từ vựng chuyên sâu "affective empathy" (trí tuệ thấu cảm).',
      contrastAnalysis: {
        spokenOrBasic: 'machines do not have real feeling (B1 Văn nói)',
        academicC1C2: 'Absent from deep-learning models is the capacity for affective empathy (C2 Đảo ngữ)',
        examinerInsight:
          'Cấu trúc đảo ngữ kết hợp hoàn hảo với thuật ngữ tâm lý học giúp thí sinh gây ấn tượng mạnh với giám khảo về Grammatical Range.',
      },
      exampleInSentence:
        'Absent from current policy proposals is any substantive blueprint for environmental remediation.',
    },
    {
      id: 'diff_5',
      originalPhrase: 'If students only stay at home and look at screen all day',
      band7Alternative: 'Were learners confined strictly to isolated virtual screens',
      band85Mastery: 'Were pedagogical interaction to be mediated solely through digital interfaces',
      category: 'grammatical_inversion',
      whyBetterVi:
        'Áp dụng Đảo ngữ câu điều kiện loại 2 (Inversion of Conditional Type 2: Were + Subject + to Verb) thay thế cho liên từ "If" thông thường.',
      contrastAnalysis: {
        spokenOrBasic: 'If students only look at screen all day (B1)',
        academicC1C2: 'Were pedagogical interaction to be mediated solely through digital interfaces (C2 Inversion)',
        examinerInsight:
          'Đảo ngữ câu điều kiện là một trong những chỉ dấu rõ ràng nhất của trình độ C1/C2 trong tiêu chí Grammatical Range & Accuracy.',
      },
      exampleInSentence:
        'Were international governments to implement synchronized carbon taxation, emissions would plummet.',
    },
    {
      id: 'diff_6',
      originalPhrase: 'teach students how to behave well in society',
      band7Alternative: 'cultivating social discipline and ethical values',
      band85Mastery: 'function as vital incubators for socialization and ethical discernment',
      category: 'nominalization',
      whyBetterVi:
        'Ẩn dụ "incubators for socialization" (vườn ươm cho sự xã hội hóa) và "ethical discernment" (năng lực phân định đạo đức) nâng tầm bài viết thành một bài bình luận xã hội thực thụ.',
      contrastAnalysis: {
        spokenOrBasic: 'teach students how to behave well (B1)',
        academicC1C2: 'vital incubators for socialization and ethical discernment (C2)',
        examinerInsight:
          'Biến đổi từ động từ đơn sơ "teach how to behave" sang cụm danh từ trừu tượng (Nominalization) là chìa khóa then chốt của văn phong học thuật Cambridge.',
      },
      exampleInSentence:
        'Civic universities serve as incubators for democratic debate and progressive policymaking.',
    },
  ],
  goldenCollocations: [
    {
      id: 'colloc_1',
      phrase: 'inexorable ascendancy',
      phonetic: '/ɪnˈek.sər.ə.bəl əˈsen.dən.si/',
      cefrLevel: 'C2',
      collocationCategory: 'Adjective + Noun',
      meaningVi: 'sự trỗi dậy / bành trướng không thể ngăn cản',
      exampleSentence:
        'The inexorable ascendancy of automation has reshaped the manufacturing sector.',
      ieltsTopic: 'Technology & Economy',
      whyHighBand:
        'Thay thế xuất sắc cho cụm từ "fast development / rapid growth" vốn bị lặp lại quá nhiều.',
    },
    {
      id: 'colloc_2',
      phrase: 'render [something] redundant',
      phonetic: '/ˈren.dər rɪˈdʌn.dənt/',
      cefrLevel: 'C1',
      collocationCategory: 'Verb + Object + Adjective',
      meaningVi: 'khiến cho điều gì/ai đó trở nên dư thừa / bị đào thải',
      exampleSentence:
        'Algorithmic breakthroughs could render traditional data analysts redundant.',
      ieltsTopic: 'Workforce & AI',
      whyHighBand:
        'Collocation chuẩn C1 của giới học thuật, thể hiện đúng trạng thái bị thay thế do công nghệ.',
    },
    {
      id: 'colloc_3',
      phrase: 'pastoral care & emotional scaffolding',
      phonetic: '/ˈpɑː.stər.əl keər ... ˈskæf.əl.dɪŋ/',
      cefrLevel: 'C2',
      collocationCategory: 'Compound Noun Phrase',
      meaningVi: 'sự chăm sóc tâm lý học đường & giàn đỡ cảm xúc sư phạm',
      exampleSentence:
        'Exceptional educators provide vital emotional scaffolding during adolescent transitions.',
      ieltsTopic: 'Education & Psychology',
      whyHighBand:
        'Thuật ngữ chuyên ngành giáo dục học giúp bài viết đạt điểm 9.0 tiêu chí Lexical Resource.',
    },
    {
      id: 'colloc_4',
      phrase: 'incubator for socialization',
      phonetic: '/ˈɪŋ.kjə.beɪ.tər fɔːr ˌsəʊ.ʃəl.aɪˈzeɪ.ʃən/',
      cefrLevel: 'C2',
      collocationCategory: 'Noun + Preposition + Noun',
      meaningVi: 'cái nôi / vườn ươm rèn luyện năng lực hòa nhập xã hội',
      exampleSentence:
        'Schools remain the primary incubator for socialization and empathetic civic dialogue.',
      ieltsTopic: 'Society & Education',
      whyHighBand:
        'Lối dùng ẩn dụ tinh tế, thoát ly hoàn toàn văn phong dịch từ tiếng Việt.',
    },
    {
      id: 'colloc_5',
      phrase: 'synergistic paradigm',
      phonetic: '/ˌsɪn.əˈdʒɪs.tɪk ˈpær.ə.daɪm/',
      cefrLevel: 'C2',
      collocationCategory: 'Adjective + Noun',
      meaningVi: 'mô hình kết hợp cộng hưởng (đôi bên cùng phát triển)',
      exampleSentence:
        'The optimal strategy involves a synergistic paradigm between AI tools and human clinical intuition.',
      ieltsTopic: 'Future & Innovation',
      whyHighBand:
        'Cụm kết luận kinh điển trong Task 2 để khẳng định tính hòa hợp giữa công nghệ và con người.',
    },
  ],
  interactiveDiffSegments: [
    {
      type: 'modified',
      originalText: 'Nowadays, technology is developing very fast and many people thinks that',
      upgradedTextBand7: 'In contemporary society, rapid advancements in artificial intelligence have prompted intense debate regarding whether',
      upgradedTextBand85: 'The inexorable ascendancy of generative artificial intelligence has precipitated contentious discourse regarding whether',
      upgradeId: 'diff_1',
      diffCategory: 'Mở bài & Đặt vấn đề học thuật',
    },
    {
      type: 'modified',
      originalText: 'artificial intelligence and computers will replace human teachers in the future.',
      upgradedTextBand7: 'autonomous digital platforms will eventually render conventional human educators obsolete.',
      upgradedTextBand85: 'algorithmic platforms will ultimately render pedagogical professionals redundant.',
      upgradeId: 'diff_2',
      diffCategory: 'Từ vựng C2 Paraphrase',
    },
    {
      type: 'modified',
      originalText: 'In my opinion, I totally disagree with this idea because teachers are very important for children.',
      upgradedTextBand7: 'I fundamentally disagree with this viewpoint, as teaching extends far beyond mere factual dissemination to encompass emotional mentorship.',
      upgradedTextBand85: 'I unequivocally contest this assertion; while machine learning undoubtedly revolutionizes information retrieval, the quintessential facets of education remain inextricably anchored in human agency.',
      upgradeId: 'diff_3',
      diffCategory: 'Luận điểm Luận đề Thesis Statement',
    },
    {
      type: 'modified',
      originalText: 'Firstly, computers and AI have a lot of advantages. They can store huge information and teach students anytime they want.',
      upgradedTextBand7: 'On the one hand, AI-powered applications undeniably offer remarkable pedagogical advantages by synthesizing vast repositories of information instantly.',
      upgradedTextBand85: 'To begin with, proponents of full automation rightly emphasize that neural networks can synthesize voluminous corpora of knowledge and calibrate individualized instructional trajectories with unmatched efficiency.',
      upgradeId: 'diff_1',
      diffCategory: 'Topic Sentence Thân bài 1',
    },
    {
      type: 'modified',
      originalText: 'However, machines do not have real feeling. A computer cannot know if a student is sad, tired or lazy.',
      upgradedTextBand7: 'However, computational models lack intrinsic emotional intelligence and cannot detect subtle psychological distress in a struggling pupil.',
      upgradedTextBand85: 'Nevertheless, absent from even the most sophisticated deep-learning models is the capacity for authentic affective empathy. An algorithm remains fundamentally oblivious to the subtle micro-expressions of cognitive fatigue or distress.',
      upgradeId: 'diff_4',
      diffCategory: 'Đảo ngữ & Trí tuệ cảm xúc',
    },
    {
      type: 'modified',
      originalText: 'Secondly, teachers teach students how to behave well in society. If students only stay at home and look at screen all day, they will lack communication skills.',
      upgradedTextBand7: 'On the other hand, classroom educators play an indispensable role in cultivating social discipline. Were learners confined strictly to isolated virtual screens, they would suffer from social alienation.',
      upgradedTextBand85: 'Furthermore, schools function not merely as content-delivery conduits, but as vital incubators for socialization and ethical discernment. Were pedagogical interaction to be mediated solely through digital interfaces, adolescents would be deprived of immersive collaborative friction.',
      upgradeId: 'diff_5',
      diffCategory: 'Đảo ngữ Điều kiện loại 2 & PEEL Structure',
    },
    {
      type: 'modified',
      originalText: 'In conclusion, although AI is very smart and useful in education, it can never replace teachers.',
      upgradedTextBand7: 'In conclusion, although artificial intelligence serves as an exceptionally powerful supplementary resource, it can never entirely supplant human teachers.',
      upgradedTextBand85: 'In conclusion, while artificial intelligence undeniably constitutes a transformative catalyst that can liberate educators from administrative tedium, it is incapable of superseding the profound human dimension of pedagogy. The future lies in a synergistic paradigm.',
      upgradeId: 'diff_6',
      diffCategory: 'Kết luận & Mô hình Cộng hưởng Synergistic',
    },
  ],
};
