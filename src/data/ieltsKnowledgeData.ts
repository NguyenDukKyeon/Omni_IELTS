import {
  SkillStrategyTopic,
  AnnotatedModelAnswer,
  CommonPitfallTrap,
  BandConversionItem,
} from '../types';

// ============================================================================
// 1. RAW SCORE TO BAND CONVERSION DATA
// ============================================================================
export const LISTENING_BAND_CONVERSION: BandConversionItem[] = [
  { rawScoreRange: '39 - 40', bandScore: 9.0, skill: 'listening', cefrLevel: 'C2', competencyDescription: 'Chuyên gia (Expert User) - Nghe hiểu hoàn toàn mọi chi tiết và ẩn ý.' },
  { rawScoreRange: '37 - 38', bandScore: 8.5, skill: 'listening', cefrLevel: 'C2', competencyDescription: 'Rất tốt (Very Good User) - Xử lý thông tin phức tạp chính xác tuyệt đối.' },
  { rawScoreRange: '35 - 36', bandScore: 8.0, skill: 'listening', cefrLevel: 'C1', competencyDescription: 'Rất tốt (Very Good User) - Nắm bắt mạch lập luận và chi tiết tinh vi.' },
  { rawScoreRange: '32 - 34', bandScore: 7.5, skill: 'listening', cefrLevel: 'C1', competencyDescription: 'Tốt (Good User) - Bắt kịp bài giảng học thuật và hội thoại nhanh.' },
  { rawScoreRange: '30 - 31', bandScore: 7.0, skill: 'listening', cefrLevel: 'C1', competencyDescription: 'Tốt (Good User) - Hiểu rõ ý chính và phần lớn chi tiết cụ thể.' },
  { rawScoreRange: '26 - 29', bandScore: 6.5, skill: 'listening', cefrLevel: 'B2', competencyDescription: 'Khá (Competent User) - Nắm được ý chính nhưng có thể lỡ bẫy đổi ý.' },
  { rawScoreRange: '23 - 25', bandScore: 6.0, skill: 'listening', cefrLevel: 'B2', competencyDescription: 'Khá (Competent User) - Hiểu hội thoại thường nhật và bài giảng cơ bản.' },
  { rawScoreRange: '18 - 22', bandScore: 5.5, skill: 'listening', cefrLevel: 'B2', competencyDescription: 'Trung bình khá (Modest User) - Dễ bị lạc nhịp ở Section 3 & 4.' },
  { rawScoreRange: '16 - 17', bandScore: 5.0, skill: 'listening', cefrLevel: 'B1', competencyDescription: 'Trung bình (Modest User) - Chỉ nghe được thông tin trực tiếp, rõ ràng.' },
  { rawScoreRange: '13 - 15', bandScore: 4.5, skill: 'listening', cefrLevel: 'B1', competencyDescription: 'Hạn chế (Limited User) - Nghe ngắt quãng ở các câu đơn giản.' },
  { rawScoreRange: '10 - 12', bandScore: 4.0, skill: 'listening', cefrLevel: 'B1', competencyDescription: 'Hạn chế (Limited User) - Khó khăn với bài nghe học thuật.' },
];

export const READING_ACADEMIC_BAND_CONVERSION: BandConversionItem[] = [
  { rawScoreRange: '39 - 40', bandScore: 9.0, skill: 'reading_academic', cefrLevel: 'C2', competencyDescription: 'Đọc hiểu sâu sắc các bài báo khoa học và luận thuyết phức tạp.' },
  { rawScoreRange: '37 - 38', bandScore: 8.5, skill: 'reading_academic', cefrLevel: 'C2', competencyDescription: 'Phân tích nhanh cấu trúc văn bản học thuật và suy luận sắc bén.' },
  { rawScoreRange: '35 - 36', bandScore: 8.0, skill: 'reading_academic', cefrLevel: 'C1', competencyDescription: 'Nắm chắc ngữ nghĩa tinh vi, từ vựng C1/C2 và hàm ý tác giả.' },
  { rawScoreRange: '33 - 34', bandScore: 7.5, skill: 'reading_academic', cefrLevel: 'C1', competencyDescription: 'Xử lý tốt bài đọc dài, ít bị bẫy Not Given và Matching Headings.' },
  { rawScoreRange: '30 - 32', bandScore: 7.0, skill: 'reading_academic', cefrLevel: 'C1', competencyDescription: 'Hiểu các luận điểm học thuật và thông tin chi tiết chính xác.' },
  { rawScoreRange: '27 - 29', bandScore: 6.5, skill: 'reading_academic', cefrLevel: 'B2', competencyDescription: 'Đọc tốt Passage 1 & 2, gặp trở ngại về từ vựng ở Passage 3.' },
  { rawScoreRange: '23 - 26', bandScore: 6.0, skill: 'reading_academic', cefrLevel: 'B2', competencyDescription: 'Nắm được ý chính nhưng tốc độ đọc còn chậm, hay bị áp lực thời gian.' },
  { rawScoreRange: '19 - 22', bandScore: 5.5, skill: 'reading_academic', cefrLevel: 'B2', competencyDescription: 'Hiểu các đoạn văn miêu tả thực tế, bối rối trước văn bản trừu tượng.' },
  { rawScoreRange: '15 - 18', bandScore: 5.0, skill: 'reading_academic', cefrLevel: 'B1', competencyDescription: 'Chỉ giải quyết được câu hỏi mức độ cơ bản trong Passage 1.' },
  { rawScoreRange: '13 - 14', bandScore: 4.5, skill: 'reading_academic', cefrLevel: 'B1', competencyDescription: 'Hạn chế về vốn từ học thuật (Academic Word List).' },
  { rawScoreRange: '10 - 12', bandScore: 4.0, skill: 'reading_academic', cefrLevel: 'B1', competencyDescription: 'Gặp khó khăn lớn trong việc hiểu mạch logic đoạn văn.' },
];

export const READING_GENERAL_BAND_CONVERSION: BandConversionItem[] = [
  { rawScoreRange: '40', bandScore: 9.0, skill: 'reading_general', cefrLevel: 'C2', competencyDescription: 'Chính xác tuyệt đối toàn bộ bài đọc đời sống & công sở.' },
  { rawScoreRange: '39', bandScore: 8.5, skill: 'reading_general', cefrLevel: 'C2', competencyDescription: 'Xử lý hoàn hảo các hướng dẫn, tài liệu đào tạo và bài đọc dài.' },
  { rawScoreRange: '37 - 38', bandScore: 8.0, skill: 'reading_general', cefrLevel: 'C1', competencyDescription: 'Khả năng quét thông tin (Scanning) cực nhanh và chuẩn.' },
  { rawScoreRange: '36', bandScore: 7.5, skill: 'reading_general', cefrLevel: 'C1', competencyDescription: 'Nắm vững các văn bản thực tế trong môi trường làm việc quốc tế.' },
  { rawScoreRange: '34 - 35', bandScore: 7.0, skill: 'reading_general', cefrLevel: 'C1', competencyDescription: 'Hiểu các bài báo phổ thông và tài liệu hợp đồng lao động.' },
  { rawScoreRange: '32 - 33', bandScore: 6.5, skill: 'reading_general', cefrLevel: 'B2', competencyDescription: 'Thang điểm GT yêu cầu số câu đúng cao hơn AC (32 câu = 6.5).' },
  { rawScoreRange: '30 - 31', bandScore: 6.0, skill: 'reading_general', cefrLevel: 'B2', competencyDescription: 'Hiểu tốt Section 1 & 2, làm tốt phần lớn Section 3.' },
  { rawScoreRange: '27 - 29', bandScore: 5.5, skill: 'reading_general', cefrLevel: 'B2', competencyDescription: 'Đọc hiểu cơ bản các thông báo, tờ rơi và quy tắc cơ quan.' },
  { rawScoreRange: '23 - 26', bandScore: 5.0, skill: 'reading_general', cefrLevel: 'B1', competencyDescription: 'Nắm được các thông tin thực tế đơn giản.' },
];

// ============================================================================
// 2. ACADEMIC VS GENERAL TRAINING COMPARISON MATRIX
// ============================================================================
export interface ExamComparisonRow {
  aspect: string;
  academic: string;
  generalTraining: string;
  strategicNoteVi: string;
}

export const ACADEMIC_VS_GENERAL_COMPARISON: ExamComparisonRow[] = [
  {
    aspect: 'Mục đích sử dụng',
    academic: 'Dành cho du học đại học/sau đại học, chứng chỉ hành nghề chuyên môn (Y, Dược, Luật) hoặc giảng dạy.',
    generalTraining: 'Dành cho định cư (Canada Express Entry, Úc, New Zealand), xuất khẩu lao động hoặc học nghề.',
    strategicNoteVi: 'Chứng chỉ Academic được chấp nhận rộng rãi hơn cho mục đích học thuật, trong khi GT thường dễ đạt điểm hơn ở phần đọc nhưng đòi hỏi số câu đúng cao hơn.',
  },
  {
    aspect: 'Kỹ năng Listening & Speaking',
    academic: 'Giống nhau 100% (cùng đề thi, cùng thời gian, cùng tiêu chí chấm).',
    generalTraining: 'Giống nhau 100% (cùng đề thi, cùng thời gian, cùng tiêu chí chấm).',
    strategicNoteVi: 'Thí sinh 2 hệ hoàn toàn có thể ôn luyện Listening và Speaking cùng nhau mà không có sự khác biệt.',
  },
  {
    aspect: 'Reading (Đọc hiểu)',
    academic: 'Gồm 3 bài báo dài học thuật (Passage 1, 2, 3) trích từ tạp chí khoa học, nghiên cứu, sách chuyên ngành.',
    generalTraining: 'Gồm 3 Section: Section 1 (đời sống hằng ngày: tờ rơi, quảng cáo), Section 2 (môi trường công sở: hợp đồng, đào tạo), Section 3 (văn bản học thuật/báo chí phổ thông).',
    strategicNoteVi: 'Reading GT dễ đọc hiểu hơn nhưng thang điểm khắt khe hơn: để đạt 7.0 GT cần 34-35 câu, trong khi AC chỉ cần 30-32 câu.',
  },
  {
    aspect: 'Writing Task 1 (20 phút)',
    academic: 'Miêu tả biểu đồ số liệu (Line, Bar, Pie, Table), quy trình (Process) hoặc bản đồ (Map). Yêu cầu văn phong khách quan, học thuật.',
    generalTraining: 'Viết một bức thư (Letter) trang trọng (Formal), bán trang trọng (Semi-formal) hoặc thân mật (Informal) giải quyết tình huống thực tế.',
    strategicNoteVi: 'Writing Task 1 GT cần chú ý đúng văn phong (Formal vs Informal) và chào kết chuẩn, trong khi AC bắt buộc phải có câu Overview tổng quát.',
  },
  {
    aspect: 'Writing Task 2 (40 phút)',
    academic: 'Tiểu luận nghị luận học thuật 250 từ về các chủ đề xã hội, môi trường, công nghệ, giáo dục mang tính trừu tượng cao.',
    generalTraining: 'Tiểu luận xã hội 250 từ, chủ đề thường gần gũi với đời sống hằng ngày hơn nhưng cấu trúc và tiêu chí chấm tương đồng.',
    strategicNoteVi: 'Cả hai hệ đều chấm theo 4 tiêu chí: Task Response (TR), Coherence & Cohesion (CC), Lexical Resource (LR), Grammatical Range & Accuracy (GRA).',
  },
];

