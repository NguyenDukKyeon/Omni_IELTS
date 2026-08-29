import { AlertTriangle, ArrowRight, BookOpenCheck, GraduationCap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getDueMistakes } from '../services/srsScheduler';
import type { SkillType } from '../types';

const SKILLS: ReadonlyArray<{ id: SkillType; label: string }> = [
  { id: 'listening', label: 'Listening' },
  { id: 'reading', label: 'Reading' },
  { id: 'writing', label: 'Writing' },
  { id: 'speaking', label: 'Speaking' },
];

export function ReviewProgressView() {
  const {
    mistakes,
    practiceAttempts,
    mockResults,
    setIsMistakeNotebookOpen,
    setActiveModule,
  } = useApp();
  const dueMistakes = getDueMistakes(mistakes);
  const latestAttempt = practiceAttempts[0];
  const latestMock = mockResults[0];

  const openDueWorkout = () => {
    try {
      sessionStorage.setItem('omni_open_mistake_workout', '1');
    } catch {
      // Workout still opens even if session storage is unavailable.
    }
    setIsMistakeNotebookOpen(true);
  };

  return (
    <div id="review-progress-view" className="omni-review-progress">
      <header className="omni-review-progress__header">
        <p className="omni-review-progress__eyebrow">Review & Progress</p>
        <h1>Ôn lỗi đến hạn</h1>
        <p className="omni-review-progress__lede">
          {dueMistakes.length > 0
            ? `${dueMistakes.length} lỗi đã đến lịch ôn và vẫn liên kết với bài làm gốc.`
            : 'Chưa có lỗi đến hạn. Hoàn thành một bài Independent để tạo bằng chứng ôn tập.'}
        </p>
      </header>

      <section className="omni-review-progress__hero" aria-label="Hàng đợi ôn lỗi">
        <div>
          <p className="omni-review-progress__count">{dueMistakes.length}</p>
          <p className="omni-review-progress__count-label">lỗi đến hạn</p>
        </div>
        <button
          type="button"
          className="omni-review-progress__cta"
          data-ux-flow="app.navigation"
          data-ux-control="review.open-due-workout"
          onClick={openDueWorkout}
        >
          <AlertTriangle aria-hidden="true" className="omni-review-progress__cta-icon" />
          <span>Bắt đầu Daily Mistake Workout</span>
          <ArrowRight aria-hidden="true" className="omni-review-progress__cta-icon" />
        </button>
      </section>

      <section className="omni-review-progress__skills" aria-label="Bằng chứng theo kỹ năng">
        {SKILLS.map((skill) => {
          const attempt = practiceAttempts.find((item) => item.skill === skill.id);
          const mockBand = latestMock
            ? latestMock[`${skill.id}Band` as 'listeningBand' | 'readingBand' | 'writingBand' | 'speakingBand']
            : undefined;
          const hasAttemptEvidence = typeof attempt?.scoreBand === 'number';
          const hasMockEvidence = typeof mockBand === 'number';

          return (
            <article key={skill.id} className="omni-review-progress__skill">
              <h2>{skill.label}</h2>
              {hasAttemptEvidence && attempt ? (
                <p>
                  Bằng chứng Independent: {attempt.taskType} · band {attempt.scoreBand.toFixed(1)}
                </p>
              ) : hasMockEvidence && latestMock ? (
                <p>
                  Bằng chứng Mock: {latestMock.testTitle} · band {mockBand.toFixed(1)}
                </p>
              ) : (
                <p>Chưa đủ bằng chứng</p>
              )}
            </article>
          );
        })}
      </section>

      <section className="omni-review-progress__history" aria-label="Lịch sử gần đây">
        <div className="omni-review-progress__history-col">
          <h2>Practice gần đây</h2>
          {latestAttempt ? (
            <button
              type="button"
              className="omni-review-progress__link"
              data-ux-flow="app.navigation"
              data-ux-control="review.open-practice-history"
              onClick={() => setActiveModule('practice')}
            >
              <BookOpenCheck aria-hidden="true" />
              <span>{latestAttempt.taskType}</span>
            </button>
          ) : (
            <p>Chưa đủ bằng chứng</p>
          )}
        </div>
        <div className="omni-review-progress__history-col">
          <h2>Mock gần đây</h2>
          {latestMock ? (
            <button
              type="button"
              className="omni-review-progress__link"
              data-ux-flow="app.navigation"
              data-ux-control="review.open-mock-history"
              onClick={() => setActiveModule('mock_test')}
            >
              <GraduationCap aria-hidden="true" />
              <span>{latestMock.testTitle}</span>
            </button>
          ) : (
            <p>Chưa đủ bằng chứng</p>
          )}
        </div>
      </section>
    </div>
  );
}
