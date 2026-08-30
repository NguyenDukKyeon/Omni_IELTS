import { useEffect, useRef } from 'react';
import { CANONICAL_MODULES } from '../../lib/appShell';
import type { ModuleId } from '../../types';

export interface ModuleChooserProps {
  open: boolean;
  onClose: () => void;
  onSelect: (id: ModuleId) => void;
}

export function ModuleChooser({ open, onClose, onSelect }: ModuleChooserProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusFirst = () => {
      const first = panelRef.current?.querySelector('button[data-ux-control^="shell.chooser.module-"]') as HTMLButtonElement | null;
      first?.focus();
    };
    const timer = window.setTimeout(focusFirst, 0);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll('button')) as HTMLButtonElement[];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="omni-module-chooser"
      data-ux-scope="app-shell-v2"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="omni-module-chooser__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="omni-module-chooser-title"
      >
        <header className="omni-module-chooser__header">
          <h2 id="omni-module-chooser-title">Chọn module học tập</h2>
          <button
            type="button"
            className="omni-module-chooser__close"
            data-ux-flow="app.navigation"
            data-ux-control="shell.chooser.close"
            onClick={onClose}
          >
            Đóng
          </button>
        </header>
        <ul className="omni-module-chooser__list">
          {CANONICAL_MODULES.map((module) => {
            const content = (
              <>
                <strong>{module.label}</strong>
                <span>{module.description}</span>
              </>
            );
            if (module.id === 'sources') {
              return (
                <li key={module.id}>
                  <button type="button" className="omni-module-chooser__item" data-ux-flow="app.navigation" data-ux-control="shell.chooser.module-sources" onClick={() => onSelect(module.id)}>{content}</button>
                </li>
              );
            }
            if (module.id === 'vocabulary') {
              return (
                <li key={module.id}>
                  <button type="button" className="omni-module-chooser__item" data-ux-flow="app.navigation" data-ux-control="shell.chooser.module-vocabulary" onClick={() => onSelect(module.id)}>{content}</button>
                </li>
              );
            }
            if (module.id === 'grammar') {
              return (
                <li key={module.id}>
                  <button type="button" className="omni-module-chooser__item" data-ux-flow="app.navigation" data-ux-control="shell.chooser.module-grammar" onClick={() => onSelect(module.id)}>{content}</button>
                </li>
              );
            }
            if (module.id === 'media') {
              return (
                <li key={module.id}>
                  <button type="button" className="omni-module-chooser__item" data-ux-flow="app.navigation" data-ux-control="shell.chooser.module-media" onClick={() => onSelect(module.id)}>{content}</button>
                </li>
              );
            }
            if (module.id === 'practice') {
              return (
                <li key={module.id}>
                  <button type="button" className="omni-module-chooser__item" data-ux-flow="app.navigation" data-ux-control="shell.chooser.module-practice" onClick={() => onSelect(module.id)}>{content}</button>
                </li>
              );
            }
            if (module.id === 'mock_test') {
              return (
                <li key={module.id}>
                  <button type="button" className="omni-module-chooser__item" data-ux-flow="app.navigation" data-ux-control="shell.chooser.module-mock" onClick={() => onSelect(module.id)}>{content}</button>
                </li>
              );
            }
            return (
              <li key={module.id}>
                <button type="button" className="omni-module-chooser__item" data-ux-flow="app.navigation" data-ux-control="shell.chooser.module-review" onClick={() => onSelect(module.id)}>{content}</button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