// ============================================================================
// 3. SKILL STRATEGY TOPICS (CHIẾN LƯỢC TỪNG DẠNG BÀI)
// ============================================================================
export const SKILL_STRATEGY_TOPICS: SkillStrategyTopic[] = [
  // --------------------------------------------------------------------------
  // READING 1: MATCHING HEADINGS
  // --------------------------------------------------------------------------
  {
    id: 'strategy_reading_matching_headings',
    skill: 'reading',
    categoryTitleVi: 'Chiến Thuật Reading',
    title: 'Tuyệt Kỹ Matching Headings: Giải Mã Ý Chính, Thoát Bẫy Từ Khóa',
    subtitle: 'Phương pháp phân tích câu chủ đề (Topic Sentence) và loại trừ tiêu đề giả trong 90 giây/đoạn.',
    readTimeMinutes: 8,
    difficultyLevel: 'Advanced (7.0 - 8.0)',
    corePrinciples: [
      'Matching Headings là dạng bài kiểm tra khả năng tóm tắt ý chính của đoạn (Gist/Main Idea), KHÔNG PHẢI tìm kiếm chi tiết (Specific Detail).',
      'Bẫy phổ biến nhất: Tiêu đề chứa từ ngữ y hệt trong bài nhưng chỉ là một ví dụ phụ hoặc một luận cứ nhỏ (Detail Trap).',
      'Luôn có nhiều tiêu đề hơn số đoạn văn (thường 7-8 tiêu đề cho 5 đoạn). Ít nhất 2-3 tiêu đề là "bẫy phân tâm" (Distractors).',
    ],
    stepByStepMethod: [
      {
        stepNumber: 1,
        stepTitle: 'Đọc lướt danh sách Headings và gạch chân từ khóa phân biệt',
        actionVi: 'Đọc qua toàn bộ headings để nắm bức tranh tổng thể. Gạch chân từ khóa thể hiện "trọng tâm" (ví dụ: reasons, solutions, historical overview, negative impacts).',
        exampleOrCaveat: 'Lưu ý sự khác nhau giữa số ít và số nhiều (e.g. "The reason" vs "Various factors").',
      },
      {
        stepNumber: 2,
        stepTitle: 'Gạch bỏ tiêu đề ví dụ (Example Heading)',
        actionVi: 'Nếu đề bài đã làm mẫu một đoạn (ví dụ Paragraph A = heading iv), gạch bỏ ngay tiêu đề đó khỏi danh sách để tránh nhìn lại.',
      },
      {
        stepNumber: 3,
        stepTitle: 'Đọc 1-2 câu đầu và câu cuối của đoạn văn (Skim for Topic & Clincher)',
        actionVi: '70% các đoạn văn học thuật đặt câu chủ đề ở câu 1 hoặc 2. Hãy chú ý các từ chuyển tiếp then chốt như: "However", "In contrast", "Consequently", "Ultimately".',
        exampleOrCaveat: 'Nếu câu 1 chỉ là câu mở màn chung chung ("Many people believe..."), câu chủ đề thực sự thường nằm ở câu 2 ("However, recent research reveals...").',
      },
      {
        stepNumber: 4,
        stepTitle: 'Tự tóm tắt ý đoạn bằng 1 câu ngắn trong đầu trước khi nhìn Headings',
        actionVi: 'Tự hỏi: "Đoạn này đang nói về cái gì chính?". Sau đó mới so sánh với danh sách Headings để chọn đáp án tương đương về mặt ý nghĩa (Paraphrased Meaning).',
      },
      {
        stepNumber: 5,
        stepTitle: 'Phương pháp loại trừ đối với các đoạn khó',
        actionVi: 'Nếu phân vân giữa 2 tiêu đề: Hãy kiểm tra xem tiêu đề nào bao quát TOÀN ĐOẠN, tiêu đề nào chỉ bao quát 1 CÂU trong đoạn. Chọn tiêu đề bao quát toàn đoạn.',
      },
    ],
    proTactics: [
      'Nên làm dạng bài Matching Headings ĐẦU TIÊN khi giải một Passage. Vì khi làm xong Matching Headings, bạn đã nắm toàn bộ cấu trúc bài đọc, giúp các dạng bài chi tiết sau đó (True/False, Gap Fill) tìm vị trí cực nhanh!',
      'Cảnh giác với các tiêu đề "Quá rộng" (Too broad) hoặc "Quá hẹp" (Too narrow). Tiêu đề chuẩn phải vừa vặn với nội dung đoạn văn.',
    ],
    trapAlerts: [
      'BẪY MATCHING TỪ VỰNG: Thấy từ "climate change" xuất hiện ở dòng 3 liền chọn ngay heading có chữ "climate change" mà không đọc ngữ cảnh. Trong IELTS, heading đúng thường dùng TỪ ĐỒNG NGHĨA (Paraphrase), không dùng nguyên từ vựng!',
    ],
    practicalApplicationMarkdown: `### Ví dụ thực tế từ bài đọc Cambridge:
> **Đoạn trích:** "While traditional farming relies heavily on fertile soil and predictable rainfall, urban vertical farming utilizes aeroponic technology to suspend plants in mist within climate-controlled warehouses. This not only eliminates the need for chemical pesticides but also reduces water consumption by up to 95% compared to conventional agriculture."

- **Heading A (BẪY CHI TIẾT):** *The reduction of water usage in modern cities* (Chỉ là 1 chi tiết nhỏ ở cuối câu).
- **Heading B (ĐÁP ÁN ĐÚNG):** *An innovative agricultural method and its environmental advantages* (Bao quát cả công nghệ vertical farming và lợi ích giảm nước/hóa chất).`,
    strategyQuiz: [
      {
        id: 'quiz_mh_1',
        scenario: 'Bạn đang làm Passage 2 có 3 dạng câu hỏi: Matching Headings (Q14-19), True/False/Not Given (Q20-23), và Summary Completion (Q24-26).',
        question: 'Thứ tự làm bài nào là chiến lược tối ưu nhất để tiết kiệm thời gian?',
        options: [
          'A. Làm Summary Completion trước vì dễ nhất, rồi đến T/F/NG, cuối cùng mới làm Matching Headings.',
          'B. Làm Matching Headings đầu tiên vì nó giúp đọc hiểu cấu trúc toàn bài, sau đó các câu chi tiết sẽ định vị nhanh hơn.',
          'C. Làm theo đúng thứ tự từ trên xuống dưới không cần tính toán.',
          'D. Đọc hết toàn bộ bài văn 1 lần 15 phút rồi mới bắt đầu làm bài.',
        ],
        correctIndex: 1,
        explanationVi: 'Làm Matching Headings trước giúp bạn đọc lướt qua toàn bộ các đoạn văn và nắm được bản đồ vị trí ý của bài đọc. Khi chuyển sang làm True/False hay Summary, bạn sẽ biết ngay thông tin đó nằm ở đoạn nào mà không mất công tìm lại từ đầu.',
        keyTakeaway: 'Matching Headings là "bản đồ quy hoạch" của bài đọc. Làm trước sẽ mở đường cho các dạng bài sau.',
      },
      {
        id: 'quiz_mh_2',
        scenario: 'Đoạn văn bắt đầu bằng: "For decades, economists assumed that increased GDP automatically guarantees higher citizen happiness. However, groundbreaking surveys across 40 nations indicate that psychological well-being plateaus once basic needs are met."',
        question: 'Ý chính của đoạn văn này nằm ở đâu?',
        options: [
          'A. Ở câu đầu tiên: GDP luôn đảm bảo hạnh phúc của người dân.',
          'B. Ở câu thứ hai sau từ "However": Hạnh phúc không tăng vô hạn theo GDP mà đạt điểm bão hòa.',
          'C. Đoạn văn chỉ nói về lịch sử kinh tế các thập kỷ trước.',
          'D. Cần đọc hết 10 câu tiếp theo mới xác định được.',
        ],
        correctIndex: 1,
        explanationVi: 'Khi câu đầu tiên bắt đầu bằng một quan niệm cũ/truyền thống ("assumed", "believed") và câu thứ hai có từ tương phản ("However", "Yet", "Nevertheless"), thì luận điểm chính thực sự của tác giả luôn nằm ở câu thứ hai!',
        keyTakeaway: 'Từ nối tương phản (However, Yet, In reality) là kim chỉ nam báo hiệu câu chủ đề thực sự.',
      },
      {
        id: 'quiz_mh_3',
        scenario: 'Bạn phân vân giữa Heading X (chứa từ khóa y hệt dòng 2 của bài) và Heading Y (sử dụng từ đồng nghĩa C1 khái quát toàn đoạn).',
        question: 'Dựa trên nguyên tắc khảo thí của Cambridge, bạn nên chọn đáp án nào?',
        options: [
          'A. Heading X vì Cambridge thích độ chính xác từng chữ.',
          'B. Heading Y vì IELTS kiểm tra khả năng hiểu bản chất ý nghĩa qua Paraphrase, trong khi từ giống hệt thường là bẫy phân tâm (Word-spotting Trap).',
          'C. Chọn heading dài hơn về số lượng từ.',
          'D. Bỏ trống câu này để làm sau.',
        ],
        correctIndex: 1,
        explanationVi: 'Giám khảo Cambridge thiết kế các câu hỏi Matching Headings để trừng phạt thói quen "Word-spotting" (tìm chữ giống nhau). Tiêu đề đúng hầu như luôn được diễn đạt lại bằng từ đồng nghĩa và cấu trúc khái quát.',
        keyTakeaway: 'Từ ngữ giống y hệt trong danh sách Headings thường là bẫy chi tiết. Hãy tìm sự tương đồng về Ý NGHĨA.',
      },
    ],
  },

  // --------------------------------------------------------------------------
  // READING 2: TRUE / FALSE / NOT GIVEN & YES / NO / NOT GIVEN
  // --------------------------------------------------------------------------
  {
    id: 'strategy_reading_tfng_mastery',
    skill: 'reading',
    categoryTitleVi: 'Chiến Thuật Reading',
    title: 'Phá Bẫy True / False / Not Given & Yes / No / Not Given',
    subtitle: 'Quy tắc tam giác vàng phân định ranh giới giữa False (Sai tuyệt đối) và Not Given (Không đủ căn cứ).',
    readTimeMinutes: 7,
    difficultyLevel: 'Foundation (5.0 - 6.5)',
    corePrinciples: [
      'TRUE / YES: Thông tin trong nhận định HOÀN TOÀN TRÙNG KHỚP với nội dung và sắc thái trong bài đọc.',
      'FALSE / NO: Thông tin trong nhận định TRÁI NGƯỢC HOẶC PHỦ ĐỊNH TRỰC TIẾP với thông tin trong bài đọc (Nếu thông tin trong bài là A thì nhận định khẳng định là B đối lập hoàn toàn).',
      'NOT GIVEN: Bài đọc KHÔNG CÓ ĐỦ THÔNG TIN để xác nhận nhận định đó là Đúng hay Sai. Dù ngoài đời thực điều đó có thể đúng nhưng bài đọc không đề cập thì vẫn là NOT GIVEN.',
      'Sự khác biệt: TRUE/FALSE/NOT GIVEN dùng cho bài đọc dựa trên SỰ THẬT KHÁCH QUAN (Facts). YES/NO/NOT GIVEN dùng cho bài đọc trình bày QUAN ĐIỂM/Ý KIẾN CỦA TÁC GIẢ (Writer\'s Views/Claims).',
    ],
    stepByStepMethod: [
      {
        stepNumber: 1,
        stepTitle: 'Xác định từ khóa định vị (Locating Keywords) và từ khóa giới hạn (Limiting Keywords)',
        actionVi: 'Locating Keywords: Tên riêng, năm, thuật ngữ khó thay đổi (dùng để tìm vị trí đoạn văn). Limiting Keywords: Các từ định lượng/phẩm chất (all, only, always, probably, major, recent) - đây chính là nơi quyết định True/False/Not Given!',
      },
      {
        stepNumber: 2,
        stepTitle: 'Định vị đoạn văn chứa thông tin và đọc toàn bộ 2-3 câu liên quan',
        actionVi: 'Không bao giờ chỉ đọc đúng 1 câu chứa từ khóa. Hãy đọc cả câu trước và câu sau để không bỏ sót các từ phủ định hoặc điều kiện (unless, despite, provided that).',
      },
      {
        stepNumber: 3,
        stepTitle: 'Áp dụng bài kiểm tra "Phủ Định Đối Nghịch" (The Contradiction Test)',
        actionVi: 'Tự hỏi: "Nếu câu đề bài là FALSE, thì bài đọc có chứng minh điều ngược lại một cách rõ ràng không?". Nếu bài đọc nói ngược lại -> FALSE. Nếu bạn không thể tìm ra bằng chứng chứng minh ngược lại mà chỉ là bài đọc không nói tới -> NOT GIVEN.',
      },
    ],
    proTactics: [
      'Các câu hỏi T/F/NG luôn xuất hiện THEO THỨ TỰ THỜI GIAN (Sequential Order) trong bài đọc. Nếu câu 1 ở dòng 5, câu 3 ở dòng 20, thì câu 2 CHẮC CHẮN nằm giữa dòng 5 và 20.',
      'Nếu bạn tìm kiếm thông tin cho một câu mãi không thấy nằm giữa 2 câu đã tìm được, khả năng rất cao câu đó là NOT GIVEN.',
    ],
    trapAlerts: [
      'BẪY SUY DIỄN NGOÀI ĐỜI (Real-world Assumption Trap): Không bao giờ dùng kiến thức phổ thông của bản thân để trả lời. Ví dụ bài đọc chỉ viết "Hút thuốc lá làm tăng nguy cơ ung thư phổi", câu hỏi viết "Hút thuốc lá là nguyên nhân duy nhất gây ung thư" -> Đáp án là FALSE (do từ "duy nhất"), không thể vì thấy hút thuốc độc hại ngoài đời mà chọn TRUE.',
      'BẪY TUYỆT ĐỐI HÓA (Absolute Qualifiers): Các từ như "always, only, impossible, entirely" trong câu hỏi rất dễ biến câu thành FALSE nếu bài đọc chỉ dùng từ mềm mỏng như "often, some, usually".',
    ],
    practicalApplicationMarkdown: `### Bảng Ma Trận Phân Biệt Thực Tế:

| Nội dung trong bài đọc | Câu hỏi trong đề thi | Đáp án | Lý do giải thích |
| :--- | :--- | :---: | :--- |
| *The university was founded in 1920 by John Smith.* | *John Smith established the university in the early 20th century.* | **TRUE** | 1920 chính là early 20th century, founded = established. |
| *The new solar panels operate at 25% efficiency in winter.* | *The solar panels work at peak efficiency during cold months.* | **FALSE** | Bài đọc nói 25%, đề bài khẳng định là "peak" (đỉnh cao) -> Trực tiếp mâu thuẫn. |
| *Scientists discovered a new species of frog in the Amazon.* | *The new frog species is endangered due to deforestation.* | **NOT GIVEN** | Bài đọc chỉ nói mới phát hiện, KHÔNG hề đề cập loài ếch này có bị nguy cấp hay không. |`,
    strategyQuiz: [
      {
        id: 'quiz_tfng_1',
        scenario: 'Bài đọc viết: "Many marine species migrate thousands of miles annually to breed in warmer equatorial waters."',
        question: 'Câu hỏi trong đề: "All marine creatures migrate during the winter season." -> Đáp án là gì?',
        options: [
          'A. TRUE',
          'B. FALSE',
          'C. NOT GIVEN',
          'D. YES',
        ],
        correctIndex: 1,
        explanationVi: 'Bài đọc nói "Many marine species" (Nhiều loài), trong khi câu hỏi khẳng định "All marine creatures" (Tất cả sinh vật biển). Từ "All" tạo ra sự mâu thuẫn trực tiếp với từ "Many" -> Đáp án chính xác là FALSE.',
        keyTakeaway: 'Chú ý các từ hạn định số lượng: "Many" khác hoàn toàn với "All".',
      },
      {
        id: 'quiz_tfng_2',
        scenario: 'Bài đọc viết: "The electric vehicle was introduced to the European market in 2021 and received mixed reviews from automotive journalists."',
        question: 'Câu hỏi trong đề: "The electric vehicle was more expensive than conventional gasoline cars." -> Đáp án là gì?',
        options: [
          'A. TRUE',
          'B. FALSE',
          'C. NOT GIVEN',
          'D. NO',
        ],
        correctIndex: 2,
        explanationVi: 'Bài đọc chỉ nhắc đến thời điểm ra mắt (2021) và đánh giá của nhà báo (mixed reviews), hoàn toàn KHÔNG hề so sánh giá tiền giữa xe điện và xe xăng. Ta không có căn cứ kết luận đắt hơn hay rẻ hơn -> Đáp án là NOT GIVEN.',
        keyTakeaway: 'Nếu bài đọc không cung cấp căn cứ để xác nhận đúng hay sai, tuyệt đối không tự suy đoán, đó là NOT GIVEN.',
      },
    ],
  },

  // --------------------------------------------------------------------------
  // READING 3: TIME MANAGEMENT (15 - 20 - 25 RULE)
  // --------------------------------------------------------------------------
  {
    id: 'strategy_reading_time_management',
    skill: 'reading',
    categoryTitleVi: 'Chiến Thuật Reading',
    title: 'Quy Tắc Quản Lý Thời Gian Vàng 15 - 20 - 25 Phút',
    subtitle: 'Nghệ thuật phân bổ 60 phút cho 3 Passage để tối ưu hóa từng 0.5 Band điểm.',
    readTimeMinutes: 6,
    difficultyLevel: 'Foundation (5.0 - 6.5)',
    corePrinciples: [
      'Độ khó của 3 Passage trong bài thi IELTS Reading tăng dần theo cấp số cộng: Passage 1 (Dễ nhất) -> Passage 2 (Trung bình) -> Passage 3 (Khó và trừu tượng nhất).',
      'Sai lầm chết người của 80% thí sinh: Chia đều 20 phút - 20 phút - 20 phút. Hậu quả là làm Passage 1 quá thong thả, đến Passage 3 không đủ thời gian đọc và phải "khoanh bừa" 10-13 câu cuối.',
      'Quy tắc Vàng 15 - 20 - 25: Passage 1 tối đa 15 phút, Passage 2 tối đa 20 phút, Passage 3 dành trọn vẹn 25 phút.',
    ],
    stepByStepMethod: [
      {
        stepNumber: 1,
        stepTitle: 'Passage 1 (Phút 0 - Phút 15): Tốc độ và chính xác tuyệt đối',
        actionVi: 'Passage 1 thường là dạng miêu tả thực tế, từ vựng rõ ràng, câu hỏi đi theo thứ tự. Mục tiêu: Đúng 12-13/13 câu trong 15 phút. Không dừng lại quá 60 giây ở bất kỳ câu nào.',
      },
      {
        stepNumber: 2,
        stepTitle: 'Passage 2 (Phút 15 - Phút 35): Xử lý dạng bài phân tích',
        actionVi: 'Passage 2 thường có các dạng bài như Matching Information, Matching Features. Sử dụng kỹ thuật quét từ khóa (Scanning) song song 2 câu hỏi cùng lúc.',
      },
      {
        stepNumber: 3,
        stepTitle: 'Passage 3 (Phút 35 - Phút 60): Giải mã văn bản trừu tượng & rà soát',
        actionVi: 'Passage 3 đòi hỏi đọc hiểu sâu sắc và suy luận (Yes/No/Not Given, Multiple Choice khó). Với 25 phút trong tay, bạn có đủ sự tỉnh táo và bình tĩnh để phân tích kỹ lưỡng.',
      },
    ],
    proTactics: [
      'Chiến thuật "Bỏ con săn sắt, bắt con cá rô": Nếu một câu hỏi mất hơn 90 giây mà chưa tìm thấy thông tin, hãy đánh dấu lại, chọn một đáp án khả dĩ nhất và ĐI TIẾP. Mỗi câu hỏi chỉ có giá trị 1 điểm như nhau, không để câu khó làm mất thời gian của 3 câu dễ phía sau!',
      'Trên máy tính (CD-IELTS), hãy tận dụng chức năng "Review" và đổi màu câu hỏi để quay lại rà soát trong 2 phút cuối.',
    ],
    trapAlerts: [
      'Bẫy "Sa lầy": Cố chấp ngồi đọc đi đọc lại 1 đoạn văn trong 4 phút chỉ để tìm đáp án cho 1 câu hỏi True/False duy nhất.',
    ],
    practicalApplicationMarkdown: `### Bảng Phân Bổ Nhịp Độ Làm Bài:

- **Phút 00 - 15:** Hoàn thành Passage 1 (Kiếm trọn vẹn 12-13 điểm nền tảng).
- **Phút 15 - 35:** Hoàn thành Passage 2 (Tích lũy thêm 10-11 điểm).
- **Phút 35 - 58:** Hoàn thành Passage 3 (Tập trung suy luận các câu phân loại Band 8.0+).
- **Phút 58 - 60:** 2 phút cuối cùng: Rà soát xem có ô nào bị bỏ trống không (Tuyệt đối không để trống bất kỳ câu trả lời nào!).`,
    strategyQuiz: [
      {
        id: 'quiz_time_1',
        scenario: 'Bạn đang làm Passage 1 và đã dành 14 phút nhưng còn vướng 1 câu Matching Information rất khó tìm thấy vị trí.',
        question: 'Hành động đúng chuẩn chiến thuật theo khuyến nghị của chuyên gia là gì?',
        options: [
          'A. Tiếp tục ngồi tìm thêm 5 phút nữa cho bằng được vì Passage 1 bắt buộc phải đúng hết.',
          'B. Đánh dấu câu đó, chọn tạm 1 đáp án có khả năng nhất và chuyển ngay sang làm Passage 2 theo đúng mốc 15 phút.',
          'C. Bỏ bài thi đi ra ngoài.',
          'D. Nhảy cóc sang làm Passage 3 trước.',
        ],
        correctIndex: 1,
        explanationVi: 'Mỗi câu hỏi chỉ có giá trị đúng 1 điểm. Dành thêm 5 phút cho 1 câu ở Passage 1 đồng nghĩa với việc bạn sẽ mất thời gian làm 3-4 câu dễ ở các passage sau. Nguyên tắc quản lý thời gian là tuân thủ chặt chẽ mốc thời gian đã định.',
        keyTakeaway: 'Kỷ luật thời gian là vũ khí tối thượng của người thi IELTS đạt Band 7.5+.',
      },
    ],
  },

  // --------------------------------------------------------------------------
  // LISTENING 1: DISTRACTORS & SIGNPOSTS
  // --------------------------------------------------------------------------
  {
    id: 'strategy_listening_distractors',
    skill: 'listening',
    categoryTitleVi: 'Chiến Thuật Listening',
    title: 'Bắt Trọn Bẫy Tự Sửa Lời (Distractors) & Ngôn Ngữ Dẫn Đường (Signposts)',
    subtitle: 'Kỹ thuật nhận biết khi người nói "quay xe" đổi ý và dự đoán từ loại chính xác trước khi audio phát.',
    readTimeMinutes: 7,
    difficultyLevel: 'Foundation (5.0 - 6.5)',
    corePrinciples: [
      'Trong IELTS Listening, người nói trong audio HIẾM KHI cung cấp đáp án đúng ngay lập tức mà không có từ phân tâm (Distractor).',
      'Họ thường đưa ra một thông tin ban đầu, sau đó "sửa lại" bằng các cụm từ như: "Actually...", "Wait, let me double check...", "That was true last year, but now...", "I wanted to, but instead...".',
      'Signposting Language (Ngôn ngữ chỉ đường) là các từ báo hiệu người nói đang chuyển ý hoặc bước sang câu hỏi tiếp theo trong đề thi.',
    ],
    stepByStepMethod: [
      {
        stepNumber: 1,
        stepTitle: 'Tận dụng 30-45 giây chuẩn bị để Dự Đoán Từ Loại & Ngữ Cảnh (Prediction)',
        actionVi: 'Đọc lướt chỗ trống: Cần điền Danh từ (số ít/số nhiều), Tên người, Số điện thoại, Ngày tháng hay Giá tiền? Nếu chỗ trống có mạo từ "a/an", chắc chắn là danh từ đếm được số ít.',
      },
      {
        stepNumber: 2,
        stepTitle: 'Lắng nghe từ đồng nghĩa của từ khóa đề bài (Paraphrased Cues)',
        actionVi: 'Đề bài viết "Total cost", audio có thể nói "The final bill came out to be". Đề bài viết "Located near", audio có thể nói "Situated adjacent to".',
      },
      {
        stepNumber: 3,
        stepTitle: 'Giữ bút chờ đợi sự xác nhận cuối cùng (The Final Confirmation)',
        actionVi: 'Khi nghe thấy con số hoặc thông tin đầu tiên, ĐỪNG vội kết luận. Hãy nghe thêm 1-2 giây xem người nói có nói "Oh sorry, that was without tax" hay không.',
      },
    ],
    proTactics: [
      'Ghi nháp chữ viết tắt hoặc số vào tờ giấy nháp, sau đó mới điền vào bài để không bị lỡ nhịp câu hỏi kế tiếp.',
      'Trong phần nghe Section 4 (bài giảng học thuật độc thoại), hãy bám chặt vào các từ nối cấu trúc: "First of all...", "Moving on to...", "Another critical dimension is...", "To sum up...".',
    ],
    trapAlerts: [
      'BẪY SỐ ÍT / SỐ NHIỀU (Singular/Plural): Nghe thiếu âm đuôi "-s" hoặc "-es" sẽ khiến bạn bị chấm sai hoàn toàn dù viết đúng từ vựng!',
      'BẪY GIỚI HẠN TỪ (Word Limit Trap): Đề bài yêu cầu "NO MORE THAN TWO WORDS" nhưng viết 3 từ sẽ nhận 0 điểm tuyệt đối.',
    ],
    practicalApplicationMarkdown: `### Phân tích một kịch bản bẫy kinh điển:
> **Audio:**
> *Clerk:* "The basic membership fee is **$45** per month." *(Bẫy số 1)*
> *Customer:* "Is there any discount for university students?"
> *Clerk:* "Yes, students receive a $10 reduction, making it **$35**." *(Bẫy số 2)*
> *Customer:* "Great, but what about the annual registration fee?"
> *Clerk:* "That is a one-time payment of **$20**, which is currently waived for all new joiners today!"
>
> **Đề bài:** "Monthly student fee: $_____" -> **Đáp án đúng là 35** (Không phải 45, cũng không phải 20).`,
    strategyQuiz: [
      {
        id: 'quiz_distractor_1',
        scenario: 'Trong audio, người nói nói: "We originally planned to hold the seminar in Room 104, but due to water leakage we had to relocate everyone to the auditorium on the second floor."',
        question: 'Đề bài hỏi: "Seminar location: __________". Đáp án chính xác là gì?',
        options: [
          'A. Room 104',
          'B. The second floor',
          'C. The auditorium',
          'D. Water leakage room',
        ],
        correctIndex: 2,
        explanationVi: 'Room 104 là kế hoạch ban đầu (originally planned) nhưng đã bị hủy do sự cố. Địa điểm thực tế diễn ra sự kiện là "the auditorium" (hoặc "auditorium").',
        keyTakeaway: 'Các từ "originally", "initially", "used to" báo hiệu kế hoạch cũ đã bị thay đổi.',
      },
    ],
  },

  // --------------------------------------------------------------------------
  // WRITING TASK 1: THE 4-PARAGRAPH ARCHITECTURE & OVERVIEW
  // --------------------------------------------------------------------------
  {
    id: 'strategy_writing_task1_mastery',
    skill: 'writing',
    categoryTitleVi: 'Chiến Thuật Writing',
    title: 'Cấu Trúc 4 Đoạn Chuẩn Mực Task 1 & Sức Mạnh Của Đoạn Overview',
    subtitle: 'Bí quyết đạt tối thiểu Band 7.0 Task Achievement và cách gom nhóm số liệu logic.',
    readTimeMinutes: 9,
    difficultyLevel: 'Advanced (7.0 - 8.0)',
    corePrinciples: [
      'Quy tắc sống còn của Task 1: BẮT BUỘC PHẢI CÓ ĐOẠN OVERVIEW TỔNG QUAN. Theo Band Descriptors chính thức, bài viết KHÔNG có Overview rõ ràng thì điểm Task Achievement TỐI ĐA CHỈ ĐẠT BAND 5.0!',
      'Trong đoạn Overview: TUYỆT ĐỐI KHÔNG ĐƯA SỐ LIỆU CỤ THỂ (data points). Overview chỉ dùng để nêu xu hướng chung (overall trend), điểm cao nhất/thấp nhất (extremes), hoặc sự thay đổi nổi bật nhất.',
      'Cấu trúc bài viết chuẩn gồm đúng 4 đoạn: 1. Introduction (Paraphrase đề bài) | 2. Overview (2 câu tổng quan) | 3. Body 1 (Nhóm số liệu 1) | 4. Body 2 (Nhóm số liệu 2).',
      'Độ dài lý tưởng: 170 - 190 từ trong vòng đúng 20 phút.',
    ],
    stepByStepMethod: [
      {
        stepNumber: 1,
        stepTitle: 'Introduction (1 câu - 2 phút): Paraphrase lại đề bài',
        actionVi: 'Thay đổi chủ ngữ, động từ và cụm thời gian. Công thức: "The provided [chart type] illustrates/delineates the changes in [topic] in [location] over a [X-year] period between [Year 1] and [Year 2]."',
      },
      {
        stepNumber: 2,
        stepTitle: 'Overview (2 câu - 3 phút): Viết điểm mấu chốt bao quát nhất',
        actionVi: 'Câu 1: Nêu xu hướng chung (Cái nào tăng, cái nào giảm hoặc giữ nguyên?). Câu 2: Nêu sự nổi bật nhất (Đối tượng nào luôn chiếm tỷ trọng lớn nhất / Biến động mạnh nhất?). Bắt đầu bằng: "Overall, it is readily apparent that..."',
      },
      {
        stepNumber: 3,
        stepTitle: 'Body 1 & Body 2 (10-12 phút): Gom nhóm số liệu theo tiêu chí logic',
        actionVi: 'Tuyệt đối không liệt kê từng đối tượng từ đầu đến cuối một cách máy móc. Hãy gom nhóm theo: Đối tượng có xu hướng tăng vào Body 1, Đối tượng giảm/dao động vào Body 2. Hoặc so sánh theo mốc thời gian: Nửa đầu thời kỳ vào Body 1, Nửa sau vào Body 2.',
      },
      {
        stepNumber: 4,
        stepTitle: 'Rà soát 3 phút: Kiểm tra thì (Tenses) và giới từ (Prepositions)',
        actionVi: 'Năm trong quá khứ -> Dùng Quá khứ đơn. Giới từ tăng/giảm: "increased by 20%" (tăng thêm 20%), "increased to 80%" (tăng đến mức 80%), "stood at 50%" (đứng ở mức 50%).',
      },
    ],
    proTactics: [
      'Đa dạng hóa từ vựng chỉ xu hướng: Thay vì lặp lại "increase/decrease", hãy dùng "experience an upward/downward trajectory", "witness a moderate decline", "reach a plateau at", "remain virtually unchanged".',
      'Sử dụng mệnh đề quan hệ rút gọn hoặc phân từ để nối số liệu: "...before plunging dramatically to a trough of 10% in 2020."',
    ],
    trapAlerts: [
      'BẪY ĐƯA Ý KIẾN CÁ NHÂN: Tuyệt đối không tự suy diễn nguyên nhân ("The number of cars increased because people were richer"). Task 1 chỉ yêu cầu báo cáo khách quan những gì biểu đồ thể hiện!',
      'BẪY LIỆT KÊ TẤT CẢ CON SỐ: Chọn lọc các số liệu trọng yếu (điểm đầu, điểm cuối, đỉnh, đáy, điểm giao nhau). Liệt kê quá nhiều số sẽ khiến bài viết bị trừ điểm Coherence.',
    ],
    practicalApplicationMarkdown: `### Mẫu câu Overview mẫu mực Band 8.5:
> *"Overall, it is readily apparent that while the consumption of renewable energy and natural gas witnessed substantial upward trajectories over the period shown, the opposite was true for coal and oil. Additionally, oil remained the predominant energy source throughout the entire timeframe despite its eventual decline."*

- **Phân tích:** 
  - Nêu rõ nhóm tăng vs nhóm giảm (renewable/gas vs coal/oil).
  - Nêu rõ đối tượng thống trị (oil remained predominant).
  - Không có bất kỳ con số cụ thể nào trong đoạn này!`,
    strategyQuiz: [
      {
        id: 'quiz_wt1_1',
        scenario: 'Một thí sinh viết bài Task 1 dài 220 từ, dùng từ vựng rất cao siêu và cấu trúc câu phức tạp, nhưng quên không viết đoạn Overview tổng quan.',
        question: 'Điểm Task Achievement tối đa mà thí sinh này có thể nhận được là bao nhiêu?',
        options: [
          'A. Band 7.0 vì từ vựng và ngữ pháp quá tốt bù lại.',
          'B. Band 6.0.',
          'C. Tối đa Band 5.0 theo quy định chính thức của Cambridge Band Descriptors.',
          'D. Band 8.0.',
        ],
        correctIndex: 2,
        explanationVi: 'Theo tiêu chí chấm điểm chính thức của Cambridge IELTS: "Presents an overview with information appropriately selected" là điều kiện bắt buộc để đạt Band 6.0+. Nếu không có overview, điểm Task Achievement bị khống chế ở mức tối đa Band 5.0 dù các phần khác có viết tốt đến đâu.',
        keyTakeaway: 'Overview là linh hồn của Writing Task 1. Không có Overview = Mất điểm Task Achievement.',
      },
    ],
  },

  // --------------------------------------------------------------------------
  // WRITING TASK 2: PEEL PARAGRAPH STRUCTURE & THESIS FORMULATION
  // --------------------------------------------------------------------------
  {
    id: 'strategy_writing_task2_peel',
    skill: 'writing',
    categoryTitleVi: 'Chiến Thuật Writing',
    title: 'Nghệ Thuật Xây Thân Bài Task 2 Chuẩn PEEL & Luận Đề Sắc Bén',
    subtitle: 'Công thức biến ý tưởng đơn giản thành đoạn văn nghị luận chặt chẽ, thuyết phục đạt Band 8.0+.',
    readTimeMinutes: 10,
    difficultyLevel: 'Master (8.5+)',
    corePrinciples: [
      'Thân bài Writing Task 2 không cần quá nhiều ý tưởng (chỉ cần 1-2 luận điểm chính cho mỗi đoạn). Quan trọng nhất là Ý TƯỞNG ĐƯỢC PHÁT TRIỂN SÂU ĐẾN ĐÂU (Fully extended and well-supported ideas).',
      'Mô hình PEEL (hoặc PEER) là tiêu chuẩn vàng của văn học thuật phương Tây: Point (Luận điểm) -> Explanation (Giải thích cơ chế tại sao) -> Evidence/Example (Ví dụ thực tế) -> Link/Result (Kết nối lại đề bài).',
      'Mở bài bắt buộc phải có câu Luận đề (Thesis Statement) thể hiện rõ lập trường xuyên suốt (A clear position throughout the response) để đạt Band 7.0+ Task Response.',
    ],
    stepByStepMethod: [
      {
        stepNumber: 1,
        stepTitle: 'Point (Câu chủ đề - Topic Sentence)',
        actionVi: 'Khẳng định ngay luận điểm chính của đoạn trong 1 câu rõ ràng, không vòng vo. Ví dụ: "The primary rationale behind government investment in public transit is the mitigation of urban congestion."',
      },
      {
        stepNumber: 2,
        stepTitle: 'Explanation (Giải thích cơ chế - The "Why/How" Chain)',
        actionVi: 'Giải thích logic từng bước: Khi A xảy ra -> Dẫn đến B -> Kéo theo C. Dùng các từ nối nhân quả: "This is largely attributable to...", "When commuters are provided with reliable subways, they are less inclined to operate personal vehicles, thereby reducing traffic volume."',
      },
      {
        stepNumber: 3,
        stepTitle: 'Example (Ví dụ minh họa cụ thể - Concrete Evidence)',
        actionVi: 'Đưa ra ví dụ thực tế về một quốc gia, chính sách hoặc hiện tượng cụ thể. Tránh ví dụ cá nhân ("My brother", "In my family"). Hãy dùng: "A compelling illustration of this is Singapore, where the expansion of the MRT network has correlated with a 30% decline in rush-hour bottlenecks."',
      },
      {
        stepNumber: 4,
        stepTitle: 'Link / Result (Câu chốt và kết nối - The Impact)',
        actionVi: 'Tóm lược tác động và khẳng định lại sự đóng góp cho xã hội: "Consequently, sustained funding in mass transit serves as a viable, long-term antidote to metropolitan gridlock."',
      },
    ],
    proTactics: [
      'Sử dụng ngôn ngữ dè dặt (Hedging Language): Trong văn học thuật, tuyệt đối tránh khẳng định 100% cực đoan như "All children will become criminals". Hãy dùng: "tend to", "are likely to", "could potentially lead to".',
      'Đa dạng hóa liên kết ý (Cohesive Devices): Không chỉ dùng "Firstly, Secondly, In addition". Hãy dùng các cấu trúc liên kết nội tại như đại từ chỉ định ("This phenomenon"), danh từ tổng hợp ("Such initiatives"), hoặc mệnh đề quan hệ.',
    ],
    trapAlerts: [
      'BẪY LIỆT KÊ Ý TƯỞNG (Idea Listing Trap): Đưa ra 4-5 lý do trong 1 đoạn văn nhưng lý do nào cũng chỉ viết 1 câu ngắn, không có câu nào được giải thích cặn kẽ. Điều này sẽ khiến điểm Task Response bị kẹt ở Band 5.5 - 6.0.',
      'BẪY OFF-TOPIC LẠC ĐỀ: Đề bài hỏi về "impact on students\' mental health" nhưng lại viết tràn lan về "economic benefits of technology".',
    ],
    practicalApplicationMarkdown: `### Đoạn Thân Bài Mẫu Đạt Band 8.5 Chuẩn PEEL:
> **[POINT]** *On the one hand, proponents of artificial intelligence in education argue that automated platforms significantly democratise personalised learning.*
> **[EXPLANATION]** *This is because machine-learning algorithms can dynamically assess an individual student's comprehension rate and autonomously calibrate the pedagogical pace, thereby preventing slower learners from being left behind while offering advanced challenges to gifted pupils.*
> **[EXAMPLE]** *For instance, adaptive software such as Duolingo and Khan Academy utilizes algorithmic diagnostics to remediate specific grammatical deficiencies in real-time, an instructional feat virtually impossible for a single teacher in a 40-student classroom.*
> **[LINK]** *Consequently, this technological integration fundamentally enhances academic efficacy and equalises educational opportunities.*`,
    strategyQuiz: [
      {
        id: 'quiz_peel_1',
        scenario: 'Một thí sinh viết đoạn thân bài Task 2 như sau: "There are many benefits of public transport. Firstly, it saves money. Secondly, it protects the environment. Thirdly, it creates jobs. Finally, it makes people healthier."',
        question: 'Giám khảo IELTS sẽ đánh giá đoạn văn này như thế nào về mặt tiêu chí Task Response?',
        options: [
          'A. Band 8.5 vì nêu được rất nhiều ý tưởng phong phú.',
          'B. Bị giới hạn ở Band 5.5 - 6.0 vì đây là lỗi "Liệt kê ý tưởng" (Ideas are listed without being developed or supported).',
          'C. Đạt Band 9.0 vì sử dụng các từ nối Firstly, Secondly rất chuẩn.',
          'D. Đoạn văn hoàn hảo không cần chỉnh sửa.',
        ],
        correctIndex: 1,
        explanationVi: 'IELTS không chấm điểm theo số lượng ý tưởng. Một danh sách 4 ý tưởng không được giải thích hoặc dẫn chứng sẽ bị coi là nông cạn (undeveloped ideas). Giám khảo muốn thấy 1-2 ý tưởng được đào sâu bằng nguyên nhân, cơ chế và ví dụ.',
        keyTakeaway: 'Chất lượng phát triển ý quan trọng gấp 10 lần số lượng ý tưởng. Hãy tuân thủ công thức PEEL.',
      },
    ],
  },

  // --------------------------------------------------------------------------
  // SPEAKING 1: PART 1 - THE A.R.E.A REFLEX FORMULA
  // --------------------------------------------------------------------------
  {
    id: 'strategy_speaking_part1_area',
    skill: 'speaking',
    categoryTitleVi: 'Chiến Thuật Speaking',
    title: 'Phản Xạ Trả Lời Speaking Part 1 Theo Công Thức A.R.E.A',
    subtitle: 'Phương pháp kéo dài câu trả lời tự nhiên từ 3-4 câu mà không bị cụt ngủn hay dài dòng lan man.',
    readTimeMinutes: 6,
    difficultyLevel: 'Foundation (5.0 - 6.5)',
    corePrinciples: [
      'Part 1 là màn khởi động (Warm-up) gồm các chủ đề quen thuộc (Hometown, Study/Work, Hobbies, Weather, Technology).',
      'Trả lời quá ngắn (1 câu cộc lốc: "Yes, I like it.") sẽ bị đánh giá thấp về Fluency. Trả lời quá dài (>6 câu như thuyết trình) sẽ bị giám khảo ngắt lời.',
      'Độ dài hoàn hảo cho mỗi câu Part 1: 3 đến 4 câu (khoảng 15 - 25 giây/câu) theo công thức A.R.E.A.',
    ],
    stepByStepMethod: [
      {
        stepNumber: 1,
        stepTitle: 'A - Answer (Trả lời trực tiếp)',
        actionVi: 'Trả lời trực diện câu hỏi bằng cách paraphrase lại câu hỏi của giám khảo, tránh lặp lại nguyên văn từ vựng. Ví dụ: "Do you enjoy cooking?" -> "To be completely honest, I am quite passionate about culinary arts."',
      },
      {
        stepNumber: 2,
        stepTitle: 'R - Reason (Giải thích lý do)',
        actionVi: 'Nêu lý do vì sao bạn thích/không thích hoặc tại sao điều đó lại diễn ra. Dùng từ nối: "Mainly because...", "The principal reason is that it serves as an excellent stress-reliever after intense working hours."',
      },
      {
        stepNumber: 3,
        stepTitle: 'E - Example / Elaboration (Ví dụ hoặc làm rõ)',
        actionVi: 'Kể một chi tiết cụ thể: "For instance, on weekends, I often experiment with traditional Vietnamese noodle dishes for my family."',
      },
      {
        stepNumber: 4,
        stepTitle: 'A - Alternative / Feeling (Mở rộng cảm xúc hoặc giả định tương phản)',
        actionVi: 'Kết thúc bằng một cảm nghĩ hoặc dự định tương lai: "That said, during busy weekdays, I rarely have the luxury of time to cook from scratch."',
      },
    ],
    proTactics: [
      'Sử dụng các cụm từ mở đầu tự nhiên (Natural Conversation Starters): "Well, to be fair...", "I haven\'t given it much thought before, but I\'d say...", "It really depends on my mood, but generally...".',
      'Ngữ điệu (Intonation): Nhấn vào các từ mang trọng âm ý nghĩa (Content words), không nói giọng đều đều (Monotone).',
    ],
    trapAlerts: [
      'BẪY TRẢ LỜI CỘC LỐC: "Do you like flowers?" -> "Yes, I like flowers very much." (Không thể hiện được cấu trúc ngữ pháp và từ vựng).',
      'BẪY HỌC THUỘC LÒNG (Memorized Script): Nói trôi chảy bất thường như đọc thuộc lòng sẽ bị giám khảo phát hiện và đổi chủ đề bất ngờ.',
    ],
    practicalApplicationMarkdown: `### So sánh câu trả lời Band 5.0 vs Band 8.0:
- **Giám khảo:** *"Do you prefer reading physical books or e-books?"*
- **Band 5.0:** *"I prefer physical books because I like the smell of paper and it is good for my eyes."*
- **Band 8.0 (Áp dụng A.R.E.A):**
  - **[Answer]:** *"Without a doubt, I have a strong inclination towards traditional printed books."*
  - **[Reason]:** *"There is something undeniably tactile and immersive about turning physical pages that digital screens simply cannot replicate."*
  - **[Example]:** *"For example, I love building my own physical bookshelf at home with classic literature."*
  - **[Alternative]:** *"Although e-readers are undeniably convenient when travelling, physical books remain my ultimate go-to."*`,
    strategyQuiz: [
      {
        id: 'quiz_sp1_1',
        scenario: 'Giám khảo hỏi: "What is your favourite type of music?"',
        question: 'Cách xử lý nào thể hiện tốt nhất tiêu chí Fluency & Coherence trong Part 1?',
        options: [
          'A. Trả lời đúng 1 chữ: "Pop music."',
          'B. Nói liên tục 2 phút không dừng về lịch sử âm nhạc thế giới từ thế kỷ 18.',
          'C. Trả lời trực diện theo công thức A.R.E.A trong 3-4 câu (Nêu thể loại yêu thích -> Lý do vì sao -> Nghệ sĩ/bài hát cụ thể hay nghe -> Cảm xúc mang lại).',
          'D. Xin đổi câu hỏi khác vì không nghe nhạc.',
        ],
        correctIndex: 2,
        explanationVi: 'Part 1 yêu cầu câu trả lời súc tích, tự nhiên trong 3-4 câu. Áp dụng A.R.E.A giúp bạn vừa phô diễn được từ vựng, ngữ pháp mà vẫn đảm bảo tính mạch lạc và độ dài hoàn hảo.',
        keyTakeaway: '3-4 câu phản xạ mượt mà theo A.R.E.A là tiêu chuẩn vàng của Speaking Part 1.',
      },
    ],
  },

  // --------------------------------------------------------------------------
  // SPEAKING 2: PART 3 - MACRO EXPANSION & ACADEMIC DISCOURSE
  // --------------------------------------------------------------------------
  {
    id: 'strategy_speaking_part3_macro',
    skill: 'speaking',
    categoryTitleVi: 'Chiến Thuật Speaking',
    title: 'Bứt Phá Speaking Part 3: Kỹ Thuật Mở Rộng Ý Vĩ Mô (Macro Expansion)',
    subtitle: 'Nâng cấp tư duy từ câu chuyện cá nhân "I / Me" lên góc nhìn xã hội, kinh tế và triết học đạt Band 8.0+.',
    readTimeMinutes: 8,
    difficultyLevel: 'Master (8.5+)',
    corePrinciples: [
      'Sự khác biệt cốt lõi giữa Part 1 và Part 3: Part 1 là về BẢN THÂN BẠN (Personal). Part 3 là về XÃ HỘI VÀ CON NGƯỜI NÓI CHUNG (Societal / Global / Abstract).',
      'Thí sinh bị kẹt ở Band 6.0 vì liên tục trả lời Part 3 bằng ngôi "I think...", "In my family...". Để lên Band 7.5 - 8.5, bạn phải dùng góc nhìn vĩ mô: "From a macroeconomic perspective", "Societal norms dictate that", "Different demographics react differently".',
      'Áp dụng cấu trúc 3 chiều: 1. Đưa ra quan điểm khái quát xã hội | 2. Phân nhánh đối lập (So sánh giới trẻ vs người già, hoặc giàu vs nghèo) | 3. Dự đoán xu hướng tương lai.',
    ],
    stepByStepMethod: [
      {
        stepNumber: 1,
        stepTitle: 'Mua 2-3 giây suy nghĩ tự nhiên bằng các cụm Filler học thuật',
        actionVi: 'Tuyệt đối không "ờ... à...". Hãy dùng: "That is an intriguing question with multiple dimensions to consider...", "Broadly speaking, there is no one-size-fits-all answer to this, but I would argue that..."',
      },
      {
        stepNumber: 2,
        stepTitle: 'Nêu thực trạng xã hội đa chiều (Societal Generalization)',
        actionVi: 'Thay vì "People like smartphones", hãy nói: "In contemporary society, mobile devices have transformed from mere luxury gadgets into indispensable logistical tools for daily navigation."',
      },
      {
        stepNumber: 3,
        stepTitle: 'Tạo độ tương phản hoặc phân nhánh đối tượng (Demographic Contrast)',
        actionVi: 'So sánh: "While younger generations readily embrace automation, the elderly demographic often experiences significant digital alienation."',
      },
      {
        stepNumber: 4,
        stepTitle: 'Khái quát hóa tác động lâu dài (Long-term Implication)',
        actionVi: 'Kết thúc bằng hệ quả vĩ mô: "Consequently, governments must implement digital literacy programs to bridge this socio-technological divide."',
      },
    ],
    proTactics: [
      'Sử dụng các cấu trúc ngữ pháp cao cấp: Đảo ngữ ("Not only does technology boost productivity, but it also..."), Câu điều kiện loại 3 / Mixed conditional ("Had policy-makers intervened sooner, urban sprawl might have been contained").',
      'Kỹ thuật nhìn nhận 2 mặt của vấn đề (Nuanced thinking): Luôn công nhận mặt lợi trước khi phân tích mặt hại.',
    ],
    trapAlerts: [
      'BẪY NÓI VỀ BẢN THÂN: Giám khảo hỏi "Why do people in your country enjoy travelling abroad?" nhưng trả lời: "Because last summer I went to Thailand and I loved the food." -> Trừ điểm Task Response vì không trả lời về số đông người dân!',
    ],
    practicalApplicationMarkdown: `### Nâng cấp câu trả lời Speaking Part 3:
- **Câu hỏi của Giám khảo:** *"Do you think artificial intelligence will replace human teachers in the future?"*
- **Band 6.0:** *"I don't think so because teachers are very friendly and AI is just a computer. I like my teacher at school."*
- **Band 8.5 (Macro Expansion):**
  - *"From my perspective, while artificial intelligence will undoubtedly revolutionise educational logistics and automate routine assessments, it is highly improbable that algorithmic systems will completely supersede human educators.*
  - *The fundamental rationale is that pedagogy is not merely the transmission of raw data; it inherently requires emotional intelligence, empathy, and moral guidance — attributes uniquely intrinsic to human interaction.*
  - *Therefore, the future will likely witness a collaborative paradigm where AI serves as an instructional assistant, augmenting rather than replacing human teachers."*`,
    strategyQuiz: [
      {
        id: 'quiz_sp3_1',
        scenario: 'Giám khảo hỏi trong Part 3: "Why is physical exercise becoming less popular among modern urban citizens?"',
        question: 'Cách tiếp cận nào sau đây thể hiện tư duy học thuật Band 8.0+?',
        options: [
          'A. Kể chuyện hôm qua bản thân mệt quá nên không đi tập gym.',
          'B. Phân tích các yếu tố vĩ mô như: Lối sống ít vận động nơi công sở (sedentary desk-bound work culture), sự bùng nổ của thiết bị kỹ thuật số và sự thiếu hụt quy hoạch không gian xanh tại các đô thị lớn.',
          'C. Trả lời thật ngắn để tránh sai ngữ pháp: "Because they are lazy."',
          'D. Khuyên giám khảo nên đi tập thể dục.',
        ],
        correctIndex: 1,
        explanationVi: 'Speaking Part 3 đánh giá khả năng thảo luận các vấn đề trừu tượng và xã hội. Việc phân tích từ góc độ văn hóa công sở, công nghệ và quy hoạch đô thị giúp thể hiện vốn từ vựng C1/C2 và tư duy phản biện sắc bén.',
        keyTakeaway: 'Nâng tầm câu trả lời từ trải nghiệm cá nhân lên góc nhìn vĩ mô của toàn xã hội.',
      },
    ],
  },
];

