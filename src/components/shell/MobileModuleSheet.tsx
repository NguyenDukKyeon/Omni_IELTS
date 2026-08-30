import { useEffect, useRef, type ReactNode } from 'react';

export interface MobileSheetItem {
  id: string;
  label: string;
  description?: string;
  control: string;
  onSelect: () => void;
}

export interface MobileModuleSheetProps {
  open: boolean;
  title: string;
  titleId: string;
  items: MobileSheetItem[];
  onClose: () => void;
  children?: ReactNode;
}

export function MobileModuleSheet({
  open,
  title,
  titleId,
  items,
  onClose,
  children,
}: MobileModuleSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusFirst = () => {
      panelRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
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
        aria-labelledby={titleId}
      >
        <header className="omni-module-chooser__header">
          <h2 id={titleId}>{title}</h2>
          <button
            type="button"
            className="omni-module-chooser__close"
            data-ux-flow="app.navigation"
            data-ux-control="shell.mobile.sheet-close"
            onClick={onClose}
          >
            Đóng
          </button>
        </header>
        <ul className="omni-module-chooser__list">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="omni-module-chooser__item"
                data-ux-flow="app.navigation"
                data-ux-control={item.control}
                onClick={item.onSelect}
              >
                <strong>{item.label}</strong>
                {item.description ? <span>{item.description}</span> : null}
              </button>
            </li>
          ))}
        </ul>
        {children}
      </div>
    </div>
  );
}
