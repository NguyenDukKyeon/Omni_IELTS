import { expect, test } from './fixtures';
import { signLiveHubItem } from '../src/lib/liveHubReceipt';

const receiptSecret = 'omni-e2e-live-hub-receipt-secret';

const item = {
  id: 'reported-writing-source',
  title: 'Reported Writing question',
  skill: 'writing_task2',
  council: 'both_vietnam',
  councilLabel: 'IDP & BC Việt Nam',
  examDate: '2026-08-20',
  topicDomain: 'Education',
  promptStatement: 'Some people believe university education should be free. Discuss both views.',
  trendStatus: 'recent_real_exam',
  trendBadge: 'Báo cáo có nguồn',
  evidenceType: 'verified_report',
  groundingSourceTitle: 'Direct report',
  groundingSourceUrl: 'https://example.org/direct-report',
  citations: [{ claimId: 'reported-writing-source', title: 'Direct report', url: 'https://example.org/direct-report' }],
};
const signedItem = { ...item, sourceReceipt: signLiveHubItem(item, receiptSecret) };

test('Live Hub artifact API rejects a verified label without direct provenance', async ({ request }) => {
  const response = await request.post('/api/live-hub/items/unverified/practice', {
    data: {
      item: {
        ...item,
        id: 'unverified',
        groundingSourceUrl: undefined,
        citations: [],
      },
    },
  });
  expect(response.status()).toBe(422);
  expect(await response.json()).toMatchObject({ code: 'PROVENANCE_REQUIRED' });
});

test('Live Hub artifact API rejects a client-forged verified source receipt', async ({ request }) => {
  const response = await request.post(`/api/live-hub/items/${item.id}/practice`, {
    data: {
      item: {
        ...item,
        sourceReceipt: 'v1.client-forged-receipt',
      },
    },
  });

  expect(response.status()).toBe(422);
  expect(await response.json()).toMatchObject({ code: 'SOURCE_RECEIPT_INVALID' });
});

test('Live Hub artifact API creates Practice provenance and an addressable MockBuild', async ({ request }) => {
  const practiceResponse = await request.post(`/api/live-hub/items/${item.id}/practice`, {
    data: { item: signedItem, retrievedAt: '2026-08-24T00:00:00.000Z' },
  });
  expect(practiceResponse.status()).toBe(201);
  expect(await practiceResponse.json()).toMatchObject({
    artifact: {
      kind: 'derived_practice',
      prompt: item.promptStatement,
      provenance: { sourceItemId: item.id, sourceUrl: item.groundingSourceUrl },
    },
  });

  // Without consentAction, mock build on single-skill source must return 422 INCOMPLETE_SOURCE_CONSENT_REQUIRED
  const mockRejectResponse = await request.post(`/api/live-hub/items/${item.id}/mock`, {
    data: { item: signedItem, targetBand: 7.5, retrievedAt: '2026-08-24T00:00:00.000Z' },
  });
  expect(mockRejectResponse.status()).toBe(422);
  expect(await mockRejectResponse.json()).toMatchObject({ code: 'INCOMPLETE_SOURCE_CONSENT_REQUIRED' });

  // With explicit consentAction, mock build is created with hybrid provenance
  const mockResponse = await request.post(`/api/live-hub/items/${item.id}/mock`, {
    data: { item: signedItem, targetBand: 7.5, retrievedAt: '2026-08-24T00:00:00.000Z', consentAction: 'ai_fill_missing' },
  });
  expect(mockResponse.status()).toBe(201);
  const mockBody = await mockResponse.json();
  expect(mockBody).toMatchObject({
    artifact: { kind: 'derived_mock_section', provenance: { sourceItemId: item.id, origin: 'source_plus_ai' } },
    mockBuild: { status: 'draft' },
  });
  expect(mockBody.mockBuild.id).toMatch(/^mock_build_/);

  const statusResponse = await request.get(`/api/mock/builds/${mockBody.mockBuild.id}`);
  expect(statusResponse.ok()).toBe(true);
  expect(await statusResponse.json()).toMatchObject({ id: mockBody.mockBuild.id, status: 'draft' });
});

