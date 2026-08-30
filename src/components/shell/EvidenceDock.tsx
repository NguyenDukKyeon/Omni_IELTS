import { useEffect, useRef } from 'react';
import { BookOpenCheck, ChevronLeft, ChevronRight, CircleAlert, Clock3 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAppShell } from '../../context/AppShellContext';
import { buildEvidenceDockModel, type EvidenceDockItem } from '../../lib/evidenceDock';
import {
  isExplicitIndependentEvidence,
  isExplicitMockEvidence,
} from '../../lib/learningEvidence';
import { getDueMistakes, getDueVocabCards } from '../../services/srsScheduler';
import type { ModuleId } from '../../types';

function controlForItem(item: EvidenceDockItem):
  | 'shell.evidence.open-due-review'
  | 'shell.evidence.open-due-vocab'
  | 'shell.evidence.open-context'
  | 'shell.evidence.open-practice'
  | 'shell.evidence.open-mock'
  | 'shell.evidence.open-media'
  | null {
  if (item.action === 'none' || !item.destination) return null;
  if (item.id === 'due-mistakes') return 'shell.evidence.open-due-review';
  if (item.id === 'due-vocab') return 'shell.evidence.open-due-vocab';
  if (item.action === 'open_module' && item.destination === 'practice') return 'shell.evidence.open-practice';
  if (item.action === 'open_module' && item.destination === 'mock_test') return 'shell.evidence.open-mock';
  if (item.action === 'open_module' && item.destination === 'media') return 'shell.evidence.open-media';
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
  if (control === 'shell.evidence.open-practice') {
    return <button {...props} data-ux-scope="app-shell-v2" data-ux-flow="app.navigation" data-ux-control="shell.evidence.open-practice" onClick={() => onOpen(item.destination)}>{content}</button>;
  }
  if (control === 'shell.evidence.open-mock') {
    return <button {...props} data-ux-scope="app-shell-v2" data-ux-flow="app.navigation" data-ux-control="shell.evidence.open-mock" onClick={() => onOpen(item.destination)}>{content}</button>;
  }
  if (control === 'shell.evidence.open-media') {
    return <button {...props} data-ux-scope="app-shell-v2" data-ux-flow="app.navigation" data-ux-control="shell.evidence.open-media" onClick={() => onOpen(item.destination)}>{content}</button>;
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
  const totalDue = dueMistakes.length + dueVocab.length;
  const currentMedia = mediaSessions.find((session) => !session.completed);
  const latestAttempt = [...practiceAttempts]
    .filter(isExplicitIndependentEvidence)
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))[0];
  const latestMock = [...mockResults]
    .filter(isExplicitMockEvidence)
    .sort((a, b) => Date.parse(b.completedDate) - Date.parse(a.completedDate))[0];
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
          title="Mở rộng bằng chứng"
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
        <div className="omni-evidence-dock__header-copy">
          <p className="omni-evidence-dock__eyebrow">Căn cứ & Đề xuất</p>
          <h2>Cơ sở đề xuất</h2>
        </div>
        <button
          ref={collapseRef}
          type="button"
          className="omni-evidence-dock__collapse"
          data-ux-flow="app.navigation"
          data-ux-control="shell.evidence.collapse"
          title="Thu gọn"
          onClick={() => setEvidenceDock('collapsed')}
        >
          <ChevronRight aria-hidden="true" />
          <span>Thu gọn</span>
        </button>
      </header>

      <div className="omni-evidence-dock__sections">
        {model.sections.map((section) => (
          <section key={section.id} id={section.id} className="omni-evidence-dock__section">
            <h3 className="omni-evidence-dock__section-title">{section.title}</h3>
            {section.id === 'system-due' && totalDue > 0 && (
              <p className="omni-evidence-dock__due-total">{totalDue}</p>
            )}
            {section.items.length === 0 ? (
              <div className="omni-evidence-dock__empty-card">
                <CircleAlert aria-hidden="true" className="w-4 h-4 text-stone-400" />
                <p className="omni-evidence-dock__empty">
                  {section.id === 'system-due'
                    ? 'Không có việc đến hạn hôm nay.'
                    : 'Chưa đủ dữ liệu độc lập.'}
                </p>
              </div>
            ) : (
              <ul className="omni-evidence-dock__list">
                {section.items.map((item) => {
                  const control = controlForItem(item);
                  const clickable = Boolean(item.destination && control);
                  return (
                    <li key={item.id} data-status={item.status} className="omni-evidence-dock__list-item">
                      {clickable && control ? (
                        <EvidenceDockButton item={item} control={control} onOpen={openDestination} />
                      ) : (
                        <div className="omni-evidence-dock__item is-static">
                          <CircleAlert aria-hidden="true" className="omni-evidence-dock__item-icon" />
                          <div className="omni-evidence-dock__item-text">
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
        {currentMedia && (
          <section id="continue-learning" className="omni-evidence-dock__section omni-evidence-dock__continue">
            <h3 className="omni-evidence-dock__section-title">Tiếp tục học</h3>
            <button
              type="button"
              className="omni-evidence-dock__item"
              data-ux-flow="app.navigation"
              data-ux-control="shell.evidence.open-media"
              onClick={() => openDestination('media')}
            >
              <BookOpenCheck aria-hidden="true" className="omni-evidence-dock__item-icon" />
              <span className="omni-evidence-dock__item-text">
                <strong>{currentMedia.title}</strong>
                <span>Mở Media Lab từ bài đã lưu</span>
              </span>
            </button>
          </section>
        )}
      </div>
    </aside>
  );
}
