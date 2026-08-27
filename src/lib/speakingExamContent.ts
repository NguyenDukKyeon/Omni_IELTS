export const SPEAKING_CUE_CARDS = [
  {
    topic: 'An Environmental Campaign or Community Initiative',
    prompt: 'Describe an environmental initiative or project in your area that you find meaningful.',
    bulletPoints: [
      'What the initiative is and where it took place',
      'Who participated or organized it',
      'What specific actions or activities were involved',
      'And explain why you think this initiative had a positive impact on the community.',
    ],
    part3Theme: 'Environmental Responsibility, Government Policies & Citizen Awareness',
  },
  {
    topic: 'An Important Piece of Technology in Modern Life',
    prompt: 'Describe a piece of electronic equipment or software that significantly enhances your daily productivity.',
    bulletPoints: [
      'What piece of technology it is and how long you have used it',
      'What main functions or features it offers',
      'How frequently you rely on it throughout your daily routine',
      'And explain why this technology is so indispensable to your work or study.',
    ],
    part3Theme: 'Technological Automation, Human Connection & Future Workforce',
  },
  {
    topic: 'A Memorable Traditional Cultural Festival',
    prompt: 'Describe a traditional festival or cultural celebration in your country that you enjoy.',
    bulletPoints: [
      'What festival it is and when it is celebrated',
      'What special food, rituals, or customs are observed',
      'How people in your community take part in it',
      'And explain why this festival holds significant cultural value for the younger generation.',
    ],
    part3Theme: 'Cultural Preservation, Globalisation & Tourism Impact',
  },
] as const;

export const SPEAKING_EXAMINER_PROFILES = [
  {
    id: 'dr_vance',
    name: 'Dr. Jonathan Vance',
    role: 'Senior IELTS Speaking Examiner (15+ yrs, Cambridge)',
    accent: 'British' as const,
    avatar: '👨‍🏫',
    style: 'Warm, International academic, strictly objective',
    defaultVoiceId: 'Kore',
  },
  {
    id: 'mr_harper',
    name: 'Alistair Harper',
    role: 'IDP Chief Speaking Assessor (10+ yrs)',
    accent: 'Australian' as const,
    avatar: '👨‍🏫',
    style: 'Tự nhiên, phản xạ sắc bén, giọng điệu Anh-Úc chuẩn khảo thí',
    defaultVoiceId: 'Orus',
  },
] as const;

export const PART_1_SEED_QUESTIONS = [
  'Let us begin. Could you tell me your full name, please?',
  'Where are you from, and how long have you lived there?',
  'Do you work or are you a student at the moment?',
  'What do you enjoy doing in your free time?',
];

export function pickCueCard(index = 0) {
  return SPEAKING_CUE_CARDS[index % SPEAKING_CUE_CARDS.length];
}