test('Live Hub artifact API requires explicit consent for incomplete source and generates hybrid/AI provenance on consent', async ({ request }) => {
  const incompleteItem = {
    id: 'incomplete-reading-item',
    title: 'Fragmented Reading Passage',
    skill: 'writing_task2',
    promptStatement: 'Short unverified prompt text',
    evidenceType: 'forecast',
    isComplete: false,
    missingComponents: ['grading_rubric', 'detailed_breakdown'],
  };

  // 1. Consent required error
  const rejectResponse = await request.post(`/api/live-hub/items/${incompleteItem.id}/practice`, {
    data: { item: incompleteItem },
  });
  expect(rejectResponse.status()).toBe(422);
  const rejectBody = await rejectResponse.json();
  expect(rejectBody.code).toBe('INCOMPLETE_SOURCE_CONSENT_REQUIRED');
  expect(rejectBody.completeness.isComplete).toBe(false);

  // A non-generating "direct" action is not valid consent for incomplete content.
  const directBypassResponse = await request.post(`/api/live-hub/items/${incompleteItem.id}/practice`, {
    data: { item: incompleteItem, consentAction: 'direct' },
  });
  expect(directBypassResponse.status()).toBe(422);
  expect(await directBypassResponse.json()).toMatchObject({ code: 'INCOMPLETE_SOURCE_CONSENT_REQUIRED' });

  // Search is handled by the Live Hub search flow and must not create an artifact as a side effect.
  const searchBypassResponse = await request.post(`/api/live-hub/items/${incompleteItem.id}/practice`, {
    data: { item: incompleteItem, consentAction: 'search_more' },
  });
  expect(searchBypassResponse.status()).toBe(422);
  expect(await searchBypassResponse.json()).toMatchObject({ code: 'INCOMPLETE_SOURCE_CONSENT_REQUIRED' });

  const mockDirectBypassResponse = await request.post(`/api/live-hub/items/${incompleteItem.id}/mock`, {
    data: { item: incompleteItem, consentAction: 'direct', targetBand: 7 },
  });
  expect(mockDirectBypassResponse.status()).toBe(422);
  expect(await mockDirectBypassResponse.json()).toMatchObject({ code: 'INCOMPLETE_SOURCE_CONSENT_REQUIRED' });

  // Practising the available portion is a Practice-only action and cannot authorize a Full Mock build.
  const mockPracticeOnlyBypassResponse = await request.post(`/api/live-hub/items/${incompleteItem.id}/mock`, {
    data: { item: incompleteItem, consentAction: 'practice_available', targetBand: 7 },
  });
  expect(mockPracticeOnlyBypassResponse.status()).toBe(422);
  expect(await mockPracticeOnlyBypassResponse.json()).toMatchObject({
    code: 'INCOMPLETE_SOURCE_CONSENT_REQUIRED',
  });

  // 2. User approves AI fill -> hybrid provenance (not gradeable until actual generation)
  const hybridResponse = await request.post(`/api/live-hub/items/${incompleteItem.id}/practice`, {
    data: {
      item: incompleteItem,
      consentAction: 'ai_fill_missing',
      retrievedAt: '2026-08-25T00:00:00.000Z',
    },
  });
  expect(hybridResponse.status()).toBe(201);
  const hybridBody = await hybridResponse.json();
  expect(hybridBody.artifact.provenance.origin).toBe('source_plus_ai');
  expect(hybridBody.artifact.isGradeable).toBe(false);
  expect(hybridBody.artifact.provenance.aiMetadata?.model).toBe('gemini-3.1-pro');
  expect(hybridBody.artifact.provenance.aiMetadata?.filledComponents).toEqual(['grading_rubric', 'detailed_breakdown']);

  // 3. User selects create AI variant -> pure AI provenance with preserved source linkage
  const aiVariantResponse = await request.post(`/api/live-hub/items/${incompleteItem.id}/practice`, {
    data: {
      item: incompleteItem,
      consentAction: 'create_ai_variant',
      retrievedAt: '2026-08-25T00:00:00.000Z',
    },
  });
  expect(aiVariantResponse.status()).toBe(201);
  const aiVariantBody = await aiVariantResponse.json();
  expect(aiVariantBody.artifact.provenance.origin).toBe('fully_ai_generated');
  expect(aiVariantBody.artifact.sourceItem).toMatchObject({ id: incompleteItem.id });
  expect(aiVariantBody.artifact.provenance.sourceItemId).toBe(incompleteItem.id);
  expect(aiVariantBody.artifact.provenance.sourceUrl).toBeNull();

  const aiVariantMockResponse = await request.post(`/api/live-hub/items/${incompleteItem.id}/mock`, {
    data: {
      item: incompleteItem,
      consentAction: 'create_ai_variant',
      targetBand: 7,
    },
  });
  expect(aiVariantMockResponse.status()).toBe(201);
  expect(await aiVariantMockResponse.json()).toMatchObject({
    artifact: { provenance: { origin: 'fully_ai_generated', sourceUrl: null } },
    mockBuild: {
      provenance: { origin: 'fully_ai_generated' },
      sourceMode: 'lineage_only',
    },
  });

  // 4. User selects practice available portion -> authentic source, ungradeable
  const availableResponse = await request.post(`/api/live-hub/items/${incompleteItem.id}/practice`, {
    data: {
      item: incompleteItem,
      consentAction: 'practice_available',
      retrievedAt: '2026-08-25T00:00:00.000Z',
    },
  });
  expect(availableResponse.status()).toBe(201);
  const availableBody = await availableResponse.json();
  expect(availableBody.artifact.provenance.origin).toBe('authentic_source');
  expect(availableBody.artifact.isGradeable).toBe(false);
  expect(availableBody.artifact.status).toBe('available_portion_only');
  expect(availableBody.artifact.requiresGeneration).toBe(false);

  // 5. Invalid consentAction is rejected with 400
  const invalidConsentResponse = await request.post(`/api/live-hub/items/${incompleteItem.id}/practice`, {
    data: {
      item: incompleteItem,
      consentAction: 'arbitrary_invalid_consent',
    },
  });
  expect(invalidConsentResponse.status()).toBe(400);
  expect(await invalidConsentResponse.json()).toMatchObject({ code: 'INVALID_CONSENT_ACTION' });
});