// ============================================================================
// 4. ANNOTATED HIGH-BAND MODEL ANSWERS (BỘ SƯU TẬP BÀI MẪU BAND 7/8/9 CÓ CHÚ THÍCH AI)
// ============================================================================
export const ANNOTATED_MODEL_ANSWERS: AnnotatedModelAnswer[] = [
  // --------------------------------------------------------------------------
  // MODEL 1: WRITING TASK 1 (BAND 8.5) - LINE GRAPH
  // --------------------------------------------------------------------------
  {
    id: 'model_wt1_energy_consumption',
    skill: 'writing',
    taskType: 'Writing Task 1',
    topicVi: 'Mức Tiêu Thụ Năng Lượng Toàn Cầu (Line Graph)',
    questionPrompt:
      'The line graph below shows global energy consumption by fuel type from 1980 to 2030, with projections for the future. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    diagramOrImageDescription:
      'Biểu đồ đường miêu tả mức tiêu thụ 5 nguồn năng lượng (Dầu mỏ, Than đá, Khí tự nhiên, Năng lượng hạt nhân, Năng lượng tái tạo) từ năm 1980 đến dự báo 2030, đơn vị tính theo triệu tấn quy dầu (Mtoe).',
    targetBand: 8.5,
    examinerOverviewVi:
      'Bài viết đạt chuẩn mực cao nhất của Cambridge Writing Task 1. Đoạn Overview khái quát hoàn hảo hai điểm mấu chốt: xu hướng tăng chung của nhiên liệu hóa thạch và vị trí thống trị liên tục của dầu mỏ. Các số liệu được gom nhóm theo trật tự thời gian và so sánh đối chiếu mượt mà bằng các cấu trúc ngữ pháp cao cấp.',
    criteriaAnalysis: {
      criterion1Name: 'Task Achievement',
      criterion1Score: 8.5,
      criterion1Notes: 'Bao quát toàn bộ các mốc quan trọng, có câu Overview mẫu mực không chứa số liệu, so sánh đối chiếu sắc sảo giữa các nguồn năng lượng.',
      criterion2Name: 'Coherence & Cohesion',
      criterion2Score: 8.5,
      criterion2Notes: 'Bố cục 4 đoạn hoàn hảo. Sử dụng các từ nối tinh tế như "In stark contrast", "Regarding the latter", "thereafter" tạo mạch chảy tự nhiên.',
      criterion3Name: 'Lexical Resource',
      criterion3Score: 8.5,
      criterion3Notes: 'Vốn từ vựng miêu tả biểu đồ học thuật C1/C2: "witnessed a marked upward trajectory", "predominant energy source", "exponential surge", "stabilised at roughly".',
      criterion4Name: 'Grammatical Range & Accuracy',
      criterion4Score: 8.5,
      criterion4Notes: 'Kết hợp linh hoạt thì quá khứ đơn, hiện tại hoàn thành và cấu trúc dự báo tương lai ("projected to reach", "is anticipated to"). Cấu trúc phân từ hoàn hảo.',
    },
    annotatedSegments: [
      {
        text: 'The provided line graph delineates global energy consumption across five distinct fuel categories between 1980 and 2030, measured in million tonnes of oil equivalent (Mtoe).',
        isHighlight: true,
        annotationType: 'grammar',
        title: 'Mở Bài Paraphrase Chuẩn Mực',
        explanationVi: 'Sử dụng động từ học thuật "delineates" thay cho "shows", cấu trúc "across five distinct fuel categories" và bổ sung đơn vị đo lường chính xác.',
        bandImpact: 'Band 8.5 Grammar & Lexical Resource',
      },
      {
        text: '\n\nOverall, it is readily apparent that total energy consumption experienced a substantial upward trajectory over the entire period, with fossil fuels consistently dominating the global energy mix. Furthermore, oil remained the predominant energy source throughout the timeframe and is projected to maintain its supremacy until 2030.',
        isHighlight: true,
        annotationType: 'task_response',
        title: 'Đoạn Overview Mẫu Mực Đạt Điểm Tuyệt Đối',
        explanationVi: 'Đoạn Overview gồm đúng 2 câu: Câu 1 nêu xu hướng tăng tổng thể của nhiên liệu hóa thạch; Câu 2 khẳng định vị thế độc tôn của dầu mỏ. Không hề có bất kỳ con số vụn vặt nào, đúng tiêu chuẩn khảo thí cao nhất của Cambridge.',
        bandImpact: 'Band 9.0 Task Achievement',
      },
      {
        text: '\n\nIn 1980, oil was by far the most heavily consumed resource, standing at approximately 35 Mtoe. Despite experiencing moderate fluctuations over the subsequent two decades, this figure climbed steadily to roughly 40 Mtoe in 2000 and is forecast to witness an exponential surge to around 50 Mtoe by the end of the projection window.',
        isHighlight: true,
        annotationType: 'vocab',
        title: 'Cụm Từ Vựng & Cấu Trúc Miêu Tả Số Liệu C1/C2',
        explanationVi: '"by far the most heavily consumed", "moderate fluctuations", "exponential surge", "projection window" là chuỗi Collocations học thuật tự nhiên, chính xác tuyệt đối.',
        bandImpact: 'Band 8.5 Lexical Resource',
      },
      {
        text: ' In a similar vein, coal and natural gas began at comparable levels of 22 Mtoe and 20 Mtoe respectively; thereafter, both exhibited parallel ascending trends, with coal anticipated to reach 30 Mtoe and natural gas climbing to 25 Mtoe by 2030.',
        isHighlight: true,
        annotationType: 'cohesion',
        title: 'Liên Kết So Sánh Song Song Mạch Lạc',
        explanationVi: 'Cụm "In a similar vein" (Tương tự như vậy) và "thereafter" kết nối mượt mà giữa xu hướng của Than đá và Khí tự nhiên, tránh sự lặp lại đơn điệu.',
        bandImpact: 'Band 8.5 Coherence & Cohesion',
      },
      {
        text: '\n\nIn stark contrast, nuclear power and renewable energy sources commenced at negligible levels of under 5 Mtoe in 1980. Although nuclear energy expanded moderately to peak at approximately 8 Mtoe around 2010 before plateauing, renewables registered a slow but steady growth, eventually matching nuclear consumption at 10 Mtoe by 2030.',
        isHighlight: true,
        annotationType: 'grammar',
        title: 'Mệnh Đề Nhượng Bộ & Cấu Trúc Phân Từ Tinh Tế',
        explanationVi: 'Cấu trúc "In stark contrast", mệnh đề nhượng bộ "Although nuclear energy expanded... before plateauing" và phân từ "eventually matching" thể hiện năng lực ngữ pháp điêu luyện.',
        bandImpact: 'Band 9.0 Grammatical Range',
      },
    ],
    vocabularyGlossary: [
      { phrase: 'delineates', meaningVi: 'Phác họa / Trình bày chi tiết', level: 'C1', usageTip: 'Thay thế cực tốt cho "shows / presents" trong mở bài Task 1.' },
      { phrase: 'upward trajectory', meaningVi: 'Quỹ đạo đi lên / Xu hướng tăng trưởng', level: 'C1', usageTip: 'Dùng thay cho "upward trend / increase".' },
      { phrase: 'predominant energy source', meaningVi: 'Nguồn năng lượng chiếm ưu thế tuyệt đối', level: 'C2', usageTip: 'Collocation học thuật đắt giá khi miêu tả đối tượng đứng đầu.' },
      { phrase: 'projection window', meaningVi: 'Giai đoạn dự báo tương lai', level: 'C2', usageTip: 'Dùng cho các biểu đồ có mốc thời gian trong tương lai (2025-2030).' },
      { phrase: 'plateauing', meaningVi: 'Chạm mức bão hòa và đi ngang', level: 'C1', usageTip: 'Miêu tả đường số liệu không tăng cũng không giảm sau một đợt tăng.' },
    ],
  },

  // --------------------------------------------------------------------------
  // MODEL 2: WRITING TASK 2 (BAND 8.5) - OPINION ESSAY (AGREE / DISAGREE)
  // --------------------------------------------------------------------------
  {
    id: 'model_wt2_ai_in_education',
    skill: 'writing',
    taskType: 'Writing Task 2',
    topicVi: 'Trí Tuệ Nhân Tạo Trong Giáo Dục (Agree / Disagree)',
    questionPrompt:
      'Some people believe that artificial intelligence will soon replace human teachers in classrooms. To what extent do you agree or disagree with this statement?',
    targetBand: 8.5,
    examinerOverviewVi:
      'Bài viết mẫu mực thể hiện tư duy phản biện sắc bén và lập trường nhất quán (Clear position throughout). Thí sinh không phủ nhận vai trò của AI mà phân tích rạch ròi: AI vượt trội về tự động hóa dữ liệu và cá nhân hóa lộ trình học, nhưng không thể thay thế sự đồng cảm và nhân cách sư phạm của con người.',
    criteriaAnalysis: {
      criterion1Name: 'Task Response',
      criterion1Score: 8.5,
      criterion1Notes: 'Trả lời trực tiếp đề bài với lập trường không đồng tình có chọn lọc (Disagree with nuance). Luận điểm phát triển sâu theo chuỗi nhân quả chặt chẽ.',
      criterion2Name: 'Coherence & Cohesion',
      criterion2Score: 8.5,
      criterion2Notes: 'Mỗi đoạn thân bài có câu chủ đề sắc sảo theo chuẩn PEEL. Chuyển đoạn bằng kỹ thuật Theme-Rheme và đại từ thay thế chuẩn xác.',
      criterion3Name: 'Lexical Resource',
      criterion3Score: 8.5,
      criterion3Notes: 'Kho từ vựng C1/C2 theo chủ đề Giáo dục & Công nghệ: "pedagogical landscape", "tailored curricular pathways", "socio-emotional scaffolding", "irreplaceable human rapport".',
      criterion4Name: 'Grammatical Range & Accuracy',
      criterion4Score: 8.5,
      criterion4Notes: 'Sử dụng điêu luyện Đảo ngữ (Inversion), Cleft sentences, Câu điều kiện loại 2 giả định và Mệnh đề phân từ không tì vết.',
    },
    annotatedSegments: [
      {
        text: 'The pervasive integration of artificial intelligence into the pedagogical landscape has precipitated a contentious debate regarding the future role of human educators. While algorithmic systems undoubtedly possess unmatched computational prowess and the capacity to tailor instructional content, I firmly contend that the complete obsolescence of human teachers is neither feasible nor desirable, given the irreplaceable nature of emotional intelligence and moral mentorship in education.',
        isHighlight: true,
        annotationType: 'task_response',
        title: 'Mở Bài Sắc Sảo & Câu Luận Đề (Thesis Statement) Xuất Sắc',
        explanationVi: 'Mở bài 2 câu kinh điển: Câu 1 nêu bối cảnh tranh luận bằng từ vựng C2 ("pervasive integration", "precipitated a contentious debate"); Câu 2 nêu rõ Thesis statement với 2 luận điểm dẫn đường (emotional intelligence & moral mentorship).',
        bandImpact: 'Band 9.0 Task Response & Lexical Resource',
      },
      {
        text: '\n\nOn the one hand, it is undeniable that artificial intelligence offers unprecedented advantages in logistical efficiency and differentiated instruction. Machine-learning algorithms are capable of analyzing vast datasets of student performance in real-time, thereby identifying conceptual bottlenecks and generating tailored curricular pathways far more rapidly than any human educator could manage in a crowded lecture hall.',
        isHighlight: true,
        annotationType: 'grammar',
        title: 'Cấu Trúc Phức Hợp & Mệnh Đề Phân Từ Nêu Cơ Chế',
        explanationVi: 'Sử dụng cấu trúc "thereby identifying... and generating..." giải thích cơ chế hoạt động của thuật toán một cách khoa học, chuẩn xác.',
        bandImpact: 'Band 8.5 Grammatical Range',
      },
      {
        text: ' For instance, adaptive software platforms can autonomously calibrate the difficulty of mathematical exercises to match a pupil\'s mastery level. Not only does this automate tedious administrative grading, but it also democratises access to top-tier pedagogical resources for autodidacts worldwide.',
        isHighlight: true,
        annotationType: 'grammar',
        title: 'Cấu Trúc Đảo Ngữ Ghi Điểm Tuyệt Đối (Inversion)',
        explanationVi: '"Not only does this automate..., but it also democratises..." là cấu trúc đảo ngữ kinh điển giúp nâng điểm GRA từ Band 7 lên Band 8.5+.',
        bandImpact: 'Band 9.0 Grammatical Range',
      },
      {
        text: '\n\nNevertheless, the fundamental essence of holistic education extends far beyond the mechanical transmission of factual knowledge. Teaching is fundamentally a socio-emotional endeavor that requires empathy, psychological discernment, and the ability to inspire pupils facing personal adversity. A software program, irrespective of its neural network complexity, cannot discern subtle nuances in a student\'s body language that signal anxiety or disengagement, nor can it provide authentic pastoral care.',
        isHighlight: true,
        annotationType: 'vocab',
        title: 'Bộ Từ Vựng Học Thuật C2 Về Tâm Lý Sư Phạm',
        explanationVi: '"holistic education", "mechanical transmission", "socio-emotional endeavor", "psychological discernment", "pastoral care" thể hiện sự uyên bác trong việc lựa chọn từ ngữ.',
        bandImpact: 'Band 9.0 Lexical Resource',
      },
      {
        text: ' It is precisely this human rapport that instills resilience, critical thinking, and ethical integrity in young minds. Were schools to rely solely on automated algorithms, education would inevitably devolve into a sterile, impersonal exercise in rote data acquisition.',
        isHighlight: true,
        annotationType: 'grammar',
        title: 'Câu Chẻ (Cleft Sentence) & Đảo Ngữ Câu Điều Kiện Loại 2',
        explanationVi: 'Kết hợp câu chẻ nhấn mạnh "It is precisely this human rapport that..." và đảo ngữ điều kiện giả định "Were schools to rely solely on..." khẳng định lập luận vững chắc.',
        bandImpact: 'Band 9.0 Grammatical Range & Accuracy',
      },
      {
        text: '\n\nIn conclusion, while artificial intelligence will unquestionably serve as an indispensable pedagogical aid that augments teaching efficacy, it cannot serve as a surrogate for human educators. The future of schooling lies in a synergistic symbiosis between algorithmic tools and empathetic human mentors.',
        isHighlight: true,
        annotationType: 'cohesion',
        title: 'Kết Bài Tổng Kết & Cụm Từ "Synergistic Symbiosis" Đắt Giá',
        explanationVi: 'Kết bài tóm tắt toàn bộ lập trường và kết lại bằng khái niệm "synergistic symbiosis" (sự cộng sinh tương hỗ) tạo ấn tượng sâu đậm cho giám khảo.',
        bandImpact: 'Band 8.5 Coherence & Task Response',
      },
    ],
    vocabularyGlossary: [
      { phrase: 'precipitated a contentious debate', meaningVi: 'Làm bùng nổ một cuộc tranh luận gay gắt', level: 'C2', usageTip: 'Cụm mở bài học thuật cực mạnh cho dạng đề Agree/Disagree.' },
      { phrase: 'tailored curricular pathways', meaningVi: 'Lộ trình học tập được may đo riêng biệt', level: 'C2', usageTip: 'Collocation cao cấp chủ đề Giáo dục & Cá nhân hóa.' },
      { phrase: 'pastoral care', meaningVi: 'Sự chăm sóc tâm lý và hướng dẫn tinh thần cho học sinh', level: 'C2', usageTip: 'Thuật ngữ sư phạm chuyên sâu của Anh/Úc.' },
      { phrase: 'synergistic symbiosis', meaningVi: 'Mối quan hệ cộng sinh tương hỗ cùng phát triển', level: 'C2', usageTip: 'Cụm từ C2 dùng để chốt bài khi nói về sự hợp tác giữa Công nghệ và Con người.' },
    ],
  },

  // --------------------------------------------------------------------------
  // MODEL 3: SPEAKING PART 2 & PART 3 (BAND 8.5) - EDUCATION / TECHNOLOGY
  // --------------------------------------------------------------------------
  {
    id: 'model_sp_tech_innovation',
    skill: 'speaking',
    taskType: 'Speaking Part 2',
    topicVi: 'Một Đột Phá Công Nghệ Thay Đổi Cuộc Sống (Speaking Part 2 & 3)',
    questionPrompt:
      'Describe a technological innovation that has significantly changed people\'s daily lives.\nYou should say:\n- What the innovation is\n- When and how you first learned about it\n- How people use it in their daily routines\n- And explain why you consider this innovation to be so transformative.',
    targetBand: 8.5,
    examinerOverviewVi:
      'Bài nói thể hiện trọn vẹn sự lưu loát tự nhiên (Natural Fluency), nối âm và ngữ điệu biểu cảm chuẩn bản xứ. Thí sinh sử dụng ngôn ngữ liên kết thời gian xuất sắc, chuyển ý mượt mà từ trải nghiệm ban đầu đến phân tích tác động sâu rộng của công nghệ dịch thuật thời gian thực.',
    criteriaAnalysis: {
      criterion1Name: 'Fluency & Coherence',
      criterion1Score: 8.5,
      criterion1Notes: 'Tốc độ nói đều đặn, không có quãng nghỉ do ngập ngừng tìm từ. Sử dụng các từ chỉ dẫn tự nhiên: "To kick things off", "What truly sets it apart", "Looking at the broader picture".',
      criterion2Name: 'Lexical Resource',
      criterion2Score: 8.5,
      criterion2Notes: 'Vốn từ vựng tự nhiên và thành ngữ đúng ngữ cảnh: "game-changer", "bridged the linguistic chasm", "seamless real-time transcription", "digital divide".',
      criterion3Name: 'Grammatical Range & Accuracy',
      criterion3Score: 8.5,
      criterion3Notes: 'Cấu trúc câu phong phú: Đảo ngữ, Mệnh đề quan hệ không xác định, Câu điều kiện hỗn hợp.',
      criterion4Name: 'Pronunciation',
      criterion4Score: 8.5,
      criterion4Notes: 'Phát âm chuẩn xác từng âm vị, ngữ điệu lên xuống có chủ đích để nhấn mạnh trọng âm ý (Sentence Stress).',
    },
    annotatedSegments: [
      {
        text: 'To kick things off, the technological breakthrough that immediately springs to mind is real-time AI neural machine translation, exemplified by tools like DeepL and live speech interpreters.',
        isHighlight: true,
        annotationType: 'cohesion',
        title: 'Mở Đầu Tự Nhiên & Nêu Rõ Đề Tài (Part 2 Starter)',
        explanationVi: '"To kick things off" và "immediately springs to mind" là các cụm từ đệm tự nhiên (Idiomatic fillers) giúp bài nói không bị khô cứng.',
        bandImpact: 'Band 8.5 Fluency & Coherence',
      },
      {
        text: ' If memory serves me right, I first stumbled upon this technology roughly four years ago during an international student conference in Tokyo. Back then, I was thoroughly astonished to see live multilingual captions projected onto giant screens with virtually zero latency, enabling delegates from over 30 countries to converse effortlessly without a human interpreter.',
        isHighlight: true,
        annotationType: 'grammar',
        title: 'Cấu Trúc Thời Gian & Mệnh Đề Phân Từ Chỉ Kết Quả',
        explanationVi: 'Kết hợp cụm "If memory serves me right", tính từ "thoroughly astonished" và mệnh đề phân từ "...with virtually zero latency, enabling delegates..." tạo độ liên kết tuyệt vời.',
        bandImpact: 'Band 9.0 Grammatical Range',
      },
      {
        text: '\n\nIn our day-to-day routines, this innovation has essentially democratised global communication. Professionals can now draft correspondence to overseas clients with pristine nuance, whilst tourists can effortlessly navigate foreign signage and menus simply by pointing their smartphone camera at the text.',
        isHighlight: true,
        annotationType: 'vocab',
        title: 'Từ Vựng Học Thuật & Thành Ngữ Tự Nhiên',
        explanationVi: '"democratised global communication", "draft correspondence", "pristine nuance", "effortlessly navigate" là các cụm collocation tự nhiên của người bản xứ.',
        bandImpact: 'Band 8.5 Lexical Resource',
      },
      {
        text: '\n\nThe fundamental reason why I deem this technology so revolutionary is that it has effectively bridged the ancient linguistic chasm that historically segregated cultures. Had we not possessed these algorithmic linguistic engines, cross-border academic collaboration and emergency humanitarian aid would remain significantly hindered by language friction.',
        isHighlight: true,
        annotationType: 'grammar',
        title: 'Đảo Ngữ Câu Điều Kiện Loại 3 (Inversion Conditional)',
        explanationVi: '"Had we not possessed these algorithmic linguistic engines, cross-border collaboration... would remain hindered" là cấu trúc câu điều kiện hỗn hợp đảo ngữ cực kỳ ấn tượng trong Speaking!',
        bandImpact: 'Band 9.0 Grammatical Range & Accuracy',
      },
    ],
    vocabularyGlossary: [
      { phrase: 'springs to mind', meaningVi: 'Nảy ra ngay trong đầu', level: 'C1', usageTip: 'Cụm thành ngữ tự nhiên để bắt đầu Part 2.' },
      { phrase: 'stumbled upon', meaningVi: 'Tình cờ biết đến / bắt gặp', level: 'C1', usageTip: 'Dùng thay cho "I found / I saw".' },
      { phrase: 'virtually zero latency', meaningVi: 'Độ trễ gần như bằng không', level: 'C2', usageTip: 'Thuật ngữ miêu tả tốc độ công nghệ tức thì.' },
      { phrase: 'bridged the linguistic chasm', meaningVi: 'Xóa nhòa khoảng cách ngăn cách ngôn ngữ', level: 'C2', usageTip: 'Hình ảnh ẩn dụ xuất sắc cho chủ đề Giao tiếp quốc tế.' },
    ],
  },
];

