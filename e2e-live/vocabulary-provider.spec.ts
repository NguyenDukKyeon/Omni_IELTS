import { expect, test } from '@playwright/test';

test('a real text provider creates a schema-valid adaptive vocabulary deck', async ({ request }) => {
  const response = await request.post('/api/vocab/adaptive-topic-decks', {
    data: { topicId: 'education', tier: 'foundation', count: 3 },
  });
  const body = await response.json();

  expect(response.ok(), JSON.stringify(body)).toBe(true);
  expect(body.topicId).toBe('education');
  expect(body.tier).toBe('foundation');
  expect(body.cards).toHaveLength(3);
  for (const card of body.cards) {
    expect(['A2', 'B1']).toContain(card.cefrLevel);
    expect(card.collocations.length).toBeGreaterThanOrEqual(2);
    expect(card.wordFamily.length).toBeGreaterThan(0);
    expect(card.paraphrases.length).toBeGreaterThan(0);
  }
});
