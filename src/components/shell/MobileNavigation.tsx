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
          const opensSheet = destination.id === 'learn' || destination.id === 'practice' || destination.id === 'more';

          return (
            <button
              key={destination.id}
              type="button"
              id={`mobile-nav-${destination.id}`}
              className={`omni-mobile-nav__item${isCurrent || expanded ? ' is-active' : ''}`}
              aria-current={isCurrent ? 'page' : undefined}
              aria-expanded={opensSheet ? expanded : undefined}
              aria-haspopup={opensSheet ? 'dialog' : undefined}
              data-ux-flow="app.navigation"
              data-ux-control={`shell.mobile.${destination.id}`}
              onClick={() => onDestination(destination.id)}
            >
              <Icon aria-hidden={true} className="omni-mobile-nav__icon" />
              <span>{destination.label}</span>
            </button>
          );
        })}
      </nav>

      <MobileModuleSheet
        open={mobileDestination === 'learn'}
        title="Learn"
        titleId="omni-mobile-learn-title"
        items={learnItems}
        onClose={closeSheet}
      />
      <MobileModuleSheet
        open={mobileDestination === 'practice'}
        title="Practice"
        titleId="omni-mobile-practice-title"
        items={practiceItems}
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
        onClose={closeSheet}
      >
        <div className="omni-mobile-sheet__theme">
          <h3>Giao diện</h3>
          <div className="omni-mobile-sheet__theme-list" role="radiogroup" aria-label="Giao diện">
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={themePreference === option.id}
                className={`omni-mobile-sheet__theme-item${themePreference === option.id ? ' is-active' : ''}`}
                data-ux-flow="app.navigation"
                data-ux-control={option.control}
                onClick={() => setThemePreference(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </MobileModuleSheet>
    </>
  );
}
