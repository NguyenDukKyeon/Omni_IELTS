import { MessageSquareText, UserRound } from 'lucide-react';
import { OmniLogo } from '../brand/OmniLogo';
import { useApp } from '../../context/AppContext';
import { ConnectivityStatus } from './ConnectivityStatus';
import { ThemeMenu } from './ThemeMenu';

export function AppHeader() {
  const { setActiveModule, setIsAITutorOpen, activeModule } = useApp();

  return (
    <header id="app-header" className="omni-shell-header">
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
          className={`omni-shell-header__action ${activeModule === 'profile' ? 'is-active' : ''}`}
          data-ux-flow="app.navigation"
          data-ux-control="shell.header.open-profile"
          aria-label="Hồ sơ"
          onClick={() => setActiveModule('profile')}
        >
          <UserRound aria-hidden="true" className="omni-shell-header__action-icon" />
          <span>Hồ sơ</span>
        </button>
      </div>
    </header>
  );
}
