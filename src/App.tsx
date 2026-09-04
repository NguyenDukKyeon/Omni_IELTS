/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AppShellProvider } from './context/AppShellContext';
import { FocusDockLayout } from './components/shell/FocusDockLayout';
import { ModuleNavigation } from './components/shell/ModuleNavigation';
import { EvidenceDock } from './components/shell/EvidenceDock';
import { FloatingAITutor } from './components/FloatingAITutor';
import { OnboardingModal } from './components/OnboardingModal';
import { MistakeNotebookModal } from './components/MistakeNotebookModal';
import { DiagnosticPsychometricianModal } from './components/diagnostic/DiagnosticPsychometricianModal';
import { SentenceAcademicStylistModal } from './components/practice/SentenceAcademicStylistModal';
import { AppNotification } from './components/AppNotification';
import { getClientSourcesLibraryV2Flag, resolveSourcesViewName } from './lib/sources/featureFlags';

import { DashboardView } from './views/DashboardView';
import { SourceIngestionView } from './views/SourceIngestionView';
import { SourcesView } from './views/SourcesView';
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
    setActiveModule,
    openArtifactHandoff,
    isExamModeActive,
    isDiagnosticOpen,
    setIsDiagnosticOpen,
    isSentenceStylistOpen,
    setIsSentenceStylistOpen,
    sentenceStylistData,
  } = useApp();

  useEffect(() => {
    const mainViewport = document.getElementById('main-viewport-content');
    if (!(mainViewport instanceof HTMLElement)) return undefined;
    mainViewport.scrollTop = 0;
    const frame = window.requestAnimationFrame(() => {
      mainViewport.scrollTop = 0;
    });
    const delayedReset = window.setTimeout(() => {
      mainViewport.scrollTop = 0;
    }, 100);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(delayedReset);
    };
  }, [activeModule]);

  const renderActiveView = () => {
    switch (activeModule) {
      case 'dashboard':
        return <DashboardView />;
      case 'sources':
        return resolveSourcesViewName(getClientSourcesLibraryV2Flag()) === 'SourcesView'
          ? <SourcesView onNavigate={setActiveModule} onOpenArtifact={openArtifactHandoff} />
          : <SourceIngestionView />;
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
        evidence={<EvidenceDock />}
        examMode={isFullScreenExam}
        mainKey={activeModule}
      >
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
