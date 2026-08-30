import { ArrowRight, BookOpenCheck, GraduationCap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DailyCoachCard } from '../components/dashboard/DailyCoachCard';
import { isExplicitIndependentEvidence, isExplicitMockEvidence } from '../lib/learningEvidence';
import { getDueMistakes, getDueVocabCards } from '../services/srsScheduler';

export function DashboardView() {
  const {
    vocabCards,
    mistakes,
    practiceAttempts,
    mockResults,
    setActiveModule,
  } = useApp();

  const dueVocab = getDueVocabCards(vocabCards);
  const dueMistakes = getDueMistakes(mistakes);
  const latestAttempt = practiceAttempts[0];
  const latestMock = mockResults[0];
  const independentEvidence = latestAttempt && isExplicitIndependentEvidence(latestAttempt)
    ? latestAttempt
    : null;
  const mockEvidence = latestMock && isExplicitMockEvidence(latestMock) ? latestMock : null;

  return (
    <div id="dashboard-view" className="omni-dashboard" data-ux-scope="app-shell-v2">
      <header className="omni-dashboard__header">
        <p className="omni-dashboard__eyebrow">Tổng quan hôm nay</p>
        <h1>Việc nên làm tiếp theo</h1>
        <p>
          Một trọng tâm rõ ràng, hai lựa chọn khác và bằng chứng học tập có thể kiểm tra.
        </p>
      </header>

      <DailyCoachCard />

      <section className="omni-dashboard__snapshot" aria-label="Bằng chứng gần đây">
        <article>
          <h2>Việc đến hạn</h2>
          <p>
            {dueMistakes.length} lỗi · {dueVocab.length} từ.
            Chi tiết nằm ở khu bằng chứng học tập.
          </p>
        </article>
        <article>
          <h2>Bài tự làm gần nhất</h2>
          {independentEvidence ? (
            <button
              type="button"
              data-ux-flow="dashboard.daily"
              data-ux-control="dashboard.open-latest-practice"
              onClick={() => setActiveModule('practice')}
            >
              <BookOpenCheck aria-hidden="true" />
              <span>{independentEvidence.taskType}</span>
              <ArrowRight aria-hidden="true" />
            </button>
          ) : (
            <p>Chưa đủ bằng chứng</p>
          )}
        </article>
        <article>
          <h2>Mock gần nhất</h2>
          {mockEvidence ? (
            <button
              type="button"
              data-ux-flow="dashboard.daily"
              data-ux-control="dashboard.open-latest-mock"
              onClick={() => setActiveModule('mock_test')}
            >
              <GraduationCap aria-hidden="true" />
              <span>{mockEvidence.testTitle}</span>
              <ArrowRight aria-hidden="true" />
            </button>
          ) : (
            <p>Chưa đủ bằng chứng</p>
          )}
        </article>
      </section>
    </div>
  );
}
