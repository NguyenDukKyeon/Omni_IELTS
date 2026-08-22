import { VocabCard } from '../types';

export interface CuratedDeckMeta {
  id: string;
  title: string;
  titleVi: string;
  description: string;
  category: 'core_awl' | 'topic_ielts' | 'collocations_band8';
  bandTarget: 'Band 6.0-7.0' | 'Band 7.5+' | 'Band 8.0+';
  icon: string;
  color: string;
  badge: string;
  totalCards: number;
  sampleWords: string[];
  cards: VocabCard[];
}

export const curatedIELTSDecks: CuratedDeckMeta[] = [
  {
    id: 'deck_awl_core',
    title: 'Academic Word List (AWL) - Top Foundation',
    titleVi: 'Bộ Từ Học Thuật Cốt Lõi (AWL 1-5)',
    description: '100% xuất hiện trong các bài đọc Reading và yêu cầu bắt buộc trong Writing Task 2 học thuật.',
    category: 'core_awl',
    bandTarget: 'Band 6.0-7.0',
    icon: 'BookOpen',
    color: 'from-blue-600 to-indigo-600',
    badge: 'Cốt lõi bắt buộc',
    totalCards: 6,
    sampleWords: ['analyze', 'paradigm', 'empirical', 'arbitrary', 'comprehensive', 'underlying'],
    cards: [
      {
        id: 'cur_awl_1',
        word: 'paradigm',
        phonetic: '/ˈpær.ə.daɪm/',
        ukPhonetic: '/ˈpær.ə.daɪm/',
        usPhonetic: '/ˈper.ə.daɪm/',
        pos: 'noun',
        definitionVi: 'hệ hình, mô hình kiểu mẫu chuẩn',
        definitionEn: 'a typical example or pattern of something; a model',
        definitionAcademicEn: 'A distinct set of concepts or thought patterns, including theories, research methods, and standards for what constitutes legitimate contributions to a field.',
        exampleEn: 'The shift towards remote learning marks a major paradigm shift in contemporary pedagogy.',
        exampleVi: 'Sự chuyển dịch sang học trực tuyến đánh dấu một bước chuyển dịch hệ hình lớn trong phương pháp giáo dục đương đại.',
        examples: [
          {
            en: 'The shift towards remote learning marks a major paradigm shift in contemporary pedagogy.',
            vi: 'Sự chuyển dịch sang học trực tuyến đánh dấu một bước chuyển dịch hệ hình lớn trong phương pháp giáo dục đương đại.',
            context: 'IELTS Task 2'
          },
          {
            en: 'Our company needs to adopt a new business paradigm to survive in the digital era.',
            vi: 'Công ty chúng ta cần tiếp nhận một mô hình kinh doanh mới để tồn tại trong kỷ nguyên số.',
            context: 'Speaking'
          },
          {
            en: 'This scientific discovery fundamentally questioned the existing Newtonian paradigm.',
            vi: 'Khám phá khoa học này đã đặt câu hỏi căn bản về mô hình Newton hiện hữu.',
            context: 'Academic'
          }
        ],
        collocations: ['paradigm shift', 'dominant paradigm', 'shift the paradigm', 'new paradigm of'],
        synonyms: [
          { word: 'model', nuance: 'mô hình thực tế' },
          { word: 'framework', nuance: 'khung sườn lý thuyết' },
          { word: 'archetype', nuance: 'hình mẫu nguyên bản' }
        ],
        antonyms: ['anomaly', 'aberration'],
        mnemonic: 'Para + Digm = Giống như "Diagram" (biểu đồ) chuẩn mực, tạo thành "Hệ hình mẫu".',
        imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&auto=format&fit=crop&q=80',
        cefrLevel: 'C1',
        topicDeck: 'Academic Word List (AWL)',
        originModule: 'curated_deck',
        srsStage: 0,
        intervalDays: 1,
        nextReviewDate: new Date().toISOString(),
        easeFactor: 2.5,
        repetitions: 0,
        mastered: false,
      },
      {
        id: 'cur_awl_2',
        word: 'empirical',
        phonetic: '/ɪmˈpɪr.ɪ.kəl/',
        ukPhonetic: '/ɪmˈpɪr.ɪ.kəl/',
        usPhonetic: '/emˈpɪr.ɪ.kəl/',
        pos: 'adj',
        definitionVi: 'mang tính thực nghiệm, dựa trên bằng chứng thực tế',
        definitionEn: 'based on, concerned with, or verifiable by observation or experience rather than theory or pure logic',
        definitionAcademicEn: 'Originating in or based on observation or experience capable of being verified or disproved by experiment.',
        exampleEn: 'There is substantial empirical evidence supporting the correlation between early bilingualism and cognitive flexibility.',
        exampleVi: 'Có bằng chứng thực nghiệm đáng kể ủng hộ mối tương quan giữa song ngữ sớm và độ linh hoạt nhận thức.',
        examples: [
          {
            en: 'There is substantial empirical evidence supporting the correlation between early bilingualism and cognitive flexibility.',
            vi: 'Có bằng chứng thực nghiệm đáng kể ủng hộ mối tương quan giữa song ngữ sớm và độ linh hoạt nhận thức.',
            context: 'IELTS Task 2'
          },
          {
            en: 'Before reaching any conclusion, researchers must conduct extensive empirical testing.',
            vi: 'Trước khi đi đến bất kỳ kết luận nào, các nhà nghiên cứu phải tiến hành thử nghiệm thực nghiệm sâu rộng.',
            context: 'Academic'
          }
        ],
        collocations: ['empirical evidence', 'empirical data', 'empirical research', 'empirical study'],
        synonyms: [
          { word: 'evidence-based', nuance: 'dựa trên chứng cứ' },
          { word: 'observational', nuance: 'quan sát thực địa' },
          { word: 'verifiable', nuance: 'có thể kiểm chứng' }
        ],
        antonyms: ['theoretical', 'hypothetical', 'speculative'],
        mnemonic: 'Empirical bắt đầu bằng "Em-" gợi nhớ "Experience" (Kinh nghiệm/thực tế quan sát).',
        imageUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400&auto=format&fit=crop&q=80',
        cefrLevel: 'C1',
        topicDeck: 'Academic Word List (AWL)',
        originModule: 'curated_deck',
        srsStage: 0,
        intervalDays: 1,
        nextReviewDate: new Date().toISOString(),
        easeFactor: 2.5,
        repetitions: 0,
        mastered: false,
      },
      {
        id: 'cur_awl_3',
        word: 'comprehensive',
        phonetic: '/ˌkɒm.prɪˈhen.sɪv/',
        ukPhonetic: '/ˌkɒm.prɪˈhen.sɪv/',
        usPhonetic: '/ˌkɑːm.prəˈhen.sɪv/',
        pos: 'adj',
        definitionVi: 'toàn diện, bao quát mọi khía cạnh',
        definitionEn: 'complete and including everything that is necessary',
        definitionAcademicEn: 'Covering completely or broadly; of large scope or content inclusive of all requisite components.',
        exampleEn: 'Governments ought to formulate a comprehensive strategy to combat plastic pollution.',
        exampleVi: 'Chính phủ nên xây dựng một chiến lược toàn diện để chống lại ô nhiễm nhựa.',
        examples: [
          {
            en: 'Governments ought to formulate a comprehensive strategy to combat plastic pollution.',
            vi: 'Chính phủ nên xây dựng một chiến lược toàn diện để chống lại ô nhiễm nhựa.',
            context: 'IELTS Task 2'
          },
          {
            en: 'The university offers a comprehensive curriculum spanning both theoretical and practical skills.',
            vi: 'Trường đại học cung cấp một chương trình giảng dạy toàn diện bao gồm cả kỹ năng lý thuyết và thực hành.',
            context: 'Speaking'
          }
        ],
        collocations: ['comprehensive approach', 'comprehensive review', 'comprehensive understanding', 'comprehensive plan'],
        synonyms: [
          { word: 'exhaustive', nuance: 'chi tiết không sót điểm nào' },
          { word: 'all-inclusive', nuance: 'bao hàm tất cả' },
          { word: 'thorough', nuance: 'kỹ lưỡng cẩn thận' }
        ],
        antonyms: ['partial', 'fragmentary', 'incomplete'],
        mnemonic: 'Comprehend (hiểu sâu) -> Comprehensive (toàn diện bao quát mọi ngóc ngách).',
        imageUrl: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&auto=format&fit=crop&q=80',
        cefrLevel: 'B2',
        topicDeck: 'Academic Word List (AWL)',
        originModule: 'curated_deck',
        srsStage: 0,
        intervalDays: 1,
        nextReviewDate: new Date().toISOString(),
        easeFactor: 2.5,
        repetitions: 0,
        mastered: false,
      },
      {
        id: 'cur_awl_4',
        word: 'arbitrary',
        phonetic: '/ˈɑː.bɪ.trər.i/',
        ukPhonetic: '/ˈɑː.bɪ.trər.i/',
        usPhonetic: '/ˈɑːr.bə.trer.i/',
        pos: 'adj',
        definitionVi: 'tùy tiện, độc đoán, không dựa trên quy chuẩn lý tính',
        definitionEn: 'based on random choice or personal whim, rather than any reason or system',
        definitionAcademicEn: 'Determined by individual discretion or impulse rather than by necessity, law, or logical principle.',
        exampleEn: 'Imposing arbitrary quotas on international students could undermine academic diversity.',
        exampleVi: 'Việc áp đặt các hạn ngạch tùy tiện lên du học sinh quốc tế có thể làm suy giảm sự đa dạng học thuật.',
        examples: [
          {
            en: 'Imposing arbitrary quotas on international students could undermine academic diversity.',
            vi: 'Việc áp đặt các hạn ngạch tùy tiện lên du học sinh quốc tế có thể làm suy giảm sự đa dạng học thuật.',
            context: 'IELTS Task 2'
          },
          {
            en: 'The decision to cancel the concert seemed completely arbitrary to the disappointed fans.',
            vi: 'Quyết định hủy buổi hòa nhạc có vẻ hoàn toàn tùy tiện đối với người hâm mộ đang thất vọng.',
            context: 'General'
          }
        ],
        collocations: ['arbitrary decision', 'arbitrary selection', 'seem arbitrary', 'arbitrary power'],
        synonyms: [
          { word: 'capricious', nuance: 'thất thường theo cảm xúc' },
          { word: 'random', nuance: 'ngẫu nhiên thiếu quy luật' },
          { word: 'unsubstantiated', nuance: 'không có căn cứ' }
        ],
        antonyms: ['rational', 'methodical', 'systematic', 'reasoned'],
        mnemonic: 'Arbitrary nghe gần giống "Ai bực thì làm" -> hành động tùy hứng cá nhân không theo luật.',
        imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&auto=format&fit=crop&q=80',
        cefrLevel: 'C1',
        topicDeck: 'Academic Word List (AWL)',
        originModule: 'curated_deck',
        srsStage: 0,
        intervalDays: 1,
        nextReviewDate: new Date().toISOString(),
        easeFactor: 2.5,
        repetitions: 0,
        mastered: false,
      },
      {
        id: 'cur_awl_5',
        word: 'underlying',
        phonetic: '/ˌʌn.dəˈlaɪ.ɪŋ/',
        ukPhonetic: '/ˌʌn.dəˈlaɪ.ɪŋ/',
        usPhonetic: '/ˌʌn.dɚˈlaɪ.ɪŋ/',
        pos: 'adj',
        definitionVi: 'nằm ở gốc rễ, căn nguyên sâu xa',
        definitionEn: 'real but not immediately obvious; forming the foundation of something',
        definitionAcademicEn: 'Present as a fundamental or significant feature or principle behind visible phenomena.',
        exampleEn: 'Poverty and systemic inequality are the underlying causes of urban crime rates.',
        exampleVi: 'Nghèo đói và bất bình đẳng hệ thống là những căn nguyên sâu xa của tỷ lệ tội phạm đô thị.',
        examples: [
          {
            en: 'Poverty and systemic inequality are the underlying causes of urban crime rates.',
            vi: 'Nghèo đói và bất bình đẳng hệ thống là những căn nguyên sâu xa của tỷ lệ tội phạm đô thị.',
            context: 'IELTS Task 2'
          },
          {
            en: 'To solve the problem, we must identify its underlying mechanism rather than treating surface symptoms.',
            vi: 'Để giải quyết vấn đề, chúng ta phải xác định cơ chế gốc rễ thay vì điều trị các triệu chứng bề mặt.',
            context: 'Academic'
          }
        ],
        collocations: ['underlying causes', 'underlying reason', 'underlying principle', 'underlying assumption'],
        synonyms: [
          { word: 'fundamental', nuance: 'mang tính nền tảng' },
          { word: 'root', nuance: 'gốc rễ' },
          { word: 'intrinsic', nuance: 'nội tại bên trong' }
        ],
        antonyms: ['superficial', 'surface-level', 'apparent'],
        mnemonic: 'Under (dưới) + Lying (nằm) = Nằm sâu bên dưới bề mặt -> Căn nguyên gốc rễ.',
        imageUrl: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=400&auto=format&fit=crop&q=80',
        cefrLevel: 'B2',
        topicDeck: 'Academic Word List (AWL)',
        originModule: 'curated_deck',
        srsStage: 0,
        intervalDays: 1,
        nextReviewDate: new Date().toISOString(),
        easeFactor: 2.5,
        repetitions: 0,
        mastered: false,
      },
      {
        id: 'cur_awl_6',
        word: 'substantiate',
        phonetic: '/səbˈstæn.ʃi.eɪt/',
        ukPhonetic: '/səbˈstæn.ʃi.eɪt/',
        usPhonetic: '/səbˈstæn.ʃi.eɪt/',
        pos: 'verb',
        definitionVi: 'chứng minh, đưa ra bằng chứng xác thực',
        definitionEn: 'provide evidence to support or prove the truth of',
        definitionAcademicEn: 'To establish by proof or competent evidence; verify empirical claims.',
        exampleEn: 'Academic essays must substantiate arguments with rigorous research rather than personal anecdotes.',
        exampleVi: 'Các bài tiểu luận học thuật phải chứng minh luận điểm bằng nghiên cứu chặt chẽ thay vì những câu chuyện cá nhân.',
        examples: [
          {
            en: 'Academic essays must substantiate arguments with rigorous research rather than personal anecdotes.',
            vi: 'Các bài tiểu luận học thuật phải chứng minh luận điểm bằng nghiên cứu chặt chẽ thay vì những câu chuyện cá nhân.',
            context: 'IELTS Task 2'
          },
          {
            en: 'The prosecution failed to substantiate the allegations against the defendant.',
            vi: 'Bên công tố đã không thể chứng minh các cáo buộc chống lại bị cáo.',
            context: 'Academic'
          }
        ],
        collocations: ['substantiate a claim', 'substantiate allegations', 'fail to substantiate', 'fully substantiate'],
        synonyms: [
          { word: 'corroborate', nuance: 'củng cố thêm bằng chứng phụ' },
          { word: 'validate', nuance: 'xác thực tính hợp lệ' },
          { word: 'verify', nuance: 'kiểm chứng độ chính xác' }
        ],
        antonyms: ['refute', 'disprove', 'undermine'],
        mnemonic: 'Substance (thực chất) -> Substantiate = làm cho luận điểm có thực chất bằng chứng.',
        imageUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=400&auto=format&fit=crop&q=80',
        cefrLevel: 'C1',
        topicDeck: 'Academic Word List (AWL)',
        originModule: 'curated_deck',
        srsStage: 0,
        intervalDays: 1,
        nextReviewDate: new Date().toISOString(),
        easeFactor: 2.5,
        repetitions: 0,
        mastered: false,
      }
    ]
  },
  {
    id: 'deck_env_75',
    title: 'Environment, Climate & Renewable Energy',
    titleVi: 'Môi Trường & Biến Đổi Khí Hậu (Band 7.5+)',
    description: 'Chủ đề chiếm hơn 25% các đề thi Writing Task 2 & Reading. Bộ từ giúp bạn diễn đạt chính xác về sinh thái học.',
    category: 'topic_ielts',
    bandTarget: 'Band 7.5+',
    icon: 'Trees',
    color: 'from-emerald-600 to-teal-600',
    badge: 'Chủ đề Hot Task 2',
    totalCards: 5,
    sampleWords: ['equilibrium', 'mitigate', 'degradation', 'deplete', 'biodiversity'],
    cards: [
      {
        id: 'cur_env_1',
        word: 'equilibrium',
        phonetic: '/ˌek.wɪˈlɪb.ri.əm/',
        ukPhonetic: '/ˌek.wɪˈlɪb.ri.əm/',
        usPhonetic: '/ˌiː.kwəˈlɪb.ri.əm/',
        pos: 'noun',
        definitionVi: 'trạng thái cân bằng sinh thái / tâm lý',
        definitionEn: 'a state in which opposing forces or influences are balanced',
        definitionAcademicEn: 'A state of balance between continuing processes or ecological components in dynamic harmony.',
        exampleEn: 'Unregulated industrial waste severely disrupts the delicate ecological equilibrium of coastal wetlands.',
        exampleVi: 'Rác thải công nghiệp không được kiểm soát làm xáo trộn nghiêm trọng trạng thái cân bằng sinh thái mong manh của vùng đất ngập nước ven biển.',
        examples: [
          {
            en: 'Unregulated industrial waste severely disrupts the delicate ecological equilibrium of coastal wetlands.',
            vi: 'Rác thải công nghiệp không được kiểm soát làm xáo trộn nghiêm trọng trạng thái cân bằng sinh thái mong manh của vùng đất ngập nước ven biển.',
            context: 'IELTS Task 2'
          },
          {
            en: 'It took several years to restore environmental equilibrium after the oil spill catastrophe.',
            vi: 'Phải mất vài năm để khôi phục cân bằng môi trường sau thảm họa tràn dầu.',
            context: 'Reading'
          }
        ],
        collocations: ['ecological equilibrium', 'maintain equilibrium', 'restore equilibrium', 'delicate equilibrium'],
        synonyms: [
          { word: 'balance', nuance: 'sự cân bằng thông thường' },
          { word: 'homeostasis', nuance: 'cân bằng nội môi sinh học' },
          { word: 'stability', nuance: 'sự ổn định lâu dài' }
        ],
        antonyms: ['imbalance', 'disequilibrium', 'instability'],
        mnemonic: 'Equi- (bằng nhau như Equal) + librium (như Libra cán cân) -> Cán cân thăng bằng hoàn hảo.',
        imageUrl: 'https://images.unsplash.com/photo-1511497584788-87676104235f?w=400&auto=format&fit=crop&q=80',
        cefrLevel: 'C1',
        topicDeck: 'Environment & Climate',
        originModule: 'curated_deck',
        srsStage: 0,
        intervalDays: 1,
        nextReviewDate: new Date().toISOString(),
        easeFactor: 2.5,
        repetitions: 0,
        mastered: false,
      },
      {
        id: 'cur_env_2',
        word: 'degradation',
        phonetic: '/ˌdeɡ.rəˈdeɪ.ʃən/',
        ukPhonetic: '/ˌdeɡ.rəˈdeɪ.ʃən/',
        usPhonetic: '/ˌdeɡ.rəˈdeɪ.ʃən/',
        pos: 'noun',
        definitionVi: 'sự suy thoái, thoái hóa chất lượng',
        definitionEn: 'the process in which the beauty or quality of something is destroyed or spoiled',
        definitionAcademicEn: 'The deterioration of the environment through depletion of resources such as air, water and soil.',
        exampleEn: 'Rampant land degradation threatens food security across developing regions.',
        exampleVi: 'Sự suy thoái đất đai tràn lan đe dọa an ninh lương thực trên khắp các khu vực đang phát triển.',
        examples: [
          {
            en: 'Rampant land degradation threatens food security across developing regions.',
            vi: 'Sự suy thoái đất đai tràn lan đe dọa an ninh lương thực trên khắp các khu vực đang phát triển.',
            context: 'IELTS Task 2'
          },
          {
            en: 'Environmental degradation is intrinsically linked to overpopulation and unsustainable consumption.',
            vi: 'Suy thoái môi trường gắn liền với sự bùng nổ dân số và tiêu dùng không bền vững.',
            context: 'Academic'
          }
        ],
        collocations: ['environmental degradation', 'soil degradation', 'halt degradation', 'cause degradation'],
        synonyms: [
          { word: 'deterioration', nuance: 'sự xấu đi theo thời gian' },
          { word: 'depreciation', nuance: 'giảm giá trị' },
          { word: 'erosion', nuance: 'bào mòn dần' }
        ],
        antonyms: ['restoration', 'enhancement', 'rejuvenation'],
        mnemonic: 'De- (hạ xuống) + Grade (cấp bậc) = Giảm cấp bậc/chất lượng -> Suy thoái.',
        imageUrl: 'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=400&auto=format&fit=crop&q=80',
        cefrLevel: 'C1',
        topicDeck: 'Environment & Climate',
        originModule: 'curated_deck',
        srsStage: 0,
        intervalDays: 1,
        nextReviewDate: new Date().toISOString(),
        easeFactor: 2.5,
        repetitions: 0,
        mastered: false,
      },
      {
        id: 'cur_env_3',
        word: 'deplete',
        phonetic: '/dɪˈpliːt/',
        ukPhonetic: '/dɪˈpliːt/',
        usPhonetic: '/dɪˈpliːt/',
        pos: 'verb',
        definitionVi: 'làm cạn kiệt, vắt kiệt (nguồn lực, tài nguyên)',
        definitionEn: 'use up the supply or resources of',
        definitionAcademicEn: 'To lessen markedly in quantity, content, power, or value.',
        exampleEn: 'Overfishing has drastically depleted marine stocks in international waters.',
        exampleVi: 'Việc đánh bắt quá mức đã làm cạn kiệt nghiêm trọng trữ lượng sinh vật biển tại các vùng biển quốc tế.',
        examples: [
          {
            en: 'Overfishing has drastically depleted marine stocks in international waters.',
            vi: 'Việc đánh bắt quá mức đã làm cạn kiệt nghiêm trọng trữ lượng sinh vật biển tại các vùng biển quốc tế.',
            context: 'IELTS Task 2'
          },
          {
            en: 'Intensive irrigation rapidly depletes non-renewable groundwater aquifers.',
            vi: 'Thủy lợi thâm canh làm cạn kiệt nhanh chóng các tầng ngậm nước ngầm không thể tái tạo.',
            context: 'Reading'
          }
        ],
        collocations: ['deplete resources', 'deplete the ozone layer', 'severely depleted', 'deplete reserves'],
        synonyms: [
          { word: 'exhaust', nuance: 'dùng hết sạch' },
          { word: 'drain', nuance: 'rút cạn từ từ' },
          { word: 'consume', nuance: 'tiêu thụ mạnh' }
        ],
        antonyms: ['replenish', 'restore', 'augment'],
        mnemonic: 'De- (bỏ) + plete (như complete đầy đủ) = Làm mất đi sự đầy đủ -> Cạn kiệt.',
        imageUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=400&auto=format&fit=crop&q=80',
        cefrLevel: 'B2',
        topicDeck: 'Environment & Climate',
        originModule: 'curated_deck',
        srsStage: 0,
        intervalDays: 1,
        nextReviewDate: new Date().toISOString(),
        easeFactor: 2.5,
        repetitions: 0,
        mastered: false,
      },
      {
        id: 'cur_env_4',
        word: 'biodiversity',
        phonetic: '/ˌbaɪ.əʊ.daɪˈvɜː.sə.ti/',
        ukPhonetic: '/ˌbaɪ.əʊ.daɪˈvɜː.sə.ti/',
        usPhonetic: '/ˌbaɪ.oʊ.daɪˈvɝː.sə.t̬i/',
        pos: 'noun',
        definitionVi: 'sự đa dạng sinh học',
        definitionEn: 'the variety of plant and animal life in the world or in a particular habitat',
        definitionAcademicEn: 'The variability among living organisms from all sources including terrestrial, marine, and other aquatic ecosystems.',
        exampleEn: 'The destruction of primary rainforests entails an irreversible loss of global biodiversity.',
        exampleVi: 'Sự phá hủy các khu rừng nhiệt đới nguyên sinh kéo theo sự mất mát không thể cứu vãn của đa dạng sinh học toàn cầu.',
        examples: [
          {
            en: 'The destruction of primary rainforests entails an irreversible loss of global biodiversity.',
            vi: 'Sự phá hủy các khu rừng nhiệt đới nguyên sinh kéo theo sự mất mát không thể cứu vãn của đa dạng sinh học toàn cầu.',
            context: 'IELTS Task 2'
          },
          {
            en: 'Preserving biodiversity is crucial for maintaining resilient ecological systems.',
            vi: 'Bảo tồn đa dạng sinh học là tối quan trọng để duy trì các hệ sinh thái có khả năng chống chịu.',
            context: 'Speaking'
          }
        ],
        collocations: ['biodiversity loss', 'preserve biodiversity', 'rich biodiversity', 'biodiversity hotspot'],
        synonyms: [
          { word: 'biological variety', nuance: 'sự đa dạng sinh vật học' },
          { word: 'ecological richness', nuance: 'sự trù phú sinh thái' }
        ],
        antonyms: ['monoculture', 'ecological homogeneity'],
        mnemonic: 'Bio (Sinh học) + Diversity (Đa dạng) = Đa dạng muôn loài sinh học.',
        imageUrl: 'https://images.unsplash.com/photo-1500485035595-cbe6f645feb1?w=400&auto=format&fit=crop&q=80',
        cefrLevel: 'B2',
        topicDeck: 'Environment & Climate',
        originModule: 'curated_deck',
        srsStage: 0,
        intervalDays: 1,
        nextReviewDate: new Date().toISOString(),
        easeFactor: 2.5,
        repetitions: 0,
        mastered: false,
      },
      {
        id: 'cur_env_5',
        word: 'mitigate',
        phonetic: '/ˈmɪt.ɪ.ɡeɪt/',
        ukPhonetic: '/ˈmɪt.ɪ.ɡeɪt/',
        usPhonetic: '/ˈmɪt̬.ə.ɡeɪt/',
        pos: 'verb',
        definitionVi: 'giảm nhẹ, xoa dịu (hậu quả, tác hại tiêu cực)',
        definitionEn: 'make something less severe, serious, or painful',
        definitionAcademicEn: 'To lessen the gravity of an offense, mistake, or natural hazard through preventive intervention.',
        exampleEn: 'Transitioning to solar power serves to mitigate greenhouse gas emissions considerably.',
        exampleVi: 'Chuyển đổi sang năng lượng mặt trời giúp giảm nhẹ đáng kể phát thải khí nhà kính.',
        examples: [
          {
            en: 'Transitioning to solar power serves to mitigate greenhouse gas emissions considerably.',
            vi: 'Chuyển đổi sang năng lượng mặt trời giúp giảm nhẹ đáng kể phát thải khí nhà kính.',
            context: 'IELTS Task 2'
          },
          {
            en: 'City planners must introduce green roofs to mitigate the urban heat island effect.',
            vi: 'Các nhà quy hoạch đô thị phải đưa mái nhà xanh vào để giảm nhẹ hiệu ứng đảo nhiệt đô thị.',
            context: 'Reading'
          }
        ],
        collocations: ['mitigate risks', 'mitigate the impact', 'mitigate climate change', 'mitigate consequences'],
        synonyms: [
          { word: 'alleviate', nuance: 'làm dịu cơn đau/gánh nặng' },
          { word: 'attenuate', nuance: 'làm giảm cường độ' },
          { word: 'curb', nuance: 'kiềm tỏa kìm chế' }
        ],
        antonyms: ['exacerbate', 'aggravate', 'intensify'],
        mnemonic: 'Mitigate gần giống "Mi-ti" (nhỏ bé) + Gate (cổng) = Thu nhỏ cổng lại để bão bớt tràn vào -> Giảm nhẹ tác hại.',
        imageUrl: 'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=400&auto=format&fit=crop&q=80',
        cefrLevel: 'C1',
        topicDeck: 'Environment & Climate',
        originModule: 'curated_deck',
        srsStage: 0,
        intervalDays: 1,
        nextReviewDate: new Date().toISOString(),
        easeFactor: 2.5,
        repetitions: 0,
        mastered: false,
      }
    ]
  },
  {
    id: 'deck_tech_ai',
    title: 'Science, AI & Digital Transformation',
    titleVi: 'Công Nghệ, Trí Tuệ Nhân Tạo & Kỷ Nguyên Số',
    description: 'Vốn từ C1/C2 thiết yếu để bàn luận về tự động hóa, quyền riêng tư dữ liệu và tác động của AI đến thị trường lao động.',
    category: 'topic_ielts',
    bandTarget: 'Band 7.5+',
    icon: 'Cpu',
    color: 'from-purple-600 to-indigo-600',
    badge: 'Chủ đề xu hướng 2026',
    totalCards: 5,
    sampleWords: ['ubiquitous', 'autonomous', 'disruptive', 'exponential', 'surveillance'],
    cards: [
      {
        id: 'cur_tech_1',
        word: 'ubiquitous',
        phonetic: '/juːˈbɪk.wə.təs/',
        ukPhonetic: '/juːˈbɪk.wə.təs/',
        usPhonetic: '/juːˈbɪk.wə.t̬əs/',
        pos: 'adj',
        definitionVi: 'phổ biến ở khắp mọi nơi, nhan nhản',
        definitionEn: 'present, appearing, or found everywhere',
        definitionAcademicEn: 'Existing or being everywhere at the same time; constantly encountered and omnipresent.',
        exampleEn: 'Smartphone technology has become so ubiquitous that offline alternatives are increasingly marginalized.',
        exampleVi: 'Công nghệ điện thoại thông minh đã trở nên phổ biến ở khắp mọi nơi đến mức các lựa chọn ngoại tuyến ngày càng bị gạt ra ngoài lề.',
        examples: [
          {
            en: 'Smartphone technology has become so ubiquitous that offline alternatives are increasingly marginalized.',
            vi: 'Công nghệ điện thoại thông minh đã trở nên phổ biến ở khắp mọi nơi đến mức các lựa chọn ngoại tuyến ngày càng bị gạt ra ngoài lề.',
            context: 'IELTS Task 2'
          },
          {
            en: 'AI algorithms have a ubiquitous presence in modern social media platforms.',
            vi: 'Các thuật toán AI hiện diện ở khắp mọi nơi trên các nền tảng mạng xã hội hiện đại.',
            context: 'Speaking'
          }
        ],
        collocations: ['ubiquitous presence', 'become ubiquitous', 'almost ubiquitous', 'ubiquitous computing'],
        synonyms: [
          { word: 'omnipresent', nuance: 'có mặt khắp nơi đồng thời' },
          { word: 'pervasive', nuance: 'lan tỏa thấm sâu mọi ngõ ngách' },
          { word: 'universal', nuance: 'mang tính phổ quát toàn cầu' }
        ],
        antonyms: ['rare', 'scarce', 'isolated'],
        mnemonic: 'U-bi-qui-tous: "U" (You) đi đâu cũng "bi" (bị) nhìn thấy vì nó ở "quanh ta" khắp nơi.',
        imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&auto=format&fit=crop&q=80',
        cefrLevel: 'C1',
        topicDeck: 'Science & AI',
        originModule: 'curated_deck',
        srsStage: 0,
        intervalDays: 1,
        nextReviewDate: new Date().toISOString(),
        easeFactor: 2.5,
        repetitions: 0,
        mastered: false,
      },
      {
        id: 'cur_tech_2',
        word: 'autonomous',
        phonetic: '/ɔːˈtɒn.ə.məs/',
        ukPhonetic: '/ɔːˈtɒn.ə.məs/',
        usPhonetic: '/ɑːˈtɑː.nə.məs/',
        pos: 'adj',
        definitionVi: 'tự hành, tự chủ không cần con người can thiệp',
        definitionEn: 'having the freedom to act independently; acting independently or having the freedom to do so',
        definitionAcademicEn: 'Carried on without outside control; self-governing and operating with independent decision-making algorithms.',
        exampleEn: 'The widespread deployment of autonomous vehicles promises to revolutionize public transit safety.',
        exampleVi: 'Việc triển khai rộng rãi phương tiện tự hành hứa hẹn sẽ cách mạng hóa độ an toàn của giao thông công cộng.',
        examples: [
          {
            en: 'The widespread deployment of autonomous vehicles promises to revolutionize public transit safety.',
            vi: 'Việc triển khai rộng rãi phương tiện tự hành hứa hẹn sẽ cách mạng hóa độ an toàn của giao thông công cộng.',
            context: 'IELTS Task 2'
          },
          {
            en: 'Fostering autonomous learning habits enables students to master new subjects independently.',
            vi: 'Nuôi dưỡng thói quen học tập tự chủ giúp học sinh làm chủ các môn học mới một cách độc lập.',
            context: 'Speaking'
          }
        ],
        collocations: ['autonomous vehicle', 'autonomous system', 'autonomous decision-making', 'autonomous learner'],
        synonyms: [
          { word: 'self-governing', nuance: 'tự quản lý' },
          { word: 'self-directed', nuance: 'tự định hướng' },
          { word: 'unmanned', nuance: 'không người lái' }
        ],
        antonyms: ['dependent', 'controlled', 'subordinate'],
        mnemonic: 'Auto- (tự động) + Nomous (quy tắc luật lệ) = Tự mình vận hành theo quy tắc của mình -> Tự hành.',
        imageUrl: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400&auto=format&fit=crop&q=80',
        cefrLevel: 'C1',
        topicDeck: 'Science & AI',
        originModule: 'curated_deck',
        srsStage: 0,
        intervalDays: 1,
        nextReviewDate: new Date().toISOString(),
        easeFactor: 2.5,
        repetitions: 0,
        mastered: false,
      },
      {
        id: 'cur_tech_3',
        word: 'disruptive',
        phonetic: '/dɪsˈrʌp.tɪv/',
        ukPhonetic: '/dɪsˈrʌp.tɪv/',
        usPhonetic: '/dɪsˈrʌp.tɪv/',
        pos: 'adj',
        definitionVi: 'mang tính đột phá làm thay đổi hoàn toàn cục diện',
        definitionEn: 'innovative in a way that creates a new market and displaces established market leaders',
        definitionAcademicEn: 'Causing radical change in an existing industry or market by means of innovation.',
        exampleEn: 'Generative AI represents a highly disruptive innovation across creative and analytical industries.',
        exampleVi: 'AI tạo sinh đại diện cho một sự đổi mới mang tính đột phá cục diện sâu sắc trên khắp các ngành công nghiệp sáng tạo và phân tích.',
        examples: [
          {
            en: 'Generative AI represents a highly disruptive innovation across creative and analytical industries.',
            vi: 'AI tạo sinh đại diện cho một sự đổi mới mang tính đột phá cục diện sâu sắc trên khắp các ngành công nghiệp sáng tạo và phân tích.',
            context: 'IELTS Task 2'
          },
          {
            en: 'Disruptive technologies frequently render obsolete traditional vocational skills.',
            vi: 'Các công nghệ đột phá thường khiến những kỹ năng nghề truyền thống trở nên lỗi thời.',
            context: 'Academic'
          }
        ],
        collocations: ['disruptive innovation', 'disruptive technology', 'disruptive impact', 'highly disruptive'],
        synonyms: [
          { word: 'game-changing', nuance: 'thay đổi luật chơi' },
          { word: 'revolutionary', nuance: 'mang tính cách mạng' },
          { word: 'groundbreaking', nuance: 'khai phá nền móng mới' }
        ],
        antonyms: ['conservative', 'traditional', 'conventional'],
        mnemonic: 'Disrupt (làm gián đoạn mô hình cũ) -> Disruptive: Đột phá tạo trật tự mới.',
        imageUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400&auto=format&fit=crop&q=80',
        cefrLevel: 'C1',
        topicDeck: 'Science & AI',
        originModule: 'curated_deck',
        srsStage: 0,
        intervalDays: 1,
        nextReviewDate: new Date().toISOString(),
        easeFactor: 2.5,
        repetitions: 0,
        mastered: false,
      },
      {
        id: 'cur_tech_4',
        word: 'exponential',
        phonetic: '/ˌek.spəˈnen.ʃəl/',
        ukPhonetic: '/ˌek.spəˈnen.ʃəl/',
        usPhonetic: '/ˌek.spoʊˈnen.ʃəl/',
        pos: 'adj',
        definitionVi: 'tăng theo cấp số nhân, cực kỳ nhanh chóng',
        definitionEn: 'becoming more and more rapid (of an increase)',
        definitionAcademicEn: 'Characterized by or being an extremely rapid increase expressed by mathematical exponents.',
        exampleEn: 'The exponential growth of computational capacity has catalyzed machine learning breakthroughs.',
        exampleVi: 'Sự tăng trưởng theo cấp số nhân của năng lực tính toán đã xúc tác cho những bước đột phá trong học máy.',
        examples: [
          {
            en: 'The exponential growth of computational capacity has catalyzed machine learning breakthroughs.',
            vi: 'Sự tăng trưởng theo cấp số nhân của năng lực tính toán đã xúc tác cho những bước đột phá trong học máy.',
            context: 'IELTS Task 2'
          },
          {
            en: 'E-commerce adoption witnessed an exponential surge during the global lockdown periods.',
            vi: 'Việc tiếp nhận thương mại điện tử đã chứng kiến sự gia tăng theo cấp số nhân trong các giai đoạn phong tỏa toàn cầu.',
            context: 'Speaking'
          }
        ],
        collocations: ['exponential growth', 'exponential increase', 'grow exponentially', 'exponential rate'],
        synonyms: [
          { word: 'meteoric', nuance: 'nhanh như sao băng' },
          { word: 'rapid', nuance: 'nhanh chóng' },
          { word: 'unprecedented', nuance: 'chưa từng có' }
        ],
        antonyms: ['linear', 'stagnant', 'gradual'],
        mnemonic: 'Exponent (số mũ toán học) -> Exponential: Nhân lên vùn vụt theo cấp số mũ.',
        imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&auto=format&fit=crop&q=80',
        cefrLevel: 'C1',
        topicDeck: 'Science & AI',
        originModule: 'curated_deck',
        srsStage: 0,
        intervalDays: 1,
        nextReviewDate: new Date().toISOString(),
        easeFactor: 2.5,
        repetitions: 0,
        mastered: false,
      },
      {
        id: 'cur_tech_5',
        word: 'surveillance',
        phonetic: '/sɜːˈveɪ.ləns/',
        ukPhonetic: '/sɜːˈveɪ.ləns/',
        usPhonetic: '/sɚˈveɪ.ləns/',
        pos: 'noun',
        definitionVi: 'sự giám sát, theo dõi an ninh / dữ liệu',
        definitionEn: 'close observation, especially of a suspected spy or criminal',
        definitionAcademicEn: 'Continuous observation of a place, person, group, or ongoing activity to collect intelligence or maintain order.',
        exampleEn: 'The rise of mass digital surveillance raises profound ethical concerns regarding civil liberties.',
        exampleVi: 'Sự gia tăng của việc giám sát kỹ thuật số hàng loạt dấy lên những lo ngại đạo đức sâu sắc liên quan đến quyền tự do dân sự.',
        examples: [
          {
            en: 'The rise of mass digital surveillance raises profound ethical concerns regarding civil liberties.',
            vi: 'Sự gia tăng của việc giám sát kỹ thuật số hàng loạt dấy lên những lo ngại đạo đức sâu sắc liên quan đến quyền tự do dân sự.',
            context: 'IELTS Task 2'
          },
          {
            en: 'High-definition surveillance cameras have proven effective in deterring petty crime in public transit stations.',
            vi: 'Camera giám sát độ nét cao đã chứng minh hiệu quả trong việc răn đe tội phạm vặt ở các ga giao thông công cộng.',
            context: 'General'
          }
        ],
        collocations: ['mass surveillance', 'surveillance camera', 'under surveillance', 'digital surveillance'],
        synonyms: [
          { word: 'monitoring', nuance: 'theo dõi định kỳ' },
          { word: 'supervision', nuance: 'giám sát công việc' },
          { word: 'scrutiny', nuance: 'soi xét kiểm tra kỹ lưỡng' }
        ],
        antonyms: ['privacy', 'anonymity'],
        mnemonic: 'Sur- (ở trên cao) + Veillance (nhìn ngó như Survey) = Nhìn bao quát từ trên xuống -> Giám sát.',
        imageUrl: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=400&auto=format&fit=crop&q=80',
        cefrLevel: 'C1',
        topicDeck: 'Science & AI',
        originModule: 'curated_deck',
        srsStage: 0,
        intervalDays: 1,
        nextReviewDate: new Date().toISOString(),
        easeFactor: 2.5,
        repetitions: 0,
        mastered: false,
      }
    ]
  },
  {
    id: 'deck_collocations_80',
    title: 'Band 8.0+ High-Impact Collocations & Idiomatic Lexis',
    titleVi: 'Bộ Collocations & Cụm Từ Học Thuật Band 8.0+',
    description: 'Tiêu chí Lexical Resource band 8.0+ đòi hỏi sử dụng cụm từ tự nhiên và chính xác tuyệt đối.',
    category: 'collocations_band8',
    bandTarget: 'Band 8.0+',
    icon: 'Sparkles',
    color: 'from-amber-500 to-rose-600',
    badge: 'Chìa khóa Band 8.0+',
    totalCards: 5,
    sampleWords: ['paramount importance', 'pivotal role', 'cast doubt on', 'strike a balance', 'give rise to'],
    cards: [
      {
        id: 'cur_col_1',
        word: 'paramount importance',
        phonetic: '/ˈpær.ə.maʊnt ɪmˈpɔː.təns/',
        ukPhonetic: '/ˈpær.ə.maʊnt ɪmˈpɔː.təns/',
        usPhonetic: '/ˈper.ə.maʊnt ɪmˈpɔːr.təns/',
        pos: 'phrase',
        definitionVi: 'tầm quan trọng tối cao, quan trọng hơn bất cứ thứ gì khác',
        definitionEn: 'more important than anything else; of supreme significance',
        definitionAcademicEn: 'Pertaining to utmost supremacy or priority in value, urgency, or structural hierarchy.',
        exampleEn: 'Ensuring universal access to primary healthcare is of paramount importance for national productivity.',
        exampleVi: 'Đảm bảo tiếp cận phổ cập y tế ban đầu có tầm quan trọng tối cao đối với năng suất quốc gia.',
        examples: [
          {
            en: 'Ensuring universal access to primary healthcare is of paramount importance for national productivity.',
            vi: 'Đảm bảo tiếp cận phổ cập y tế ban đầu có tầm quan trọng tối cao đối với năng suất quốc gia.',
            context: 'IELTS Task 2'
          },
          {
            en: 'In competitive negotiations, timing and emotional composure are of paramount importance.',
            vi: 'Trong đàm phán cạnh tranh, thời điểm và sự điềm tĩnh cảm xúc có tầm quan trọng tối cao.',
            context: 'Speaking'
          }
        ],
        collocations: ['be of paramount importance', 'a matter of paramount importance', 'paramount importance to'],
        synonyms: [
          { word: 'utmost significance', nuance: 'tầm quan trọng tột bậc' },
          { word: 'cardinal priority', nuance: 'ưu tiên cốt tử' }
        ],
        antonyms: ['trivial concern', 'negligible factor'],
        mnemonic: 'Para (vượt lên) + Mount (ngọn núi đỉnh cao) = Đứng trên đỉnh núi cao nhất -> Tối quan trọng.',
        imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&auto=format&fit=crop&q=80',
        cefrLevel: 'C2',
        topicDeck: 'High-Impact Collocations',
        originModule: 'curated_deck',
        srsStage: 0,
        intervalDays: 1,
        nextReviewDate: new Date().toISOString(),
        easeFactor: 2.5,
        repetitions: 0,
        mastered: false,
      },
      {
        id: 'cur_col_2',
        word: 'pivotal role',
        phonetic: '/ˈpɪv.ə.təl rəʊl/',
        ukPhonetic: '/ˈpɪv.ə.təl rəʊl/',
        usPhonetic: '/ˈpɪv.ə.t̬əl roʊl/',
        pos: 'phrase',
        definitionVi: 'vai trò then chốt, mang tính bước ngoặt',
        definitionEn: 'a crucial, central role upon which other things depend',
        definitionAcademicEn: 'Serving as a central pivot; decisively determining the outcome or direction of an overarching system.',
        exampleEn: 'Early childhood educators play a pivotal role in nurturing interpersonal empathy and critical thinking.',
        exampleVi: 'Các nhà giáo dục mầm non đóng một vai trò then chốt trong việc nuôi dưỡng sự đồng cảm giữa các cá nhân và tư duy phản biện.',
        examples: [
          {
            en: 'Early childhood educators play a pivotal role in nurturing interpersonal empathy and critical thinking.',
            vi: 'Các nhà giáo dục mầm non đóng một vai trò then chốt trong việc nuôi dưỡng sự đồng cảm giữa các cá nhân và tư duy phản biện.',
            context: 'IELTS Task 2'
          },
          {
            en: 'International cooperation played a pivotal role in eradicating smallpox.',
            vi: 'Hợp tác quốc tế đã đóng một vai trò then chốt trong việc thanh toán bệnh đậu mùa.',
            context: 'Academic'
          }
        ],
        collocations: ['play a pivotal role in', 'a pivotal role in shaping', 'assume a pivotal role'],
        synonyms: [
          { word: 'crucial role', nuance: 'vai trò tối quan trọng' },
          { word: 'instrumental role', nuance: 'đóng vai trò phương tiện quyết định' },
          { word: 'cornerstone', nuance: 'viên đá tảng nền móng' }
        ],
        antonyms: ['marginal role', 'minor function', 'peripheral role'],
        mnemonic: 'Pivot (trục quay trung tâm) -> Pivotal Role: Trục chính để toàn bộ hệ thống xoay quanh.',
        imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&auto=format&fit=crop&q=80',
        cefrLevel: 'C1',
        topicDeck: 'High-Impact Collocations',
        originModule: 'curated_deck',
        srsStage: 0,
        intervalDays: 1,
        nextReviewDate: new Date().toISOString(),
        easeFactor: 2.5,
        repetitions: 0,
        mastered: false,
      },
      {
        id: 'cur_col_3',
        word: 'strike a balance',
        phonetic: '/straɪk ə ˈbæl.əns/',
        ukPhonetic: '/straɪk ə ˈbæl.əns/',
        usPhonetic: '/straɪk ə ˈbæl.əns/',
        pos: 'phrase',
        definitionVi: 'thiết lập sự cân bằng hài hòa giữa hai yếu tố đối lập',
        definitionEn: 'find a compromise between two conflicting things',
        definitionAcademicEn: 'To attain an equitable equilibrium or viable compromise between divergent interests or systemic priorities.',
        exampleEn: 'Urban development policies must strike a balance between economic expansion and historic conservation.',
        exampleVi: 'Các chính sách phát triển đô thị phải thiết lập sự cân bằng hài hòa giữa tăng trưởng kinh tế và bảo tồn lịch sử.',
        examples: [
          {
            en: 'Urban development policies must strike a balance between economic expansion and historic conservation.',
            vi: 'Các chính sách phát triển đô thị phải thiết lập sự cân bằng hài hòa giữa tăng trưởng kinh tế và bảo tồn lịch sử.',
            context: 'IELTS Task 2'
          },
          {
            en: 'Working professionals often struggle to strike a healthy balance between career ambitions and family life.',
            vi: 'Những người đi làm thường chật vật để đạt được sự cân bằng lành mạnh giữa hoài bão sự nghiệp và cuộc sống gia đình.',
            context: 'Speaking'
          }
        ],
        collocations: ['strike a balance between', 'strike a delicate balance', 'seek to strike a balance'],
        synonyms: [
          { word: 'reconcile competing demands', nuance: 'hòa giải các nhu cầu xung đột' },
          { word: 'achieve equilibrium', nuance: 'đạt tới trạng thái thăng bằng' }
        ],
        antonyms: ['tip the scales', 'create an imbalance'],
        mnemonic: 'Strike (gõ nhẹ điều chỉnh) + Balance (cán cân) = Điều chỉnh để cán cân giữ thăng bằng chuẩn mực.',
        imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&auto=format&fit=crop&q=80',
        cefrLevel: 'C1',
        topicDeck: 'High-Impact Collocations',
        originModule: 'curated_deck',
        srsStage: 0,
        intervalDays: 1,
        nextReviewDate: new Date().toISOString(),
        easeFactor: 2.5,
        repetitions: 0,
        mastered: false,
      },
      {
        id: 'cur_col_4',
        word: 'cast doubt on',
        phonetic: '/kɑːst daʊt ɒn/',
        ukPhonetic: '/kɑːst daʊt ɒn/',
        usPhonetic: '/kæst daʊt ɑːn/',
        pos: 'phrase',
        definitionVi: 'dấy lên mối nghi ngờ, làm lung lay độ tin cậy',
        definitionEn: 'make something seem uncertain, unreliable, or questionable',
        definitionAcademicEn: 'To introduce skepticism or empirical counter-evidence regarding the veracity of an accepted premise.',
        exampleEn: 'Recent empirical findings cast doubt on the long-term viability of austerity economics.',
        exampleVi: 'Những phát hiện thực nghiệm gần đây đã dấy lên mối nghi ngờ về tính khả thi lâu dài của chính sách kinh tế thắt lưng buộc bụng.',
        examples: [
          {
            en: 'Recent empirical findings cast doubt on the long-term viability of austerity economics.',
            vi: 'Những phát hiện thực nghiệm gần đây đã dấy lên mối nghi ngờ về tính khả thi lâu dài của chính sách kinh tế thắt lưng buộc bụng.',
            context: 'IELTS Task 2'
          },
          {
            en: 'Inconsistencies in the witness testimony cast serious doubt on the initial police report.',
            vi: 'Những điểm mâu thuẫn trong lời khai nhân chứng đã làm dấy lên sự hoài nghi nghiêm trọng về báo cáo ban đầu của cảnh sát.',
            context: 'Academic'
          }
        ],
        collocations: ['cast serious doubt on', 'cast doubt upon the validity of', 'serve to cast doubt'],
        synonyms: [
          { word: 'call into question', nuance: 'đặt câu hỏi chất vấn' },
          { word: 'undermine the credibility of', nuance: 'làm suy yếu độ tin cậy' }
        ],
        antonyms: ['corroborate', 'reaffirm', 'reinforce'],
        mnemonic: 'Cast (quăng/ném) + Doubt (sự nghi ngờ) = Ném cái bóng nghi ngờ phủ lên điều gì đó.',
        imageUrl: 'https://images.unsplash.com/photo-1453728013993-6d66e9c9123a?w=400&auto=format&fit=crop&q=80',
        cefrLevel: 'C1',
        topicDeck: 'High-Impact Collocations',
        originModule: 'curated_deck',
        srsStage: 0,
        intervalDays: 1,
        nextReviewDate: new Date().toISOString(),
        easeFactor: 2.5,
        repetitions: 0,
        mastered: false,
      },
      {
        id: 'cur_col_5',
        word: 'give rise to',
        phonetic: '/ɡɪv raɪz tuː/',
        ukPhonetic: '/ɡɪv raɪz tuː/',
        usPhonetic: '/ɡɪv raɪz tuː/',
        pos: 'phrase',
        definitionVi: 'làm nảy sinh, là nguyên nhân dẫn đến',
        definitionEn: 'cause something to happen, exist, or develop',
        definitionAcademicEn: 'To serve as the primary catalyst or causal agent precipitating a subsequent phenomenon.',
        exampleEn: 'Unchecked social media algorithms have given rise to widespread political polarization.',
        exampleVi: 'Các thuật toán mạng xã hội không được kiểm soát đã làm nảy sinh sự phân cực chính trị sâu rộng.',
        examples: [
          {
            en: 'Unchecked social media algorithms have given rise to widespread political polarization.',
            vi: 'Các thuật toán mạng xã hội không được kiểm soát đã làm nảy sinh sự phân cực chính trị sâu rộng.',
            context: 'IELTS Task 2'
          },
          {
            en: 'Severe economic disparity inevitably gives rise to social unrest and disaffection.',
            vi: 'Sự chênh lệch kinh tế trầm trọng tất yếu sẽ làm nảy sinh bất ổn xã hội và sự bất mãn.',
            context: 'Academic'
          }
        ],
        collocations: ['give rise to concerns', 'give rise to speculation', 'give rise to conflict'],
        synonyms: [
          { word: 'precipitate', nuance: 'thúc đẩy xảy ra nhanh chóng' },
          { word: 'engender', nuance: 'sinh ra phát sinh từ bên trong' },
          { word: 'bring about', nuance: 'mang lại gây ra' }
        ],
        antonyms: ['prevent', 'preclude', 'curb'],
        mnemonic: 'Give (cho) + Rise (vươn lên) = Tạo điều kiện để một vấn đề mới mọc lên.',
        imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400&auto=format&fit=crop&q=80',
        cefrLevel: 'C1',
        topicDeck: 'High-Impact Collocations',
        originModule: 'curated_deck',
        srsStage: 0,
        intervalDays: 1,
        nextReviewDate: new Date().toISOString(),
        easeFactor: 2.5,
        repetitions: 0,
        mastered: false,
      }
    ]
  }
];
