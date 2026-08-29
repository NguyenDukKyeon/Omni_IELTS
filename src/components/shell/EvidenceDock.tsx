import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, CircleAlert } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAppShell } from '../../context/AppShellContext';
import { buildEvidenceDockModel, type EvidenceDockItem } from '../../lib/evidenceDock';
import { getDueMistakes, getDueVocabCards } from '../../services/srsScheduler';
import type { ModuleId } from '../../types';

function controlForItem(item: EvidenceDockItem):
  | 'shell.evidence.open-due-review'
  | 'shell.evidence.open-due-vocab'
  | 'shell.evidence.open-context'
  | 'shell.evidence.resume-latest'
  | null {
  if (item.id === 'due-mistakes') return 'shell.evidence.open-due-review';
  if (item.id === 'due-vocab') return 'shell.evidence.open-due-vocab';
  if (item.id === 'current-media' || item.id === 'missing-context-evidence') return 'shell.evidence.open-context';
  if (item.status === 'recent') return 'shell.evidence.resume-latest';
  return null;
}

export function EvidenceDock() {
  const {
    activeModule,
    isExamModeActive,
    mistakes,
    vocabCards,
    mediaSessions,
    practiceAttempts,
    mockResults,
    setActiveModule,
  } = useApp();
  const { evidenceDock, setEvidenceDock } = useAppShell();
  const collapseRef = useRef<HTMLButtonElement>(null);
  const expandRef = useRef<HTMLButtonElement>(null);
  const previousState = useRef(evidenceDock);

  const dueMistakes = getDueMistakes(mistakes);
  const dueVocab = getDueVocabCards(vocabCards);
  const currentMedia = mediaSessions.find((session) => !session.completed);
  const latestAttempt = practiceAttempts[0];
  const latestMock = mockResults[0];
  const recentEvidence = latestAttempt
    ? [{ id: latestAttempt.id, label: latestAttempt.taskType, destination: 'practice' as ModuleId }]
    : latestMock
      ? [{ id: latestMock.id, label: latestMock.testTitle, destination: 'mock_test' as ModuleId }]
      : [];

  const model = buildEvidenceDockModel({
    activeModule,
    examMode: isExamModeActive && activeModule === 'mock_test',
    dueMistakeCount: dueMistakes.length,
    dueVocabCount: dueVocab.length,
    currentMediaTitle: currentMedia?.title,
    recentEvidence,
  });

  useEffect(() => {
    if (previousState.current === 'collapsed' && evidenceDock === 'open') {
      collapseRef.current?.focus();
    }
    if (previousState.current === 'open' && evidenceDock === 'collapsed') {
      expandRef.current?.focus();
    }
    previousState.current = evidenceDock;
  }, [evidenceDock]);

  useEffect(() => {
    if (model.visibility === 'hidden' || evidenceDock === 'collapsed') return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setEvidenceDock('collapsed');
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [evidenceDock, model.visibility, setEvidenceDock]);

  if (model.visibility === 'hidden') return null;

  const openDestination = (destination?: ModuleId) => {
    if (!destination || destination === 'knowledge') return;
    if (destination === 'dashboard' || destination === 'profile' || destination === 'review_progress'
      || destination === 'sources' || destination === 'vocabulary' || destination === 'grammar'
      || destination === 'media' || destination === 'practice' || destination === 'mock_test') {
      setActiveModule(destination);
    }
  };

  if (evidenceDock === 'collapsed') {
    return (
      <aside className="omni-evidence-dock is-collapsed" aria-label="Bằng chứng và việc đến hạn">
        <button
          ref={expandRef}
          type="button"
          className="omni-evidence-dock__expand"
          data-ux-flow="app.navigation"
          data-ux-control="shell.evidence.expand"
          onClick={() => setEvidenceDock('open')}
        >
          <ChevronLeft aria-hidden="true" />
          <span>Mở rộng bằng chứng</span>
        </button>
      </aside>
    );
  }

  return (
    <aside className="omni-evidence-dock" aria-label="Bằng chứng và việc đến hạn">
      <header className="omni-evidence-dock__header">
        <div>
          <p className="omni-evidence-dock__eyebrow">Evidence Dock</p>
          <h2>Bằng chứng và việc đến hạn</h2>
        </div>
        <button
          ref={collapseRef}
          type="button"
          className="omni-evidence-dock__collapse"
          data-ux-flow="app.navigation"
          data-ux-control="shell.evidence.collapse"
          onClick={() => setEvidenceDock('collapsed')}
        >
          <ChevronRight aria-hidden="true" />
          <span>Thu gọn</span>
        </button>
      </header>

      {model.sections.map((section) => (
        <section key={section.id} id={section.id} className="omni-evidence-dock__section">
          <h3>{section.title}</h3>
          {section.items.length === 0 ? (
            <p className="omni-evidence-dock__empty">Chưa đủ bằng chứng</p>
          ) : (
            <ul>
              {section.items.map((item) => {
                const control = controlForItem(item);
                const clickable = Boolean(item.destination && control);
                return (
                  <li key={item.id} data-status={item.status}>
                    {clickable ? (
                      <button
                        type="button"
                        className="omni-evidence-dock__item"
                        data-ux-flow="app.navigation"
                        data-ux-control={
                          control === 'shell.evidence.open-due-review'
                            ? 'shell.evidence.open-due-review'
                            : control === 'shell.evidence.open-due-vocab'
                              ? 'shell.evidence.open-due-vocab'
                              : control === 'shell.evidence.open-context'
                                ? 'shell.evidence.open-context'
                                : 'shell.evidence.resume-latest'
                        }
                        onClick={() => openDestination(item.destination)}
                      >
                        <strong>{item.label}</strong>
                        <span>{item.detail}</span>
                      </button>
                    ) : (
                      <div className="omni-evidence-dock__item is-static">
                        <CircleAlert aria-hidden="true" />
                        <div>
                          <strong>{item.label}</strong>
                          <span>{item.detail}</span>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}
    </aside>
  );
}
