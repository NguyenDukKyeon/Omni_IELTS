import { expect, test, type Page } from './fixtures';
import { navigateToModule } from './helpers/navigation';

const question = (number: number, sectionIndex: number) => ({
  id: `q_${number}`,
  number,
  sectionIndex,
  type: 'gap_fill',
  prompt: `Question ${number}`,
  correctAnswer: `answer ${number}`,
  explanationVi: `Giải thích ${number}`,
});

const listening = {
  title: 'Validated Listening',
  audioTranscript: 'This is a complete listening transcript used by the deterministic E2E fixture.',
  sections: Array.from({ length: 4 }, (_, sectionIndex) => ({
    sectionNumber: sectionIndex + 1,
    title: `Section ${sectionIndex + 1}`,
    context: 'Academic conversation',
    audioScriptExcerpt: 'This is a complete listening transcript used by the deterministic E2E fixture.',
    instructionsVi: 'Điền đáp án.',
    questions: Array.from({ length: 10 }, (_, index) => question(sectionIndex * 10 + index + 1, sectionIndex)),
  })),
};

const readingCounts = [13, 13, 14];
const reading = {
  title: 'Validated Reading',
  passages: readingCounts.map((count, passageIndex) => {
    const offset = readingCounts.slice(0, passageIndex).reduce((sum, value) => sum + value, 0);
    return {
      passageNumber: passageIndex + 1,
      title: `Passage ${passageIndex + 1}`,
      subtitle: 'E2E fixture',
      wordCount: 40,
      paragraphs: [{ label: 'A', text: 'A deterministic passage paragraph for browser interaction testing.' }],
      questions: Array.from({ length: count }, (_, index) => question(offset + index + 1, passageIndex)),
    };
  }),
};

const writing = {
  title: 'Validated Writing',
  task1: { category: 'Bar Chart', prompt: 'Summarise the chart.', minWords: 150, suggestedMinutes: 20 },
  task2: { category: 'Opinion Essay', prompt: 'Discuss this view.', minWords: 250, suggestedMinutes: 40 },
};

const speaking = {
  examinerName: 'Omni AI Examiner',
  examinerAvatar: '',
  part1: { topic: 'Study', questions: ['What do you study?'] },
  part2: { cueCard: { topic: 'A place', prompt: 'Describe a place.', bulletPoints: ['where it is'], prepTimeSeconds: 60, speakTimeSeconds: 120 } },
  part3: { topic: 'Cities', questions: ['How will cities change?'] },
};

const fullPackage = {
  id: 'mock_build_e2e',
  code: 'OMNI-E2E-01',
  title: 'AI-generated IELTS-style mock — E2E',
  subtitle: 'Validated fixture',
  difficulty: 'Diagnostic Standard',
  description: 'Test fixture; not an official IELTS test.',
  estimatedMinutes: 165,
  listening,
  reading,
  writing,
  speaking,
};

async function mockStagedBuildApi(page: Page, options: { failSpeakingOnce?: boolean } = {}) {
  const readySkills = new Set<string>();
  let speakingFailures = 0;
  await page.route('**/api/mock/builds', route => route.fulfill({
    status: 201,
    contentType: 'application/json',
    body: JSON.stringify({ id: 'mock_build_e2e', status: 'draft' }),
  }));
  await page.route(/\/api\/mock\/builds\/mock_build_e2e\/skills\/(listening|reading|writing|speaking)\/generate$/, route => {
    const skill = route.request().url().match(/skills\/(\w+)\/generate/)?.[1] as keyof typeof fullPackage;
    if (skill === 'speaking' && options.failSpeakingOnce && speakingFailures++ === 0) {
      return route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Không thể tạo phần speaking đạt quality gate.',
          code: 'schema_invalid',
          failedParts: ['part2'],
          readyParts: ['part1', 'part3'],
          partial: { part1: speaking.part1, part3: speaking.part3 },
          validation: { ready: false, errors: ['Speaking part2.cueCard: Required.'], count: 2 },
        }),
      });
    }
    readySkills.add(skill);
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ mockBuildId: 'mock_build_e2e', skill, state: 'ready', data: fullPackage[skill], validation: { ready: true, errors: [] } }),
    });
  });
  await page.route(/\/api\/mock\/builds\/mock_build_e2e$/, route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      id: 'mock_build_e2e',
      status: readySkills.size === 4 ? 'validating' : 'failed',
      skillStates: Object.fromEntries(['listening', 'reading', 'writing', 'speaking'].map(skill => [
        skill,
        readySkills.has(skill) ? 'ready' : skill === 'speaking' && speakingFailures ? 'failed' : 'pending',
      ])),
    }),
  }));
  await page.route('**/api/mock/builds/mock_build_e2e/retry', route => {
    readySkills.add('speaking');
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        mockBuildId: 'mock_build_e2e',
        skill: 'speaking',
        state: 'ready',
        data: speaking,
        validation: { ready: true, errors: [], count: 3 },
        readyParts: ['part1', 'part2', 'part3'],
      }),
    });
  });
  await page.route('**/api/mock/builds/mock_build_e2e/finalize', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      promptVersion: 'mock-assembler-v3-staged',
      testId: fullPackage.id,
      testTitle: fullPackage.title,
      mockBuildId: fullPackage.id,
      validation: { ready: true, errors: [], repairAttempts: 0 },
      fullPackage,
      readingPackage: { passages: reading.passages.map((passage, index) => ({ passageIndex: index + 1, title: passage.title, text: passage.paragraphs[0].text, questionTypesIncluded: ['gap_fill'], questionCount: passage.questions.length })), totalQuestions: 40 },
      listeningPackage: { sections: listening.sections.map((section, index) => ({ sectionIndex: index + 1, scenario: section.context, difficultyLevel: `Section ${index + 1}`, questionCount: 10 })), totalQuestions: 40 },
      writingPackage: { task1: { type: writing.task1.category, prompt: writing.task1.prompt, chartDescription: '' }, task2: { category: writing.task2.category, prompt: writing.task2.prompt } },
      speakingPackage: { examinerName: speaking.examinerName, part1Topics: [speaking.part1.topic], part2CueCard: { topic: speaking.part2.cueCard.topic, bulletPoints: speaking.part2.cueCard.bulletPoints }, part3AbstractThemes: [speaking.part3.topic] },
    }),
  }));
}

