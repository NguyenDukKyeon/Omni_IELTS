import { useState } from 'react';
import { GrammarHubView } from './GrammarHubView';
import { KnowledgeBaseView } from './KnowledgeBaseView';

type GrammarStrategyTab = 'grammar' | 'strategy';

export function GrammarStrategyView() {
  const [activeTab, setActiveTab] = useState<GrammarStrategyTab>('grammar');

  return (
    <div className="omni-grammar-strategy">
      <div
        className="omni-grammar-strategy__tabs"
        role="tablist"
        aria-label="Grammar and Strategy"
      >
        <button
          type="button"
          role="tab"
          id="grammar-strategy-tab-grammar"
          aria-selected={activeTab === 'grammar'}
          aria-controls="grammar-strategy-panel-grammar"
          tabIndex={activeTab === 'grammar' ? 0 : -1}
          className={`omni-grammar-strategy__tab ${activeTab === 'grammar' ? 'is-active' : ''}`}
          data-ux-flow="grammar.learning"
          data-ux-control="shell.grammar.tab-grammar"
          onClick={() => setActiveTab('grammar')}
        >
          Grammar
        </button>
        <button
          type="button"
          role="tab"
          id="grammar-strategy-tab-strategy"
          aria-selected={activeTab === 'strategy'}
          aria-controls="grammar-strategy-panel-strategy"
          tabIndex={activeTab === 'strategy' ? 0 : -1}
          className={`omni-grammar-strategy__tab ${activeTab === 'strategy' ? 'is-active' : ''}`}
          data-ux-flow="grammar.learning"
          data-ux-control="shell.grammar.tab-strategy"
          onClick={() => setActiveTab('strategy')}
        >
          IELTS Strategy
        </button>
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
