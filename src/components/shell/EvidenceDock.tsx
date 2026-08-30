import { useEffect, useRef } from 'react';
import { BookOpenCheck, ChevronLeft, ChevronRight, CircleAlert, Clock3, History } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAppShell } from '../../context/AppShellContext';
import { buildEvidenceDockModel, type EvidenceDockItem } from '../../lib/evidenceDock';
import {
  isExplicitIndependentEvidence,
  isExplicitMockEvidence,
  isUnfinishedPracticeAttempt,
} from '../../lib/learningEvidence';
import { getDueMistakes, getDueVocabCards } from '../../services/srsScheduler';
import type { ModuleId } from '../../types';

function controlForItem(item: EvidenceDockItem):
  | 'shell.evidence.open-due-review'
  | 'shell.evidence.open-due-vocab'
  | 'shell.evidence.open-context'
  | 'shell.evidence.resume-latest'
  | 'shell.evidence.open-practice'
  | 'shell.evidence.open-mock'
  | null {
  if (item.action === 'none' || !item.destination) return null;
  if (item.id === 'due-mistakes') return 'shell.evidence.open-due-review';
  if (item.id === 'due-vocab') return 'shell.evidence.open-due-vocab';
  if (item.action === 'resume') return 'shell.evidence.resume-latest';
  if (item.action === 'open_module' && item.destination === 'practice') return 'shell.evidence.open-practice';
  if (item.action === 'open_module' && item.destination === 'mock_test') return 'shell.evidence.open-mock';
  if (item.action === 'collect' || item.id === 'current-media' || item.action === 'open_module') {
    return 'shell.evidence.open-context';
  }
  return null;
}

type EvidenceDockControl = Exclude<ReturnType<typeof controlForItem>, null>;

function EvidenceDockButton({
  item,
  control,
  onOpen,
}: {
  item: EvidenceDockItem;
  control: EvidenceDockControl;
  onOpen: (destination?: ModuleId) => void;
}) {
  const StatusIcon = item.status === 'due'
    ? Clock3
    : item.status === 'unfinished'
      ? History
      : BookOpenCheck;
  const content = (
    <>
      <StatusIcon aria-hidden="true" className="omni-evidence-dock__item-icon" />
      <strong>{item.label}</strong>
      <span>{item.detail}</span>
    </>
  );
  const props = {
    type: 'button' as const,
    className: 'omni-evidence-dock__item',
  };

  if (control === 'shell.evidence.open-due-review') {
    return <button {...props} data-ux-scope="app-shell-v2" data-ux-flow="app.navigation" data-ux-control="shell.evidence.open-due-review" onClick={() => onOpen(item.destination)}>{content}</button>;
  }
  if (control === 'shell.evidence.open-due-vocab') {
    return <button {...props} data-ux-scope="app-shell-v2" data-ux-flow="app.navigation" data-ux-control="shell.evidence.open-due-vocab" onClick={() => onOpen(item.destination)}>{content}</button>;
  }
  if (control === 'shell.evidence.resume-latest') {
    return <button {...props} data-ux-scope="app-shell-v2" data-ux-flow="app.navigation" data-ux-control="shell.evidence.resume-latest" onClick={() => onOpen(item.destination)}>{content}</button>;
  }
  if (control === 'shell.evidence.open-practice') {
    return <button {...props} data-ux-scope="app-shell-v2" data-ux-flow="app.navigation" data-ux-control="shell.evidence.open-practice" onClick={() => onOpen(item.destination)}>{content}</button>;
  }
  if (control === 'shell.evidence.open-mock') {
    return <button {...props} data-ux-scope="app-shell-v2" data-ux-flow="app.navigation" data-ux-control="shell.evidence.open-mock" onClick={() => onOpen(item.destination)}>{content}</button>;
  }
  return <button {...props} data-ux-scope="app-shell-v2" data-ux-flow="app.navigation" data-ux-control="shell.evidence.open-context" onClick={() => onOpen(item.destination)}>{content}</button>;
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
  const dockRef = useRef<HTMLElement>(null);
  const collapseRef = useRef<HTMLButtonElement>(null);
  const expandRef = useRef<HTMLButtonElement>(null);
  const previousState = useRef(evidenceDock);

  const dueMistakes = getDueMistakes(mistakes);
  const dueVocab = getDueVocabCards(vocabCards);
  const currentMedia = mediaSessions.find((session) => !session.completed);
  const unfinished = practiceAttempts.find(isUnfinishedPracticeAttempt);
  const latestAttempt = practiceAttempts.find(isExplicitIndependentEvidence);
  const latestMock = mockResults.find(isExplicitMockEvidence);
  const recentEvidence = unfinished
    ? [{ id: unfinished.id, label: unfinished.taskType, destination: 'practice' as ModuleId, canResume: true }]
    : latestAttempt
      ? [{ id: latestAttempt.id, label: latestAttempt.taskType, destination: 'practice' as ModuleId, canResume: false }]
      : latestMock
        ? [{ id: latestMock.id, label: latestMock.testTitle, destination: 'mock_test' as ModuleId, canResume: false }]
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
      const target = event.target as Node | null;
      if (!dockRef.current || !target || !dockRef.current.contains(target)) return;
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
      <aside ref={dockRef} className="omni-evidence-dock is-collapsed" aria-label="Bằng chứng và việc đến hạn" data-ux-scope="app-shell-v2">
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
    <aside ref={dockRef} className="omni-evidence-dock" aria-label="Bằng chứng và việc đến hạn" data-ux-scope="app-shell-v2">
      <header className="omni-evidence-dock__header">
        <div>
          <p className="omni-evidence-dock__eyebrow">Bằng chứng học tập</p>
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
                    {clickable && control ? (
                      <EvidenceDockButton item={item} control={control} onOpen={openDestination} />
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
