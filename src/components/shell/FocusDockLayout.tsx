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
  mainKey?: string;
}

export function FocusDockLayout({
  navigation,
  children,
  evidence,
  examMode,
  focusMode = false,
  mainKey,
}: FocusDockLayoutProps) {
  const { navCollapsed, evidenceDock } = useAppShell();
  const showChrome = !examMode;
  const showEvidence = showChrome && Boolean(evidence) && evidenceDock !== 'hidden';

  return (
    <div
      className={`omni-focus-dock${examMode ? ' omni-focus-dock--exam' : ''}${focusMode && showChrome ? ' omni-focus-dock--focus' : ''}`}
      data-nav-collapsed={showChrome && navCollapsed ? 'true' : 'false'}
      data-evidence={showEvidence ? evidenceDock : 'hidden'}
    >
      <div className="omni-focus-dock__frame">
        {showChrome ? <AppHeader /> : null}
        <div
          className={`omni-focus-dock__body${showEvidence ? ' omni-focus-dock__body--with-evidence' : ''}${examMode ? ' omni-focus-dock__body--exam' : ''}`}
        >
          {showChrome ? <div className="omni-focus-dock__nav">{navigation}</div> : null}
          <main id="main-viewport-content" key={mainKey} className="omni-focus-dock__main">
            {children}
          </main>
          {showEvidence ? <div className="omni-focus-dock__evidence">{evidence}</div> : null}
        </div>
        {showChrome ? <BottomNav /> : null}
      </div>
    </div>
  );
}
