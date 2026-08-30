import { BookOpen, Home, ListChecks, MoreHorizontal, PenLine } from 'lucide-react';
import type { ComponentType } from 'react';
import { useApp } from '../../context/AppContext';
import { useAppShell } from '../../context/AppShellContext';
import {
  destinationForModule,
  MOBILE_DESTINATIONS,
  modulesInMobileGroup,
  type MobileDestinationId,
  type ThemePreference,
} from '../../lib/appShell';
import type { ModuleId } from '../../types';
import { MobileModuleSheet } from './MobileModuleSheet';

const ICONS: Record<MobileDestinationId, ComponentType<{ className?: string; 'aria-hidden'?: boolean }>> = {
  home: Home,
  learn: BookOpen,
  practice: PenLine,
  review: ListChecks,
  more: MoreHorizontal,
};

const LEARN_CONTROLS: Record<string, string> = {
  sources: 'shell.mobile.learn-sources',
  vocabulary: 'shell.mobile.learn-vocabulary',
  grammar: 'shell.mobile.learn-grammar',
  media: 'shell.mobile.learn-media',
};

const PRACTICE_CONTROLS: Record<string, string> = {
  practice: 'shell.mobile.practice-practice',
  mock_test: 'shell.mobile.practice-mock',
};

const THEME_OPTIONS: ReadonlyArray<{ id: ThemePreference; label: string; control: string }> = [
  { id: 'system', label: 'Hệ thống', control: 'shell.mobile.theme-system' },
  { id: 'light', label: 'Sáng', control: 'shell.mobile.theme-light' },
  { id: 'dark', label: 'Tối', control: 'shell.mobile.theme-dark' },
  { id: 'high_contrast', label: 'Tương phản cao', control: 'shell.mobile.theme-high-contrast' },
];

