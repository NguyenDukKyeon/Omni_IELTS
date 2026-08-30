import { ArrowRight, BookOpenCheck, GraduationCap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DailyCoachCard } from '../components/dashboard/DailyCoachCard';
import { isExplicitIndependentEvidence, isExplicitMockEvidence } from '../lib/learningEvidence';

function daysUntilExam(examDate: string): number | null {
  const target = new Date(`${examDate}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / 86_400_000));
}

export function DashboardView() {
  const {
    practiceAttempts,
    mockResults,
    profile,
    setActiveModule,
  } = useApp();

  const independentEvidence = [...practiceAttempts]
    .filter(isExplicitIndependentEvidence)
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))[0] ?? null;
  const mockEvidence = [...mockResults]
    .filter(isExplicitMockEvidence)
    .sort((a, b) => Date.parse(b.completedDate) - Date.parse(a.completedDate))[0] ?? null;
  const examDays = daysUntilExam(profile.examDate);

  return (
    <div id="dashboard-view" className="omni-dashboard" data-ux-scope="app-shell-v2">
      <header className="omni-dashboard__header">
        <p className="omni-dashboard__eyebrow">Tổng quan hôm nay</p>
        <h1>Việc nên làm tiếp theo</h1>
        <p>
          {examDays === null
            ? 'Một trọng tâm rõ ràng, hai lựa chọn khác và bằng chứng học tập có thể kiểm tra.'
            : `Dựa trên mục tiêu Band ${profile.targetBand.toFixed(1)} và ${examDays} ngày còn lại.`}
        </p>
      </header>

      <DailyCoachCard />

      {(independentEvidence || mockEvidence) && (
        <section className="omni-dashboard__snapshot" aria-label="Bằng chứng gần đây">
          {independentEvidence && (
            <article>
              <h2>Bài tự làm gần nhất</h2>
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
            </article>
          )}
          {mockEvidence && (
            <article>
              <h2>Mock gần nhất</h2>
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
            </article>
          )}
        </section>
      )}
    </div>
  );
}