test('Live Hub artifact API parses Reading and Listening skill payloads and evaluates completeness', async ({ request }) => {
  // 1. Incomplete Reading passage without questions
  const rawReadingItem = {
    id: 'reading-passage-live-2026',
    title: 'Microplastics in Alpine Glaciers',
    skill: 'reading',
    evidenceType: 'forecast',
    passage: {
      title: 'Microplastics in Alpine Glaciers',
      paragraphs: [{ label: 'A', text: 'Recent ice core samples demonstrate widespread particulate deposition.' }],
    },
  };

  const readingReject = await request.post(`/api/live-hub/items/${rawReadingItem.id}/practice`, {
    data: { item: rawReadingItem },
  });
  expect(readingReject.status()).toBe(422);
  const readingRejectBody = await readingReject.json();
  expect(readingRejectBody.code).toBe('INCOMPLETE_SOURCE_CONSENT_REQUIRED');
  expect(readingRejectBody.completeness.missingComponents).toContain('questions');

  // Complete Reading with passages and answered questions
  const completeReadingItem = {
    id: 'reading-complete-live-2026',
    title: 'Marine Biology Ecosystems',
    skill: 'reading',
    evidenceType: 'forecast',
    passage: {
      title: 'Marine Biology Ecosystems',
      paragraphs: [{ label: 'A', text: 'Coral reefs host significant biodiversity.' }],
    },
    questions: [
      { id: 'rq1', questionNumber: 1, prompt: 'Coral reefs support marine species', correctAnswer: 'TRUE' },
    ],
  };

  const readingSuccess = await request.post(`/api/live-hub/items/${completeReadingItem.id}/practice`, {
    data: { item: completeReadingItem },
  });
  expect(readingSuccess.status()).toBe(201);
  const readingSuccessBody = await readingSuccess.json();
  expect(readingSuccessBody.artifact.isGradeable).toBe(true);
  expect(readingSuccessBody.artifact.status).toBe('ready');

  // 2. Incomplete Listening without audio
  const listeningNoAudio = {
    id: 'listening-no-audio-live-2026',
    title: 'Campus Tour',
    skill: 'listening',
    evidenceType: 'forecast',
    audioTranscript: 'Welcome to campus tour.',
    questions: [{ id: 'lq1', questionNumber: 1, prompt: 'Main building', correctAnswer: 'Library' }],
  };

  const listeningReject = await request.post(`/api/live-hub/items/${listeningNoAudio.id}/practice`, {
    data: { item: listeningNoAudio },
  });
  expect(listeningReject.status()).toBe(422);
  const listeningRejectBody = await listeningReject.json();
  expect(listeningRejectBody.code).toBe('INCOMPLETE_SOURCE_CONSENT_REQUIRED');
  expect(listeningRejectBody.completeness.missingComponents).toContain('playable_audio');

  // Complete Listening with playable audio
  const completeListeningItem = {
    id: 'listening-complete-live-2026',
    title: 'Campus Tour Complete',
    skill: 'listening',
    evidenceType: 'forecast',
    audioUrl: 'https://example.org/audio/campus-tour.mp3',
    audioTranscript: 'Welcome to campus tour.',
    questions: [{ id: 'lq1', questionNumber: 1, prompt: 'Main building', correctAnswer: 'Library' }],
  };

  const listeningSuccess = await request.post(`/api/live-hub/items/${completeListeningItem.id}/practice`, {
    data: { item: completeListeningItem },
  });
  expect(listeningSuccess.status()).toBe(201);
  const listeningSuccessBody = await listeningSuccess.json();
  expect(listeningSuccessBody.artifact.isGradeable).toBe(true);
  expect(listeningSuccessBody.artifact.status).toBe('ready');
});
