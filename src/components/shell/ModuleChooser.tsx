import { useEffect, useRef } from 'react';
import { CANONICAL_MODULES } from '../../lib/appShell';
import type { ModuleId } from '../../types';

function chooserControl(id: (typeof CANONICAL_MODULES)[number]['id']): string {
  if (id === 'sources') return 'shell.chooser.module-sources';
  if (id === 'vocabulary') return 'shell.chooser.module-vocabulary';
  if (id === 'grammar') return 'shell.chooser.module-grammar';
  if (id === 'media') return 'shell.chooser.module-media';
  if (id === 'practice') return 'shell.chooser.module-practice';
  if (id === 'mock_test') return 'shell.chooser.module-mock';
  return 'shell.chooser.module-review';
}

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
      panelRef.current?.querySelector<HTMLButtonElement>('button[data-ux-control^="shell.chooser.module-"]')?.focus();
    };
    const timer = window.setTimeout(focusFirst, 0);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLButtonElement>('button'));
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
          {CANONICAL_MODULES.map((module) => (
            <li key={module.id}>
              <button
                type="button"
                className="omni-module-chooser__item"
                data-ux-flow="app.navigation"
                data-ux-control={chooserControl(module.id)}
                onClick={() => onSelect(module.id)}
              >
                <strong>{module.label}</strong>
                <span>{module.description}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
