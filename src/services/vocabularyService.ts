import { AdaptiveVocabTier } from '../data/adaptiveVocabTopics';
import { getGeminiRequestHeaders } from './aiTutor';

export interface GeneratedAdaptiveVocabCard {
  word: string;
  phonetic: string;
  pos: string;
  definitionVi: string;
  definitionEn: string;
  exampleEn: string;
  exampleVi: string;
  collocations: string[];
  wordFamily: string[];
  paraphrases: string[];
  usageNoteVi: string;
  cefrLevel: 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
}

export async function generateAdaptiveTopicDeck(
  topicId: string,
  tier: AdaptiveVocabTier,
  count = 6
): Promise<{ topicId: string; tier: AdaptiveVocabTier; cards: GeneratedAdaptiveVocabCard[] }> {
  const response = await fetch('/api/vocab/adaptive-topic-decks', {
    method: 'POST',
    headers: getGeminiRequestHeaders(),
    body: JSON.stringify({ topicId, tier, count }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Không thể tạo deck chủ đề (${response.status})`);
  }
  return await response.json();
}
