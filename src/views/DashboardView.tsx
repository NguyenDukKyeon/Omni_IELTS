import { ArrowRight, BookOpenCheck, GraduationCap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DailyCoachCard } from '../components/dashboard/DailyCoachCard';
import { getDueMistakes, getDueVocabCards } from '../services/srsScheduler';

export function DashboardView() {
  const {
    profile,
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

  return (
    <div id="dashboard-view" className="omni-dashboard">
      <header className="omni-dashboard__header">
        <p className="omni-dashboard__eyebrow">Dashboard</p>
        <h1>Hôm nay của {profile.name}</h1>
        <p>
          Một hành động chính, hai lựa chọn, và bằng chứng học tập có thể kiểm tra.
        </p>
      </header>

      <DailyCoachCard />

      <section className="omni-dashboard__snapshot" aria-label="Bằng chứng gần đây">
        <article>
          <h2>Việc đến hạn</h2>
          <p>
            {dueMistakes.length} lỗi · {dueVocab.length} từ.
            Chi tiết nằm ở Evidence Dock bên phải, không lặp lại ở đây.
          </p>
        </article>
        <article>
          <h2>Independent gần nhất</h2>
          {latestAttempt ? (
            <button
              type="button"
              data-ux-flow="dashboard.daily"
              data-ux-control="dashboard.open-latest-practice"
              onClick={() => setActiveModule('practice')}
            >
              <BookOpenCheck aria-hidden="true" />
              <span>{latestAttempt.taskType}</span>
              <ArrowRight aria-hidden="true" />
            </button>
          ) : (
            <p>Chưa đủ bằng chứng</p>
          )}
        </article>
        <article>
          <h2>Mock gần nhất</h2>
          {latestMock ? (
            <button
              type="button"
              data-ux-flow="dashboard.daily"
              data-ux-control="dashboard.open-latest-mock"
              onClick={() => setActiveModule('mock_test')}
            >
              <GraduationCap aria-hidden="true" />
              <span>{latestMock.testTitle}</span>
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
