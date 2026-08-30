import { useState } from 'react';
import { ArrowRight, ChevronDown, Clock, Compass, Target } from 'lucide-react';
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
      <div className="omni-daily-coach__primary">
        <div className="omni-daily-coach__primary-copy">
          <div className="omni-daily-coach__eyebrow-row">
            <span className="omni-daily-coach__mark" aria-hidden="true"><Target /></span>
            <p className="omni-daily-coach__eyebrow">Trọng tâm hôm nay</p>
          </div>
          <h2>{model.primary.title}</h2>
          <p>{model.primary.reason}</p>
          <div className="omni-daily-coach__meta">
            {typeof model.primary.estimatedMinutes === 'number' && (
              <span>
                <Clock aria-hidden="true" />
                {model.primary.estimatedMinutes} phút
              </span>
            )}
            <span data-confidence={model.primary.confidence}>
              {model.primary.confidence === 'low' ? 'Độ tin cậy thấp' : 'Bám bằng chứng học tập'}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="omni-daily-coach__cta"
          data-ux-flow="dashboard.daily"
          data-ux-control="dashboard.coach.primary"
          onClick={() => runAction(model.primary)}
        >
          {model.primary.kind === 'diagnostic' && <Compass aria-hidden="true" />}
          <span>{model.primary.title}</span>
          <ArrowRight aria-hidden="true" />
        </button>
      </div>

      <button
        type="button"
        className="omni-daily-coach__evidence-toggle"
        aria-expanded={evidenceOpen}
        aria-controls="daily-coach-evidence"
        data-ux-flow="dashboard.daily"
        data-ux-control="dashboard.coach.open-evidence"
        onClick={() => setEvidenceOpen((open) => !open)}
      >
        <ChevronDown aria-hidden="true" />
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

      <div className="omni-daily-coach__alternatives">
        <button
          type="button"
          className="omni-daily-coach__alt"
          data-ux-flow="dashboard.daily"
          data-ux-control="dashboard.coach.alternative-1"
          onClick={() => runAction(firstAlternative)}
        >
          <strong>{firstAlternative.title}</strong>
          <span>{firstAlternative.reason}</span>
          <em className="omni-daily-coach__alt-action">
            Mở
            <ArrowRight aria-hidden="true" />
          </em>
        </button>
        <button
          type="button"
          className="omni-daily-coach__alt"
          data-ux-flow="dashboard.daily"
          data-ux-control="dashboard.coach.alternative-2"
          onClick={() => runAction(secondAlternative)}
        >
          <strong>{secondAlternative.title}</strong>
          <span>{secondAlternative.reason}</span>
          <em className="omni-daily-coach__alt-action">
            Mở
            <ArrowRight aria-hidden="true" />
          </em>
        </button>
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
