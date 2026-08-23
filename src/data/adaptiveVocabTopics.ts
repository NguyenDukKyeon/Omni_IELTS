export type AdaptiveVocabTier = 'foundation' | 'bridge' | 'advanced';

export interface AdaptiveVocabTierMeta {
  id: AdaptiveVocabTier;
  title: string;
  bandRange: string;
  cefrRange: string;
  description: string;
}

export const ADAPTIVE_VOCAB_TIERS: Record<AdaptiveVocabTier, AdaptiveVocabTierMeta> = {
  foundation: {
    id: 'foundation',
    title: 'Foundation',
    bandRange: 'Band 3.0–4.5',
    cefrRange: 'A2–B1',
    description: 'Từ phổ biến, phát âm rõ, word family cơ bản và collocation dễ dùng.',
  },
  bridge: {
    id: 'bridge',
    title: 'Bridge',
    bandRange: 'Band 5.0–6.5',
    cefrRange: 'B1–B2',
    description: 'Academic words, paraphrase và collocation dùng được trong bốn kỹ năng.',
  },
  advanced: {
    id: 'advanced',
    title: 'Advanced',
    bandRange: 'Band 7.0–9.0',
    cefrRange: 'C1–C2',
    description: 'Sắc thái nghĩa, word family, lập luận học thuật và cách dùng tự nhiên.',
  },
};

export interface AdaptiveVocabTopic {
  id: string;
  titleEn: string;
  titleVi: string;
  description: string;
  seedConcepts: string[];
}

export const ADAPTIVE_VOCAB_TOPICS: AdaptiveVocabTopic[] = [
  { id: 'daily-life', titleEn: 'Daily Life', titleVi: 'Đời sống hằng ngày', description: 'Thói quen, mua sắm, dịch vụ và quản lý thời gian.', seedConcepts: ['routine', 'convenience', 'household'] },
  { id: 'family', titleEn: 'Family & Relationships', titleVi: 'Gia đình & Quan hệ', description: 'Vai trò gia đình, thế hệ và quan hệ xã hội.', seedConcepts: ['upbringing', 'generation', 'support'] },
  { id: 'education', titleEn: 'Education', titleVi: 'Giáo dục', description: 'Trường học, kỹ năng, chương trình và học tập suốt đời.', seedConcepts: ['curriculum', 'literacy', 'assessment'] },
  { id: 'work', titleEn: 'Work & Careers', titleVi: 'Công việc & Nghề nghiệp', description: 'Việc làm, năng suất, kỹ năng và cân bằng cuộc sống.', seedConcepts: ['employment', 'productivity', 'workforce'] },
  { id: 'travel', titleEn: 'Travel & Tourism', titleVi: 'Du lịch', description: 'Trải nghiệm, giao thông, du lịch bền vững và văn hóa.', seedConcepts: ['destination', 'hospitality', 'itinerary'] },
  { id: 'health', titleEn: 'Health & Wellbeing', titleVi: 'Sức khỏe', description: 'Lối sống, y tế, dinh dưỡng và sức khỏe tinh thần.', seedConcepts: ['prevention', 'nutrition', 'wellbeing'] },
  { id: 'cities', titleEn: 'Cities & Housing', titleVi: 'Thành phố & Nhà ở', description: 'Đô thị hóa, hạ tầng, nhà ở và không gian công cộng.', seedConcepts: ['housing', 'infrastructure', 'congestion'] },
  { id: 'environment', titleEn: 'Environment', titleVi: 'Môi trường', description: 'Khí hậu, đa dạng sinh học, chất thải và năng lượng.', seedConcepts: ['emissions', 'conservation', 'renewable'] },
  { id: 'science', titleEn: 'Science', titleVi: 'Khoa học', description: 'Nghiên cứu, bằng chứng, khám phá và đạo đức khoa học.', seedConcepts: ['evidence', 'experiment', 'innovation'] },
  { id: 'technology', titleEn: 'Technology', titleVi: 'Công nghệ', description: 'AI, tự động hóa, quyền riêng tư và chuyển đổi số.', seedConcepts: ['automation', 'privacy', 'digitalisation'] },
  { id: 'media', titleEn: 'Media & Communication', titleVi: 'Truyền thông', description: 'Tin tức, quảng cáo, mạng xã hội và thông tin sai lệch.', seedConcepts: ['journalism', 'advertising', 'misinformation'] },
  { id: 'economy', titleEn: 'Economy & Business', titleVi: 'Kinh tế & Kinh doanh', description: 'Tăng trưởng, tiêu dùng, thương mại và bất bình đẳng.', seedConcepts: ['income', 'consumption', 'trade'] },
  { id: 'law', titleEn: 'Law & Crime', titleVi: 'Luật & Tội phạm', description: 'Pháp luật, hình phạt, phòng ngừa và phục hồi.', seedConcepts: ['legislation', 'deterrence', 'rehabilitation'] },
  { id: 'culture', titleEn: 'Culture & Tradition', titleVi: 'Văn hóa & Truyền thống', description: 'Bản sắc, di sản, ngôn ngữ và thay đổi văn hóa.', seedConcepts: ['heritage', 'identity', 'custom'] },
  { id: 'psychology', titleEn: 'Psychology & Behaviour', titleVi: 'Tâm lý & Hành vi', description: 'Động lực, thói quen, cảm xúc và ra quyết định.', seedConcepts: ['motivation', 'bias', 'resilience'] },
  { id: 'public-policy', titleEn: 'Public Policy', titleVi: 'Chính sách công', description: 'Quản trị, phúc lợi, thuế và dịch vụ công.', seedConcepts: ['regulation', 'welfare', 'accountability'] },
  { id: 'globalisation', titleEn: 'Globalisation', titleVi: 'Toàn cầu hóa', description: 'Hội nhập, di cư, chuỗi cung ứng và hợp tác.', seedConcepts: ['migration', 'integration', 'interdependence'] },
  { id: 'arts', titleEn: 'Arts & Creativity', titleVi: 'Nghệ thuật & Sáng tạo', description: 'Văn học, âm nhạc, sáng tạo và tài trợ nghệ thuật.', seedConcepts: ['creativity', 'expression', 'patronage'] },
  { id: 'data', titleEn: 'Data & Research', titleVi: 'Dữ liệu & Nghiên cứu', description: 'Xu hướng, phương pháp, độ tin cậy và diễn giải số liệu.', seedConcepts: ['trend', 'methodology', 'correlation'] },
  { id: 'academic-argument', titleEn: 'Academic Argument', titleVi: 'Lập luận học thuật', description: 'Quan điểm, nguyên nhân, phản biện và kết luận có điều kiện.', seedConcepts: ['claim', 'counterargument', 'implication'] },
];

export function getAdaptiveVocabTopic(topicId: string) {
  return ADAPTIVE_VOCAB_TOPICS.find((topic) => topic.id === topicId);
}