export function MobileNavigation() {
  const { activeModule, setActiveModule, setIsAITutorOpen } = useApp();
  const { mobileDestination, setMobileDestination, themePreference, setThemePreference } = useAppShell();
  const currentDestination = destinationForModule(activeModule);
  const sheetOpen = mobileDestination === 'learn' || mobileDestination === 'practice' || mobileDestination === 'more';

  const closeSheet = () => setMobileDestination(null);

  const goToModule = (id: ModuleId) => {
    setActiveModule(id);
    closeSheet();
  };

  const onDestination = (id: MobileDestinationId) => {
    if (id === 'home') {
      closeSheet();
      setActiveModule('dashboard');
      return;
    }
    if (id === 'review') {
      closeSheet();
      setActiveModule('review_progress');
      return;
    }
    setMobileDestination(mobileDestination === id ? null : id);
  };

  const learnItems = modulesInMobileGroup('learn').map((module) => ({
    id: module.id,
    label: module.label,
    description: module.description,
    control: LEARN_CONTROLS[module.id],
    onSelect: () => goToModule(module.id),
  }));

  const practiceItems = modulesInMobileGroup('practice').map((module) => ({
    id: module.id,
    label: module.label,
    description: module.description,
    control: PRACTICE_CONTROLS[module.id],
    onSelect: () => goToModule(module.id),
  }));

  return (
    <>
      <nav
        id="mobile-bottom-nav"
        className="omni-mobile-nav"
        aria-label="Điều hướng di động"
      >
        {MOBILE_DESTINATIONS.map((destination) => {
          const Icon = ICONS[destination.id];
          const isCurrent = currentDestination === destination.id && !sheetOpen;
          const expanded = sheetOpen && mobileDestination === destination.id;
          const content = (
            <>
              <Icon aria-hidden={true} className="omni-mobile-nav__icon" />
              <span>{destination.label}</span>
            </>
          );
          const className = `omni-mobile-nav__item${isCurrent || expanded ? ' is-active' : ''}`;
          if (destination.id === 'home') {
            return <button key={destination.id} type="button" id="mobile-nav-home" className={className} aria-current={isCurrent ? 'page' : undefined} data-ux-flow="app.navigation" data-ux-control="shell.mobile.home" onClick={() => onDestination(destination.id)}>{content}</button>;
          }
          if (destination.id === 'learn') {
            return <button key={destination.id} type="button" id="mobile-nav-learn" className={className} aria-current={isCurrent ? 'page' : undefined} aria-expanded={expanded} aria-haspopup="dialog" data-ux-flow="app.navigation" data-ux-control="shell.mobile.learn" onClick={() => onDestination(destination.id)}>{content}</button>;
          }
          if (destination.id === 'practice') {
            return <button key={destination.id} type="button" id="mobile-nav-practice" className={className} aria-current={isCurrent ? 'page' : undefined} aria-expanded={expanded} aria-haspopup="dialog" data-ux-flow="app.navigation" data-ux-control="shell.mobile.practice" onClick={() => onDestination(destination.id)}>{content}</button>;
          }
          if (destination.id === 'review') {
            return <button key={destination.id} type="button" id="mobile-nav-review" className={className} aria-current={isCurrent ? 'page' : undefined} data-ux-flow="app.navigation" data-ux-control="shell.mobile.review" onClick={() => onDestination(destination.id)}>{content}</button>;
          }
          return <button key={destination.id} type="button" id="mobile-nav-more" className={className} aria-current={isCurrent ? 'page' : undefined} aria-expanded={expanded} aria-haspopup="dialog" data-ux-flow="app.navigation" data-ux-control="shell.mobile.more" onClick={() => onDestination(destination.id)}>{content}</button>;
        })}
      </nav>

      <MobileModuleSheet
        open={mobileDestination === 'learn'}
        title="Learn"
        titleId="omni-mobile-learn-title"
        items={learnItems}
        closeControl="shell.mobile.learn.sheet-close"
        onClose={closeSheet}
      />
      <MobileModuleSheet
        open={mobileDestination === 'practice'}
        title="Practice"
        titleId="omni-mobile-practice-title"
        items={practiceItems}
        closeControl="shell.mobile.practice.sheet-close"
        onClose={closeSheet}
      />
      <MobileModuleSheet
        open={mobileDestination === 'more'}
        title="More"
        titleId="omni-mobile-more-title"
        items={[
          {
            id: 'tutor',
            label: 'AI Tutor',
            description: 'Hỏi về bài đang làm',
            control: 'shell.mobile.more-tutor',
            onSelect: () => {
              closeSheet();
              setIsAITutorOpen(true);
            },
          },
          {
            id: 'profile',
            label: 'Hồ sơ',
            description: 'Hồ sơ người học',
            control: 'shell.mobile.more-profile',
            onSelect: () => goToModule('profile'),
          },
        ]}
        closeControl="shell.mobile.more.sheet-close"
        onClose={closeSheet}
      >
        <div className="omni-mobile-sheet__theme" data-ux-scope="app-shell-v2">
          <h3>Giao diện</h3>
          <div className="omni-mobile-sheet__theme-list" role="radiogroup" aria-label="Giao diện">
            {THEME_OPTIONS.map((option) => {
              const className = `omni-mobile-sheet__theme-item${themePreference === option.id ? ' is-active' : ''}`;
              if (option.id === 'system') {
                return <button key={option.id} type="button" role="radio" aria-checked={themePreference === option.id} className={className} data-ux-flow="app.navigation" data-ux-control="shell.mobile.theme-system" onClick={() => setThemePreference('system')}>{option.label}</button>;
              }
              if (option.id === 'light') {
                return <button key={option.id} type="button" role="radio" aria-checked={themePreference === option.id} className={className} data-ux-flow="app.navigation" data-ux-control="shell.mobile.theme-light" onClick={() => setThemePreference('light')}>{option.label}</button>;
              }
              if (option.id === 'dark') {
                return <button key={option.id} type="button" role="radio" aria-checked={themePreference === option.id} className={className} data-ux-flow="app.navigation" data-ux-control="shell.mobile.theme-dark" onClick={() => setThemePreference('dark')}>{option.label}</button>;
              }
              return <button key={option.id} type="button" role="radio" aria-checked={themePreference === option.id} className={className} data-ux-flow="app.navigation" data-ux-control="shell.mobile.theme-high-contrast" onClick={() => setThemePreference('high_contrast')}>{option.label}</button>;
            })}
          </div>
        </div>
      </MobileModuleSheet>
    </>
  );
}