test('staged Mock Orchestrator opens a validated package in the exam room', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  await mockStagedBuildApi(page);

  await page.goto('/');
  await expect(page).toHaveTitle(/Omni IELTS/);
  await navigateToModule(page, 'mock_test');
  await expect(page.getByRole('heading', { name: /Phòng Thi Thử IELTS-style/ })).toBeVisible();
  await page.getByRole('button', { name: /Mở Mock Test Orchestrator/ }).click();
  await page.getByRole('button', { name: 'Lắp Ráp Bộ Đề 4 Kỹ Năng (Orchestrator)', exact: true }).click();

  await expect(page.getByText('Bộ Đề Đã Lắp Ráp Thành Công')).toBeVisible();
  await expect(page.getByText('AI-generated IELTS-style mock — E2E')).toBeVisible();
  await page.getByRole('button', { name: /Vào Phòng Thi Thử Ngay/ }).click();

  const persistedAttempt = await page.evaluate(() => JSON.parse(localStorage.getItem('omni_active_mock_build') || 'null'));
  expect(persistedAttempt).toMatchObject({
    mockBuildId: 'mock_build_e2e',
    attemptId: expect.stringContaining('attempt_mock_build_e2e_'),
    currentSkill: 'listening',
    package: { id: 'mock_build_e2e' },
  });

  await expect(page.getByText('OMNI-E2E-01')).toBeVisible();
  await expect(page.getByText(/Listening Test — Section 1/i)).toBeVisible();
  await expect(page.getByText(/Question 1/).first()).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});

test.describe('controlled Mock repair failure', () => {
  test.use({ expectedConsoleErrors: ['status of 422 (Unprocessable Entity)'] });

  test('Mock Orchestrator preserves valid Speaking parts and retries only the failed build step', async ({ page }) => {
    await mockStagedBuildApi(page, { failSpeakingOnce: true });

    await page.goto('/');
    await navigateToModule(page, 'mock_test');
    await page.getByRole('button', { name: /Mở Mock Test Orchestrator/ }).click();
    await page.getByRole('button', { name: 'Lắp Ráp Bộ Đề 4 Kỹ Năng (Orchestrator)', exact: true }).click();

    await expect(page.getByText(/Speaking part2\.cueCard/)).toBeVisible();
    const pendingBeforeRetry = await page.evaluate(() => JSON.parse(localStorage.getItem('omni_pending_mock_build') || 'null'));
    expect(pendingBeforeRetry).toMatchObject({
      id: 'mock_build_e2e',
      lastFailedSkill: 'speaking',
      failedParts: ['part2'],
      speakingParts: { part1: speaking.part1, part3: speaking.part3 },
    });

    await page.getByRole('button', { name: /Thử lại đúng phần bị lỗi/ }).click();
    await expect(page.getByText('Bộ Đề Đã Lắp Ráp Thành Công')).toBeVisible();
    await expect(page.getByRole('button', { name: /Vào Phòng Thi Thử Ngay/ })).toBeEnabled();
  });
});
