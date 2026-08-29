import type { ReactNode } from 'react';
import {
  BookOpenCheck,
  GraduationCap,
  Headphones,
  Layers,
  LayoutDashboard,
  Library,
  ListChecks,
  PanelLeftClose,
  PanelLeftOpen,
  PenLine,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAppShell } from '../../context/AppShellContext';
import { CANONICAL_MODULES } from '../../lib/appShell';
import type { ModuleId } from '../../types';

function NavCopy({
  icon,
  label,
  description,
}: {
  icon: ReactNode;
  label: string;
  description: string;
}) {
  return (
    <>
      {icon}
      <span className="omni-module-nav__copy">
        <span className="omni-module-nav__label">{label}</span>
        <span className="omni-module-nav__description">{description}</span>
      </span>
    </>
  );
}

export function ModuleNavigation() {
  const { activeModule, setActiveModule } = useApp();
  const { navCollapsed, setNavCollapsed } = useAppShell();
  const moduleById = Object.fromEntries(CANONICAL_MODULES.map((module) => [module.id, module]));

  const itemClass = (id: ModuleId) =>
    `omni-module-nav__item ${activeModule === id ? 'is-active' : ''}`;

  return (
    <nav
      id="desktop-sidebar"
      className={`omni-module-nav ${navCollapsed ? 'is-collapsed' : ''}`}
      aria-label="Điều hướng học tập"
    >
      <div className="omni-module-nav__list">
        <button
          type="button"
          id="nav-item-dashboard"
          className={itemClass('dashboard')}
          aria-current={activeModule === 'dashboard' ? 'page' : undefined}
          aria-label="Dashboard"
          title="Dashboard"
          data-ux-flow="app.navigation"
          data-ux-control="shell.nav.dashboard"
          onClick={() => setActiveModule('dashboard')}
        >
          <NavCopy
            icon={<LayoutDashboard aria-hidden="true" className="omni-module-nav__icon" />}
            label="Dashboard"
            description="Tổng quan hôm nay"
          />
        </button>
        <button
          type="button"
          id="nav-item-sources"
          className={itemClass('sources')}
          aria-current={activeModule === 'sources' ? 'page' : undefined}
          aria-label={moduleById.sources.label}
          title={moduleById.sources.label}
          data-ux-flow="app.navigation"
          data-ux-control="shell.nav.sources"
          onClick={() => setActiveModule('sources')}
        >
          <NavCopy
            icon={<Library aria-hidden="true" className="omni-module-nav__icon" />}
            label={moduleById.sources.label}
            description={moduleById.sources.description}
          />
        </button>
        <button
          type="button"
          id="nav-item-vocabulary"
          className={itemClass('vocabulary')}
          aria-current={activeModule === 'vocabulary' ? 'page' : undefined}
          aria-label={moduleById.vocabulary.label}
          title={moduleById.vocabulary.label}
          data-ux-flow="app.navigation"
          data-ux-control="shell.nav.vocabulary"
          onClick={() => setActiveModule('vocabulary')}
        >
          <NavCopy
            icon={<Layers aria-hidden="true" className="omni-module-nav__icon" />}
            label={moduleById.vocabulary.label}
            description={moduleById.vocabulary.description}
          />
        </button>
        <button
          type="button"
          id="nav-item-grammar"
          className={itemClass('grammar')}
          aria-current={activeModule === 'grammar' ? 'page' : undefined}
          aria-label={moduleById.grammar.label}
          title={moduleById.grammar.label}
          data-ux-flow="app.navigation"
          data-ux-control="shell.nav.grammar"
          onClick={() => setActiveModule('grammar')}
        >
          <NavCopy
            icon={<BookOpenCheck aria-hidden="true" className="omni-module-nav__icon" />}
            label={moduleById.grammar.label}
            description={moduleById.grammar.description}
          />
        </button>
        <button
          type="button"
          id="nav-item-media"
          className={itemClass('media')}
          aria-current={activeModule === 'media' ? 'page' : undefined}
          aria-label={moduleById.media.label}
          title={moduleById.media.label}
          data-ux-flow="app.navigation"
          data-ux-control="shell.nav.media"
          onClick={() => setActiveModule('media')}
        >
          <NavCopy
            icon={<Headphones aria-hidden="true" className="omni-module-nav__icon" />}
            label={moduleById.media.label}
            description={moduleById.media.description}
          />
        </button>
        <button
          type="button"
          id="nav-item-practice"
          className={itemClass('practice')}
          aria-current={activeModule === 'practice' ? 'page' : undefined}
          aria-label={moduleById.practice.label}
          title={moduleById.practice.label}
          data-ux-flow="app.navigation"
          data-ux-control="shell.nav.practice"
          onClick={() => setActiveModule('practice')}
        >
          <NavCopy
            icon={<PenLine aria-hidden="true" className="omni-module-nav__icon" />}
            label={moduleById.practice.label}
            description={moduleById.practice.description}
          />
        </button>
        <button
          type="button"
          id="nav-item-mock_test"
          className={itemClass('mock_test')}
          aria-current={activeModule === 'mock_test' ? 'page' : undefined}
          aria-label={moduleById.mock_test.label}
          title={moduleById.mock_test.label}
          data-ux-flow="app.navigation"
          data-ux-control="shell.nav.mock"
          onClick={() => setActiveModule('mock_test')}
        >
          <NavCopy
            icon={<GraduationCap aria-hidden="true" className="omni-module-nav__icon" />}
            label={moduleById.mock_test.label}
            description={moduleById.mock_test.description}
          />
        </button>
        <button
          type="button"
          id="nav-item-review_progress"
          className={itemClass('review_progress')}
          aria-current={activeModule === 'review_progress' ? 'page' : undefined}
          aria-label={moduleById.review_progress.label}
          title={moduleById.review_progress.label}
          data-ux-flow="app.navigation"
          data-ux-control="shell.nav.review"
          onClick={() => setActiveModule('review_progress')}
        >
          <NavCopy
            icon={<ListChecks aria-hidden="true" className="omni-module-nav__icon" />}
            label={moduleById.review_progress.label}
            description={moduleById.review_progress.description}
          />
        </button>
      </div>
      <button
        type="button"
        className="omni-module-nav__collapse"
        data-ux-flow="app.navigation"
        data-ux-control="shell.nav.collapse"
        aria-pressed={navCollapsed}
        onClick={() => setNavCollapsed(!navCollapsed)}
      >
        {navCollapsed ? (
          <PanelLeftOpen aria-hidden="true" className="omni-module-nav__icon" />
        ) : (
          <PanelLeftClose aria-hidden="true" className="omni-module-nav__icon" />
        )}
        <span className="omni-module-nav__collapse-label">
          {navCollapsed ? 'Mở rộng điều hướng' : 'Thu gọn điều hướng'}
        </span>
      </button>
    </nav>
  );
}
