import { FullMockTestPackage } from '../types';

export const officialMockTestPackages: FullMockTestPackage[] = [
  {
    id: 'cam_19_test_1',
    code: 'OMNI-ACAD-01',
    title: 'Omni Academic IELTS-style Mock — Set 1',
    subtitle: 'Đề thi chuẩn hóa 4 kỹ năng áp lực phòng thi thật',
    origin: 'fully_ai_generated',
    difficulty: 'Diagnostic Standard',
    description: 'Trải nghiệm chuẩn thi máy (CD-IELTS) với đầy đủ 4 phần thi liên tục: Listening (40 câu), Reading (40 câu), Writing (Task 1 & 2), Speaking phỏng vấn trực tiếp cùng Giám khảo AI.',
    estimatedMinutes: 170,
    listening: {
      title: 'IELTS Academic Listening Simulation',
      audioTranscript: `[SECTION 1: Sports Center Membership & Facility Enquiry]
Clerk: Good morning, City Riverside Sports and Wellness Center. How can I assist you today?
Applicant: Hello, I'm interested in joining the center. I recently relocated to the district and would like some information regarding membership packages.
Clerk: Fantastic! We have individual and family memberships. Let me take down your particulars first. What is your full name?
Applicant: It is Evelyn Henderson, spelled H-E-N-D-E-R-S-O-N.
Clerk: Thank you. And your primary contact telephone number?
Applicant: It is 07700 900342.
Clerk: Great. And which membership tier were you considering?
Applicant: I would like the Gold tier, which includes the heated swimming pool and the racquet squash courts.
Clerk: Excellent. The monthly fee for Gold is 45 pounds, and there is a one-time induction charge of 15 pounds.
Applicant: That sounds very reasonable. When does the introductory induction take place?
Clerk: We have slots every Tuesday at 6:30 PM and Saturday mornings at 10:00 AM.
Applicant: Saturday at 10 AM works best for me.
Clerk: Noted. Please remember to bring a padlock for your locker and suitable non-marking sports trainers.

[SECTION 2: Riverside Heritage Park Monologue & Map Guide]
Guide: Welcome everyone to the Riverside Heritage Park visitor briefing. Before you set off along the nature trails, let me orient you using our map. We are currently standing at the Main Information Pavillion right at the southern entrance. Directly to your left, west of the entrance, is the historic Watermill Cafe where you can purchase artisanal refreshments. If you follow the central cobblestone path northwards, you will cross the Wooden Footbridge over the river. Immediately after crossing the bridge on your right-hand side, letter A on your map, you will find the Rare Herb Arboretum. Continuing further north to the top end of the park, letter B marks the Falconry Observation Deck with panoramic valley vistas. On the far eastern bank, adjacent to the willow grove, letter C indicates the Children's Interactive Maze. Please note that the Botanical Glasshouse at letter D is currently undergoing restoration.

[SECTION 3: Academic Discussion on AI Ethics in Higher Education]
Professor: Welcome Mark and Chloe. Let us evaluate your joint seminar paper on ethical parameters in tertiary education. Mark, what did your survey reveal regarding student reliance on large language models?
Mark: Well Professor, over 68% of undergraduates reported utilizing generative algorithms primarily for initial brainstorming and literature synthesis, rather than generating entire essays.
Chloe: However, our data indicated a pronounced divergence in faculty attitudes. While computer science professors actively encouraged automated code verification, humanities lecturers expressed profound concern regarding cognitive atrophy and the erosion of original analytical thought.
Professor: That is a critical observation. How did you propose reconciling this pedagogical dilemma?
Mark: We argued that universities must transition from punitive detection software towards process-based assessment models, such as viva-voce examinations and reflective portfolios.

[SECTION 4: Academic Lecture on Urban Heat Islands & Megacity Cooling]
Lecturer: Good afternoon. Today we examine the microclimatic phenomenon termed the Urban Heat Island (UHI) effect. In metropolitan conglomerates with populations exceeding ten million, ambient temperatures can be up to 8 degrees Celsius warmer than adjacent rural hinterlands. The primary driver is the extensive replacement of permeable vegetative canopies with impervious, high-thermal-mass materials like asphalt and concrete. These surfaces absorb shortwave solar radiation during daylight and re-radiate longwave thermal energy continuously throughout nocturnal hours. To mitigate this thermal accumulation, contemporary urban architects are championing biophilic retrofitting. By mandating extensive green roofs and planting reflective high-albedo pavements, municipalities can substantially lower surface temperatures and reduce air conditioning energy expenditures by up to 25%.`,
      sections: [
        {
          sectionNumber: 1,
          title: 'Section 1: Sports Center Membership Registration',
          context: 'Conversation between an enquiry applicant and a center receptionist',
          audioScriptExcerpt: 'Clerk: Good morning, City Riverside Sports... Applicant: Evelyn Henderson... non-marking sports trainers.',
          instructionsVi: 'Nghe và điền vào chỗ trống. KHÔNG QUÁ HAI TỪ VÀ/HOẶC MỘT CON SỐ (NO MORE THAN TWO WORDS AND/OR A NUMBER).',
          questions: [
            {
              id: 'c19_l_1',
              number: 1,
              sectionIndex: 0,
              type: 'gap_fill',
              prompt: "Applicant's surname: _____________",
              correctAnswer: 'Henderson',
              acceptableAnswers: ['henderson', 'HENDERSON'],
              explanationVi: "Người nộp đơn đánh vần rõ ràng: H-E-N-D-E-R-S-O-N.",
              trapWarning: "Chú ý viết hoa chữ cái đầu của tên riêng.",
              locationHint: 'Đoạn đầu Section 1'
            },
            {
              id: 'c19_l_2',
              number: 2,
              sectionIndex: 0,
              type: 'gap_fill',
              prompt: "Contact telephone: 07700 _____________",
              correctAnswer: '900342',
              acceptableAnswers: ['900 342', '900-342'],
              explanationVi: "Số điện thoại được đọc rõ: 900342.",
              locationHint: 'Sau khi hỏi số điện thoại'
            },
            {
              id: 'c19_l_3',
              number: 3,
              sectionIndex: 0,
              type: 'gap_fill',
              prompt: "Chosen membership tier: _____________ tier",
              correctAnswer: 'Gold',
              acceptableAnswers: ['gold', 'GOLD'],
              explanationVi: "Applicant chọn: 'I would like the Gold tier'.",
              locationHint: 'Đoạn nói về gói thành viên'
            },
            {
              id: 'c19_l_4',
              number: 4,
              sectionIndex: 0,
              type: 'gap_fill',
              prompt: "Monthly membership fee: £_____________",
              correctAnswer: '45',
              acceptableAnswers: ['45 pounds', '45.00'],
              explanationVi: "Phí hàng tháng là 45 bảng (The monthly fee for Gold is 45 pounds).",
              trapWarning: "Không nhầm với phí gia nhập 15 pounds (induction charge).",
              locationHint: 'Đoạn báo giá'
            },
            {
              id: 'c19_l_5',
              number: 5,
              sectionIndex: 0,
              type: 'gap_fill',
              prompt: "Induction session day chosen: _____________",
              correctAnswer: 'Saturday',
              acceptableAnswers: ['saturday', 'SATURDAY'],
              explanationVi: "Applicant chọn buổi thứ Bảy: 'Saturday at 10 AM works best for me'.",
              locationHint: 'Đoạn chốt lịch hẹn'
            },
            {
              id: 'c19_l_6',
              number: 6,
              sectionIndex: 0,
              type: 'gap_fill',
              prompt: "Induction start time: _____________ AM",
              correctAnswer: '10:00',
              acceptableAnswers: ['10', '10.00', '10 am', 'ten'],
              explanationVi: "Giờ bắt đầu là 10:00 sáng.",
              locationHint: 'Đoạn nói về slot giờ'
            },
            {
              id: 'c19_l_7',
              number: 7,
              sectionIndex: 0,
              type: 'gap_fill',
              prompt: "Item to bring for locker: a _____________ ",
              correctAnswer: 'padlock',
              acceptableAnswers: ['lock', 'Padlock'],
              explanationVi: "Lễ tân dặn: 'Please remember to bring a padlock for your locker'.",
              locationHint: 'Lời dặn cuối của lễ tân'
            },
            {
              id: 'c19_l_8',
              number: 8,
              sectionIndex: 0,
              type: 'gap_fill',
              prompt: "Footwear required: _____________ trainers",
              correctAnswer: 'non-marking',
              acceptableAnswers: ['non marking', 'non-marking sports'],
              explanationVi: "Yêu cầu mang giày thể thao không để lại vệt sàn: 'non-marking sports trainers'.",
              locationHint: 'Câu cuối cùng của Section 1'
            },
            {
              id: 'c19_l_9',
              number: 9,
              sectionIndex: 0,
              type: 'multiple_choice',
              prompt: "What facility is EXCLUSIVELY included in Gold membership?",
              options: [
                'A. Free towel laundry service',
                'B. Heated swimming pool and racquet squash courts',
                'C. Personal nutritionist consultations',
                'D. Unlimited sauna and spa treatments'
              ],
              correctAnswer: 'B',
              explanationVi: "Người nộp đơn nhắc đến 'heated swimming pool and the racquet squash courts'.",
              locationHint: 'Đoạn mô tả quyền lợi Gold'
            },
            {
              id: 'c19_l_10',
              number: 10,
              sectionIndex: 0,
              type: 'multiple_choice',
              prompt: "The one-time induction charge costs:",
              options: [
                'A. £10',
                'B. £15',
                'C. £25',
                'D. £45'
              ],
              correctAnswer: 'B',
              explanationVi: "Phí mở đầu là 15 pounds ('induction charge of 15 pounds').",
              locationHint: 'Đoạn báo giá'
            }
          ]
        },
        {
          sectionNumber: 2,
          title: 'Section 2: Riverside Heritage Park Visitor Orientation',
          context: 'Tour guide briefing visitors on park landmarks and map layout',
          audioScriptExcerpt: 'Directly to your left, west of the entrance... Rare Herb Arboretum... Falconry Observation Deck...',
          instructionsVi: 'Chọn đáp án đúng nhất hoặc gắn đúng chữ cái trên bản đồ.',
          questions: [
            {
              id: 'c19_l_11',
              number: 11,
              sectionIndex: 1,
              type: 'map_labelling',
              prompt: "Location of the Rare Herb Arboretum:",
              options: ['A', 'B', 'C', 'D'],
              correctAnswer: 'A',
              explanationVi: "Hướng dẫn viên: 'Immediately after crossing the bridge on your right-hand side, letter A on your map, you will find the Rare Herb Arboretum'.",
              locationHint: 'Sau khi qua cầu gỗ'
            },
            {
              id: 'c19_l_12',
              number: 12,
              sectionIndex: 1,
              type: 'map_labelling',
              prompt: "Location of the Falconry Observation Deck:",
              options: ['A', 'B', 'C', 'D'],
              correctAnswer: 'B',
              explanationVi: "Vị trí B ở cực bắc của công viên: 'Continuing further north to the top end of the park, letter B marks the Falconry Observation Deck'.",
              locationHint: 'Cực bắc công viên'
            },
            {
              id: 'c19_l_13',
              number: 13,
              sectionIndex: 1,
              type: 'map_labelling',
              prompt: "Location of the Children's Interactive Maze:",
              options: ['A', 'B', 'C', 'D'],
              correctAnswer: 'C',
              explanationVi: "Vị trí C ở bờ phía đông: 'On the far eastern bank, adjacent to the willow grove, letter C indicates the Children\'s Interactive Maze'.",
              locationHint: 'Bờ đông công viên'
            },
            {
              id: 'c19_l_14',
              number: 14,
              sectionIndex: 1,
              type: 'map_labelling',
              prompt: "Which facility is currently CLOSED for restoration?",
              options: ['A. Watermill Cafe', 'B. Rare Herb Arboretum', 'C. Children Maze', 'D. Botanical Glasshouse'],
              correctAnswer: 'D',
              explanationVi: "Nhà kính thực vật tại điểm D đang trùng tu: 'the Botanical Glasshouse at letter D is currently undergoing restoration'.",
              locationHint: 'Câu cuối phần giới thiệu bản đồ'
            },
            {
              id: 'c19_l_15',
              number: 15,
              sectionIndex: 1,
              type: 'multiple_choice',
              prompt: "Where is the Watermill Cafe located in relation to the main entrance?",
              options: [
                'A. Directly opposite the main entrance',
                'B. To the left (west) of the southern entrance',
                'C. Next to the Falconry deck in the north',
                'D. Across the wooden footbridge'
              ],
              correctAnswer: 'B',
              explanationVi: "Hướng dẫn viên nêu: 'Directly to your left, west of the entrance, is the historic Watermill Cafe'.",
              locationHint: 'Đoạn đầu Section 2'
            },
            {
              id: 'c19_l_16',
              number: 16,
              sectionIndex: 1,
              type: 'gap_fill',
              prompt: "Visitors cross the _____________ Footbridge to reach the northern trails.",
              correctAnswer: 'Wooden',
              acceptableAnswers: ['wooden'],
              explanationVi: "Cầu qua sông là cầu gỗ: 'Wooden Footbridge'.",
              locationHint: 'Đoạn miêu tả con đường'
            },
            {
              id: 'c19_l_17',
              number: 17,
              sectionIndex: 1,
              type: 'gap_fill',
              prompt: "The Cafe specializes in selling _____________ refreshments.",
              correctAnswer: 'artisanal',
              acceptableAnswers: ['Artisanal'],
              explanationVi: "Cafe bán đồ uống thủ công/đặc sản: 'artisanal refreshments'.",
              locationHint: 'Đoạn giới thiệu Cafe'
            },
            {
              id: 'c19_l_18',
              number: 18,
              sectionIndex: 1,
              type: 'gap_fill',
              prompt: "The Falconry deck offers panoramic _____________ vistas.",
              correctAnswer: 'valley',
              acceptableAnswers: ['Valley'],
              explanationVi: "Đài quan sát nhìn ra toàn cảnh thung lũng: 'panoramic valley vistas'.",
              locationHint: 'Đoạn về Falconry Observation Deck'
            },
            {
              id: 'c19_l_19',
              number: 19,
              sectionIndex: 1,
              type: 'gap_fill',
              prompt: "The Maze is located adjacent to the _____________ grove.",
              correctAnswer: 'willow',
              acceptableAnswers: ['Willow'],
              explanationVi: "Vườn mê cung nằm cạnh rặng liễu: 'adjacent to the willow grove'.",
              locationHint: 'Đoạn miêu tả điểm C'
            },
            {
              id: 'c19_l_20',
              number: 20,
              sectionIndex: 1,
              type: 'multiple_choice',
              prompt: "What is the primary architectural feature of the main entrance?",
              options: [
                'A. A stone Gothic archway',
                'B. The Main Information Pavillion',
                'C. An automated electronic gate',
                'D. A subterranean ticket terminal'
              ],
              correctAnswer: 'B',
              explanationVi: "Đoàn đang tập trung tại 'Main Information Pavillion right at the southern entrance'.",
              locationHint: 'Câu đầu Section 2'
            }
          ]
        },
        {
          sectionNumber: 3,
          title: 'Section 3: Academic Discussion — AI in Higher Education',
          context: 'University Professor assessing student seminar research project',
          audioScriptExcerpt: 'Mark: over 68% of undergraduates reported... Chloe: faculty attitudes... viva-voce examinations...',
          instructionsVi: 'Chọn đáp án A, B, C hoặc D chính xác.',
          questions: [
            {
              id: 'c19_l_21',
              number: 21,
              sectionIndex: 2,
              type: 'multiple_choice',
              prompt: "According to Mark's survey, what proportion of students used AI primarily for brainstorming?",
              options: ['A. Exactly 50%', 'B. Under 40%', 'C. Over 68%', 'D. Nearly 90%'],
              correctAnswer: 'C',
              explanationVi: "Mark báo cáo: 'over 68% of undergraduates reported utilizing generative algorithms primarily for initial brainstorming'.",
              locationHint: 'Lời thoại đầu của Mark'
            },
            {
              id: 'c19_l_22',
              number: 22,
              sectionIndex: 2,
              type: 'multiple_choice',
              prompt: "Why were humanities lecturers particularly concerned about generative AI?",
              options: [
                'A. High subscription licensing expenses for university departments',
                'B. Potential cognitive atrophy and loss of critical analysis skills',
                'C. Inability of current servers to handle internet bandwidth',
                'D. Severe copyright infringement lawsuits from publishing houses'
              ],
              correctAnswer: 'B',
              explanationVi: "Chloe nêu rõ: 'expressed profound concern regarding cognitive atrophy and the erosion of original analytical thought'.",
              locationHint: 'Lời thoại đầu của Chloe'
            },
            {
              id: 'c19_l_23',
              number: 23,
              sectionIndex: 2,
              type: 'multiple_choice',
              prompt: "How did computer science professors react to automated tools?",
              options: [
                'A. They banned all computer labs from running the software',
                'B. They actively encouraged automated code verification',
                'C. They remained completely indifferent to the technology',
                'D. They requested disciplinary action against all users'
              ],
              correctAnswer: 'B',
              explanationVi: "Chloe nêu: 'computer science professors actively encouraged automated code verification'.",
              locationHint: 'Lời thoại đầu của Chloe'
            },
            {
              id: 'c19_l_24',
              number: 24,
              sectionIndex: 2,
              type: 'multiple_choice',
              prompt: "What alternative assessment method did Mark and Chloe recommend?",
              options: [
                'A. Standardized multiple-choice examinations',
                'B. Timed handwritten essays in isolated exam halls',
                'C. Viva-voce oral defenses and reflective learning portfolios',
                'D. Unsupervised group research assignments'
              ],
              correctAnswer: 'C',
              explanationVi: "Mark đề xuất: 'transition from punitive detection software towards process-based assessment models, such as viva-voce examinations and reflective portfolios'.",
              locationHint: 'Lời thoại cuối của Mark'
            },
            {
              id: 'c19_l_25',
              number: 25,
              sectionIndex: 2,
              type: 'gap_fill',
              prompt: "Students used algorithms mainly for brainstorming and literature _____________",
              correctAnswer: 'synthesis',
              acceptableAnswers: ['Synthesis'],
              explanationVi: "Mark nêu: 'initial brainstorming and literature synthesis'.",
              locationHint: 'Lời thoại của Mark'
            },
            {
              id: 'c19_l_26',
              number: 26,
              sectionIndex: 2,
              type: 'gap_fill',
              prompt: "Humanities faculty feared cognitive atrophy and erosion of _____________ thought.",
              correctAnswer: 'analytical',
              acceptableAnswers: ['original analytical', 'Analytical'],
              explanationVi: "Từ cần điền là 'analytical' ('erosion of original analytical thought').",
              locationHint: 'Lời thoại của Chloe'
            },
            {
              id: 'c19_l_27',
              number: 27,
              sectionIndex: 2,
              type: 'gap_fill',
              prompt: "Computer science faculty promoted automated code _____________.",
              correctAnswer: 'verification',
              acceptableAnswers: ['Verification'],
              explanationVi: "Từ trong bài: 'automated code verification'.",
              locationHint: 'Lời thoại của Chloe'
            },
            {
              id: 'c19_l_28',
              number: 28,
              sectionIndex: 2,
              type: 'gap_fill',
              prompt: "The speakers recommend replacing _____________ detection software.",
              correctAnswer: 'punitive',
              acceptableAnswers: ['Punitive'],
              explanationVi: "Từ trong bài: 'punitive detection software'.",
              locationHint: 'Đoạn cuối Section 3'
            },
            {
              id: 'c19_l_29',
              number: 29,
              sectionIndex: 2,
              type: 'multiple_choice',
              prompt: "What was the Professor's assessment of their core finding?",
              options: [
                'A. It lacked empirical rigor',
                'B. It was a critical and insightful observation',
                'C. It duplicated existing published papers',
                'D. It was irrelevant to modern curriculum design'
              ],
              correctAnswer: 'B',
              explanationVi: "Giáo sư nhận xét: 'That is a critical observation'.",
              locationHint: 'Lời thoại của Giáo sư'
            },
            {
              id: 'c19_l_30',
              number: 30,
              sectionIndex: 2,
              type: 'multiple_choice',
              prompt: "The term 'viva-voce' refers to:",
              options: [
                'A. Automated coding tests',
                'B. Oral defense / verbal examination',
                'C. Anonymous peer review',
                'D. Online open-book quiz'
              ],
              correctAnswer: 'B',
              explanationVi: "Viva-voce là hình thức thi vấn đáp trực tiếp.",
              locationHint: 'Khái niệm trong Section 3'
            }
          ]
        },
        {
          sectionNumber: 4,
          title: 'Section 4: Academic Lecture — Urban Heat Islands & Megacity Cooling',
          context: 'Monologue academic lecture on microclimate thermodynamics and biophilic design',
          audioScriptExcerpt: 'Urban Heat Island (UHI) effect... temperatures can be up to 8 degrees Celsius warmer... high-albedo pavements...',
          instructionsVi: 'Điền từ vào chỗ trống. KHÔNG QUÁ HAI TỪ VÀ/HOẶC MỘT CON SỐ.',
          questions: [
            {
              id: 'c19_l_31',
              number: 31,
              sectionIndex: 3,
              type: 'gap_fill',
              prompt: "Megacities can be up to _____________ degrees Celsius warmer than rural zones.",
              correctAnswer: '8',
              acceptableAnswers: ['eight', '8°C', '8 degrees'],
              explanationVi: "Giảng viên nêu: 'temperatures can be up to 8 degrees Celsius warmer'.",
              locationHint: 'Đoạn đầu Section 4'
            },
            {
              id: 'c19_l_32',
              number: 32,
              sectionIndex: 3,
              type: 'gap_fill',
              prompt: "Vegetative canopies are replaced by _____________ and concrete.",
              correctAnswer: 'asphalt',
              acceptableAnswers: ['Asphalt'],
              explanationVi: "Vật liệu được nhắc đến: 'impervious, high-thermal-mass materials like asphalt and concrete'.",
              locationHint: 'Đoạn nguyên nhân nhiệt đô thị'
            },
            {
              id: 'c19_l_33',
              number: 33,
              sectionIndex: 3,
              type: 'gap_fill',
              prompt: "Urban materials absorb _____________ solar radiation during daytime.",
              correctAnswer: 'shortwave',
              acceptableAnswers: ['Shortwave'],
              explanationVi: "Bức xạ ban ngày là sóng ngắn: 'absorb shortwave solar radiation'.",
              locationHint: 'Đoạn phân tích bức xạ nhiệt'
            },
            {
              id: 'c19_l_34',
              number: 34,
              sectionIndex: 3,
              type: 'gap_fill',
              prompt: "Thermal energy is re-radiated continuously during _____________ hours.",
              correctAnswer: 'nocturnal',
              acceptableAnswers: ['night', 'nighttime', 'Nocturnal'],
              explanationVi: "Nhiệt tỏa ra liên tục ban đêm: 'nocturnal hours'.",
              locationHint: 'Đoạn miêu tả ban đêm'
            },
            {
              id: 'c19_l_35',
              number: 35,
              sectionIndex: 3,
              type: 'gap_fill',
              prompt: "Architects champion _____________ retrofitting to cool urban spaces.",
              correctAnswer: 'biophilic',
              acceptableAnswers: ['Biophilic'],
              explanationVi: "Thuật ngữ kiến trúc: 'championing biophilic retrofitting'.",
              locationHint: 'Đoạn giải pháp'
            },
            {
              id: 'c19_l_36',
              number: 36,
              sectionIndex: 3,
              type: 'gap_fill',
              prompt: "Cities mandate the installation of extensive _____________ roofs.",
              correctAnswer: 'green',
              acceptableAnswers: ['Green'],
              explanationVi: "Mái nhà xanh: 'mandating extensive green roofs'.",
              locationHint: 'Đoạn các biện pháp cụ thể'
            },
            {
              id: 'c19_l_37',
              number: 37,
              sectionIndex: 3,
              type: 'gap_fill',
              prompt: "Pavements should possess high-_____________ reflective properties.",
              correctAnswer: 'albedo',
              acceptableAnswers: ['Albedo'],
              explanationVi: "Khả năng phản xạ ánh sáng: 'high-albedo pavements'.",
              locationHint: 'Đoạn nói về vỉa hè'
            },
            {
              id: 'c19_l_38',
              number: 38,
              sectionIndex: 3,
              type: 'gap_fill',
              prompt: "Cooling measures can reduce air conditioning expenditures by up to _____________%.",
              correctAnswer: '25',
              acceptableAnswers: ['25%', 'twenty-five'],
              explanationVi: "Tiết kiệm tới 25%: 'reduce air conditioning energy expenditures by up to 25%'.",
              locationHint: 'Câu cuối bài giảng'
            },
            {
              id: 'c19_l_39',
              number: 39,
              sectionIndex: 3,
              type: 'multiple_choice',
              prompt: "What is the primary thermodynamic cause of nocturnal heat retention in cities?",
              options: [
                'A. Excess heat from subterranean underground rail networks',
                'B. Continuous release of longwave thermal radiation stored in dense materials',
                'C. Industrial chemical manufacturing along river basins',
                'D. High density of domestic refrigeration units'
              ],
              correctAnswer: 'B',
              explanationVi: "Bài giảng nêu rõ vật liệu có khối lượng nhiệt lớn hấp thụ bức xạ ban ngày và tỏa bức xạ sóng dài liên tục về đêm.",
              locationHint: 'Đoạn giữa Section 4'
            },
            {
              id: 'c19_l_40',
              number: 40,
              sectionIndex: 3,
              type: 'multiple_choice',
              prompt: "The term 'megacities' in this lecture defines urban conglomerates exceeding:",
              options: [
                'A. 2 million residents',
                'B. 5 million residents',
                'C. 10 million residents',
                'D. 25 million residents'
              ],
              correctAnswer: 'C',
              explanationVi: "Định nghĩa trong bài: 'metropolitan conglomerates with populations exceeding ten million'.",
              locationHint: 'Đoạn đầu Section 4'
            }
          ]
        }
      ]
    },
    reading: {
      title: 'IELTS Academic Reading Simulation (60 Minutes)',
      passages: [
        {
          passageNumber: 1,
          title: 'Passage 1: The Evolution of the Adhesive Postage Stamp and Postal Reforms',
          subtitle: 'How Rowland Hill’s radical uniform penny post transformed global communication',
          wordCount: 820,
          paragraphs: [
            {
              label: 'A',
              text: 'Prior to the mid-nineteenth century, the postal system in Great Britain was notoriously labyrinthine, exorbitantly expensive, and fraught with systemic inefficiencies. Postal rates were calculated based on a bewildering matrix of distance traveled and the number of individual sheets of paper comprising the correspondence. Crucially, the prevailing convention dictated that the recipient—rather than the sender—bore the financial liability of postage upon delivery. This protocol resulted in staggering operational losses for the General Post Office, as recipients frequently refused to accept letters after inspecting coded symbols covertly penned on the envelope by the sender.'
            },
            {
              label: 'B',
              text: 'In 1837, an English educator and social reformer named Rowland Hill published a seminal pamphlet entitled "Post Office Reform: Its Importance and Practicability". Hill posited that the actual cost of transporting a letter between distant cities was virtually negligible compared to the exorbitant administrative expenses incurred by collecting charges upon delivery. He advocated for a revolutionary paradigm: an inexpensive, uniform postal rate of one penny per half-ounce, irrespective of distance throughout the United Kingdom, strictly prepaid by the sender via adhesive labels.'
            },
            {
              label: 'C',
              text: 'Despite fierce opposition from entrenched postal bureaucrats who forecasted immediate fiscal collapse, Hill’s Uniform Penny Post was officially enacted by Parliament in January 1840. On May 6, 1840, the world’s first adhesive postage stamp—the "Penny Black", featuring an engraved portrait of the young Queen Victoria—entered public circulation. The public reception was overwhelmingly enthusiastic; in 1839, approximately 76 million letters were posted across the nation, but within a single decade of the Penny Black’s debut, annual mail volume surged past 350 million items.'
            },
            {
              label: 'D',
              text: 'The socioeconomic ramifications of Hill’s innovation were profound. Inexpensive and prepaid mail democratized personal and commercial literacy, fostering intimate communication across dispersed working-class families and catalyzing unprecedented trade expansion for burgeoning industrial enterprises. The adhesive stamp mechanism was rapidly adopted internationally, with Switzerland and Brazil issuing regional stamps in 1843, followed by the United States in 1847. By standardizing postal commerce, Hill unwittingly laid the foundational architecture for modern global logistics networks.'
            }
          ],
          questions: [
            {
              id: 'c19_r_1',
              number: 1,
              sectionIndex: 0,
              type: 'true_false_not_given',
              prompt: 'Before postal reform, letter recipients were legally required to pay for postage upon receiving the mail.',
              correctAnswer: 'TRUE',
              explanationVi: "Đoạn A nêu: 'the prevailing convention dictated that the recipient—rather than the sender—bore the financial liability of postage upon delivery'.",
              locationHint: 'Đoạn A, câu 3'
            },
            {
              id: 'c19_r_2',
              number: 2,
              sectionIndex: 0,
              type: 'true_false_not_given',
              prompt: 'The Post Office made substantial profits from coded symbols inscribed on envelopes.',
              correctAnswer: 'FALSE',
              explanationVi: "Đoạn A khẳng định việc này gây thua lỗ nặng nề ('staggering operational losses') vì người nhận từ chối nhận thư sau khi nhìn ký hiệu mã hóa.",
              locationHint: 'Đoạn A, câu 4'
            },
            {
              id: 'c19_r_3',
              number: 3,
              sectionIndex: 0,
              type: 'true_false_not_given',
              prompt: 'Rowland Hill argued that the physical transport of mail was the primary operational cost for post offices.',
              correctAnswer: 'FALSE',
              explanationVi: "Đoạn B chỉ ra rằng chi phí vận chuyển là không đáng kể ('virtually negligible') so với chi phí hành chính thu tiền lúc giao hàng.",
              locationHint: 'Đoạn B, câu 2'
            },
            {
              id: 'c19_r_4',
              number: 4,
              sectionIndex: 0,
              type: 'true_false_not_given',
              prompt: 'The British postal bureaucracy immediately embraced Rowland Hill’s recommendations without dispute.',
              correctAnswer: 'FALSE',
              explanationVi: "Đoạn C nêu: 'Despite fierce opposition from entrenched postal bureaucrats who forecasted immediate fiscal collapse...'.",
              locationHint: 'Đoạn C, câu 1'
            },
            {
              id: 'c19_r_5',
              number: 5,
              sectionIndex: 0,
              type: 'true_false_not_given',
              prompt: 'The Penny Black featured a portrait of Queen Victoria in her senior years.',
              correctAnswer: 'FALSE',
              explanationVi: "Đoạn C nêu rõ chân dung là thời trẻ ('engraved portrait of the young Queen Victoria').",
              locationHint: 'Đoạn C, câu 2'
            },
            {
              id: 'c19_r_6',
              number: 6,
              sectionIndex: 0,
              type: 'true_false_not_given',
              prompt: 'The United States was the first international nation to adopt adhesive postage stamps.',
              correctAnswer: 'FALSE',
              explanationVi: "Đoạn D nêu Thụy Sĩ và Brazil phát hành tem năm 1843, trước khi Mỹ phát hành năm 1847.",
              locationHint: 'Đoạn D, câu 3'
            },
            {
              id: 'c19_r_7',
              number: 7,
              sectionIndex: 0,
              type: 'true_false_not_given',
              prompt: 'Rowland Hill received a royal knighthood for his contributions to British postal reform.',
              correctAnswer: 'NOT GIVEN',
              explanationVi: "Bài đọc không đề cập đến việc Rowland Hill có được phong tước hiệp sĩ hay không.",
              locationHint: 'Toàn bộ bài đọc'
            },
            {
              id: 'c19_r_8',
              number: 8,
              sectionIndex: 0,
              type: 'gap_fill',
              prompt: 'In 1837, Rowland Hill published a seminal _____________ detailing postal inefficiency.',
              correctAnswer: 'pamphlet',
              acceptableAnswers: ['Pamphlet'],
              explanationVi: "Từ trong đoạn B: 'published a seminal pamphlet'.",
              locationHint: 'Đoạn B, câu 1'
            },
            {
              id: 'c19_r_9',
              number: 9,
              sectionIndex: 0,
              type: 'gap_fill',
              prompt: 'Hill proposed a uniform charge of one _____________ per half-ounce.',
              correctAnswer: 'penny',
              acceptableAnswers: ['Penny', 'pence'],
              explanationVi: "Mức cước đồng giá một xu: 'uniform postal rate of one penny per half-ounce'.",
              locationHint: 'Đoạn B, câu 3'
            },
            {
              id: 'c19_r_10',
              number: 10,
              sectionIndex: 0,
              type: 'gap_fill',
              prompt: 'The first adhesive postage stamp was officially named the _____________ Black.',
              correctAnswer: 'Penny',
              acceptableAnswers: ['penny'],
              explanationVi: "Tên con tem: 'Penny Black'.",
              locationHint: 'Đoạn C, câu 2'
            },
            {
              id: 'c19_r_11',
              number: 11,
              sectionIndex: 0,
              type: 'gap_fill',
              prompt: 'Annual mail volume exceeded _____________ million items within a decade of the reform.',
              correctAnswer: '350',
              acceptableAnswers: ['350 million'],
              explanationVi: "Số liệu trong đoạn C: 'annual mail volume surged past 350 million items'.",
              locationHint: 'Đoạn C, câu 3'
            },
            {
              id: 'c19_r_12',
              number: 12,
              sectionIndex: 0,
              type: 'multiple_choice',
              prompt: 'What was the primary socioeconomic benefit of uniform cheap postage in Britain?',
              options: [
                'A. It forced private courier companies out of business',
                'B. It democratized literacy and facilitated trade across working-class communities',
                'C. It drastically reduced government tax revenue from print media',
                'D. It eliminated the need for railways to transport physical mail'
              ],
              correctAnswer: 'B',
              explanationVi: "Đoạn D nêu: 'democratized personal and commercial literacy, fostering intimate communication... and catalyzing unprecedented trade expansion'.",
              locationHint: 'Đoạn D, câu 1'
            },
            {
              id: 'c19_r_13',
              number: 13,
              sectionIndex: 0,
              type: 'multiple_choice',
              prompt: 'Which two territories issued regional adhesive stamps in 1843?',
              options: [
                'A. France and Germany',
                'B. Switzerland and Brazil',
                'C. United States and Canada',
                'D. Australia and New Zealand'
              ],
              correctAnswer: 'B',
              explanationVi: "Đoạn D ghi rõ: 'Switzerland and Brazil issuing regional stamps in 1843'.",
              locationHint: 'Đoạn D, câu 3'
            }
          ]
        },
        {
          passageNumber: 2,
          title: 'Passage 2: Biomimicry — Nature’s Masterclass in Engineering Innovation',
          subtitle: 'How biological adaptations solve human technological and structural bottlenecks',
          wordCount: 910,
          headingsList: [
            { id: 'i', text: 'Aerodynamic lessons from aquatic apex predators' },
            { id: 'ii', text: 'Passive thermoregulation inspired by insect architecture' },
            { id: 'iii', text: 'Structural colouration and non-toxic chromatic engineering' },
            { id: 'iv', text: 'Self-cleaning hydrophobic microstructures in botany' },
            { id: 'v', text: 'A philosophical critique of artificial intelligence' },
            { id: 'vi', text: 'Adhesive mechanics derived from gecko toe pads' }
          ],
          paragraphs: [
            {
              label: 'A',
              text: 'Biomimicry—the practice of emulating nature’s time-tested designs to resolve complex human challenges—has transitioned from an eccentric interdisciplinary curiosity into a cornerstone of sustainable industrial engineering. Organisms have undergone roughly 3.8 billion years of rigorous evolutionary optimization through natural selection, resulting in biological systems characterized by peerless resource efficiency, structural resilience, and zero synthetic waste generation.'
            },
            {
              label: 'B',
              text: 'Consider the Eastgate Centre, an architectural landmark in Harare, Zimbabwe. Rather than relying on power-hungry mechanical air conditioning in an extreme sub-Saharan climate, architect Mick Pearce modeled the building’s ventilation after indigenous termite mounds. Termites construct elaborate chimney networks that continuously vent accumulated metabolic heat while drawing cooler air through subterranean tunnels, maintaining an interior temperature stable within 1 degree Celsius. The Eastgate Centre consumes 90% less energy than conventionally cooled commercial buildings of equivalent scale.'
            },
            {
              label: 'C',
              text: 'In the domain of transportation engineering, Japanese Shinkansen bullet trains historically generated deafening sonic booms whenever exiting tunnels due to rapid air pressure displacement at high velocity. Chief engineer and avid ornithologist Eiji Nakatsu resolved this aerodynamic dilemma by redesigning the locomotive’s nose cone after the streamlined beak of the kingfisher bird, which dives seamlessly from air into dense water with virtually zero splash. The bio-inspired redesign not only eliminated sonic shockwaves but also increased speed by 10% and curtailed electricity consumption by 15%.'
            },
            {
              label: 'D',
              text: 'Similarly, the surface of the sacred lotus leaf (Nelumbo nucifera) exhibits extraordinary hydrophobic properties. Under high-resolution electron microscopy, the leaf’s epidermis reveals microscopic conical papillae coated with hydrophobic epicuticular waxes. Water droplets roll effortlessly across the undulating surface, entrapping dirt particles and fungal spores in a continuous self-cleaning mechanism termed the "Lotus Effect". Material scientists have synthesized biomimetic exterior paints and solar panel coatings that maintain immaculate optical clarity without requiring harsh detergents.'
            }
          ],
          questions: [
            {
              id: 'c19_r_14',
              number: 14,
              sectionIndex: 1,
              type: 'matching_headings',
              prompt: 'Which heading best matches Paragraph B?',
              options: ['i', 'ii', 'iii', 'iv', 'v', 'vi'],
              correctAnswer: 'ii',
              explanationVi: "Đoạn B nói về điều hòa nhiệt thụ động mô phỏng tổ mối ('Passive thermoregulation inspired by insect architecture').",
              locationHint: 'Đoạn B'
            },
            {
              id: 'c19_r_15',
              number: 15,
              sectionIndex: 1,
              type: 'matching_headings',
              prompt: 'Which heading best matches Paragraph C?',
              options: ['i', 'ii', 'iii', 'iv', 'v', 'vi'],
              correctAnswer: 'i',
              explanationVi: "Đoạn C nói về khí động học và mỏ chim bói cá ('Aerodynamic lessons from aquatic apex predators' / avian aerodynamics).",
              locationHint: 'Đoạn C'
            },
            {
              id: 'c19_r_16',
              number: 16,
              sectionIndex: 1,
              type: 'matching_headings',
              prompt: 'Which heading best matches Paragraph D?',
              options: ['i', 'ii', 'iii', 'iv', 'v', 'vi'],
              correctAnswer: 'iv',
              explanationVi: "Đoạn D nói về cấu trúc kỵ nước tự làm sạch của lá sen ('Self-cleaning hydrophobic microstructures in botany').",
              locationHint: 'Đoạn D'
            },
            {
              id: 'c19_r_17',
              number: 17,
              sectionIndex: 1,
              type: 'gap_fill',
              prompt: 'Architect Mick Pearce modeled the Eastgate Centre after _____________ mounds.',
              correctAnswer: 'termite',
              acceptableAnswers: ['Termite'],
              explanationVi: "Công trình mô phỏng tổ mối: 'termite mounds'.",
              locationHint: 'Đoạn B, câu 2'
            },
            {
              id: 'c19_r_18',
              number: 18,
              sectionIndex: 1,
              type: 'gap_fill',
              prompt: 'The Eastgate Centre consumes _____________ % less energy than conventional complexes.',
              correctAnswer: '90',
              acceptableAnswers: ['90%', 'ninety'],
              explanationVi: "Tiết kiệm 90% năng lượng: 'consumes 90% less energy'.",
              locationHint: 'Đoạn B, câu cuối'
            },
            {
              id: 'c19_r_19',
              number: 19,
              sectionIndex: 1,
              type: 'gap_fill',
              prompt: 'The Shinkansen train nose was redesigned after the beak of the _____________ bird.',
              correctAnswer: 'kingfisher',
              acceptableAnswers: ['Kingfisher'],
              explanationVi: "Mô phỏng mỏ chim bói cá: 'beak of the kingfisher bird'.",
              locationHint: 'Đoạn C, câu 2'
            },
            {
              id: 'c19_r_20',
              number: 20,
              sectionIndex: 1,
              type: 'gap_fill',
              prompt: 'The kingfisher design lowered electricity consumption by _____________ %.',
              correctAnswer: '15',
              acceptableAnswers: ['15%', 'fifteen'],
              explanationVi: "Giảm 15% điện năng: 'curtailed electricity consumption by 15%'.",
              locationHint: 'Đoạn C, câu cuối'
            },
            {
              id: 'c19_r_21',
              number: 21,
              sectionIndex: 1,
              type: 'gap_fill',
              prompt: 'The self-cleaning phenomenon on lotus leaves is known as the Lotus _____________ .',
              correctAnswer: 'Effect',
              acceptableAnswers: ['effect'],
              explanationVi: "Hiện tượng có tên là 'Lotus Effect'.",
              locationHint: 'Đoạn D, câu 3'
            },
            {
              id: 'c19_r_22',
              number: 22,
              sectionIndex: 1,
              type: 'multiple_choice',
              prompt: 'How long has natural biological optimization taken place according to Paragraph A?',
              options: ['A. 3.8 million years', 'B. 3.8 billion years', 'C. 500 million years', 'D. 100 billion years'],
              correctAnswer: 'B',
              explanationVi: "Đoạn A nêu: 'roughly 3.8 billion years of rigorous evolutionary optimization'.",
              locationHint: 'Đoạn A, câu 2'
            },
            {
              id: 'c19_r_23',
              number: 23,
              sectionIndex: 1,
              type: 'true_false_not_given',
              prompt: 'The Eastgate Centre relies on synthetic fluorocarbon refrigerants during summer peaks.',
              correctAnswer: 'FALSE',
              explanationVi: "Đoạn B nêu rõ tòa nhà không dùng máy lạnh cơ học ('Rather than relying on power-hungry mechanical air conditioning').",
              locationHint: 'Đoạn B, câu 2'
            },
            {
              id: 'c19_r_24',
              number: 24,
              sectionIndex: 1,
              type: 'true_false_not_given',
              prompt: 'The Shinkansen train speed increased after the aerodynamic nose redesign.',
              correctAnswer: 'TRUE',
              explanationVi: "Đoạn C nêu tốc độ tăng 10%: 'increased speed by 10%'.",
              locationHint: 'Đoạn C, câu cuối'
            },
            {
              id: 'c19_r_25',
              number: 25,
              sectionIndex: 1,
              type: 'true_false_not_given',
              prompt: 'Lotus leaves require chemical cleaning detergents once every month.',
              correctAnswer: 'FALSE',
              explanationVi: "Đoạn D nêu cấu trúc tự làm sạch không cần chất tẩy rửa ('without requiring harsh detergents').",
              locationHint: 'Đoạn D, câu cuối'
            },
            {
              id: 'c19_r_26',
              number: 26,
              sectionIndex: 1,
              type: 'multiple_choice',
              prompt: 'Which commercial application of the Lotus Effect is highlighted in Paragraph D?',
              options: [
                'A. Fire-resistant textiles',
                'B. Self-cleaning exterior paints and solar panel coatings',
                'C. Submarine hulls reducing acoustic sonar detection',
                'D. Surgical implants preventing blood coagulation'
              ],
              correctAnswer: 'B',
              explanationVi: "Đoạn D nêu rõ: 'synthesized biomimetic exterior paints and solar panel coatings'.",
              locationHint: 'Đoạn D, câu cuối'
            }
          ]
        },
        {
          passageNumber: 3,
          title: 'Passage 3: The Neurological Architecture of Memory Consolidation',
          subtitle: 'Spaced repetition, synaptic plasticity, and the fight against the forgetting curve',
          wordCount: 980,
          paragraphs: [
            {
              label: 'A',
              text: 'In 1885, German experimental psychologist Hermann Ebbinghaus published his landmark monograph "Über das Gedächtnis" (Memory), establishing the empirical foundation of cognitive retention studies. Through meticulous self-experimentation with nonsense syllables, Ebbinghaus charted the mathematical trajectory of memory decay, termed the "Forgetting Curve". His findings revealed that newly acquired declarative information deteriorates exponentially: without deliberate reinforcement, humans lose approximately 50% of newly memorized material within 24 hours, and up to 75% within a single week.'
            },
            {
              label: 'B',
              text: 'Contemporary neurobiology has illuminated the biological mechanisms underpinning Ebbinghaus’s initial observations. The hippocampus—a seahorse-shaped structure situated in the medial temporal lobe—serves as the brain’s temporary mnemonic buffer. Newly formed experiences trigger Long-Term Potentiation (LTP), strengthening synaptic connections between hippocampal neurons through neurotransmitter cascades involving glutamate and NMDA receptors. However, hippocampal storage remains inherently volatile and metabolically expensive.'
            },
            {
              label: 'C',
              text: 'For memories to attain permanent durability, they must undergo systems consolidation, migrating from the fragile hippocampus to the extensive neural architecture of the neocortex. This structural migration occurs predominantly during slow-wave non-REM sleep, orchestrated by synchronized sharp-wave ripples. By spacing learning intervals progressively over expanding increments of time (Spaced Retrieval Practice), learners reactivate hippocampal-cortical circuits just as forgetting begins. This optimal cognitive friction triggers structural protein synthesis, converting transient memory traces into stable cortical engrams.'
            }
          ],
          questions: [
            {
              id: 'c19_r_27',
              number: 27,
              sectionIndex: 2,
              type: 'true_false_not_given',
              prompt: 'Hermann Ebbinghaus conducted his memory decay experiments on a large sample of university students.',
              correctAnswer: 'FALSE',
              explanationVi: "Đoạn A nêu rõ Ebbinghaus tự thực nghiệm trên chính bản thân mình ('Through meticulous self-experimentation with nonsense syllables').",
              locationHint: 'Đoạn A, câu 2'
            },
            {
              id: 'c19_r_28',
              number: 28,
              sectionIndex: 2,
              type: 'true_false_not_given',
              prompt: 'According to Ebbinghaus, humans retain less than half of new information after one week without reinforcement.',
              correctAnswer: 'TRUE',
              explanationVi: "Đoạn A nêu con người mất tới 75% thông tin trong vòng 1 tuần nếu không ôn tập ('and up to 75% within a single week').",
              locationHint: 'Đoạn A, câu 3'
            },
            {
              id: 'c19_r_29',
              number: 29,
              sectionIndex: 2,
              type: 'true_false_not_given',
              prompt: 'The hippocampus is the permanent long-term storage site for all human declarative knowledge.',
              correctAnswer: 'FALSE',
              explanationVi: "Đoạn B nêu đồi hải mã chỉ là bộ nhớ đệm tạm thời ('temporary mnemonic buffer'), ký ức lâu dài phải chuyển sang vỏ não mới (neocortex).",
              locationHint: 'Đoạn B, câu 2'
            },
            {
              id: 'c19_r_30',
              number: 30,
              sectionIndex: 2,
              type: 'true_false_not_given',
              prompt: 'Systems memory consolidation happens mostly during slow-wave non-REM sleep.',
              correctAnswer: 'TRUE',
              explanationVi: "Đoạn C nêu: 'This structural migration occurs predominantly during slow-wave non-REM sleep'.",
              locationHint: 'Đoạn C, câu 2'
            },
            {
              id: 'c19_r_31',
              number: 31,
              sectionIndex: 2,
              type: 'gap_fill',
              prompt: 'Ebbinghaus plotted the mathematical decay of memory known as the _____________ Curve.',
              correctAnswer: 'Forgetting',
              acceptableAnswers: ['forgetting', 'Forgetting Curve'],
              explanationVi: "Đường cong quên lãng: 'Forgetting Curve'.",
              locationHint: 'Đoạn A, câu 2'
            },
            {
              id: 'c19_r_32',
              number: 32,
              sectionIndex: 2,
              type: 'gap_fill',
              prompt: 'The _____________ is located in the medial temporal lobe of the brain.',
              correctAnswer: 'hippocampus',
              acceptableAnswers: ['Hippocampus'],
              explanationVi: "Cấu trúc đồi hải mã: 'The hippocampus'.",
              locationHint: 'Đoạn B, câu 2'
            },
            {
              id: 'c19_r_33',
              number: 33,
              sectionIndex: 2,
              type: 'gap_fill',
              prompt: 'Synaptic connections are reinforced through Long-Term _____________ (LTP).',
              correctAnswer: 'Potentiation',
              acceptableAnswers: ['potentiation'],
              explanationVi: "Hiện tượng điện thế hóa dài hạn: 'Long-Term Potentiation (LTP)'.",
              locationHint: 'Đoạn B, câu 3'
            },
            {
              id: 'c19_r_34',
              number: 34,
              sectionIndex: 2,
              type: 'gap_fill',
              prompt: 'Permanent memories eventually reside in the _____________ layer of the brain.',
              correctAnswer: 'neocortex',
              acceptableAnswers: ['Neocortex', 'cortex'],
              explanationVi: "Vỏ não mới: 'neocortex'.",
              locationHint: 'Đoạn C, câu 1'
            },
            {
              id: 'c19_r_35',
              number: 35,
              sectionIndex: 2,
              type: 'gap_fill',
              prompt: 'Spacing intervals activates structural _____________ synthesis.',
              correctAnswer: 'protein',
              acceptableAnswers: ['Protein'],
              explanationVi: "Tổng hợp protein cấu trúc: 'structural protein synthesis'.",
              locationHint: 'Đoạn C, câu cuối'
            },
            {
              id: 'c19_r_36',
              number: 36,
              sectionIndex: 2,
              type: 'multiple_choice',
              prompt: 'What primary advantage does Spaced Retrieval Practice confer on neural circuits?',
              options: [
                'A. It completely shuts down neurotransmitter production',
                'B. It reactivates memory pathways just as forgetting commences, fortifying engrams',
                'C. It speeds up REM dream sleep duration by over 50%',
                'D. It bypasses hippocampal involvement entirely'
              ],
              correctAnswer: 'B',
              explanationVi: "Đoạn C nêu việc ôn tập ngắt quãng kích hoạt lại mạch thần kinh đúng lúc sắp quên, giúp củng cố vết ký ức thành vĩnh cửu.",
              locationHint: 'Đoạn C, câu 3'
            },
            {
              id: 'c19_r_37',
              number: 37,
              sectionIndex: 2,
              type: 'multiple_choice',
              prompt: 'The acronym LTP stands for:',
              options: [
                'A. Linear Transmission Protocol',
                'B. Long-Term Potentiation',
                'C. Lateral Temporal Plasticity',
                'D. Localized Thermal Processing'
              ],
              correctAnswer: 'B',
              explanationVi: "Đoạn B định nghĩa: 'Long-Term Potentiation (LTP)'.",
              locationHint: 'Đoạn B, câu 3'
            },
            {
              id: 'c19_r_38',
              number: 38,
              sectionIndex: 2,
              type: 'true_false_not_given',
              prompt: 'Glutamate is one of the neurotransmitters involved in synaptic strengthening.',
              correctAnswer: 'TRUE',
              explanationVi: "Đoạn B nêu rõ: 'neurotransmitter cascades involving glutamate and NMDA receptors'.",
              locationHint: 'Đoạn B, câu 3'
            },
            {
              id: 'c19_r_39',
              number: 39,
              sectionIndex: 2,
              type: 'true_false_not_given',
              prompt: 'Ebbinghaus received immediate financial sponsorship from the Prussian Royal Academy.',
              correctAnswer: 'NOT GIVEN',
              explanationVi: "Bài đọc không đề cập đến việc Ebbinghaus có nhận tài trợ tài chính từ Viện hàn lâm Hoàng gia Phổ hay không.",
              locationHint: 'Đoạn A'
            },
            {
              id: 'c19_r_40',
              number: 40,
              sectionIndex: 2,
              type: 'multiple_choice',
              prompt: 'What is the overarching conclusion regarding memory retention mechanisms?',
              options: [
                'A. Memory decay is completely irreversible regardless of strategy',
                'B. Systemic spaced reinforcement transforms vulnerable hippocampal traces into stable cortical engrams',
                'C. Sleep has zero measurable influence on memory consolidation',
                'D. Cramming immediately before exams is neurologically superior'
              ],
              correctAnswer: 'B',
              explanationVi: "Toàn bài Passage 3 nhấn mạnh vai trò của Spaced Practice và giấc ngủ trong việc chuyển đổi vết nhớ tạm thời thành ký ức dài hạn ổn định trong vỏ não.",
              locationHint: 'Đoạn C tổng kết'
            }
          ]
        }
      ]
    },
    writing: {
      title: 'IELTS Academic Writing Simulation (60 Minutes)',
      task1: {
        category: 'Line Graph',
        suggestedMinutes: 20,
        minWords: 150,
        prompt: `The line graph illustrates electricity generation (in terawatt-hours, TWh) from four renewable energy sources—Solar, Wind, Hydroelectric, and Biomass—in an industrialized country between 2010 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.`,
        chartData: {
          description: 'Electricity generation by renewable energy source (2010-2025, TWh)',
          labels: ['2010', '2013', '2016', '2019', '2022', '2025'],
          datasets: [
            { label: 'Wind Power', data: [45, 62, 85, 115, 148, 190], unit: 'TWh', color: '#0284c7' },
            { label: 'Solar Photovoltaic', data: [10, 22, 48, 88, 142, 215], unit: 'TWh', color: '#e11d48' },
            { label: 'Hydroelectric', data: [110, 112, 108, 115, 114, 118], unit: 'TWh', color: '#059669' },
            { label: 'Biomass Energy', data: [25, 30, 36, 42, 48, 52], unit: 'TWh', color: '#d97706' }
          ]
        }
      },
      task2: {
        category: 'Opinion Essay',
        suggestedMinutes: 40,
        minWords: 250,
        prompt: `Some educators believe that the rapid emergence of advanced artificial intelligence and automated tutoring systems will eventually render human teachers obsolete in schools and universities. To what extent do you agree or disagree with this statement? Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.`
      }
    },
    speaking: {
      examinerName: 'Dr. Alistair Finch',
      examinerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      part1: {
        topic: 'Daily Routine, Hometown & Technology Use',
        questions: [
          'Good morning. My name is Dr. Alistair Finch. Could you tell me your full name, please?',
          'Let us talk about your daily schedule. What is your favourite part of the day, and why?',
          'Do you prefer studying or working in the early morning or late at night?',
          'How has technology changed the way you organize your daily commitments?'
        ]
      },
      part2: {
        cueCard: {
          topic: 'An Eco-Friendly Project or Habit',
          prompt: 'Describe an environmental initiative, eco-friendly project, or sustainable habit that you personally participated in or adopted.',
          bulletPoints: [
            'What the initiative or habit was',
            'When and why you decided to get involved',
            'What challenges you encountered while sustaining it',
            'And explain how this experience influenced your personal attitude towards environmental conservation.'
          ],
          prepTimeSeconds: 60,
          speakTimeSeconds: 120
        }
      },
      part3: {
        topic: 'Global Environmental Governance & Corporate Responsibility',
        questions: [
          'To what extent should international environmental treaties be made legally binding on developing economies?',
          'Do you believe individual lifestyle adjustments (such as reducing plastic use) have a measurable impact compared to corporate emissions regulation?',
          'How can schools and educational institutions foster genuine environmental stewardship rather than superficial awareness?'
        ]
      }
    }
  },
  {
    id: 'cam_18_test_2',
    code: 'OMNI-ACAD-02',
    title: 'Omni Academic IELTS-style Mock — Set 2',
    subtitle: 'Bộ luyện tập AI-generated đủ bốn kỹ năng',
    origin: 'fully_ai_generated',
    difficulty: 'Hard (Band 7.5 - 8.5+)',
    description: 'Bộ đề thi nâng cao kiểm tra độ bền nhận thức và khả năng xử lý bẫy từ vựng C1/C2 trong phần Reading và Listening.',
    estimatedMinutes: 170,
    listening: {
      title: 'IELTS Academic Listening Test 2',
      audioTranscript: `[SECTION 1: Student Accommodation Enquiry]
Officer: Welcome to the University Housing Bureau. How can I help you?
Student: Hello, I would like to register for on-campus ensuite accommodation for the upcoming autumn term.
Officer: Certainly. May I have your student identification reference?
Student: Yes, it is STU-88421.
Officer: And your preferred hall of residence?
Student: Lancaster Court, preferably on the upper floor with garden views.
Officer: Lancaster Court requires a refundable deposit of 300 pounds.

[SECTION 2: City Library Architectural Renovation]
Director: Good afternoon members of the City Heritage Trust. Our historic central library, built in 1892, has concluded its major structural retrofitting. The new basement now hosts an interactive multimedia digital archive, while the grand rotunda on the second floor houses the rare manuscripts collection.

[SECTION 3: Renewable Marine Energy Research Project]
Supervisor: Let us review your computational modeling on tidal stream turbines. What was your primary hydrodynamic conclusion?
Student: We discovered that deploying counter-rotating blades reduced cavitation turbulence by 28% while boosting power coefficient efficiency.

[SECTION 4: Cognitive Psychology — Attention Economics in the Digital Age]
Lecturer: In contemporary psychological discourse, human attention is increasingly conceptualized as a finite, zero-sum cognitive resource. Digital platforms employ intermittent variable reinforcement schedules—identical to casino slot machines—to maximize user dwell time.`,
      sections: [
        {
          sectionNumber: 1,
          title: 'Section 1: University Accommodation Application',
          context: 'Student booking campus residence hall',
          audioScriptExcerpt: 'Student ID: STU-88421... Lancaster Court... 300 pounds deposit...',
          instructionsVi: 'Điền từ vào chỗ trống. KHÔNG QUÁ HAI TỪ VÀ/HOẶC MỘT CON SỐ.',
          questions: [
            {
              id: 'c18_l_1',
              number: 1,
              sectionIndex: 0,
              type: 'gap_fill',
              prompt: "Student ID reference: _____________",
              correctAnswer: 'STU-88421',
              acceptableAnswers: ['stu-88421', 'STU88421'],
              explanationVi: "Mã số sinh viên: STU-88421.",
              locationHint: 'Đoạn đầu'
            },
            {
              id: 'c18_l_2',
              number: 2,
              sectionIndex: 0,
              type: 'gap_fill',
              prompt: "Preferred hall of residence: _____________ Court",
              correctAnswer: 'Lancaster',
              acceptableAnswers: ['lancaster'],
              explanationVi: "Tên ký túc xá: Lancaster Court.",
              locationHint: 'Đoạn chọn phòng'
            },
            {
              id: 'c18_l_3',
              number: 3,
              sectionIndex: 0,
              type: 'gap_fill',
              prompt: "Refundable deposit amount: £_____________",
              correctAnswer: '300',
              acceptableAnswers: ['300 pounds'],
              explanationVi: "Số tiền đặt cọc là 300 bảng.",
              locationHint: 'Đoạn báo giá'
            }
          ]
        },
        {
          sectionNumber: 2,
          title: 'Section 2: City Library Architectural Renovation',
          context: 'Heritage Trust director briefing members',
          audioScriptExcerpt: '1892... basement interactive multimedia... rare manuscripts on 2nd floor...',
          instructionsVi: 'Chọn đáp án chính xác.',
          questions: [
            {
              id: 'c18_l_4',
              number: 4,
              sectionIndex: 1,
              type: 'multiple_choice',
              prompt: 'In which year was the original central library constructed?',
              options: ['A. 1845', 'B. 1892', 'C. 1920', 'D. 1954'],
              correctAnswer: 'B',
              explanationVi: "Năm xây dựng ban đầu là 1892.",
              locationHint: 'Đoạn mở đầu Section 2'
            }
          ]
        },
        {
          sectionNumber: 3,
          title: 'Section 3: Marine Energy Hydrodynamics',
          context: 'Research meeting on tidal turbine blades',
          audioScriptExcerpt: 'counter-rotating blades reduced cavitation turbulence by 28%...',
          instructionsVi: 'Chọn đáp án chính xác.',
          questions: [
            {
              id: 'c18_l_5',
              number: 5,
              sectionIndex: 2,
              type: 'gap_fill',
              prompt: "Deploying counter-rotating blades reduced cavitation turbulence by _____________% .",
              correctAnswer: '28',
              acceptableAnswers: ['28%'],
              explanationVi: "Số liệu giảm là 28%.",
              locationHint: 'Lời thoại của sinh viên'
            }
          ]
        },
        {
          sectionNumber: 4,
          title: 'Section 4: Attention Economics & Digital Dopamine Loops',
          context: 'Lecture on variable reinforcement schedules',
          audioScriptExcerpt: 'intermittent variable reinforcement schedules...',
          instructionsVi: 'Chọn đáp án đúng.',
          questions: [
            {
              id: 'c18_l_6',
              number: 6,
              sectionIndex: 3,
              type: 'multiple_choice',
              prompt: 'Digital platforms utilize reinforcement schedules analogous to:',
              options: ['A. Chess tournaments', 'B. Casino slot machines', 'C. University lectures', 'D. Airline booking algorithms'],
              correctAnswer: 'B',
              explanationVi: "Giảng viên so sánh với máy đánh bạc casino ('identical to casino slot machines').",
              locationHint: 'Đoạn cuối Section 4'
            }
          ]
        }
      ]
    },
    reading: {
      title: 'IELTS Academic Reading Test 2',
      passages: [
        {
          passageNumber: 1,
          title: 'Passage 1: The Silk Road — Ancient Arteries of Globalization',
          subtitle: 'The trade routes that bridged East Asia with the Mediterranean world',
          wordCount: 850,
          paragraphs: [
            {
              label: 'A',
              text: 'The Silk Road was never a single paved thoroughfare, but rather a dynamic, shifting web of trans-Eurasian caravan tracks spanning over 6,400 kilometers between Chang’an in ancient China and Rome on the Mediterranean coast.'
            },
            {
              label: 'B',
              text: 'While precious silk textiles was the headline luxury commodity, the routes facilitated the profound transmission of intangible assets: papermaking technology, gunpowder, astronomical maps, and major philosophical traditions including Buddhism and Islam.'
            }
          ],
          questions: [
            {
              id: 'c18_r_1',
              number: 1,
              sectionIndex: 0,
              type: 'true_false_not_given',
              prompt: 'The Silk Road consisted of a single straight stone highway across Eurasia.',
              correctAnswer: 'FALSE',
              explanationVi: "Đoạn A nêu đó là mạng lưới đường mòn biến chuyển ('dynamic, shifting web of trans-Eurasian caravan tracks') chứ không phải 1 con đường đơn lẻ.",
              locationHint: 'Đoạn A'
            },
            {
              id: 'c18_r_2',
              number: 2,
              sectionIndex: 0,
              type: 'gap_fill',
              prompt: 'The route spanned over _____________ kilometers in total length.',
              correctAnswer: '6400',
              acceptableAnswers: ['6,400', '6400 km'],
              explanationVi: "Chiều dài hơn 6,400 km.",
              locationHint: 'Đoạn A'
            }
          ]
        },
        {
          passageNumber: 2,
          title: 'Passage 2: CRISPR-Cas9 — The Genomic Editing Revolution',
          subtitle: 'Precision molecular scissors and the democratization of biotechnology',
          wordCount: 920,
          paragraphs: [
            {
              label: 'A',
              text: 'Discovered as an adaptive immune mechanism in prokaryotes to fend off bacteriophage viral invaders, CRISPR-Cas9 allows molecular biologists to edit genetic sequences with surgical accuracy.'
            }
          ],
          questions: [
            {
              id: 'c18_r_3',
              number: 3,
              sectionIndex: 1,
              type: 'multiple_choice',
              prompt: 'CRISPR originally functioned in bacteria as:',
              options: ['A. A digestive enzyme', 'B. An adaptive immune mechanism', 'C. A photosynthetic pigment', 'D. A structural cell wall component'],
              correctAnswer: 'B',
              explanationVi: "Cơ chế miễn dịch thích ứng tự nhiên của vi khuẩn ('adaptive immune mechanism in prokaryotes').",
              locationHint: 'Đoạn A'
            }
          ]
        },
        {
          passageNumber: 3,
          title: 'Passage 3: Neuroplasticity and Cognitive Reserve Across the Lifespan',
          subtitle: 'How bilingualism and continuous education shield against neurodegeneration',
          wordCount: 950,
          paragraphs: [
            {
              label: 'A',
              text: 'Cognitive reserve refers to the brain’s resilience against neuropathological damage, enabling individuals to maintain functional independence despite structural brain atrophy.'
            }
          ],
          questions: [
            {
              id: 'c18_r_4',
              number: 4,
              sectionIndex: 2,
              type: 'true_false_not_given',
              prompt: 'Cognitive reserve helps maintain functional ability even when physical brain pathology is present.',
              correctAnswer: 'TRUE',
              explanationVi: "Đoạn A khẳng định duy trì khả năng hoạt động độc lập bất chấp tổn thương teo não vật lý.",
              locationHint: 'Đoạn A'
            }
          ]
        }
      ]
    },
    writing: {
      title: 'IELTS Academic Writing Test 2',
      task1: {
        category: 'Bar Chart',
        suggestedMinutes: 20,
        minWords: 150,
        prompt: `The bar chart shows the percentage of households with access to high-speed fiber broadband in five nations between 2018 and 2024. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.`,
        chartData: {
          description: 'Household fiber broadband penetration (% of households)',
          labels: ['South Korea', 'Japan', 'Sweden', 'United Kingdom', 'Germany'],
          datasets: [
            { label: '2018', data: [78, 72, 65, 22, 18], unit: '%', color: '#6366f1' },
            { label: '2024', data: [96, 91, 88, 68, 54], unit: '%', color: '#ec4899' }
          ]
        }
      },
      task2: {
        category: 'Discussion Essay',
        suggestedMinutes: 40,
        minWords: 250,
        prompt: `Some people argue that space exploration is a waste of government financial resources that would be better allocated to urgent planetary problems such as poverty eradication and healthcare. Others maintain that space exploration yields indispensable scientific breakthroughs. Discuss both views and give your own opinion. Write at least 250 words.`
      }
    },
    speaking: {
      examinerName: 'Dr. Jonathan Smith',
      examinerAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      part1: {
        topic: 'Transportation, Travel Habits & Urban Living',
        questions: [
          'Good morning. What is your primary mode of daily transportation?',
          'Do you prefer travelling alone or in a group with friends?',
          'What improvements would you like to see in your local city transit system?'
        ]
      },
      part2: {
        cueCard: {
          topic: 'A Historical Place or Monument',
          prompt: 'Describe an ancient historic building, monument, or archaeological site that you found particularly fascinating.',
          bulletPoints: [
            'Where the site is located',
            'When you visited it or learned about it',
            'What specific architectural or historical features stood out',
            'And explain why this place left such a lasting impression on you.'
          ],
          prepTimeSeconds: 60,
          speakTimeSeconds: 120
        }
      },
      part3: {
        topic: 'Cultural Heritage Preservation vs Modern Development',
        questions: [
          'Should governments invest public tax revenue into restoring centuries-old monuments when housing shortages exist?',
          'How does mass international tourism impact the structural integrity of ancient cultural landmarks?'
        ]
      }
    }
  }
];

export const ALL_FULL_MOCK_TESTS = officialMockTestPackages;
export const CAM_19_TEST_01 = officialMockTestPackages[0];
export const CAM_18_TEST_02 = officialMockTestPackages[1];