// ============================================================================
// 5. COMMON PITFALLS & TRAPS (SỔ TAY BẪY VÀ LỖI THƯỜNG GẶP THEO KỸ NĂNG)
// ============================================================================
export const COMMON_PITFALLS_DATA: CommonPitfallTrap[] = [
  {
    id: 'pitfall_listening_plural',
    skill: 'listening',
    trapTitle: 'Bỏ quên âm đuôi số nhiều "-s" hoặc "-es" trong bài điền từ',
    impactBand: 'Mất 0.5 - 1.0 Band',
    dangerLevel: 'critical',
    frequency: 'Rất phổ biến (>70% thí sinh mắc)',
    howTrapWorks:
      'Trong audio, người nói phát âm âm "-s" rất nhẹ hoặc nuốt âm nhanh. Thí sinh nghe ra đúng từ gốc nhưng chỉ ghi dạng số ít vào giấy thi. Theo quy định chấm của Cambridge, sai dạng số nhiều sẽ bị tính là SAI HOÀN TOÀN (0 điểm).',
    riskyExample:
      'Đề bài: "Participants need to bring their own __________." | Thí sinh nghe thấy "notebook" và ghi "notebook" -> SAI vì audio nói "notebooks" (số nhiều).',
    highBandSolution:
      'Quan sát ngữ pháp xung quanh chỗ trống TRƯỚC KHI NGHE: Nếu không có mạo từ "a/an" phía trước danh từ đếm được, khả năng 95% đó là DANH TỪ SỐ NHIỀU hoặc DANH TỪ KHÔNG ĐẾM ĐƯỢC. Luôn kiểm tra lại sự hòa hợp số ít - số nhiều trong 10 phút chuyển đáp án.',
    examinerSecretInsight:
      'Giám khảo chấm máy tính (CD-IELTS) và chấm tay đều đối chiếu đáp án khớp 100% với Bare-m. Máy tính sẽ gạch bỏ ngay lập tức nếu thiếu một chữ "s".',
  },
  {
    id: 'pitfall_reading_not_given_assumption',
    skill: 'reading',
    trapTitle: 'Lấy kiến thức đời thực để suy đoán đáp án NOT GIVEN',
    impactBand: 'Mất 1.0 - 1.5 Band',
    dangerLevel: 'critical',
    frequency: 'Rất phổ biến (>70% thí sinh mắc)',
    howTrapWorks:
      'Thí sinh đọc một nhận định thấy rất hợp lý ngoài đời thực (ví dụ: "Tập thể dục giúp giảm cân"), nhưng trong bài đọc tác giả KHÔNG HỀ đề cập đến việc giảm cân. Thí sinh tự động chọn TRUE thay vì NOT GIVEN.',
    riskyExample:
      'Bài đọc: "Green tea contains antioxidants that protect cells." | Câu hỏi: "Drinking green tea cures all types of cancer." -> Thí sinh nghĩ trà xanh tốt nên chọn TRUE, trong khi bài đọc KHÔNG nói về việc chữa tất cả bệnh ung thư -> Phải là NOT GIVEN / FALSE.',
    highBandSolution:
      'Chỉ tin vào con chữ trên trang giấy. Hãy coi như bạn là một "người ngoài hành tinh" không có bất kỳ kiến thức nào về Trái Đất. Nếu bài đọc không nói đến mối quan hệ A dẫn đến B, câu trả lời bắt buộc là NOT GIVEN.',
    examinerSecretInsight:
      'Bẫy Not Given được thiết kế chuyên biệt để đánh lừa những thí sinh đọc hiểu hời hợt và có thói quen suy diễn chủ quan.',
  },
  {
    id: 'pitfall_writing_task1_no_overview',
    skill: 'writing',
    trapTitle: 'Không viết đoạn Overview hoặc viết Overview chứa đầy số liệu',
    impactBand: 'Mất 1.0 - 1.5 Band',
    dangerLevel: 'critical',
    frequency: 'Phổ biến',
    howTrapWorks:
      'Thí sinh lao vào miêu tả chi tiết số liệu của từng năm mà không dành riêng một đoạn văn 2 câu để tóm tắt xu hướng tổng quan. Hậu quả là điểm Task Achievement bị khống chế tối đa Band 5.0.',
    riskyExample:
      'Overview viết: "Overall, in 1990 the car was 20%, then in 1995 it increased to 35%, and in 2000 it was 50%." -> Đây không phải Overview mà là liệt kê chi tiết (Detail description).',
    highBandSolution:
      'Luôn đặt đoạn Overview ngay sau Introduction. Dùng mẫu câu: "Overall, it is readily apparent that [Nhóm A] witnessed a marked upward trajectory, whereas the reverse was true for [Nhóm B]. Additionally, [X] remained the predominant category throughout the timeframe."',
    examinerSecretInsight:
      'Giám khảo khi chấm Task 1 sẽ tìm kiếm đoạn Overview ĐẦU TIÊN. Nếu không thấy câu tổng quan rõ ràng, bài thi sẽ lập tức bị kéo xuống dải điểm 5.0 Task Achievement.',
  },
  {
    id: 'pitfall_writing_task2_memorized_template',
    skill: 'writing',
    trapTitle: 'Lạm dụng các câu mở bài/thân bài học thuộc lòng sáo rỗng (Memorized Templates)',
    impactBand: 'Bị kẹt ở Band 6.0',
    dangerLevel: 'high',
    frequency: 'Rất phổ biến (>70% thí sinh mắc)',
    howTrapWorks:
      'Thí sinh dùng các mẫu câu sáo rỗng học vẹt như: "Since the dawn of human civilization, this issue has been a heated debate...", "Every coin has two sides...", "In this modern era of globalization and industrialization...".',
    riskyExample:
      '"In the contemporary era, with the rapid development of science and technology, whether students should wear uniforms has sparked a vigorous debate." -> Lố bịch và không ăn nhập với chủ đề đồng phục.',
    highBandSolution:
      'Đi thẳng vào vấn đề bằng cách Paraphrase đúng trọng tâm đề bài. Ví dụ: "The policy of mandatory school uniforms has long generated divergent perspectives among educators and parents alike."',
    examinerSecretInsight:
      'Giám khảo được đào tạo để nhận diện và BỎ QUA không tính điểm các câu học thuộc lòng sáo rỗng. Những câu này chỉ làm tốn thời gian và làm loãng mạch lập luận.',
  },
  {
    id: 'pitfall_speaking_monotone_script',
    skill: 'speaking',
    trapTitle: 'Nói giọng đều đều (Monotone) và học thuộc lòng nguyên văn bài nói',
    impactBand: 'Mất 1.0 - 1.5 Band',
    dangerLevel: 'high',
    frequency: 'Phổ biến',
    howTrapWorks:
      'Thí sinh học thuộc sẵn một bài nói Part 2 ở nhà và khi vào phòng thi nói với tốc độ cực nhanh, không hề có ngắt nghỉ tự nhiên, mắt nhìn vô định, giọng phẳng lì không có trọng âm câu (Sentence Stress).',
    riskyExample:
      'Nói một mạch 150 từ trong 45 giây như một cái máy phát thanh mà không hề giao tiếp bằng mắt (Eye contact) với giám khảo.',
    highBandSolution:
      'Học theo cụm ý tưởng (Bullet points), KHÔNG BAO GIỜ học thuộc từng câu chữ. Luyện tập ngữ điệu: Lên giọng ở vế đầu câu điều kiện, hạ giọng ở cuối câu khẳng định, nhấn mạnh vào các tính từ/trạng từ thể hiện cảm xúc.',
    examinerSecretInsight:
      'Nếu giám khảo nghi ngờ bạn đang đọc lại bài học thuộc lòng, họ có quyền ngắt lời bạn ngay lập tức và đặt những câu hỏi bẻ hướng bất ngờ để kiểm tra phản xạ thực tế.',
  },
  {
    id: 'pitfall_speaking_overused_idioms',
    skill: 'speaking',
    trapTitle: 'Gượng ép chèn thành ngữ lỗi thời (Cliche Idioms) sai ngữ cảnh',
    impactBand: 'Bị kẹt ở Band 6.0',
    dangerLevel: 'medium',
    frequency: 'Phổ biến',
    howTrapWorks:
      'Nhồi nhét các thành ngữ cũ kỹ như "Raining cats and dogs", "At the drop of a hat", "Cost an arm and a leg" vào mọi câu trả lời một cách thiếu tự nhiên.',
    riskyExample:
      '"I study IELTS at the drop of a hat and it costs an arm and a leg." -> Nghe vô cùng kỳ quặc và máy móc.',
    highBandSolution:
      'Sử dụng các cụm Collocations tự nhiên và Phrasal verbs đời thường thay vì thành ngữ sáo rỗng. Ví dụ: "heavily congested traffic", "exorbitantly priced", "stumbled upon", "come up with".',
    examinerSecretInsight:
      'Tiêu chí Lexical Resource trong Speaking đánh giá tính "tự nhiên và đúng ngữ cảnh" (Natural & Context-appropriate usage), không phải số lượng thành ngữ bạn nhồi nhét.',
  },
];
