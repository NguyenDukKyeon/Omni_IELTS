import { useEffect, useRef, type ReactNode } from 'react';

export interface MobileSheetItem {
  id: string;
  label: string;
  description?: string;
  control: string;
  onSelect: () => void;
}

export type MobileSheetCloseControl =
  | 'shell.mobile.learn.sheet-close'
  | 'shell.mobile.practice.sheet-close'
  | 'shell.mobile.more.sheet-close';

export interface MobileModuleSheetProps {
  open: boolean;
  title: string;
  titleId: string;
  items: MobileSheetItem[];
  closeControl: MobileSheetCloseControl;
  onClose: () => void;
  children?: ReactNode;
}

export function MobileModuleSheet({
  open,
  title,
  titleId,
  items,
  closeControl,
  onClose,
  children,
}: MobileModuleSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const layer = panelRef.current?.parentElement;
    const frame = layer?.parentElement;
    const inertSiblings = frame
      ? Array.from(frame.children).filter((child) => child !== layer) as HTMLElement[]
      : [];
    inertSiblings.forEach((target) => {
      target.inert = true;
    });
    document.body.classList.add('omni-sheet-open');
    const focusFirst = () => {
      const first = panelRef.current?.querySelector('button') as HTMLButtonElement | null;
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
      inertSiblings.forEach((target) => {
        target.inert = false;
      });
      document.body.classList.remove('omni-sheet-open');
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
        aria-labelledby={titleId}
      >
        <header className="omni-module-chooser__header">
          <h2 id={titleId}>{title}</h2>
          {closeControl === 'shell.mobile.learn.sheet-close' ? (
            <button type="button" className="omni-module-chooser__close" data-ux-flow="app.navigation" data-ux-control="shell.mobile.learn.sheet-close" onClick={onClose}>Đóng</button>
          ) : closeControl === 'shell.mobile.practice.sheet-close' ? (
            <button type="button" className="omni-module-chooser__close" data-ux-flow="app.navigation" data-ux-control="shell.mobile.practice.sheet-close" onClick={onClose}>Đóng</button>
          ) : (
            <button type="button" className="omni-module-chooser__close" data-ux-flow="app.navigation" data-ux-control="shell.mobile.more.sheet-close" onClick={onClose}>Đóng</button>
          )}
        </header>
        <ul className="omni-module-chooser__list">
          {items.map((item) => {
            const content = (
              <>
                <strong>{item.label}</strong>
                {item.description ? <span>{item.description}</span> : null}
              </>
            );
            if (item.control === 'shell.mobile.learn-sources') {
              return <li key={item.id}><button type="button" className="omni-module-chooser__item" data-ux-flow="app.navigation" data-ux-control="shell.mobile.learn-sources" onClick={item.onSelect}>{content}</button></li>;
            }
            if (item.control === 'shell.mobile.learn-vocabulary') {
              return <li key={item.id}><button type="button" className="omni-module-chooser__item" data-ux-flow="app.navigation" data-ux-control="shell.mobile.learn-vocabulary" onClick={item.onSelect}>{content}</button></li>;
            }
            if (item.control === 'shell.mobile.learn-grammar') {
              return <li key={item.id}><button type="button" className="omni-module-chooser__item" data-ux-flow="app.navigation" data-ux-control="shell.mobile.learn-grammar" onClick={item.onSelect}>{content}</button></li>;
            }
            if (item.control === 'shell.mobile.learn-media') {
              return <li key={item.id}><button type="button" className="omni-module-chooser__item" data-ux-flow="app.navigation" data-ux-control="shell.mobile.learn-media" onClick={item.onSelect}>{content}</button></li>;
            }
            if (item.control === 'shell.mobile.practice-practice') {
              return <li key={item.id}><button type="button" className="omni-module-chooser__item" data-ux-flow="app.navigation" data-ux-control="shell.mobile.practice-practice" onClick={item.onSelect}>{content}</button></li>;
            }
            if (item.control === 'shell.mobile.practice-mock') {
              return <li key={item.id}><button type="button" className="omni-module-chooser__item" data-ux-flow="app.navigation" data-ux-control="shell.mobile.practice-mock" onClick={item.onSelect}>{content}</button></li>;
            }
            if (item.control === 'shell.mobile.more-tutor') {
              return <li key={item.id}><button type="button" className="omni-module-chooser__item" data-ux-flow="tutor.chat" data-ux-control="shell.mobile.more-tutor" onClick={item.onSelect}>{content}</button></li>;
            }
            if (item.control === 'shell.mobile.more-profile') {
              return <li key={item.id}><button type="button" className="omni-module-chooser__item" data-ux-flow="app.navigation" data-ux-control="shell.mobile.more-profile" onClick={item.onSelect}>{content}</button></li>;
            }
            return null;
          })}
        </ul>
        {children}
      </div>
    </div>
  );
}
