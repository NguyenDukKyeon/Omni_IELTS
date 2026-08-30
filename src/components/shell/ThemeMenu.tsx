import { useEffect, useRef, useState } from 'react';
import { Check, SunMoon } from 'lucide-react';
import { useAppShell } from '../../context/AppShellContext';
import type { ThemePreference } from '../../lib/appShell';

export function ThemeMenu() {
  const { themePreference, setThemePreference } = useAppShell();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    };
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [open]);

  const selectTheme = (theme: ThemePreference) => {
    setThemePreference(theme);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className="omni-theme-menu" ref={menuRef} data-ux-scope="app-shell-v2">
      <button
        ref={triggerRef}
        type="button"
        id="darkmode-toggle-btn"
        className="omni-shell-header__action"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Giao diện"
        data-ux-flow="app.navigation"
        data-ux-control="shell.theme.open"
        onClick={() => setOpen((current) => !current)}
      >
        <SunMoon aria-hidden="true" className="omni-shell-header__action-icon" />
        <span>Giao diện</span>
      </button>
      {open && (
        <div className="omni-theme-menu__panel" role="menu" aria-label="Chọn giao diện">
          <button
            type="button"
            role="menuitemradio"
            aria-checked={themePreference === 'system'}
            className="omni-theme-menu__item"
            data-ux-flow="app.navigation"
            data-ux-control="shell.theme.system"
            onClick={() => selectTheme('system')}
          >
            <span>Hệ thống</span>
            {themePreference === 'system' && <Check aria-hidden="true" className="omni-theme-menu__check" />}
          </button>
          <button
            type="button"
            role="menuitemradio"
            aria-checked={themePreference === 'light'}
            className="omni-theme-menu__item"
            data-ux-flow="app.navigation"
            data-ux-control="shell.theme.light"
            onClick={() => selectTheme('light')}
          >
            <span>Sáng</span>
            {themePreference === 'light' && <Check aria-hidden="true" className="omni-theme-menu__check" />}
          </button>
          <button
            type="button"
            role="menuitemradio"
            aria-checked={themePreference === 'dark'}
            className="omni-theme-menu__item"
            data-ux-flow="app.navigation"
            data-ux-control="shell.theme.dark"
            onClick={() => selectTheme('dark')}
          >
            <span>Tối</span>
            {themePreference === 'dark' && <Check aria-hidden="true" className="omni-theme-menu__check" />}
          </button>
          <button
            type="button"
            role="menuitemradio"
            aria-checked={themePreference === 'high_contrast'}
            className="omni-theme-menu__item"
            data-ux-flow="app.navigation"
            data-ux-control="shell.theme.high-contrast"
            onClick={() => selectTheme('high_contrast')}
          >
            <span>Tương phản cao</span>
            {themePreference === 'high_contrast' && <Check aria-hidden="true" className="omni-theme-menu__check" />}
          </button>
        </div>
      )}
    </div>
  );
}
