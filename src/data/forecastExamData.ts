import { RealExamForecastItem } from '../types';

export const INITIAL_REAL_EXAM_FORECAST_DATA: RealExamForecastItem[] = [
  {
    id: 'forecast_w2_ai_employment_2026',
    title: 'AI & Tự Động Hóa Trong Lực Lượng Lao Động Tương Lai',
    skill: 'writing_task2',
    council: 'both_vietnam',
    councilLabel: 'IDP & BC Việt Nam (Hà Nội & TP.HCM)',
    examDate: 'Thi thật: 15/08/2026',
    topicDomain: 'Technology & Future of Work',
    subCategory: 'To what extent do you agree or disagree?',
    promptStatement:
      'Some people believe that artificial intelligence and automation will lead to widespread unemployment, while others argue that they will create new and higher-value career opportunities. Discuss both views and give your own opinion.',
    trendStatus: 'recent_real_exam',
    trendBadge: '🔥 Đề Thi Thật Vừa Ra',
    frequencyScore: 98,
    outlinePEEL: {
      point:
        'Tự động hóa tuy gây gián đoạn việc làm thủ công trong ngắn hạn, nhưng về dài hạn đóng vai trò đòn bẩy tái cấu trúc nền kinh tế tri thức và mở ra các ngành nghề giá trị gia tăng cao.',
      explanation:
        'Các thuật toán và mô hình ngôn ngữ lớn (LLMs) tự động hóa các tác vụ lặp đi lặp lại (routine repetitive tasks), buộc lực lượng lao động phải nâng cấp kỹ năng (upskilling) sang tư duy phản biện, giám sát đạo đức AI và quản trị dữ liệu.',
      evidence:
        'Dữ liệu từ Báo cáo Tương lai Việc làm của Diễn đàn Kinh tế Thế giới (WEF) chỉ ra rằng cứ 1 vị trí việc làm truyền thống bị thay thế thì có 1.5 vị trí mới đòi hỏi chuyên môn kỹ thuật số và phân tích chiến lược được tạo ra.',
      link:
        'Do đó, thay vì lo ngại nguy cơ thất nghiệp hàng loạt, chính phủ và các tổ chức giáo dục cần chủ động trang bị năng lực số thích ứng cho người lao động.',
      suggestedParagraphs: [
        {
          heading: 'Body 1: Nỗi lo mất việc ở các ngành thâm dụng lao động',
          keyPoints: [
            'Tự động hóa dây chuyền lắp ráp và các nghiệp vụ văn thư cơ bản',
            'Rủi ro thất nghiệp cơ cấu (structural unemployment) ở lao động trung niên',
            'Áp lực chuyển đổi công nghệ cấp bách',
          ],
        },
        {
          heading: 'Body 2: Sự bùng nổ của các phân khúc nghề nghiệp bậc cao & Ý kiến cá nhân',
          keyPoints: [
            'Sự xuất hiện của các vị trí kỹ sư AI, chuyên viên kiểm toán thuật toán, sáng tạo nội dung cao cấp',
            'Tăng năng suất biên (marginal productivity) và giải phóng con người khỏi lao động cực nhọc',
            'Khẳng định quan điểm: Lợi ích vượt trội nếu có chính sách tái đào tạo (reskilling programs)',
          ],
        },
      ],
    },
    topicVocabularyC1C2: [
      {
        phrase: 'paradigm shift',
        phonetic: '/ˈpær.ə.daɪm ʃɪft/',
        pos: 'Noun Phrase',
        meaningVi: 'sự chuyển dịch mô hình căn bản mang tính cách mạng',
        exampleSentence:
          'The integration of generative AI represents a monumental paradigm shift in global employment dynamics.',
        cefrLevel: 'C2',
      },
      {
        phrase: 'structural unemployment',
        phonetic: '/ˌstrʌk.tʃər.əl ˌʌn.ɪmˈplɔɪ.mənt/',
        pos: 'Noun Phrase',
        meaningVi: 'thất nghiệp cơ cấu (do kỹ năng không còn phù hợp với công nghệ mới)',
        exampleSentence:
          'Governments must intervene proactively to mitigate the threat of structural unemployment among manual workers.',
        cefrLevel: 'C1',
      },
      {
        phrase: 'render obsolete',
        phonetic: '/ˈren.dər ˈɒb.sə.liːt/',
        pos: 'Verb Phrase (Collocation)',
        meaningVi: 'khiến cái gì trở nên lỗi thời, không còn giá trị sử dụng',
        exampleSentence:
          'While repetitive data entry tasks are rendered obsolete, high-level analytical roles continue to flourish.',
        cefrLevel: 'C2',
      },
      {
        phrase: 'upskilling and reskilling initiatives',
        phonetic: '/ʌpˈskɪl.ɪŋ ænd riːˈskɪl.ɪŋ ɪˈnɪʃ.ə.tɪvz/',
        pos: 'Noun Phrase',
        meaningVi: 'các sáng kiến nâng cao và tái trang bị kỹ năng',
        exampleSentence:
          'Subsidized upskilling and reskilling initiatives are indispensable in navigating technological disruptions.',
        cefrLevel: 'C1',
      },
    ],
    band8ModelAnswer: `The rapid proliferation of artificial intelligence and automated systems has ignited a contentious discourse regarding their ultimate ramifications on the global labor market. While one school of thought contends that advanced automation precipitates catastrophic levels of unemployment, others posit that this technological revolution serves as a catalyst for unprecedented occupational opportunities. In my appraisal, although short-term dislocation in routine sectors is inevitable, AI will fundamentally augment human productivity and foster higher-value professions, provided comprehensive reskilling frameworks are instituted.

On the one hand, apprehensions concerning job displacement are rooted in legitimate socioeconomic realities. Historically, industrial transitions have exerted immense pressure on manual and semi-skilled labor forces. With modern AI algorithms increasingly mastering complex administrative, logistical, and computational tasks, millions of clerical and assembly-line roles risk being rendered obsolete. For instance, algorithmic underwriting and autonomous logistics have substantially diminished the reliance on human personnel in financial institutions and warehousing facilities. This sudden contraction can induce pervasive structural unemployment, particularly among mid-career individuals who encounter prohibitive barriers when attempting to pivot toward high-tech specializations.

Conversely, proponents of technological progression convincingly argue that automation acts as an indispensable engine of economic expansion and career evolution. By liberating employees from tedious, repetitive procedures, AI enables the workforce to redirect their cognitive resources toward strategic problem-solving, innovative ideation, and interdisciplinary collaboration. Crucially, the burgeoning AI ecosystem creates entirely novel employment domains—ranging from machine learning auditing and prompt architecture to ethical algorithmic compliance. Empirical findings from the World Economic Forum consistently demonstrate that emerging digital paradigms generate a net surplus of employment opportunities relative to those phased out, thereby elevating the overall intellectual caliber and remuneration of the labor force.

In conclusion, while the apprehension surrounding widespread job obsolescence is well-founded in the context of transitional friction, automation does not portend an irreversible unemployment crisis. Provided that policymakers enact decisive upskilling and reskilling initiatives, humanity stands to benefit profoundly from an enriched professional landscape characterized by enhanced creative freedom and socioeconomic prosperity.`,
    modelAnswerWordCount: 342,
    examinerTipsVi:
      'Bài viết đạt chuẩn Band 8.5+ nhờ giải quyết trọn vẹn cả 2 vế (Task Response), chuyển đoạn mượt mà bằng các liên từ học thuật (Cohesion), và sử dụng từ vựng kinh tế vĩ mô chuẩn xác như "structural unemployment", "paradigm shift", "net surplus of employment".',
    groundingSourceTitle: 'IDP Vietnam Real Exam August 2026 Official Test Archive',
    groundingSourceUrl: 'https://ielts.idp.com/vietnam',
  },
  {
    id: 'forecast_w2_carbon_tax_climate_2026',
    title: 'Đánh Thuế Carbon & Trách Nhiệm Bảo Vệ Môi Trường Của Doanh Nghiệp',
    skill: 'writing_task2',
    council: 'bc_vietnam',
    councilLabel: 'British Council Hà Nội & Đà Nẵng',
    examDate: 'Thi thật: 08/08/2026',
    topicDomain: 'Environment & Sustainable Policy',
    subCategory: 'Do the advantages outweigh the disadvantages?',
    promptStatement:
      'Some governments are imposing heavy carbon taxes and environmental penalties on industrial corporations to combat climate change. Do the advantages of this policy outweigh its disadvantages?',
    trendStatus: 'hot_trend',
    trendBadge: '⭐ Trọng Tâm Quý 3/2026',
    frequencyScore: 94,
    outlinePEEL: {
      point:
        'Việc áp thuế phát thải carbon tuy có thể làm gia tăng chi phí vận hành ngắn hạn của doanh nghiệp, nhưng là công cụ kinh tế hữu hiệu nhất để thúc đẩy chuyển dịch sang năng lượng tái tạo.',
      explanation:
        'Cơ chế đánh thuế nội hóa các chi phí ngoại ứng tiêu cực (internalizing negative externalities), buộc các tập đoàn công nghiệp phải đầu tư vào công nghệ xanh và giảm thiểu lượng khí thải nhà kính.',
      evidence:
        'Điển hình như Hệ thống Mua bán Phát thải của Liên minh Châu Âu (EU ETS), sau khi áp thuế carbon nghiêm ngặt, đã giúp giảm hơn 35% lượng phát thải từ các nhà máy điện và cơ sở luyện kim.',
      link:
        'Lợi ích sinh thái và sự phát triển bền vững dài hạn hoàn toàn vượt trội so với các gánh nặng tài chính chuyển tiếp.',
    },
    topicVocabularyC1C2: [
      {
        phrase: 'internalize negative externalities',
        phonetic: '/ɪnˈtɜː.nəl.aɪz ˈneɡ.ə.tɪv ˌek.stɜːˈnæl.ə.tiz/',
        pos: 'Verb Phrase',
        meaningVi: 'nội hóa các chi phí ngoại ứng tiêu cực (buộc bên gây ô nhiễm phải trả tiền)',
        exampleSentence:
          'Carbon pricing schemes compel industrial polluters to internalize their negative environmental externalities.',
        cefrLevel: 'C2',
      },
      {
        phrase: 'ecological degradation',
        phonetic: '/ˌiː.kəˈlɒdʒ.ɪ.kəl ˌdeɡ.rəˈdeɪ.ʃən/',
        pos: 'Noun Phrase',
        meaningVi: 'sự suy thoái sinh thái',
        exampleSentence:
          'Stringent regulatory fines are imperative to arrest the relentless pace of ecological degradation.',
        cefrLevel: 'C1',
      },
      {
        phrase: 'green innovation',
        phonetic: '/ɡriːn ˌɪn.əˈveɪ.ʃən/',
        pos: 'Noun Phrase',
        meaningVi: 'đổi mới sáng tạo xanh / công nghệ sạch',
        exampleSentence:
          'Fiscal penalties incentivize multinational enterprises to accelerate their investments in green innovation.',
        cefrLevel: 'B2',
      },
    ],
    band8ModelAnswer: `In response to escalating environmental crises, an increasing number of municipal and national authorities have instituted rigorous carbon taxation and punitive financial levies on industrial conglomerates. Although critics argue that such fiscal burdens may dampen commercial profitability and exacerbate consumer prices in the short term, I firmly maintain that the long-term ecological and sustainable economic dividends overwhelmingly surpass these provisional drawbacks.

Admittedly, the primary objection to heavy environmental taxation centers upon short-term economic friction. When manufacturing enterprises are subjected to substantial carbon levies, their operational expenditures inevitably swell. In competitive global markets, corporations may pass these compliance costs onto end-consumers in the form of inflated commodity prices, thereby contributing to inflationary pressures. Furthermore, smaller enterprises operating on razor-thin profit margins might face fiscal insolvency or relocate manufacturing operations to jurisdictions with laxer environmental statutes—a phenomenon widely recognized as "carbon leakage."

Nevertheless, the merits of implementing carbon taxation are profoundly consequential. Most notably, financial penalties operate as a powerful market mechanism that forces corporations to internalize their negative environmental externalities. When greenhouse gas emissions carry a direct financial detriment, corporate boards are economically compelled to decommission fossil-fuel infrastructure and redirect capital toward green innovation, such as photovoltaic systems and closed-loop recycling processes. Empirical evidence from the European Union Emissions Trading Scheme underscores this efficacy, having catalyzed a remarkable 35% reduction in industrial carbon intensity over the past decade. Moreover, the revenue accrued from these taxes can be strategically reinvested into public mass transit, renewable energy grid upgrades, and reforestation programs.

In conclusion, while carbon taxation may engender transient commercial adjustments and marginal price increases, its role as an indispensable catalyst for industrial decarbonization cannot be overstated. The enduring preservation of the biosphere and the establishment of a resilient circular economy render this policy overwhelmingly advantageous.`,
    modelAnswerWordCount: 318,
    examinerTipsVi:
      'Cấu trúc cân bằng, sử dụng thuật ngữ kinh tế môi trường C1/C2 ("carbon leakage", "carbon intensity", "circular economy") giúp bài viết đạt điểm Lexical Resource tối đa.',
    groundingSourceTitle: 'British Council IELTS Real Exam Report',
    groundingSourceUrl: 'https://takeielts.britishcouncil.org',
  },
  {
    id: 'forecast_sp2_describe_ai_experience_2026',
    title: 'Speaking Part 2: Describe a time you used Artificial Intelligence to solve a problem',
    skill: 'speaking_part2',
    council: 'idp_vietnam',
    councilLabel: 'IDP TP. Hồ Chí Minh & Cần Thơ',
    examDate: 'Thi thật: 20/08/2026',
    topicDomain: 'Technology & Academic Life',
    subCategory: 'Describe an Experience / Event',
    promptStatement:
      'Describe a memorable occasion when you utilized an artificial intelligence tool or digital software to resolve a complex problem in your study or work.',
    cueCardPoints: [
      'What the problem was and what software/tool you used',
      'How you operated the AI tool',
      'What the outcome was',
      'And explain why this experience made a strong impression on you',
    ],
    trendStatus: 'recent_real_exam',
    trendBadge: '🔥 Đề Thi Thật Vừa Ra',
    frequencyScore: 96,
    outlinePEEL: {
      point:
        'Kể về trải nghiệm sử dụng mô hình AI hỗ trợ tổng hợp và phân tích 30 bài báo nghiên cứu khoa học cho đề án tốt nghiệp trong thời hạn gấp gáp.',
      explanation:
        'Nhấn mạnh vào kỹ thuật viết câu lệnh chi tiết (prompt engineering), đối chiếu dữ liệu để tránh ảo giác AI (hallucination), và cấu trúc lại dàn ý theo chuẩn học thuật.',
      evidence:
        'Nhờ đó, hoàn thành báo cáo chuyên đề đúng hạn 2 ngày trước deadline và đạt điểm A từ hội đồng chấm điểm.',
      link:
        'Nhận thức sâu sắc rằng AI không thay thế tư duy phản biện của con người mà là trợ thủ đắc lực nâng cấp hiệu suất làm việc.',
    },
    topicVocabularyC1C2: [
      {
        phrase: 'arduous undertaking',
        phonetic: '/ˈɑː.dʒu.əs ˌʌn.dəˈteɪ.kɪŋ/',
        pos: 'Noun Phrase',
        meaningVi: 'một nhiệm vụ gian nan, đòi hỏi nhiều công sức',
        exampleSentence:
          'Synthesizing dozens of academic papers within a tight timeframe was an exceptionally arduous undertaking.',
        cefrLevel: 'C2',
      },
      {
        phrase: 'streamline the workflow',
        phonetic: '/ˈstriːm.laɪn ðə ˈwɜːk.fləʊ/',
        pos: 'Verb Phrase',
        meaningVi: 'tinh gọn và tối ưu hóa quy trình làm việc',
        exampleSentence:
          'Employing generative AI tools allowed me to streamline my research workflow substantially.',
        cefrLevel: 'C1',
      },
      {
        phrase: 'mitigate algorithmic hallucinations',
        phonetic: '/ˈmɪt.ɪ.ɡeɪt ˌæl.ɡəˈrɪð.mɪk həˌluː.sɪˈneɪ.ʃənz/',
        pos: 'Verb Phrase (Technical Collocation)',
        meaningVi: 'giảm thiểu hiện tượng AI bịa thông tin / ảo giác thuật toán',
        exampleSentence:
          'I cross-referenced primary sources meticulously to mitigate any potential algorithmic hallucinations.',
        cefrLevel: 'C2',
      },
    ],
    band8ModelAnswer: `I would like to recount an experience when I leveraged an advanced generative AI research assistant to overcome a daunting academic bottleneck during my final-year dissertation.

Approximately three months ago, I was tasked with synthesizing a massive corpus of literature concerning sustainable supply chain management. With over thirty dense peer-reviewed journals to dissect within an unforgiving two-week deadline, I found myself utterly overwhelmed by the sheer volume of econometric data. Recognizing that traditional manual skimming would fall short, I decided to deploy an AI-powered analytical assistant.

To ensure the utmost academic rigor, I formulated structured prompts instructing the model to extract recurring methodologies, comparative statistical models, and research limitations across the documents. Furthermore, being acutely conscious of algorithmic hallucinations, I meticulously cross-referenced every synthesized summary against the primary citations.

The outcome was nothing short of transformative. The tool enabled me to condense weeks of laborious data parsing into mere days, empowering me to dedicate the bulk of my cognitive energy to qualitative critique and original synthesis. Ultimately, my research proposal received high commendation from the faculty committee. 

This encounter left an indelible impression on me because it fundamentally reshaped my perspective on technology: when wielded with critical discernment, AI serves not as a shortcut, but as a profound cognitive amplifier.`,
    modelAnswerWordCount: 228,
    examinerTipsVi:
      'Cách sử dụng thời gian tự nhiên trong 2 phút: Mở đầu bằng bối cảnh áp lực ➔ Quá trình giải quyết thông minh kèm từ vựng C2 ➔ Kết thúc bằng bài học triết lý sâu sắc.',
    groundingSourceTitle: 'IDP IELTS Speaking Real Test August 2026',
    groundingSourceUrl: 'https://ielts.idp.com',
  },
  {
    id: 'forecast_w1_renewable_energy_mix_2026',
    title: 'Writing Task 1 Academic: Energy Consumption from Renewable Sources (2015-2025)',
    skill: 'writing_task1',
    council: 'both_vietnam',
    councilLabel: 'IDP & British Council Toàn Quốc',
    examDate: 'Thi thật: 12/08/2026',
    topicDomain: 'Energy & Infrastructure',
    subCategory: 'Line Graph / Comparative Trends',
    promptStatement:
      'The graph below shows the percentage of electricity generated from four different renewable energy sources (Solar, Wind, Hydroelectric, and Biomass) in a European country between 2015 and 2025.',
    trendStatus: 'high_frequency',
    trendBadge: '📈 Tần Suất Cao',
    frequencyScore: 92,
    outlinePEEL: {
      point:
        'Tổng thể: Năng lượng Mặt trời (Solar) và Gió (Wind) ghi nhận mức tăng trưởng vượt bậc, trong khi Thủy điện (Hydroelectric) dù chiếm ưu thế ban đầu lại có xu hướng chững lại.',
      explanation:
        'Đoạn Body 1 phân tích sự vươn lên thần tốc của Solar và Wind từ mức dưới 10% lên vượt mốc 35-40%. Đoạn Body 2 đối chiếu Hydroelectric và Biomass với mức biến động khiêm tốn.',
      evidence:
        'Solar tăng gấp 4 lần từ 8% năm 2015 lên 38% năm 2025, trở thành nguồn cung điện tái tạo dẫn đầu.',
      link:
        'Bức tranh năng lượng phản ánh sự chuyển hướng mạnh mẽ sang các công nghệ năng lượng tái tạo phân tán.',
    },
    topicVocabularyC1C2: [
      {
        phrase: 'exponential surge',
        phonetic: '/ˌek.spəˈnen.ʃəl sɜːdʒ/',
        pos: 'Noun Phrase',
        meaningVi: 'sự tăng trưởng đột biến theo cấp số nhân',
        exampleSentence:
          'Solar energy witnessed an exponential surge over the ten-year period.',
        cefrLevel: 'C1',
      },
      {
        phrase: 'eclipsed by',
        phonetic: '/ɪˈklɪpst baɪ/',
        pos: 'Verb (Passive Collocation)',
        meaningVi: 'bị lu mờ / bị vượt qua bởi cái khác',
        exampleSentence:
          'Hydroelectric power was eventually eclipsed by wind and solar generation by 2022.',
        cefrLevel: 'C2',
      },
      {
        phrase: 'plateaued',
        phonetic: '/ˈplæt.əʊd/',
        pos: 'Verb',
        meaningVi: 'chạm ngưỡng đi ngang, bình ổn không tăng không giảm',
        exampleSentence:
          'Biomass contributions plateaued at approximately 12% after an initial modest rise.',
        cefrLevel: 'C1',
      },
    ],
    band8ModelAnswer: `The line graph delineates the proportion of electricity produced from four distinct renewable energy modalities—namely Solar, Wind, Hydroelectric, and Biomass—within a particular European nation spanning the decade from 2015 to 2025.

Overall, the period was characterized by a dramatic expansion in the adoption of solar and wind energy, both of which experienced exponential growth. Conversely, while hydroelectric power initially dominated the renewable energy portfolio, its contribution stagnated and was ultimately eclipsed by both solar and wind technologies by the culmination of the timeline.

In 2015, hydroelectric power commanded the preeminent position, accounting for roughly 30% of aggregate renewable generation. However, this figure underwent minor fluctuations before plateauing at 28% throughout the remaining years. In stark contrast, solar energy began as the least utilized source at a modest 7%, yet exhibited a sustained upward trajectory, quadrupling to reach an impressive 38% by 2025, thereby emerging as the foremost energy contributor.

Concurrently, electricity generated via wind turbines climbed steadily from 15% in 2015 to overtake hydroelectric power in 2022, settling at 32% by the end of the survey. Biomass exhibited the most subdued trajectory, oscillating marginally between 10% and 12% across the entire ten-year timeframe without registering any substantial breakthrough.`,
    modelAnswerWordCount: 204,
    examinerTipsVi:
      'Bài viết đạt điểm Task Achievement cao nhờ Overview rõ ràng, chia nhóm số liệu logic theo "Nhóm tăng trưởng mạnh" vs "Nhóm đi ngang", không đưa ý kiến cá nhân vào bài Task 1.',
    groundingSourceTitle: 'British Council & IDP Exam Database 2026',
    groundingSourceUrl: 'https://ielts.idp.com',
  },
  {
    id: 'forecast_sp3_digital_privacy_2026',
    title: 'Speaking Part 3: Digital Privacy, Surveillance & Social Responsibility',
    skill: 'speaking_part3',
    council: 'bc_vietnam',
    councilLabel: 'British Council TP.HCM & Hà Nội',
    examDate: 'Thi thật: 19/08/2026',
    topicDomain: 'Society, Law & Digital Ethics',
    subCategory: 'Discussion / Two-way In-depth Discussion',
    promptStatement:
      'Should individuals expect absolute privacy in the digital age, or must some level of personal data transparency be surrendered for public security?',
    trendStatus: 'quarter_forecast',
    trendBadge: '⭐ Trọng Tâm Quý 3/2026',
    frequencyScore: 91,
    outlinePEEL: {
      point:
        'Quyền riêng tư là quyền cơ bản của con người, song sự minh bạch có kiểm soát là cần thiết để ngăn chặn tội phạm mạng và bảo đảm an ninh quốc gia.',
      explanation:
        'Cần có cơ chế giám sát tư pháp độc lập (independent judicial oversight) để tránh tình trạng lạm quyền giám sát hàng loạt (mass surveillance abuse).',
      evidence:
        'Quy định Bảo vệ Dữ liệu Chung của Châu Âu (GDPR) là minh chứng thành công cho việc cân bằng giữa quyền riêng tư cá nhân và yêu cầu quản trị an ninh.',
      link:
        'Vì vậy, câu hỏi không phải là từ bỏ hoàn toàn quyền riêng tư, mà là thiết lập khung pháp lý minh bạch và nghiêm ngặt.',
    },
    topicVocabularyC1C2: [
      {
        phrase: 'unbridled mass surveillance',
        phonetic: '/ʌnˈbraɪ.dəld mæs sɜːˈveɪ.ləns/',
        pos: 'Noun Phrase',
        meaningVi: 'sự giám sát hàng loạt không bị kiềm chế',
        exampleSentence:
          'Citizens should remain vigilant against unbridled mass surveillance under the guise of public safety.',
        cefrLevel: 'C2',
      },
      {
        phrase: 'strike a delicate equilibrium',
        phonetic: '/straɪk ə ˈdel.ɪ.kət ˌiː.kwɪˈlɪb.ri.əm/',
        pos: 'Idiom / Collocation',
        meaningVi: 'đạt được sự cân bằng mong manh, tinh tế',
        exampleSentence:
          'Legislators must strike a delicate equilibrium between state security imperatives and fundamental civil liberties.',
        cefrLevel: 'C2',
      },
    ],
    band8ModelAnswer: `From my perspective, asserting an absolute right to digital privacy in our deeply interconnected global ecosystem is somewhat impractical; however, any concession of personal data must be rigorously circumscribed.

On one hand, law enforcement agencies undoubtedly require legitimate access to certain digital communications to combat transnational cybercrime, terrorism, and financial fraud. Without proportional data transparency, national security architectures would remain vulnerable to sophisticated modern threats.

Nevertheless, this necessity should never serve as a carte blanche for unbridled mass surveillance. Without independent judicial oversight and robust data protection frameworks—akin to the European GDPR—corporations and state entities risk encroaching upon fundamental democratic freedoms. Therefore, rather than a binary choice between total privacy and absolute transparency, governments must strike a delicate equilibrium governed by strict accountability and consent.`,
    modelAnswerWordCount: 146,
    examinerTipsVi:
      'Phát triển câu trả lời Part 3 đa chiều: Tránh chỉ trả lời Có/Không, sử dụng cấu trúc nhượng bộ (Concession: On one hand... Nevertheless...) và từ vựng học thuật C2.',
    groundingSourceTitle: 'British Council Speaking Topic Forecast Q3 2026',
    groundingSourceUrl: 'https://takeielts.britishcouncil.org',
  },
  {
    id: 'forecast_sp1_hometown_urban_shift_2026',
    title: 'Speaking Part 1: Hometown, Urban Changes & Local Communities',
    skill: 'speaking_part1',
    council: 'both_vietnam',
    councilLabel: 'IDP & BC Toàn Quốc',
    examDate: 'Thi thật: 17/08/2026',
    topicDomain: 'Daily Life & Urbanization',
    subCategory: 'Personal Q&A',
    promptStatement:
      'Has your hometown changed significantly over the past five to ten years? What do you like most about the changes?',
    trendStatus: 'high_frequency',
    trendBadge: '📈 Tần Suất Cao',
    frequencyScore: 97,
    outlinePEEL: {
      point:
        'Quê hương tôi đã trải qua sự chuyển mình mạnh mẽ về cơ sở hạ tầng giao thông và dịch vụ tiện ích công cộng.',
      explanation:
        'Các tuyến tàu điện trên cao và công viên cây xanh được xây dựng đã cải thiện đáng kể chất lượng sống của cư dân đô thị.',
      evidence:
        'Thời gian di chuyển từ ngoại ô vào trung tâm giảm từ 1 giờ xuống còn 25 phút.',
      link:
        'Sự hiện đại hóa này giúp thành phố vừa năng động hơn vừa duy trì được bản sắc văn hóa địa phương.',
    },
    topicVocabularyC1C2: [
      {
        phrase: 'undergone a profound metamorphosis',
        phonetic: '/ˌʌn.dəˈɡɒn ə prəˈfaʊnd ˌmet.əˈmɔː.fə.sɪs/',
        pos: 'Verb Phrase',
        meaningVi: 'trải qua một sự chuyển mình / lột xác sâu sắc',
        exampleSentence:
          'My hometown has undergone a profound metamorphosis in terms of civil infrastructure.',
        cefrLevel: 'C2',
      },
      {
        phrase: 'bustling urban enclave',
        phonetic: '/ˈbʌs.lɪŋ ˈɜː.bən ˈen.kleɪv/',
        pos: 'Noun Phrase',
        meaningVi: 'một khu vực đô thị nhộn nhịp, sầm uất',
        exampleSentence:
          'It has evolved from a sleepy district into a bustling urban enclave.',
        cefrLevel: 'C1',
      },
    ],
    band8ModelAnswer: `Unquestionably, yes. Over the past decade, my hometown has undergone a profound metamorphosis. What was once a relatively tranquil suburban area has now evolved into a bustling urban enclave, characterized by modern transit networks and expansive green public spaces. 

What I appreciate most is the dramatic enhancement in civil infrastructure—particularly the new metro line, which has substantially curtailed commuter gridlock and elevated the overall quality of daily life for local residents.`,
    modelAnswerWordCount: 82,
    examinerTipsVi:
      'Trong Part 1, câu trả lời cần súc tích (3-4 câu), trôi chảy, tránh ngập ngừng và sử dụng từ nối tự nhiên.',
    groundingSourceTitle: 'IELTS Real Speaking Part 1 Pool August 2026',
    groundingSourceUrl: 'https://ielts.idp.com',
  },
];
