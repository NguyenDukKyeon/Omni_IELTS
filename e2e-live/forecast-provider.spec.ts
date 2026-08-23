import { expect, test } from '@playwright/test';

test('a real grounded provider returns a fresh sourced Forecast snapshot', async ({ request }) => {
  const response = await request.post('/api/forecast/refresh', {
    data: {
      skill: 'writing_task2',
      council: 'both_vietnam',
      timeframe: 'latest',
      customQuery: 'IELTS Writing Task 2 recent reported topics Vietnam',
    },
  });
  const body = await response.json();

  expect(response.ok(), JSON.stringify(body)).toBe(true);
  expect(body.status).toBe('fresh');
  expect(['gemini', 'groq']).toContain(body.provider);
  if (body.fallbackReason) {
    expect(body.provider).toBe('groq');
  }
  expect(body.forecastItems?.length).toBeGreaterThan(0);
  expect(body.groundingSources?.length).toBeGreaterThan(0);
  for (const item of body.forecastItems) {
    expect(item.citations?.length, `Item ${item.id} must have claim-level citations`).toBeGreaterThan(0);
  }
});
