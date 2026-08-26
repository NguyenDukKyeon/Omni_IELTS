import { describe, expect, it } from 'vitest';
import {
  checkPracticeCompleteness,
  checkMockCompleteness,
  buildLearningArtifactProvenance,
  buildComponentProvenance,
  getContentOriginBadge,
  filterSupportedCitations,
  isValidatedPlayableAudio,
} from '../contentOrigin';
import type { RealExamForecastItem, FullMockTestPackage, WritingLiveHubItem, SpeakingLiveHubItem } from '../../types';

describe('contentOrigin & deterministic completeness', () => {
  const authenticWritingItem: RealExamForecastItem = {
    id: 'live-writing-task2-2026',
    title: 'University Education Funding',
    skill: 'writing_task2',
    council: 'both_vietnam',
    councilLabel: 'IDP & BC Việt Nam',
    examDate: 'Thi thật: 18/08/2026',
    topicDomain: 'Education',
    subCategory: 'Discussion',
    promptStatement: 'Some people believe university education should be free for all students. Discuss both views and give your opinion.',
    trendStatus: 'recent_real_exam',
    trendBadge: 'Báo cáo đã xác minh',
    evidenceType: 'verified_report',
    groundingSourceTitle: 'IDP Vietnam Real Exam Report',
    groundingSourceUrl: 'https://example.org/idp-report-2026',
    citations: [{ claimId: 'live-writing-task2-2026', title: 'IDP Vietnam Real Exam Report', url: 'https://example.org/idp-report-2026' }],
  };

  const authenticSpeakingItem: RealExamForecastItem = {
    id: 'live-speaking-part2-2026',
    title: 'Describe a Public Park',
    skill: 'speaking_part2',
    council: 'both_vietnam',
    councilLabel: 'IDP & BC Việt Nam',
    examDate: 'Dự đoán Quý 3/2026',
    topicDomain: 'Public Facilities',
    promptStatement: 'Describe a public facility or park in your city that you enjoy visiting.',
    cueCardPoints: ['Where it is', 'Who you go with', 'What people do there', 'Why it is essential'],
    trendStatus: 'quarter_forecast',
    trendBadge: 'Trọng tâm Quý',
    evidenceType: 'reported_recall',
    groundingSourceTitle: 'BC Speaking Recall Q3',
    groundingSourceUrl: 'https://example.org/bc-speaking-recall',
    citations: [{ claimId: 'live-speaking-part2-2026', title: 'BC Speaking Recall Q3', url: 'https://example.org/bc-speaking-recall' }],
  };

  describe('1. Practice completeness checks', () => {
    it('identifies complete Writing prompt as complete and gradeable without requiring AI rewrite', () => {
      const result = checkPracticeCompleteness('writing_task2', authenticWritingItem);
      expect(result.isComplete).toBe(true);
      expect(result.gradeable).toBe(true);
      expect(result.missingComponents).toEqual([]);
      expect(result.availableComponents).toContain('promptStatement');
    });

    it('identifies complete Speaking Part 2 cue card as complete and gradeable', () => {
      const result = checkPracticeCompleteness('speaking_part2', authenticSpeakingItem);
      expect(result.isComplete).toBe(true);
      expect(result.gradeable).toBe(true);
      expect(result.missingComponents).toEqual([]);
      expect(result.availableComponents).toContain('cueCard');
    });

    it('identifies raw Reading text without questions as incomplete and non-gradeable', () => {
      const rawReadingItem = {
        id: 'reading-raw-passage',
        title: 'Microplastics in Alpine Snow',
        skill: 'reading',
        promptStatement: 'Raw passage text without IELTS questions.',
        passage: {
          title: 'Microplastics in Alpine Snow',
          paragraphs: [{ label: 'A', text: 'Recent studies indicate high microplastic concentration in alpine snowpacks.' }],
        },
      };

      const result = checkPracticeCompleteness('reading', rawReadingItem);
      expect(result.isComplete).toBe(false);
      expect(result.gradeable).toBe(false);
      expect(result.missingComponents).toContain('questions');
      expect(result.actionOptions).toEqual(['search_more', 'practice_available', 'ai_fill_missing', 'create_ai_variant']);
    });

    it('identifies Reading with questions missing correct answers as non-gradeable', () => {
      const ungradeableReading = {
        id: 'reading-unanswered',
        skill: 'reading',
        passage: { title: 'Passage', paragraphs: [{ label: 'A', text: 'Paragraph' }] },
        questions: [{ id: 'q1', questionNumber: 1, statementOrQuestion: 'Is this true?', correctAnswer: '' }],
      };

      const result = checkPracticeCompleteness('reading', ungradeableReading);
      expect(result.isComplete).toBe(false);
      expect(result.gradeable).toBe(false);
      expect(result.missingComponents).toContain('answers');
    });

    it('identifies Listening without playable audio as incomplete and non-gradeable', () => {
      const listeningWithoutAudio = {
        id: 'listening-no-audio',
        skill: 'listening',
        title: 'University Orientation Tour',
        audioTranscript: 'Audio transcript only, no playable audio file.',
        questions: [{ id: 'l1', questionNumber: 1, prompt: 'Location: ____', correctAnswer: 'Library' }],
      };

      const result = checkPracticeCompleteness('listening', listeningWithoutAudio);
      expect(result.isComplete).toBe(false);
      expect(result.gradeable).toBe(false);
      expect(result.missingComponents).toContain('playable_audio');
      expect(result.actionOptions).toContain('ai_fill_missing');
      expect(result.actionOptions).toContain('search_more');
    });

    it('identifies complete Listening with audioUrl/base64 and questions as complete and gradeable', () => {
      const completeListening = {
        id: 'listening-complete',
        skill: 'listening',
        title: 'University Tour',
        audioUrl: 'https://example.org/listening-audio-01.mp3',
        audioTranscript: 'Full script',
        questions: [{ id: 'l1', questionNumber: 1, prompt: 'Location: ____', correctAnswer: 'Library' }],
      };

      const result = checkPracticeCompleteness('listening', completeListening);
      expect(result.isComplete).toBe(true);
      expect(result.gradeable).toBe(true);
      expect(result.missingComponents).toEqual([]);
    });
  });

  describe('2. Full Mock Test completeness validation', () => {
    it('rejects a single-skill Live Hub item as an incomplete 4-skill Full Mock', () => {
      const result = checkMockCompleteness(authenticWritingItem);
      expect(result.isComplete).toBe(false);
      expect(result.gradeable).toBe(false);
      expect(result.missingComponents).toEqual(expect.arrayContaining(['listening_40_questions', 'reading_40_questions', 'speaking_parts_1_2_3', 'writing_task1']));
      expect(result.availableComponents).toContain('writing_task2');
    });

    it('keeps an incomplete source skill in the Full Mock missing-component report', () => {
      const result = checkMockCompleteness({
        ...authenticWritingItem,
        isComplete: false,
        missingComponents: ['grading_rubric'],
      });

      expect(result.isComplete).toBe(false);
      expect(result.missingComponents).toContain('writing_task2');
      expect(result.missingComponents).toContain('writing_task2_grading_rubric');
    });

    it('validates a complete 4-skill package (40L + 40R + 2W + S1/2/3) as complete and gradeable', () => {
      const completeMockPackage: Partial<FullMockTestPackage> = {
        id: 'cam-19-mock-01',
        title: 'Cambridge 19 Test 1',
        listening: {
          title: 'Listening',
          audioTranscript: 'Transcript',
          sections: Array.from({ length: 4 }, (_, sIdx) => ({
            sectionNumber: sIdx + 1,
            title: `Section ${sIdx + 1}`,
            context: 'Context',
            audioUrl: 'https://example.org/audio.mp3',
            audioArtifact: {
              audioUrl: 'https://example.org/audio.mp3',
              isValidated: true,
              status: 'validated',
            },
            audioScriptExcerpt: 'Excerpt',
            instructionsVi: 'Instructions',
            questions: Array.from({ length: 10 }, (_, qIdx) => ({
              id: `l_${sIdx * 10 + qIdx + 1}`,
              number: sIdx * 10 + qIdx + 1,
              sectionIndex: sIdx,
              type: 'gap_fill',
              prompt: `Question ${sIdx * 10 + qIdx + 1}`,
              correctAnswer: 'Answer',
              explanationVi: 'Explanation',
            })),
          })),
        },
        reading: {
          title: 'Reading',
          passages: [13, 13, 14].map((count, pIdx) => ({
            passageNumber: pIdx + 1,
            title: `Passage ${pIdx + 1}`,
            subtitle: 'Sub',
            wordCount: 700,
            paragraphs: [{ label: 'A', text: 'Text' }],
            questions: Array.from({ length: count }, (_, qIdx) => ({
              id: `r_${pIdx * 13 + qIdx + 1}`,
              number: pIdx === 2 ? 27 + qIdx : pIdx * 13 + qIdx + 1,
              sectionIndex: pIdx,
              type: 'true_false_not_given',
              prompt: `Statement ${qIdx + 1}`,
              correctAnswer: 'TRUE',
              explanationVi: 'Explanation',
            })),
          })),
        },
        writing: {
          title: 'Writing',
          task1: { category: 'Bar Chart', prompt: 'Summarise the chart.', minWords: 150, suggestedMinutes: 20 },
          task2: { category: 'Opinion Essay', prompt: 'Discuss both views.', minWords: 250, suggestedMinutes: 40 },
        },
        speaking: {
          examinerName: 'Examiner',
          examinerAvatar: '',
          part1: { topic: 'Work', questions: ['What do you do?'] },
          part2: { cueCard: { topic: 'A park', prompt: 'Describe a park.', bulletPoints: ['where it is'], prepTimeSeconds: 60, speakTimeSeconds: 120 } },
          part3: { topic: 'Green spaces', questions: ['Why are parks important?'] },
        },
      };

      const result = checkMockCompleteness(completeMockPackage);
      expect(result.isComplete).toBe(true);
      expect(result.gradeable).toBe(true);
      expect(result.missingComponents).toEqual([]);
    });

    it('rejects a mock package if Listening audio or Reading answers are missing', () => {
      const incompleteMock: Record<string, unknown> = {
        listening: {
          title: 'Incomplete Listening',
          audioTranscript: '',
          sections: [
            {
              sectionNumber: 1,
              title: 'Section 1',
              context: 'Context',
              audioScriptExcerpt: '',
              instructionsVi: '',
              questions: [
                {
                  id: 'l1',
                  number: 1,
                  sectionIndex: 0,
                  type: 'gap_fill',
                  prompt: 'Prompt',
                  correctAnswer: 'A',
                  explanationVi: '',
                },
              ],
            },
          ],
        },
        reading: { title: 'Empty Reading', passages: [] },
        writing: { title: 'Empty Writing' },
        speaking: { examinerName: 'AI', examinerAvatar: '' },
      };
      const result = checkMockCompleteness(incompleteMock);
      expect(result.isComplete).toBe(false);
      expect(result.gradeable).toBe(false);
      expect(result.missingComponents).toContain('listening_playable_audio');
      expect(result.missingComponents).toContain('reading_gradeable_answers');
    });

    it('fails closed and returns isComplete=false for unsupported skill', () => {
      const unsupportedItem: WritingLiveHubItem = {
        id: 'unsupported-skill-item',
        title: 'Item with unsupported skill',
        skill: 'writing',
        promptStatement: 'Some prompt',
      };
      const completeness = checkPracticeCompleteness('unsupported_skill_xyz', unsupportedItem);
      expect(completeness.isComplete).toBe(false);
      expect(completeness.gradeable).toBe(false);
      expect(completeness.missingComponents).toEqual(['unsupported_skill_unsupported_skill_xyz']);
    });
  });

  describe('3. Provenance & Origin building with explicit consent', () => {
    it('builds authentic_source provenance for complete original item without AI fill', () => {
      const provenance = buildLearningArtifactProvenance({
        sourceItem: authenticWritingItem,
        consentAction: 'direct',
        retrievedAt: '2026-08-26T00:00:00.000Z',
      });

      expect(provenance.origin).toBe('authentic_source');
      expect(provenance.sourceItemId).toBe(authenticWritingItem.id);
      expect(provenance.sourceUrl).toBe(authenticWritingItem.groundingSourceUrl);
      expect(provenance.evidenceType).toBe('verified_report');
      expect(provenance.aiMetadata).toBeUndefined();
    });

    it('builds source_plus_ai hybrid provenance when user approves AI fill for missing components', () => {
      const provenance = buildLearningArtifactProvenance({
        sourceItem: authenticWritingItem,
        consentAction: 'ai_fill_missing',
        filledComponents: ['listening', 'reading', 'speaking', 'writing_task1'],
        aiModel: 'gemini-3.1-pro',
        taskTier: 'analytical_heavy',
      });

      expect(provenance.origin).toBe('source_plus_ai');
      expect(provenance.sourceItemId).toBe(authenticWritingItem.id);
      expect(provenance.sourceUrl).toBe(authenticWritingItem.groundingSourceUrl);
      expect(provenance.aiMetadata).toBeDefined();
      expect(provenance.aiMetadata?.model).toBe('gemini-3.1-pro');
      expect(provenance.aiMetadata?.filledComponents).toEqual(['listening', 'reading', 'speaking', 'writing_task1']);
      expect(provenance.components?.writing_task2?.origin).toBe('authentic_source');
      expect(provenance.components?.listening?.origin).toBe('fully_ai_generated');
    });

    it('builds fully_ai_generated provenance with lineage-only linkage for a separate AI variant', () => {
      const provenance = buildLearningArtifactProvenance({
        sourceItem: authenticWritingItem,
        consentAction: 'create_ai_variant',
        aiModel: 'gemini-3.1-pro',
        taskTier: 'balanced',
      });

      expect(provenance.origin).toBe('fully_ai_generated');
      expect(provenance.sourceItemId).toBe(authenticWritingItem.id);
      expect(provenance.sourceUrl).toBeNull();
      expect(provenance.aiMetadata).toBeDefined();
      expect(provenance.aiMetadata?.model).toBe('gemini-3.1-pro');
    });

    it.each([
      ['authentic_source', 'authentic_source'],
      ['source_plus_ai', 'source_plus_ai'],
      ['fully_ai_generated', 'fully_ai_generated'],
    ] as const)('preserves the supplied source origin %s for a direct artifact', (sourceOrigin, expectedOrigin) => {
      const provenance = buildLearningArtifactProvenance({
        sourceItem: { ...authenticWritingItem, origin: sourceOrigin },
        consentAction: 'direct',
      });

      expect(provenance.origin).toBe(expectedOrigin);
      expect(provenance.components?.writing_task2?.origin).toBe(expectedOrigin);
    });

    it('does not upgrade a fully AI source to hybrid when AI fills more components', () => {
      const provenance = buildLearningArtifactProvenance({
        sourceItem: { ...authenticWritingItem, origin: 'fully_ai_generated' },
        consentAction: 'ai_fill_missing',
        filledComponents: ['reading'],
      });

      expect(provenance.origin).toBe('fully_ai_generated');
      expect(provenance.evidenceType).toBe('ai_generated');
      expect(provenance.sourceUrl).toBeNull();
      expect(provenance.citationUrls).toEqual([]);
    });

    it('keeps only lineage, not source evidence, for a separate AI variant', () => {
      const provenance = buildLearningArtifactProvenance({
        sourceItem: authenticWritingItem,
        consentAction: 'create_ai_variant',
        aiModel: 'gemini-3.1-pro',
      });

      expect(provenance.origin).toBe('fully_ai_generated');
      expect(provenance.sourceItemId).toBe(authenticWritingItem.id);
      expect(provenance.aiMetadata?.derivedFromSourceId).toBe(authenticWritingItem.id);
      expect(provenance.evidenceType).toBe('ai_generated');
      expect(provenance.sourceUrl).toBeNull();
      expect(provenance.citationUrls).toEqual([]);
      expect(provenance.components?.writing_task2?.origin).toBe('fully_ai_generated');
      expect(provenance.components?.writing_task2?.sourceUrl).toBeNull();
    });

    it('omits practice_available when item has no usable available components', () => {
      const emptyItem: SpeakingLiveHubItem = {
        id: 'empty_item',
        title: 'Empty prompt item',
        skill: 'speaking_part2',
        promptStatement: '',
        cueCardPoints: [],
      };
      const completeness = checkPracticeCompleteness('speaking_part2', emptyItem);
      expect(completeness.availableComponents).toEqual([]);
      expect(completeness.actionOptions).not.toContain('practice_available');
      expect(completeness.actionOptions).toEqual(['search_more', 'ai_fill_missing', 'create_ai_variant']);
    });
  });

  describe('4. UI Badges and Content Origin Labels', () => {
    it('returns authentic badge with Vietnamese label for practice and mock', () => {
      const practiceBadge = getContentOriginBadge('authentic_source', 'practice', 'verified_report');
      expect(practiceBadge.labelVi).toBe('Nguồn đã xác minh');
      expect(practiceBadge.isAuthentic).toBe(true);
      expect(practiceBadge.isHybrid).toBe(false);

      const mockBadge = getContentOriginBadge('authentic_source', 'mock', 'verified_report');
      expect(mockBadge.labelVi).toBe('Nguồn đã xác minh từ Live Hub');
      expect(mockBadge.isAuthentic).toBe(true);
    });

    it('returns evidence-aware hybrid badges for source_plus_ai', () => {
      const verifiedHybrid = getContentOriginBadge('source_plus_ai', 'practice', 'verified_report');
      expect(verifiedHybrid.labelVi).toBe('Nguồn đã xác minh + AI bổ sung');
      expect(verifiedHybrid.isHybrid).toBe(true);

      const unverifiedHybrid = getContentOriginBadge('source_plus_ai', 'practice', 'forecast');
      expect(unverifiedHybrid.labelVi).toBe('Nguồn Live Hub chưa xác minh + AI bổ sung');
      expect(unverifiedHybrid.isHybrid).toBe(true);

      const unverifiedMockHybrid = getContentOriginBadge('source_plus_ai', 'mock', 'forecast');
      expect(unverifiedMockHybrid.labelVi).toBe('Nguồn Live Hub chưa xác minh + AI bổ sung');
      expect(unverifiedMockHybrid.isHybrid).toBe(true);

      const recallHybrid = getContentOriginBadge('source_plus_ai', 'mock', 'reported_recall');
      expect(recallHybrid.labelVi).toBe('Nguồn hồi tưởng có dẫn chứng + AI bổ sung');
    });

    it('returns standardized AI-generated labels for fully_ai_generated', () => {
      const aiPracticeBadge = getContentOriginBadge('fully_ai_generated', 'practice');
      expect(aiPracticeBadge.labelVi).toBe('AI tạo bài mới');
      expect(aiPracticeBadge.labelEn).toBe('AI-generated IELTS-style Practice');
      expect(aiPracticeBadge.isAi).toBe(true);

      const aiMockBadge = getContentOriginBadge('fully_ai_generated', 'mock');
      expect(aiMockBadge.labelVi).toBe('AI tạo Full Mock');
      expect(aiMockBadge.labelEn).toBe('AI-generated IELTS-style Mock');
      expect(aiMockBadge.isAi).toBe(true);
    });
  });

  describe('5. Citation filtering to supported authentic components', () => {
    it('attaches citations only when component has genuine grounding URL and authentic origin', () => {
      const citations = [
        { claimId: 'live-writing-task2-2026', title: 'IDP Vietnam Real Exam Report', url: 'https://example.org/idp-report-2026' },
      ];

      const supported = filterSupportedCitations(citations, 'authentic_source');
      expect(supported).toHaveLength(1);
      expect(supported[0].url).toBe('https://example.org/idp-report-2026');

      const unsupported = filterSupportedCitations(citations, 'fully_ai_generated');
      expect(unsupported).toHaveLength(0);
    });
  });

  describe('6. Evidence type resolution and unverified source safety', () => {
    it('does not default evidence to verified_report when source lacks verified grounding', () => {
      const itemWithoutVerifiedEvidence: RealExamForecastItem = {
        id: 'unverified-item',
        title: 'Unverified report',
        skill: 'writing_task2',
        council: 'both_vietnam',
        councilLabel: 'BC',
        examDate: '2026',
        topicDomain: 'Society',
        promptStatement: 'Some prompt',
        trendStatus: 'recent_real_exam',
        trendBadge: 'Chưa xác minh',
        evidenceType: 'forecast',
      };

      const provenance = buildLearningArtifactProvenance({
        sourceItem: itemWithoutVerifiedEvidence,
        consentAction: 'direct',
      });

      expect(provenance.evidenceType).toBe('forecast');
      expect(provenance.evidenceType).not.toBe('verified_report');
    });

    it('defaults component evidence strictly to forecast when unverified, never upgrading simply from URL presence', () => {
      const compProv = buildComponentProvenance({
        origin: 'authentic_source',
        sourceTitle: 'Some report',
        sourceUrl: 'https://example.org/unverified-link',
        citationUrls: ['https://example.org/unverified-link'],
      });

      expect(compProv.evidenceType).toBe('forecast');
      expect(compProv.evidenceType).not.toBe('reported_recall');
      expect(compProv.evidenceType).not.toBe('verified_report');
    });

    it('returns claim-aware "Nguồn Live Hub — chưa xác minh" badge for unverified forecast items', () => {
      const badge = getContentOriginBadge('authentic_source', 'practice', 'forecast');
      expect(badge.labelVi).toBe('Nguồn Live Hub — chưa xác minh');
      expect(badge.isAuthentic).toBe(false);
      expect(badge.isAi).toBe(false);
    });
  });

  describe('7. Structural completeness & validated audio in Full Mock Packages', () => {
    it('rejects Listening with 40 questions spread across only 3 sections with listening_4_sections error', () => {
      const invalidMock: Partial<FullMockTestPackage> = {
        listening: {
          title: 'Listening',
          audioTranscript: 'Transcript',
          sections: [13, 13, 14].map((count, idx) => ({
            sectionNumber: idx + 1,
            title: `Section ${idx + 1}`,
            context: 'Context',
            audioUrl: 'https://example.org/audio.mp3',
            audioScriptExcerpt: 'Excerpt',
            instructionsVi: 'Instructions',
            questions: Array.from({ length: count }, (_, qIdx) => ({
              id: `l_${idx * 13 + qIdx + 1}`,
              number: idx * 13 + qIdx + 1,
              sectionIndex: idx,
              type: 'gap_fill',
              prompt: `Prompt`,
              correctAnswer: 'Answer',
              explanationVi: 'Explanation',
            })),
          })),
        },
        reading: {
          title: 'Reading',
          passages: Array.from({ length: 3 }, (_, pIdx) => ({
            passageNumber: pIdx + 1,
            title: `Passage ${pIdx + 1}`,
            subtitle: 'Sub',
            wordCount: 700,
            paragraphs: [{ label: 'A', text: 'Text' }],
            questions: Array.from({ length: pIdx === 2 ? 14 : 13 }, (_, qIdx) => ({
              id: `r_${pIdx * 13 + qIdx + 1}`,
              number: pIdx * 13 + qIdx + 1,
              sectionIndex: pIdx,
              type: 'multiple_choice',
              prompt: 'Prompt',
              correctAnswer: 'A',
              explanationVi: 'Exp',
            })),
          })),
        },
        writing: {
          title: 'Writing',
          task1: { category: 'Bar Chart', prompt: 'Task 1', minWords: 150, suggestedMinutes: 20 },
          task2: { category: 'Opinion Essay', prompt: 'Task 2', minWords: 250, suggestedMinutes: 40 },
        },
        speaking: {
          examinerName: 'Examiner',
          examinerAvatar: '',
          part1: { topic: 'Work', questions: ['Q1'] },
          part2: { cueCard: { topic: 'Topic', prompt: 'Prompt', bulletPoints: [], prepTimeSeconds: 60, speakTimeSeconds: 120 } },
          part3: { topic: 'Discussion', questions: ['Q3'] },
        },
      };

      const result = checkMockCompleteness(invalidMock);
      expect(result.isComplete).toBe(false);
      expect(result.missingComponents).toContain('listening_4_sections');
    });

    it('rejects Reading with 40 questions in only 1 passage with reading_3_passages error', () => {
      const invalidMock: Partial<FullMockTestPackage> = {
        listening: {
          title: 'Listening',
          audioTranscript: 'Transcript',
          sections: Array.from({ length: 4 }, (_, idx) => ({
            sectionNumber: idx + 1,
            title: `Section ${idx + 1}`,
            context: 'Context',
            audioUrl: 'https://example.org/audio.mp3',
            audioScriptExcerpt: 'Excerpt',
            instructionsVi: 'Instructions',
            questions: Array.from({ length: 10 }, (_, qIdx) => ({
              id: `l_${idx * 10 + qIdx + 1}`,
              number: idx * 10 + qIdx + 1,
              sectionIndex: idx,
              type: 'gap_fill',
              prompt: `Prompt`,
              correctAnswer: 'Answer',
              explanationVi: 'Explanation',
            })),
          })),
        },
        reading: {
          title: 'Reading',
          passages: [{
            passageNumber: 1,
            title: 'Single Long Passage',
            subtitle: 'Sub',
            wordCount: 2000,
            paragraphs: [{ label: 'A', text: 'Text' }],
            questions: Array.from({ length: 40 }, (_, qIdx) => ({
              id: `r_${qIdx + 1}`,
              number: qIdx + 1,
              sectionIndex: 0,
              type: 'multiple_choice',
              prompt: 'Prompt',
              correctAnswer: 'A',
              explanationVi: 'Exp',
            })),
          }],
        },
        writing: {
          title: 'Writing',
          task1: { category: 'Bar Chart', prompt: 'Task 1', minWords: 150, suggestedMinutes: 20 },
          task2: { category: 'Opinion Essay', prompt: 'Task 2', minWords: 250, suggestedMinutes: 40 },
        },
        speaking: {
          examinerName: 'Examiner',
          examinerAvatar: '',
          part1: { topic: 'Work', questions: ['Q1'] },
          part2: { cueCard: { topic: 'Topic', prompt: 'Prompt', bulletPoints: [], prepTimeSeconds: 60, speakTimeSeconds: 120 } },
          part3: { topic: 'Discussion', questions: ['Q3'] },
        },
      };

      const result = checkMockCompleteness(invalidMock);
      expect(result.isComplete).toBe(false);
      expect(result.missingComponents).toContain('reading_3_passages');
    });

    it('rejects audio with invalid URL or broken/truncated audio artifact status', () => {
      const mockWithBrokenAudio: Partial<FullMockTestPackage> = {
        listening: {
          title: 'Listening',
          audioTranscript: 'Transcript',
          sections: Array.from({ length: 4 }, (_, idx) => ({
            sectionNumber: idx + 1,
            title: `Section ${idx + 1}`,
            context: 'Context',
            audioUrl: 'http://broken/invalid.mp3', // invalid hostname
            audioScriptExcerpt: 'Excerpt',
            instructionsVi: 'Instructions',
            questions: Array.from({ length: 10 }, (_, qIdx) => ({
              id: `l_${idx * 10 + qIdx + 1}`,
              number: idx * 10 + qIdx + 1,
              sectionIndex: idx,
              type: 'gap_fill',
              prompt: `Prompt`,
              correctAnswer: 'Answer',
              explanationVi: 'Explanation',
            })),
          })),
        },
        reading: {
          title: 'Reading',
          passages: Array.from({ length: 3 }, (_, pIdx) => ({
            passageNumber: pIdx + 1,
            title: `Passage ${pIdx + 1}`,
            subtitle: 'Sub',
            wordCount: 700,
            paragraphs: [{ label: 'A', text: 'Text' }],
            questions: Array.from({ length: pIdx === 2 ? 14 : 13 }, (_, qIdx) => ({
              id: `r_${pIdx * 13 + qIdx + 1}`,
              number: pIdx * 13 + qIdx + 1,
              sectionIndex: pIdx,
              type: 'multiple_choice',
              prompt: 'Prompt',
              correctAnswer: 'A',
              explanationVi: 'Exp',
            })),
          })),
        },
        writing: {
          title: 'Writing',
          task1: { category: 'Bar Chart', prompt: 'Task 1', minWords: 150, suggestedMinutes: 20 },
          task2: { category: 'Opinion Essay', prompt: 'Task 2', minWords: 250, suggestedMinutes: 40 },
        },
        speaking: {
          examinerName: 'Examiner',
          examinerAvatar: '',
          part1: { topic: 'Work', questions: ['Q1'] },
          part2: { cueCard: { topic: 'Topic', prompt: 'Prompt', bulletPoints: [], prepTimeSeconds: 60, speakTimeSeconds: 120 } },
          part3: { topic: 'Discussion', questions: ['Q3'] },
        },
      };

      const result = checkMockCompleteness(mockWithBrokenAudio);
      expect(result.isComplete).toBe(false);
      expect(result.missingComponents).toContain('listening_playable_audio');
    });

    it('rejects full mock when section has URL alone without validated audio artifact', () => {
      const mockWithUnvalidatedAudio: Partial<FullMockTestPackage> = {
        listening: {
          title: 'Listening',
          audioTranscript: 'Transcript',
          sections: Array.from({ length: 4 }, (_, idx) => ({
            sectionNumber: idx + 1,
            title: `Section ${idx + 1}`,
            context: 'Context',
            audioUrl: 'https://example.org/audio.mp3', // URL exists, but no validated audioArtifact
            audioScriptExcerpt: 'Excerpt',
            instructionsVi: 'Instructions',
            questions: Array.from({ length: 10 }, (_, qIdx) => ({
              id: `l_${idx * 10 + qIdx + 1}`,
              number: idx * 10 + qIdx + 1,
              sectionIndex: idx,
              type: 'gap_fill',
              prompt: `Prompt`,
              correctAnswer: 'Answer',
              explanationVi: 'Explanation',
            })),
          })),
        },
        reading: {
          title: 'Reading',
          passages: Array.from({ length: 3 }, (_, pIdx) => ({
            passageNumber: pIdx + 1,
            title: `Passage ${pIdx + 1}`,
            subtitle: 'Sub',
            wordCount: 700,
            paragraphs: [{ label: 'A', text: 'Text' }],
            questions: Array.from({ length: pIdx === 2 ? 14 : 13 }, (_, qIdx) => ({
              id: `r_${pIdx * 13 + qIdx + 1}`,
              number: pIdx * 13 + qIdx + 1,
              sectionIndex: pIdx,
              type: 'multiple_choice',
              prompt: 'Prompt',
              correctAnswer: 'A',
              explanationVi: 'Exp',
            })),
          })),
        },
        writing: {
          title: 'Writing',
          task1: { category: 'Bar Chart', prompt: 'Task 1', minWords: 150, suggestedMinutes: 20 },
          task2: { category: 'Opinion Essay', prompt: 'Task 2', minWords: 250, suggestedMinutes: 40 },
        },
        speaking: {
          examinerName: 'Examiner',
          examinerAvatar: '',
          part1: { topic: 'Work', questions: ['Q1'] },
          part2: { cueCard: { topic: 'Topic', prompt: 'Prompt', bulletPoints: [], prepTimeSeconds: 60, speakTimeSeconds: 120 } },
          part3: { topic: 'Discussion', questions: ['Q3'] },
        },
      };

      const result = checkMockCompleteness(mockWithUnvalidatedAudio);
      expect(result.isComplete).toBe(false);
      expect(result.missingComponents).toContain('listening_playable_audio');
    });

    it('rejects full mock when audio artifact has validation marker but lacks audio payload', () => {
      const mockWithMarkerNoPayload: Partial<FullMockTestPackage> = {
        listening: {
          title: 'Listening',
          audioTranscript: 'Transcript',
          sections: Array.from({ length: 4 }, (_, idx) => ({
            sectionNumber: idx + 1,
            title: `Section ${idx + 1}`,
            context: 'Context',
            audioArtifact: {
              isValidated: true,
              status: 'validated',
              // No audioUrl or audioBase64!
            },
            audioScriptExcerpt: 'Excerpt',
            instructionsVi: 'Instructions',
            questions: Array.from({ length: 10 }, (_, qIdx) => ({
              id: `l_${idx * 10 + qIdx + 1}`,
              number: idx * 10 + qIdx + 1,
              sectionIndex: idx,
              type: 'gap_fill',
              prompt: `Prompt`,
              correctAnswer: 'Answer',
              explanationVi: 'Explanation',
            })),
          })),
        },
        reading: {
          title: 'Reading',
          passages: Array.from({ length: 3 }, (_, pIdx) => ({
            passageNumber: pIdx + 1,
            title: `Passage ${pIdx + 1}`,
            subtitle: 'Sub',
            wordCount: 700,
            paragraphs: [{ label: 'A', text: 'Text' }],
            questions: Array.from({ length: pIdx === 2 ? 14 : 13 }, (_, qIdx) => ({
              id: `r_${pIdx * 13 + qIdx + 1}`,
              number: pIdx * 13 + qIdx + 1,
              sectionIndex: pIdx,
              type: 'multiple_choice',
              prompt: 'Prompt',
              correctAnswer: 'A',
              explanationVi: 'Exp',
            })),
          })),
        },
        writing: {
          title: 'Writing',
          task1: { category: 'Bar Chart', prompt: 'Task 1', minWords: 150, suggestedMinutes: 20 },
          task2: { category: 'Opinion Essay', prompt: 'Task 2', minWords: 250, suggestedMinutes: 40 },
        },
        speaking: {
          examinerName: 'Examiner',
          examinerAvatar: '',
          part1: { topic: 'Work', questions: ['Q1'] },
          part2: { cueCard: { topic: 'Topic', prompt: 'Prompt', bulletPoints: [], prepTimeSeconds: 60, speakTimeSeconds: 120 } },
          part3: { topic: 'Discussion', questions: ['Q3'] },
        },
      };

      const result = checkMockCompleteness(mockWithMarkerNoPayload);
      expect(result.isComplete).toBe(false);
      expect(result.missingComponents).toContain('listening_playable_audio');
    });

    it('isValidatedPlayableAudio accepts direct valid URL for Practice', () => {
      expect(isValidatedPlayableAudio({ audioUrl: 'https://example.org/audio.mp3' })).toBe(true);
      expect(isValidatedPlayableAudio('https://example.org/audio.mp3')).toBe(true);
    });

    it('isValidatedPlayableAudio rejects validation marker when actual audio payload is missing', () => {
      const artifactWithoutPayload = {
        audioArtifact: {
          isValidated: true,
          status: 'validated',
        },
      };
      expect(isValidatedPlayableAudio(artifactWithoutPayload)).toBe(false);

      const artifactWithInvalidUrl = {
        audioArtifact: {
          audioUrl: 'http://broken/invalid.mp3',
          isValidated: true,
          status: 'validated',
        },
      };
      expect(isValidatedPlayableAudio(artifactWithInvalidUrl)).toBe(false);
    });
  });
});
