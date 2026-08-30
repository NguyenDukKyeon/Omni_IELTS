import { useState } from 'react';
import { ArrowRight, BookOpen, ChevronDown, ChevronRight, Clock, Compass, Layers, Sparkles, Target } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { buildDailyCoachModel, type DailyCoachAction } from '../../lib/dailyCoach';
import { isUnfinishedPracticeAttempt } from '../../lib/learningEvidence';
import { getDueMistakes, getDueVocabCards } from '../../services/srsScheduler';
import { ModuleChooser } from '../shell/ModuleChooser';

export function DailyCoachCard() {
  const {
    profile,
    mistakes,
    vocabCards,
    practiceAttempts,
    setActiveModule,
    setIsDiagnosticOpen,
  } = useApp();
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);

  const dueMistakes = getDueMistakes(mistakes);
  const dueVocab = getDueVocabCards(vocabCards);
  const unfinished = practiceAttempts.find(isUnfinishedPracticeAttempt);
  const model = buildDailyCoachModel({
    diagnosticComplete: profile.completedDiagnostic,
    dueMistakeIds: dueMistakes.map((item) => item.id),
    dueVocabIds: dueVocab.map((item) => item.id),
    unfinishedPracticeId: unfinished?.id,
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

  return (
    <section className="omni-daily-coach" aria-label="Daily Coach" data-ux-scope="app-shell-v2">
      <div className="omni-daily-coach__focus">
        <div className="omni-daily-coach__focus-header">
          <div className="omni-daily-coach__tag">
            <Target aria-hidden="true" className="w-3.5 h-3.5" />
            <span>FOCUS HÔM NAY</span>
          </div>
          <h2>{model.primary.title}</h2>
          <p className="omni-daily-coach__reason">{model.primary.reason}</p>
        </div>

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
              ) : (
                <Sparkles aria-hidden="true" />
              )}
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

      <div className="omni-daily-coach__plan">
        <h3 className="omni-daily-coach__plan-title">Kế hoạch hôm nay</h3>
        <div className="omni-daily-coach__plan-list">
          <button
            type="button"
            className="omni-daily-coach__plan-row"
            data-ux-flow="dashboard.daily"
            data-ux-control="dashboard.coach.alternative-1"
            onClick={() => runAction(firstAlternative)}
          >
            <div className="omni-daily-coach__plan-row-main">
              <div className="omni-daily-coach__plan-row-icon">
                <BookOpen aria-hidden="true" />
              </div>
              <div className="omni-daily-coach__plan-row-text">
                <strong>{firstAlternative.title}</strong>
                <span>{firstAlternative.reason}</span>
              </div>
            </div>
            <div className="omni-daily-coach__plan-row-meta">
              <span>
                {typeof firstAlternative.estimatedMinutes === 'number'
                  ? `${firstAlternative.estimatedMinutes} phút`
                  : 'Nhiệm vụ'}
              </span>
              <ChevronRight aria-hidden="true" />
            </div>
          </button>

          <div className="omni-daily-coach__plan-row">
            <div className="omni-daily-coach__plan-row-main">
              <div className="omni-daily-coach__plan-row-icon">
                <Layers aria-hidden="true" />
              </div>
              <div className="omni-daily-coach__plan-row-text">
                <strong>{secondAlternative.title}</strong>
                <span>{secondAlternative.reason}</span>
              </div>
            </div>
            <div className="omni-daily-coach__plan-row-meta">
              <span>Tự chọn</span>
              <ChevronRight aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>

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
