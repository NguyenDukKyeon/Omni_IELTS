/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AppShellProvider } from './context/AppShellContext';
import { FocusDockLayout } from './components/shell/FocusDockLayout';
import { ModuleNavigation } from './components/shell/ModuleNavigation';
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
import { GrammarStrategyView } from './views/GrammarStrategyView';
import { MediaLabView } from './views/MediaLabView';
import { IELTSPracticeView } from './views/IELTSPracticeView';
import { MockTestView } from './views/MockTestView';
import { KnowledgeBaseView } from './views/KnowledgeBaseView';
import { LearnerProfileView } from './views/LearnerProfileView';
import { ReviewProgressView } from './views/ReviewProgressView';

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
        return <GrammarStrategyView />;
      case 'media':
        return <MediaLabView />;
      case 'practice':
        return <IELTSPracticeView />;
      case 'mock_test':
        return <MockTestView />;
      case 'review_progress':
        return <ReviewProgressView />;
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
    <>
      <FocusDockLayout
        navigation={<ModuleNavigation />}
        evidence={null}
        examMode={isFullScreenExam}
      >
        {!isFullScreenExam && <NextActionBanner />}
        {renderActiveView()}
      </FocusDockLayout>

      {!isFullScreenExam && <FloatingAITutor />}

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
    </>
  );
};

export default function App() {
  return (
    <AppShellProvider>
      <AppProvider>
        <MainContent />
      </AppProvider>
    </AppShellProvider>
  );
}
