import type { ReactNode } from 'react';
import { useAppShell } from '../../context/AppShellContext';
import { AppHeader } from './AppHeader';
import { BottomNav } from '../BottomNav';

export interface FocusDockLayoutProps {
  navigation: ReactNode;
  children: ReactNode;
  evidence: ReactNode;
  examMode: boolean;
  focusMode?: boolean;
}

export function FocusDockLayout({
  navigation,
  children,
  evidence,
  examMode,
  focusMode = false,
}: FocusDockLayoutProps) {
  const { navCollapsed, evidenceDock } = useAppShell();

  if (examMode) {
    return (
      <div className="omni-focus-dock omni-focus-dock--exam">
        {children}
      </div>
    );
  }

  const showEvidence = Boolean(evidence) && evidenceDock !== 'hidden';

  return (
    <div
      className={`omni-focus-dock ${focusMode ? 'omni-focus-dock--focus' : ''}`}
      data-nav-collapsed={navCollapsed ? 'true' : 'false'}
      data-evidence={showEvidence ? evidenceDock : 'hidden'}
    >
      <AppHeader />
      <div
        className={`omni-focus-dock__body ${showEvidence ? 'omni-focus-dock__body--with-evidence' : ''}`}
      >
        <div className="omni-focus-dock__nav">{navigation}</div>
        <main id="main-viewport-content" className="omni-focus-dock__main">
          {children}
        </main>
        {showEvidence && (
          <div className="omni-focus-dock__evidence">{evidence}</div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
