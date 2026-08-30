import { useRef, useState, type KeyboardEvent } from 'react';
import { GrammarHubView } from './GrammarHubView';
import { KnowledgeBaseView } from './KnowledgeBaseView';

type GrammarStrategyTab = 'grammar' | 'strategy';

const TABS: ReadonlyArray<{ id: GrammarStrategyTab; label: string }> = [
  { id: 'grammar', label: 'Grammar' },
  { id: 'strategy', label: 'IELTS Strategy' },
];

export function GrammarStrategyView() {
  const [activeTab, setActiveTab] = useState<GrammarStrategyTab>('grammar');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const activate = (index: number) => {
    const next = TABS[index];
    setActiveTab(next.id);
    tabRefs.current[index]?.focus();
  };

  const onTabListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = TABS.findIndex((tab) => tab.id === activeTab);
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      activate((current + 1) % TABS.length);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      activate((current - 1 + TABS.length) % TABS.length);
    } else if (event.key === 'Home') {
      event.preventDefault();
      activate(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      activate(TABS.length - 1);
    }
  };

  return (
    <div className="omni-grammar-strategy" data-ux-scope="app-shell-v2">
      <div
        className="omni-grammar-strategy__tabs"
        role="tablist"
        aria-label="Grammar and Strategy"
        onKeyDown={onTabListKeyDown}
      >
        {TABS.map((tab, index) => tab.id === 'grammar' ? (
          <button
            key={tab.id}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            type="button"
            role="tab"
            id="grammar-strategy-tab-grammar"
            aria-selected={activeTab === tab.id}
            aria-controls="grammar-strategy-panel-grammar"
            tabIndex={activeTab === tab.id ? 0 : -1}
            className={`omni-grammar-strategy__tab ${activeTab === tab.id ? 'is-active' : ''}`}
            data-ux-flow="grammar.learning"
            data-ux-control="shell.grammar.tab-grammar"
            onClick={() => activate(index)}
          >
            {tab.label}
          </button>
        ) : (
          <button
            key={tab.id}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            type="button"
            role="tab"
            id="grammar-strategy-tab-strategy"
            aria-selected={activeTab === tab.id}
            aria-controls="grammar-strategy-panel-strategy"
            tabIndex={activeTab === tab.id ? 0 : -1}
            className={`omni-grammar-strategy__tab ${activeTab === tab.id ? 'is-active' : ''}`}
            data-ux-flow="grammar.learning"
            data-ux-control="shell.grammar.tab-strategy"
            onClick={() => activate(index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === 'grammar' ? (
        <div
          role="tabpanel"
          id="grammar-strategy-panel-grammar"
          aria-labelledby="grammar-strategy-tab-grammar"
          className="omni-grammar-strategy__panel"
        >
          <GrammarHubView />
        </div>
      ) : (
        <div
          role="tabpanel"
          id="grammar-strategy-panel-strategy"
          aria-labelledby="grammar-strategy-tab-strategy"
          className="omni-grammar-strategy__panel"
        >
          <KnowledgeBaseView />
        </div>
      )}
    </div>
  );
}
