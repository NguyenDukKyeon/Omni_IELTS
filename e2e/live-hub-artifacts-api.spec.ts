import { expect, test } from './fixtures';

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

test('Live Hub artifact API creates Practice provenance and an addressable MockBuild', async ({ request }) => {
  const practiceResponse = await request.post(`/api/live-hub/items/${item.id}/practice`, {
    data: { item, retrievedAt: '2026-08-24T00:00:00.000Z' },
  });
  expect(practiceResponse.status()).toBe(201);
  expect(await practiceResponse.json()).toMatchObject({
    artifact: {
      kind: 'derived_practice',
      prompt: item.promptStatement,
      provenance: { sourceItemId: item.id, sourceUrl: item.groundingSourceUrl },
    },
  });

  const mockResponse = await request.post(`/api/live-hub/items/${item.id}/mock`, {
    data: { item, targetBand: 7.5, retrievedAt: '2026-08-24T00:00:00.000Z' },
  });
  expect(mockResponse.status()).toBe(201);
  const mockBody = await mockResponse.json();
  expect(mockBody).toMatchObject({
    artifact: { kind: 'derived_mock_section', provenance: { sourceItemId: item.id } },
    mockBuild: { status: 'draft' },
  });
  expect(mockBody.mockBuild.id).toMatch(/^mock_build_/);

  const statusResponse = await request.get(`/api/mock/builds/${mockBody.mockBuild.id}`);
  expect(statusResponse.ok()).toBe(true);
  expect(await statusResponse.json()).toMatchObject({ id: mockBody.mockBuild.id, status: 'draft' });
});
