import { useState } from 'react';
import { ArrowRight, BookOpen, CalendarDays, ChevronDown, ChevronRight, Clock, Compass, FilePlus2, Layers, Target } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { buildDailyCoachModel, type DailyCoachAction } from '../../lib/dailyCoach';
import { getDueMistakes, getDueVocabCards } from '../../services/srsScheduler';
import { ModuleChooser } from '../shell/ModuleChooser';

function daysUntilExam(examDate: string): number | null {
  const target = new Date(`${examDate}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / 86_400_000));
}

export function DailyCoachCard() {
  const {
    profile,
    mistakes,
    vocabCards,
    setActiveModule,
    setIsDiagnosticOpen,
  } = useApp();
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);

  const dueMistakes = getDueMistakes(mistakes);
  const dueVocab = getDueVocabCards(vocabCards);
  const model = buildDailyCoachModel({
    diagnosticComplete: profile.completedDiagnostic,
    dueMistakeIds: dueMistakes.map((item) => item.id),
    dueVocabIds: dueVocab.map((item) => item.id),
  });

  const runAction = (action: DailyCoachAction) => {
    if (action.command === 'open_diagnostic') {
      setIsDiagnosticOpen(true);
      return;
    }
    if (action.command === 'open_module_chooser' || action.kind === 'manual_module') {
      setChooserOpen(true);
      return;
    }
    setActiveModule(action.destination);
  };

  const [firstAlternative, secondAlternative] = model.alternatives;
  const sourceAction: DailyCoachAction = {
    id: 'daily-source-import',
    kind: 'collect_source',
    title: 'Tạo bài từ nguồn học',
    reason: 'Dùng một nguồn bạn chọn để tạo bài luyện.',
    destination: 'sources',
    command: 'open_module',
    evidenceRefs: [],
    estimatedMinutes: 12,
    confidence: 'medium',
  };
  const planRows = [
    {
      action: firstAlternative,
      control: 'dashboard.coach.alternative-1',
      icon: BookOpen,
      fallbackMeta: 'Nhiệm vụ',
    },
    {
      action: sourceAction,
      control: 'dashboard.coach.plan-source',
      icon: FilePlus2,
      fallbackMeta: 'Tạo mới',
    },
    {
      action: secondAlternative,
      control: 'dashboard.coach.plan-manual-module',
      icon: Layers,
      fallbackMeta: 'Tự chọn',
    },
  ] as const;

  // Truthful FocusSignal calculation
  const isDueReviewState = dueMistakes.length > 0;
  const isDueVocabState = !isDueReviewState && dueVocab.length > 0;
  const isDiagnosticState = model.primary.kind === 'diagnostic';
  const totalDueCount = dueMistakes.length + dueVocab.length;
  const examDays = daysUntilExam(profile.examDate);

  const signalCount = isDueReviewState
    ? dueMistakes.length
    : isDueVocabState
      ? dueVocab.length
      : isDiagnosticState
        ? '0/1'
        : '✓';

  const signalLabel = isDueReviewState
    ? 'lỗi đến hạn'
    : isDueVocabState
      ? 'từ đến hạn'
      : isDiagnosticState
        ? 'chẩn đoán'
        : 'sẵn sàng';

  // The ring represents the selected share of actual due work, never a skill score.
  const selectedDueCount = isDueReviewState ? dueMistakes.length : dueVocab.length;
  const ringFraction = totalDueCount > 0 ? selectedDueCount / totalDueCount : 0;
  const strokeDashoffset = 238.76 * (1 - ringFraction);
  const signalAriaLabel = totalDueCount > 0
    ? `${selectedDueCount} ${signalLabel} trong tổng số ${totalDueCount} việc đến hạn`
    : `${signalLabel}: ${signalCount}`;
  const signalDetail = totalDueCount > 0
    ? `${selectedDueCount} trong ${totalDueCount} việc cần ôn hôm nay`
    : 'Chưa có việc đến hạn';
  const Plan0Icon = planRows[0]?.icon;
  const Plan1Icon = planRows[1]?.icon;
  const Plan2Icon = planRows[2]?.icon;

  return (
    <section className="omni-daily-coach" aria-label="Daily Coach" data-ux-scope="app-shell-v2">
      <div className="omni-daily-coach__focus-grid">
        <div className="omni-daily-coach__focus-main">
          <div className="omni-daily-coach__tag">
            <Target aria-hidden="true" className="w-3.5 h-3.5" />
            <span>FOCUS HÔM NAY</span>
          </div>
          <h2>{model.primary.title}</h2>
          <p className="omni-daily-coach__reason">{model.primary.reason}</p>

          <div className="omni-daily-coach__action-bar">
            <div className="omni-daily-coach__buttons">
              <button
                type="button"
                className="omni-daily-coach__cta"
                data-ux-flow="dashboard.daily"
                data-ux-control="dashboard.coach.primary"
                onClick={() => runAction(model.primary)}
              >
                {model.primary.kind === 'diagnostic' ? (
                  <Compass aria-hidden="true" />
                ) : null}
                <span>{model.primary.title}</span>
                <ArrowRight aria-hidden="true" />
              </button>
              <button
                type="button"
                className="omni-daily-coach__secondary-btn"
                data-ux-flow="dashboard.daily"
                data-ux-control="dashboard.coach.alternative-2"
                onClick={() => runAction(secondAlternative)}
              >
                <span>Đổi kỹ năng</span>
              </button>
            </div>

            <div className="omni-daily-coach__meta">
              {typeof model.primary.estimatedMinutes === 'number' && (
                <span className="omni-daily-coach__meta-item">
                  <Clock aria-hidden="true" />
                  <span>{model.primary.estimatedMinutes} phút</span>
                </span>
              )}
              <span
                className="omni-daily-coach__meta-confidence"
                data-confidence={model.primary.confidence}
              >
                {model.primary.confidence === 'low' ? 'Độ tin cậy thấp' : 'Bám bằng chứng học tập'}
              </span>
            </div>
          </div>

          <div className="omni-daily-coach__evidence-section">
            <button
              type="button"
              className="omni-daily-coach__evidence-toggle"
              aria-expanded={evidenceOpen}
              aria-controls="daily-coach-evidence"
              data-ux-flow="dashboard.daily"
              data-ux-control="dashboard.coach.open-evidence"
              onClick={() => setEvidenceOpen((open) => !open)}
            >
              <ChevronDown aria-hidden="true" className={evidenceOpen ? 'rotate-180' : ''} />
              <span>{evidenceOpen ? 'Ẩn bằng chứng' : 'Xem bằng chứng'}</span>
            </button>
            {evidenceOpen && (
              <ul id="daily-coach-evidence" className="omni-daily-coach__evidence">
                {model.primary.evidenceRefs.length === 0 ? (
                  <li>Chưa đủ bằng chứng. Hành động này dùng để thu thập dữ liệu độc lập.</li>
                ) : (
                  model.primary.evidenceRefs.map((ref) => <li key={ref}>{ref}</li>)
                )}
              </ul>
            )}
          </div>
        </div>

        <div className="omni-daily-coach__focus-signal" aria-label={signalAriaLabel}>
          <div className="omni-focus-signal">
            <span className="omni-focus-signal__eyebrow">Việc cần ưu tiên</span>
            <div className="omni-focus-signal__ring-container">
              <svg className="omni-focus-signal__ring" viewBox="0 0 96 96" aria-hidden="true">
                <circle
                  className="omni-focus-signal__track"
                  cx="48"
                  cy="48"
                  r="38"
                  strokeWidth="5"
                  fill="none"
                />
                <circle
                  className="omni-focus-signal__progress"
                  cx="48"
                  cy="48"
                  r="38"
                  strokeWidth="5"
                  fill="none"
                  strokeDasharray="238.76"
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  transform="rotate(-90 48 48)"
                />
              </svg>
              <div className="omni-focus-signal__center">
                <span className="omni-focus-signal__value">{signalCount}</span>
                <span className="omni-focus-signal__label">{signalLabel}</span>
              </div>
            </div>
            <span className="omni-focus-signal__detail">{signalDetail}</span>
          </div>
        </div>
      </div>

      <div className="omni-daily-coach__plan">
        <h3 className="omni-daily-coach__plan-title">Kế hoạch hôm nay</h3>
        <div className="omni-daily-coach__plan-list">
          {planRows[0] && Plan0Icon && (
            <button
              type="button"
              className="omni-daily-coach__plan-row"
              data-ux-flow="dashboard.daily"
              data-ux-control="dashboard.coach.alternative-1"
              onClick={() => runAction(planRows[0].action)}
            >
              <div className="omni-daily-coach__plan-row-main">
                <div className="omni-daily-coach__plan-row-icon">
                  <Plan0Icon aria-hidden="true" />
                </div>
                <div className="omni-daily-coach__plan-row-text">
                  <strong>{planRows[0].action.title}</strong>
                  <span>{planRows[0].action.reason}</span>
                </div>
              </div>
              <div className="omni-daily-coach__plan-row-meta">
                <span>
                  {typeof planRows[0].action.estimatedMinutes === 'number'
                    ? `${planRows[0].action.estimatedMinutes} phút`
                    : planRows[0].fallbackMeta}
                </span>
                <ChevronRight aria-hidden="true" />
              </div>
            </button>
          )}

          {planRows[1] && Plan1Icon && (
            <button
              type="button"
              className="omni-daily-coach__plan-row"
              data-ux-flow="dashboard.daily"
              data-ux-control="dashboard.coach.plan-manual-module"
              onClick={() => runAction(planRows[1].action)}
            >
              <div className="omni-daily-coach__plan-row-main">
                <div className="omni-daily-coach__plan-row-icon">
                  <Plan1Icon aria-hidden="true" />
                </div>
                <div className="omni-daily-coach__plan-row-text">
                  <strong>{planRows[1].action.title}</strong>
                  <span>{planRows[1].action.reason}</span>
                </div>
              </div>
              <div className="omni-daily-coach__plan-row-meta">
                <span>
                  {typeof planRows[1].action.estimatedMinutes === 'number'
                    ? `${planRows[1].action.estimatedMinutes} phút`
                    : planRows[1].fallbackMeta}
                </span>
                <ChevronRight aria-hidden="true" />
              </div>
            </button>
          )}

          {planRows[2] && Plan2Icon && (
            <button
              type="button"
              className="omni-daily-coach__plan-row"
              data-ux-flow="dashboard.daily"
              data-ux-control="dashboard.coach.plan-source"
              onClick={() => runAction(planRows[2].action)}
            >
              <div className="omni-daily-coach__plan-row-main">
                <div className="omni-daily-coach__plan-row-icon">
                  <Plan2Icon aria-hidden="true" />
                </div>
                <div className="omni-daily-coach__plan-row-text">
                  <strong>{planRows[2].action.title}</strong>
                  <span>{planRows[2].action.reason}</span>
                </div>
              </div>
              <div className="omni-daily-coach__plan-row-meta">
                <span>
                  {typeof planRows[2].action.estimatedMinutes === 'number'
                    ? `${planRows[2].action.estimatedMinutes} phút`
                    : planRows[2].fallbackMeta}
                </span>
                <ChevronRight aria-hidden="true" />
              </div>
            </button>
          )}
        </div>
      </div>

      {examDays !== null && (
        <footer className="omni-daily-coach__deadline">
          <CalendarDays aria-hidden="true" />
          <span>Còn {examDays} ngày thi</span>
        </footer>
      )}

      <ModuleChooser
        open={chooserOpen}
        onClose={() => setChooserOpen(false)}
        onSelect={(id) => {
          setActiveModule(id);
          setChooserOpen(false);
        }}
      />
    </section>
  );
}

