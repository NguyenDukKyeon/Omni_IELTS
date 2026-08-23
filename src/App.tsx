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
import { DiagnosticPsychometricianModal } from './components/diagnostic/DiagnosticPsychometricianModal';
import { SentenceAcademicStylistModal } from './components/practice/SentenceAcademicStylistModal';
import { AppNotification } from './components/AppNotification';

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
  const {
    activeModule,
    isExamModeActive,
    isDiagnosticOpen,
    setIsDiagnosticOpen,
    isSentenceStylistOpen,
    setIsSentenceStylistOpen,
    sentenceStylistData,
  } = useApp();

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

  const isFullScreenExam = isExamModeActive && activeModule === 'mock_test';

  return (
    <div
      className={`min-h-screen ${
        isFullScreenExam
          ? 'bg-slate-900 text-slate-100'
          : 'bg-[#F8FAFC] dark:bg-slate-950 text-slate-800 dark:text-slate-100'
      } flex flex-col font-sans transition-colors duration-200`}
    >
      {/* Top Fixed Header */}
      {!isFullScreenExam && <Header />}

      {/* Main Body Shell */}
      <div
        className={`flex-1 flex w-full ${
          isFullScreenExam ? 'max-w-full p-0 pb-0' : 'max-w-7xl mx-auto pb-20 md:pb-8'
        }`}
      >
        {/* Left Desktop Sidebar */}
        {!isFullScreenExam && <Sidebar />}

        {/* Dynamic Center Stage Content */}
        <main
          id="main-viewport-content"
          className={`flex-1 min-w-0 ${
            isFullScreenExam ? 'p-0 overflow-hidden flex flex-col' : 'p-4 sm:p-6 lg:p-8 overflow-y-auto'
          }`}
        >
          {/* Next Recommended Best Action Banner */}
          {!isFullScreenExam && <NextActionBanner />}

          {/* Module View */}
          {renderActiveView()}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      {!isFullScreenExam && <BottomNav />}

      {/* Contextual Floating AI Tutor */}
      {!isFullScreenExam && <FloatingAITutor />}

      {/* Modals */}
      <OnboardingModal />
      <MistakeNotebookModal />
      <DiagnosticPsychometricianModal
        isOpen={isDiagnosticOpen}
        onClose={() => setIsDiagnosticOpen(false)}
      />
      <SentenceAcademicStylistModal
        isOpen={isSentenceStylistOpen}
        onClose={() => setIsSentenceStylistOpen(false)}
        initialSentence={sentenceStylistData.sentence}
        initialTopic={sentenceStylistData.topic}
      />
      <AppNotification />
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
