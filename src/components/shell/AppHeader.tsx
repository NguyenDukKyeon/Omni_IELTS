import { ChevronDown, MessageSquareText } from 'lucide-react';
import { OmniLogo } from '../brand/OmniLogo';
import { useApp } from '../../context/AppContext';
import { ConnectivityStatus } from './ConnectivityStatus';
import { ThemeMenu } from './ThemeMenu';

export function AppHeader() {
  const { setActiveModule, setIsAITutorOpen, activeModule, profile } = useApp();
  const initials = profile.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

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
          className="omni-shell-header__action"
          data-ux-flow="tutor.chat"
          data-ux-control="shell.header.open-tutor"
          aria-label="Open AI Tutor"
          onClick={() => setIsAITutorOpen(true)}
        >
          <MessageSquareText aria-hidden="true" className="omni-shell-header__action-icon" />
          <span>AI Tutor</span>
        </button>
        <ThemeMenu />
        <button
          type="button"
          id="profile-nav-btn"
          className={`omni-shell-header__action omni-shell-header__profile ${activeModule === 'profile' ? 'is-active' : ''}`}
          data-ux-flow="app.navigation"
          data-ux-control="shell.header.open-profile"
          aria-label="Hồ sơ"
          onClick={() => setActiveModule('profile')}
        >
          <span aria-hidden="true" className="omni-shell-header__avatar">{initials}</span>
          <span className="omni-shell-header__profile-name">{profile.name}</span>
          <ChevronDown aria-hidden="true" className="omni-shell-header__profile-chevron" />
        </button>
      </div>
    </header>
  );
}
