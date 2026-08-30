import { useEffect, useRef, useState } from 'react';
import { Bell, ChevronDown, MessageSquareText, UserRound } from 'lucide-react';
import { OmniLogo } from '../brand/OmniLogo';
import { useApp } from '../../context/AppContext';
import { getDueMistakes, getDueVocabCards } from '../../services/srsScheduler';
import { ConnectivityStatus } from './ConnectivityStatus';
import { ThemeMenu } from './ThemeMenu';

export function AppHeader() {
  const {
    setActiveModule,
    setIsAITutorOpen,
    profile,
    mistakes,
    vocabCards,
  } = useApp();
  const [accountOpen, setAccountOpen] = useState(false);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const initials = profile.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  const dueMistakeCount = getDueMistakes(mistakes).length;
  const dueVocabCount = getDueVocabCards(vocabCards).length;
  const dueWorkCount = dueMistakeCount + dueVocabCount;

  useEffect(() => {
    if (!accountOpen) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setAccountOpen(false);
      accountTriggerRef.current?.focus();
    };
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (accountMenuRef.current?.contains(target) || accountTriggerRef.current?.contains(target)) return;
      setAccountOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [accountOpen]);

  const openProfile = () => {
    setAccountOpen(false);
    setActiveModule('profile');
  };

  const openTutor = () => {
    setAccountOpen(false);
    setIsAITutorOpen(true);
  };

  return (
    <header id="app-header" className="omni-shell-header" data-ux-scope="app-shell-v2">
      <button
        type="button"
        id="brand-home-btn"
        className="omni-shell-header__home"
        aria-label="OMNI Home"
        data-ux-flow="app.navigation"
        data-ux-control="shell.header.home"
        onClick={() => setActiveModule('dashboard')}
      >
        <OmniLogo variant="horizontal" />
      </button>

      <div className="omni-shell-header__actions">
        <ConnectivityStatus />
        <button
          type="button"
          className="omni-shell-header__notification"
          aria-label="Mở việc đến hạn"
          data-ux-flow="app.navigation"
          data-ux-control="shell.header.open-review"
          onClick={() => setActiveModule('review_progress')}
        >
          <Bell aria-hidden="true" />
          {dueWorkCount > 0 && <span className="omni-shell-header__notification-count">{dueWorkCount}</span>}
        </button>

        <div className="omni-shell-header__account">
          <button
            ref={accountTriggerRef}
            type="button"
            className={`omni-shell-header__profile${accountOpen ? ' is-active' : ''}`}
            data-ux-flow="app.navigation"
            data-ux-control="shell.header.open-account-menu"
            aria-expanded={accountOpen}
            aria-haspopup="menu"
            aria-label="Mở tài khoản và công cụ"
            onClick={() => setAccountOpen((open) => !open)}
          >
            <span aria-hidden="true" className="omni-shell-header__avatar">{initials}</span>
            <span className="omni-shell-header__profile-name">{profile.name}</span>
            <ChevronDown aria-hidden="true" className="omni-shell-header__profile-chevron" />
          </button>

          {accountOpen && (
            <div
              ref={accountMenuRef}
              className="omni-shell-header__account-menu"
              role="menu"
              aria-label="Tài khoản và công cụ"
            >
              <button
                type="button"
                role="menuitem"
                className="omni-shell-header__menu-item"
                data-ux-flow="tutor.chat"
                data-ux-control="shell.header.open-tutor"
                onClick={openTutor}
              >
                <MessageSquareText aria-hidden="true" />
                <span>AI Tutor</span>
              </button>
              <ThemeMenu />
              <button
                type="button"
                role="menuitem"
                className="omni-shell-header__menu-item"
                data-ux-flow="app.navigation"
                data-ux-control="shell.header.open-profile"
                onClick={openProfile}
              >
                <UserRound aria-hidden="true" />
                <span>Hồ sơ</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
