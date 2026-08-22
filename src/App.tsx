/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { NextActionBanner } from './components/NextActionBanner';
import { FloatingAITutor } from './components/FloatingAITutor';
import { OnboardingModal } from './components/OnboardingModal';
import { MistakeNotebookModal } from './components/MistakeNotebookModal';

import { DashboardView } from './views/DashboardView';
import { SourceIngestionView } from './views/SourceIngestionView';
import { VocabularySRSView } from './views/VocabularySRSView';
import { GrammarHubView } from './views/GrammarHubView';
import { MediaLabView } from './views/MediaLabView';
import { IELTSPracticeView } from './views/IELTSPracticeView';
import { MockTestView } from './views/MockTestView';
import { KnowledgeBaseView } from './views/KnowledgeBaseView';
import { LearnerProfileView } from './views/LearnerProfileView';

const MainContent: React.FC = () => {
  const { activeModule } = useApp();

  const renderActiveView = () => {
    switch (activeModule) {
      case 'dashboard':
        return <DashboardView />;
      case 'sources':
        return <SourceIngestionView />;
      case 'vocabulary':
        return <VocabularySRSView />;
      case 'grammar':
        return <GrammarHubView />;
      case 'media':
        return <MediaLabView />;
      case 'practice':
        return <IELTSPracticeView />;
      case 'mock_test':
        return <MockTestView />;
      case 'knowledge':
        return <KnowledgeBaseView />;
      case 'profile':
        return <LearnerProfileView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Fixed Header */}
      <Header />

      {/* Main Body Shell */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto pb-20 md:pb-8">
        {/* Left Desktop Sidebar */}
        <Sidebar />

        {/* Dynamic Center Stage Content */}
        <main
          id="main-viewport-content"
          className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto"
        >
          {/* Next Recommended Best Action Banner */}
          <NextActionBanner />

          {/* Module View */}
          {renderActiveView()}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav />

      {/* Contextual Floating AI Tutor */}
      <FloatingAITutor />

      {/* Modals */}
      <OnboardingModal />
      <MistakeNotebookModal />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
