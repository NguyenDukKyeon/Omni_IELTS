import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

export interface UxFlowContract {
  id: string;
  module: string;
  owner: string;
  precondition: string;
  trigger: string;
  expectedTransition: string;
  sideEffect: string;
  errorStates: string[];
  evidence: string[];
}

export interface UxControlContract {
  id: string;
  flowId: string;
  owner: string;
  preconditions: string[];
  action: string;
  beforeState: string;
  afterState: string;
  sideEffects: string[];
  failureCategories: string[];
  recoveryActions: string[];
  evidence: string[];
}

export const UX_FLOW_CONTRACTS: UxFlowContract[] = [
  {
    id: 'app.notification',
    module: 'app',
    owner: 'App shell',
    precondition: 'Có hành động tạo notification trong AppContext',
    trigger: 'Người học đóng thông báo phản hồi toàn cục',
    expectedTransition: 'notification visible -> dismissed',
    sideEffect: 'Không',
    errorStates: [],
    evidence: ['e2e/vocabulary.spec.ts'],
  },
  {
    id: 'app.navigation', module: 'app', owner: 'AppShell',
    precondition: 'The application shell is visible', trigger: 'Learner selects a module or global action',
    expectedTransition: 'current module -> requested module', sideEffect: 'Update application navigation state',
    errorStates: ['route_unavailable'], evidence: ['e2e/app-navigation.spec.ts'],
  },
  {
    id: 'app.shared', module: 'app', owner: 'Shared components',
    precondition: 'A shared control is visible', trigger: 'Learner activates the control',
    expectedTransition: 'idle -> declared local UI state', sideEffect: 'Component-specific state update',
    errorStates: ['unavailable'], evidence: ['e2e/app-navigation.spec.ts'],
  },
  {
    id: 'dashboard.daily', module: 'dashboard', owner: 'DashboardView',
    precondition: 'Dashboard is visible', trigger: 'Learner opens a recommended activity',
    expectedTransition: 'recommendation -> target learning module', sideEffect: 'Navigate to the selected activity',
    errorStates: ['target_unavailable'], evidence: ['e2e/dashboard.spec.ts'],
  },
  {
    id: 'sources.manage', module: 'sources', owner: 'SourceHubView',
    precondition: 'Sources module is visible', trigger: 'Learner imports, opens, filters, or removes a source',
    expectedTransition: 'source input -> validated source state', sideEffect: 'Persist learner-owned source metadata',
    errorStates: ['invalid_source', 'import_failed'], evidence: ['e2e/sources.spec.ts'],
  },
  {
    id: 'vocabulary.srs', module: 'vocabulary', owner: 'VocabularySRSView',
    precondition: 'Vocabulary module is visible', trigger: 'Learner manages or reviews a vocabulary card',
    expectedTransition: 'due -> answered -> rescheduled|mastered', sideEffect: 'Persist review outcome',
    errorStates: ['audio_unavailable', 'grading_unavailable'], evidence: ['e2e/vocabulary.spec.ts'],
  },
  {
    id: 'grammar.learning', module: 'grammar', owner: 'GrammarView',
    precondition: 'Grammar module is visible', trigger: 'Learner opens a lesson or submits an exercise',
    expectedTransition: 'lesson -> attempt -> feedback|mistake', sideEffect: 'Persist attempt and mistake taxonomy',
    errorStates: ['generation_unavailable', 'grading_unavailable'], evidence: ['e2e/grammar.spec.ts'],
  },
  {
    id: 'media.learning', module: 'media', owner: 'MediaLabView',
    precondition: 'Media Lab is visible', trigger: 'Learner imports media or completes a learning segment',
    expectedTransition: 'source -> transcript -> shadowing|dictation -> progress', sideEffect: 'Persist transcript and progress',
    errorStates: ['caption_unavailable', 'audio_unavailable', 'microphone_unavailable'], evidence: ['e2e/media.spec.ts'],
  },
  {
    id: 'practice.skills', module: 'practice', owner: 'IELTSPracticeView',
    precondition: 'Practice is visible', trigger: 'Learner opens or submits a skill activity',
    expectedTransition: 'skill selection -> attempt -> feedback', sideEffect: 'Persist practice attempt and mistakes',
    errorStates: ['generation_unavailable', 'grading_unavailable'], evidence: ['e2e/practice.spec.ts'],
  },
  {
    id: 'live-hub.refresh', module: 'live-hub', owner: 'ForecastLiveHub',
    precondition: 'Live Hub is visible', trigger: 'Learner requests a grounded refresh',
    expectedTransition: 'idle -> loading -> fresh|unavailable', sideEffect: 'POST /api/forecast/refresh and persist verified snapshot',
    errorStates: ['auth_missing', 'quota_exhausted', 'gateway_unavailable', 'all_providers_exhausted', 'network_failed', 'schema_invalid'], evidence: ['e2e/live-hub.spec.ts'],
  },
  {
    id: 'live-hub.retry', module: 'live-hub', owner: 'ForecastLiveHub',
    precondition: 'A retryable refresh error is visible', trigger: 'Learner retries Search Grounding',
    expectedTransition: 'unavailable -> loading -> fresh|unavailable', sideEffect: 'Repeat the last grounded request',
    errorStates: ['provider_overloaded', 'network_failed'], evidence: ['e2e/live-hub.spec.ts'],
  },
  {
    id: 'live-hub.open-api-settings', module: 'live-hub', owner: 'ForecastLiveHub',
    precondition: 'Gemini configuration is missing or invalid', trigger: 'Learner opens API settings',
    expectedTransition: 'Live Hub -> Profile API settings', sideEffect: 'Navigate without persisting a secret',
    errorStates: [], evidence: ['e2e/live-hub.spec.ts'],
  },
  {
    id: 'live-hub.open-quota', module: 'live-hub', owner: 'ForecastLiveHub',
    precondition: 'A provider or the free gateway pool is exhausted', trigger: 'Learner opens quota management',
    expectedTransition: 'quota alert -> provider quota page|Profile gateway settings', sideEffect: 'Open the matching provider page or navigate to Profile without exposing keys',
    errorStates: ['popup_blocked'], evidence: ['e2e/live-hub.spec.ts'],
  },
  {
    id: 'live-hub.toggle-enrichment', module: 'live-hub', owner: 'ForecastLiveHub',
    precondition: 'A sourced item already has generated enrichment', trigger: 'Learner expands or collapses analysis',
    expectedTransition: 'collapsed <-> expanded', sideEffect: 'Update local presentation state',
    errorStates: [], evidence: ['e2e/live-hub.spec.ts'],
  },
  {
    id: 'live-hub.practice', module: 'live-hub', owner: 'ForecastLiveHub',
    precondition: 'A sourced Live Hub item is visible', trigger: 'Learner creates a single-skill practice artifact',
    expectedTransition: 'sourced item -> persisted Practice artifact -> matching skill lesson',
    sideEffect: 'POST /api/live-hub/items/:id/practice and persist provenance',
    errorStates: ['provenance_required', 'artifact_unavailable'], evidence: ['e2e/live-hub.spec.ts', 'e2e/live-hub-artifacts-api.spec.ts'],
  },
  {
    id: 'live-hub.mock', module: 'live-hub', owner: 'ForecastLiveHub',
    precondition: 'A sourced Live Hub item is visible', trigger: 'Learner creates a Full Mock from the source',
    expectedTransition: 'sourced item -> persisted MockBuild draft -> Mock Orchestrator',
    sideEffect: 'POST /api/live-hub/items/:id/mock and persist source provenance',
    errorStates: ['provenance_required', 'build_unavailable'], evidence: ['e2e/live-hub.spec.ts', 'e2e/live-hub-artifacts-api.spec.ts'],
  },
  {
    id: 'live-hub.consent.dismiss', module: 'live-hub', owner: 'ForecastLiveHub',
    precondition: 'Incomplete source consent modal is visible', trigger: 'Learner closes or dismisses the consent modal',
    expectedTransition: 'consent modal -> dismissed', sideEffect: 'Close modal state without API call',
    errorStates: [], evidence: ['e2e/live-hub.spec.ts', 'e2e/live-hub-artifacts-api.spec.ts'],
  },
  {
    id: 'live-hub.consent.search-more', module: 'live-hub', owner: 'ForecastLiveHub',
    precondition: 'Incomplete source consent modal is visible', trigger: 'Learner chooses to search for additional authentic sources',
    expectedTransition: 'consent modal -> search query / refresh trigger', sideEffect: 'Trigger grounded search query',
    errorStates: ['network_failed'], evidence: ['e2e/live-hub.spec.ts', 'e2e/live-hub-artifacts-api.spec.ts'],
  },
  {
    id: 'live-hub.consent.practice-available', module: 'live-hub', owner: 'ForecastLiveHub',
    precondition: 'Incomplete source has usable available components', trigger: 'Learner consents to practice only available portion without grading',
    expectedTransition: 'consent modal -> practice view (isGradeable: false)', sideEffect: 'POST /api/live-hub/items/:id/practice with practice_available',
    errorStates: ['artifact_unavailable'], evidence: ['e2e/live-hub.spec.ts', 'e2e/live-hub-artifacts-api.spec.ts'],
  },
  {
    id: 'live-hub.consent.ai-fill-missing', module: 'live-hub', owner: 'ForecastLiveHub',
    precondition: 'Incomplete source is missing components', trigger: 'Learner approves AI fill for missing components',
    expectedTransition: 'consent modal -> hybrid artifact / mock orchestrator', sideEffect: 'POST /api/live-hub/items/:id/practice or mock with ai_fill_missing',
    errorStates: ['generation_unavailable', 'artifact_unavailable'], evidence: ['e2e/live-hub.spec.ts', 'e2e/live-hub-artifacts-api.spec.ts'],
  },
  {
    id: 'live-hub.consent.create-ai-variant', module: 'live-hub', owner: 'ForecastLiveHub',
    precondition: 'Source is incomplete or learner prefers independent AI variant', trigger: 'Learner requests an AI-generated variant referencing the source',
    expectedTransition: 'consent modal -> pure AI artifact / mock orchestrator', sideEffect: 'POST /api/live-hub/items/:id/practice or mock with create_ai_variant',
    errorStates: ['generation_unavailable', 'artifact_unavailable'], evidence: ['e2e/live-hub.spec.ts', 'e2e/live-hub-artifacts-api.spec.ts'],
  },
  {
    id: 'mock.exam', module: 'mock', owner: 'MockTestView',
    precondition: 'Mock module is visible', trigger: 'Learner builds, resumes, completes, or reviews a mock',
    expectedTransition: 'package -> attempt -> report -> history', sideEffect: 'Persist validated build and attempt',
    errorStates: ['build_invalid', 'audio_unavailable', 'grading_unavailable'], evidence: ['e2e/mock-orchestrator.spec.ts'],
  },
  {
    id: 'knowledge.learn', module: 'knowledge', owner: 'IELTSKnowledgeView',
    precondition: 'Knowledge module is visible', trigger: 'Learner opens or interacts with a lesson',
    expectedTransition: 'catalog -> lesson -> saved learning state', sideEffect: 'Persist lesson progress when applicable',
    errorStates: ['content_unavailable'], evidence: ['e2e/knowledge.spec.ts'],
  },
  {
    id: 'tutor.chat', module: 'tutor', owner: 'FloatingAITutor',
    precondition: 'AI Tutor is open', trigger: 'Learner sends a message or requests research',
    expectedTransition: 'draft -> sending -> answer|unavailable', sideEffect: 'POST /api/tutor/respond',
    errorStates: ['auth_missing', 'quota_exhausted', 'network_failed'], evidence: ['e2e/tutor.spec.ts'],
  },
  {
    id: 'profile.settings', module: 'profile', owner: 'LearnerProfileView',
    precondition: 'Profile is visible', trigger: 'Learner updates a preference or private setting',
    expectedTransition: 'saved state -> validated updated state', sideEffect: 'Persist allowed profile data',
    errorStates: ['validation_failed', 'sync_unavailable'], evidence: ['e2e/profile.spec.ts'],
  },
];

const SHELL_E2E_EVIDENCE = ['e2e/app-shell-redesign.spec.ts'];

function shellControl(
  id: string,
  flowId: string,
  owner: string,
  action: string,
  beforeState: string,
  afterState: string,
  sideEffects: string[] = ['Update shell navigation or presentation state'],
  failureCategories: string[] = ['route_unavailable'],
  recoveryActions: string[] = ['Retry the action or use direct navigation'],
): UxControlContract {
  return {
    id,
    flowId,
    owner,
    preconditions: ['The owning shell surface is visible'],
    action,
    beforeState,
    afterState,
    sideEffects,
    failureCategories,
    recoveryActions,
    evidence: SHELL_E2E_EVIDENCE,
  };
}

export const UX_CONTROL_CONTRACTS: UxControlContract[] = [
  shellControl('shell.header.home', 'app.navigation', 'AppHeader', 'Open OMNI Home', 'any shell route', 'dashboard'),
  shellControl('shell.header.open-review', 'app.navigation', 'AppHeader', 'Open due review from the notification control', 'any shell route', 'review_progress'),
  shellControl('shell.header.open-account-menu', 'app.navigation', 'AppHeader', 'Open or close the account tools menu', 'account tools menu closed or open', 'account tools menu toggled', ['Update account menu presentation state'], ['storage_unavailable'], ['Activate the account control again']),
  shellControl('shell.header.open-tutor', 'tutor.chat', 'AppHeader', 'Open AI Tutor', 'tutor closed', 'tutor open', ['Open the contextual Tutor panel']),
  shellControl('shell.theme.open', 'app.navigation', 'ThemeMenu', 'Open theme choices', 'theme menu closed', 'theme menu open', ['Set theme menu open']),
  shellControl('shell.theme.system', 'app.navigation', 'ThemeMenu', 'Choose system theme', 'theme menu open', 'system theme active', ['Persist theme preference']),
  shellControl('shell.theme.light', 'app.navigation', 'ThemeMenu', 'Choose light theme', 'theme menu open', 'light theme active', ['Persist theme preference']),
  shellControl('shell.theme.dark', 'app.navigation', 'ThemeMenu', 'Choose dark theme', 'theme menu open', 'dark theme active', ['Persist theme preference']),
  shellControl('shell.theme.high-contrast', 'app.navigation', 'ThemeMenu', 'Choose high contrast theme', 'theme menu open', 'high contrast theme active', ['Persist theme preference']),
  shellControl('shell.header.open-profile', 'app.navigation', 'AppHeader', 'Open learner profile', 'any shell route', 'profile route'),

  shellControl('shell.nav.dashboard', 'app.navigation', 'ModuleNavigation', 'Open Dashboard', 'any shell route', 'dashboard'),
  shellControl('shell.nav.sources', 'app.navigation', 'ModuleNavigation', 'Open Sources & Library', 'any shell route', 'sources'),
  shellControl('shell.nav.vocabulary', 'app.navigation', 'ModuleNavigation', 'Open Vocabulary', 'any shell route', 'vocabulary'),
  shellControl('shell.nav.grammar', 'app.navigation', 'ModuleNavigation', 'Open Grammar & Strategy', 'any shell route', 'grammar'),
  shellControl('shell.nav.media', 'app.navigation', 'ModuleNavigation', 'Open Media Lab', 'any shell route', 'media'),
  shellControl('shell.nav.practice', 'app.navigation', 'ModuleNavigation', 'Open IELTS Practice', 'any shell route', 'practice'),
  shellControl('shell.nav.mock', 'app.navigation', 'ModuleNavigation', 'Open IELTS Mock', 'any shell route', 'mock_test'),
  shellControl('shell.nav.review', 'app.navigation', 'ModuleNavigation', 'Open Review & Progress', 'any shell route', 'review_progress'),
  shellControl('shell.nav.collapse', 'app.navigation', 'ModuleNavigation', 'Collapse desktop navigation', 'navigation expanded', 'navigation collapsed', ['Persist navigation preference']),
  shellControl('shell.nav.expand', 'app.navigation', 'ModuleNavigation', 'Expand desktop navigation', 'navigation collapsed', 'navigation expanded', ['Persist navigation preference']),

  shellControl('dashboard.coach.primary', 'dashboard.daily', 'DailyCoachCard', 'Start the recommended primary action', 'dashboard with recommendation', 'recommended destination or diagnostic open', ['Navigate to the recommendation owner or open diagnostic']),
  shellControl('dashboard.coach.alternative-1', 'dashboard.daily', 'DailyCoachCard', 'Open the first alternative', 'dashboard with alternatives', 'first alternative destination', ['Navigate to the selected alternative']),
  shellControl('dashboard.coach.alternative-2', 'dashboard.daily', 'DailyCoachCard', 'Open the second alternative', 'dashboard with alternatives', 'second alternative destination or chooser', ['Navigate to the selected alternative']),
  shellControl('dashboard.coach.plan-manual-module', 'dashboard.daily', 'DailyCoachCard', 'Open module chooser from the daily plan', 'dashboard daily plan visible', 'module chooser open', ['Open the manual module chooser']),
  shellControl('dashboard.coach.plan-source', 'dashboard.daily', 'DailyCoachCard', 'Open Sources from the daily plan', 'dashboard daily plan visible', 'sources', ['Navigate to Sources & Library']),
  shellControl('dashboard.coach.open-plan-module', 'dashboard.daily', 'DailyCoachCard', 'Open the module chooser from the daily plan footer', 'dashboard daily plan visible', 'module chooser open', ['Open the manual module chooser']),
  shellControl('dashboard.mobile.open-due-work', 'dashboard.daily', 'DailyCoachCard', 'Open the highest-priority due work on mobile', 'mobile due summary visible', 'review or vocabulary destination', ['Navigate to the learner work due today']),
  shellControl('dashboard.coach.open-evidence', 'dashboard.daily', 'DailyCoachCard', 'Show or hide recommendation evidence', 'evidence disclosure closed or open', 'evidence disclosure toggled', ['Persist no learner evidence; update presentation state'], ['storage_unavailable'], ['Toggle the disclosure again']),
  shellControl('dashboard.open-latest-practice', 'dashboard.daily', 'DashboardView', 'Open latest valid independent Practice evidence', 'valid Practice evidence visible', 'practice route', ['Navigate to IELTS Practice']),
  shellControl('dashboard.open-latest-mock', 'dashboard.daily', 'DashboardView', 'Open latest valid Mock evidence', 'valid Mock evidence visible', 'mock route', ['Navigate to IELTS Mock']),
  shellControl('shell.chooser.close', 'app.navigation', 'ModuleChooser', 'Close module chooser', 'module chooser open', 'module chooser closed', ['Restore focus to the chooser trigger'], ['storage_unavailable'], ['Reopen the chooser']),
  shellControl('shell.chooser.module-sources', 'app.navigation', 'ModuleChooser', 'Choose Sources & Library', 'module chooser open', 'sources'),
  shellControl('shell.chooser.module-vocabulary', 'app.navigation', 'ModuleChooser', 'Choose Vocabulary', 'module chooser open', 'vocabulary'),
  shellControl('shell.chooser.module-grammar', 'app.navigation', 'ModuleChooser', 'Choose Grammar & Strategy', 'module chooser open', 'grammar'),
  shellControl('shell.chooser.module-media', 'app.navigation', 'ModuleChooser', 'Choose Media Lab', 'module chooser open', 'media'),
  shellControl('shell.chooser.module-practice', 'app.navigation', 'ModuleChooser', 'Choose IELTS Practice', 'module chooser open', 'practice'),
  shellControl('shell.chooser.module-mock', 'app.navigation', 'ModuleChooser', 'Choose IELTS Mock', 'module chooser open', 'mock_test'),
  shellControl('shell.chooser.module-review', 'app.navigation', 'ModuleChooser', 'Choose Review & Progress', 'module chooser open', 'review_progress'),

  shellControl('shell.evidence.collapse', 'app.navigation', 'EvidenceDock', 'Collapse learning evidence dock', 'evidence dock open', 'evidence dock collapsed', ['Persist dock preference'], ['storage_unavailable'], ['Expand the evidence dock']),
  shellControl('shell.evidence.expand', 'app.navigation', 'EvidenceDock', 'Expand learning evidence dock', 'evidence dock collapsed', 'evidence dock open', ['Persist dock preference'], ['storage_unavailable'], ['Collapse the evidence dock']),
  shellControl('shell.evidence.open-due-summary', 'app.navigation', 'EvidenceDock', 'Open the highest-priority due work from the due summary', 'due summary visible', 'review or vocabulary destination'),
  shellControl('shell.evidence.open-context', 'app.navigation', 'EvidenceDock', 'Open the current context action', 'context action visible', 'context destination'),
  shellControl('shell.evidence.open-practice', 'app.navigation', 'EvidenceDock', 'Open recent Practice destination', 'recent Practice evidence visible', 'practice'),
  shellControl('shell.evidence.open-mock', 'app.navigation', 'EvidenceDock', 'Open recent Mock destination', 'recent Mock evidence visible', 'mock_test'),
  shellControl('shell.evidence.open-media', 'app.navigation', 'EvidenceDock', 'Open saved Media lesson', 'saved Media lesson visible', 'media'),
  shellControl('shell.evidence.open-resumable-media', 'app.navigation', 'EvidenceDock', 'Open the current resumable Media lesson', 'resumable Media lesson visible', 'media'),

  shellControl('shell.grammar.tab-grammar', 'grammar.learning', 'GrammarStrategyView', 'Select Grammar curriculum tab', 'strategy tab active', 'grammar tab active', ['Update active curriculum tab']),
  shellControl('shell.grammar.tab-strategy', 'grammar.learning', 'GrammarStrategyView', 'Select IELTS Strategy tab', 'grammar tab active', 'strategy tab active', ['Update active curriculum tab']),
  shellControl('review.open-due-workout', 'app.navigation', 'ReviewProgressView', 'Open due mistake workout', 'Review & Progress visible', 'mistake workout open', ['Open the existing mistake workout']),
  shellControl('review.open-practice-history', 'app.navigation', 'ReviewProgressView', 'Open recent valid Practice evidence', 'valid Practice evidence visible', 'practice'),
  shellControl('review.open-mock-history', 'app.navigation', 'ReviewProgressView', 'Open recent valid Mock evidence', 'valid Mock evidence visible', 'mock_test'),

  shellControl('shell.mobile.home', 'app.navigation', 'MobileNavigation', 'Open Home', 'any mobile destination', 'dashboard'),
  shellControl('shell.mobile.learn', 'app.navigation', 'MobileNavigation', 'Open or close Learn sheet', 'Learn sheet closed or open', 'Learn sheet toggled', ['Update mobile sheet state'], ['storage_unavailable'], ['Tap Learn again']),
  shellControl('shell.mobile.practice', 'app.navigation', 'MobileNavigation', 'Open or close Practice sheet', 'Practice sheet closed or open', 'Practice sheet toggled', ['Update mobile sheet state'], ['storage_unavailable'], ['Tap Practice again']),
  shellControl('shell.mobile.review', 'app.navigation', 'MobileNavigation', 'Open Review', 'any mobile destination', 'review_progress'),
  shellControl('shell.mobile.more', 'app.navigation', 'MobileNavigation', 'Open or close More sheet', 'More sheet closed or open', 'More sheet toggled', ['Update mobile sheet state'], ['storage_unavailable'], ['Tap More again']),

  shellControl('shell.mobile.learn.sheet-close', 'app.navigation', 'MobileModuleSheet', 'Close Learn sheet', 'Learn sheet open', 'Learn sheet closed', ['Restore focus to Learn trigger'], ['storage_unavailable'], ['Reopen Learn sheet']),
  shellControl('shell.mobile.learn-sources', 'app.navigation', 'MobileModuleSheet', 'Choose Sources & Library from Learn', 'Learn sheet open', 'sources'),
  shellControl('shell.mobile.learn-vocabulary', 'app.navigation', 'MobileModuleSheet', 'Choose Vocabulary from Learn', 'Learn sheet open', 'vocabulary'),
  shellControl('shell.mobile.learn-grammar', 'app.navigation', 'MobileModuleSheet', 'Choose Grammar & Strategy from Learn', 'Learn sheet open', 'grammar'),
  shellControl('shell.mobile.learn-media', 'app.navigation', 'MobileModuleSheet', 'Choose Media Lab from Learn', 'Learn sheet open', 'media'),

  shellControl('shell.mobile.practice.sheet-close', 'app.navigation', 'MobileModuleSheet', 'Close Practice sheet', 'Practice sheet open', 'Practice sheet closed', ['Restore focus to Practice trigger'], ['storage_unavailable'], ['Reopen Practice sheet']),
  shellControl('shell.mobile.practice-practice', 'app.navigation', 'MobileModuleSheet', 'Choose IELTS Practice from Practice', 'Practice sheet open', 'practice'),
  shellControl('shell.mobile.practice-mock', 'app.navigation', 'MobileModuleSheet', 'Choose IELTS Mock from Practice', 'Practice sheet open', 'mock_test'),

  shellControl('shell.mobile.more.sheet-close', 'app.navigation', 'MobileModuleSheet', 'Close More sheet', 'More sheet open', 'More sheet closed', ['Restore focus to More trigger'], ['storage_unavailable'], ['Reopen More sheet']),
  shellControl('shell.mobile.more-tutor', 'tutor.chat', 'MobileModuleSheet', 'Open AI Tutor from More', 'More sheet open', 'tutor open', ['Open the contextual Tutor panel']),
  shellControl('shell.mobile.more-profile', 'app.navigation', 'MobileModuleSheet', 'Open profile from More', 'More sheet open', 'profile'),
  shellControl('shell.mobile.theme-system', 'app.navigation', 'MobileModuleSheet', 'Choose system theme from More', 'More sheet open', 'system theme active', ['Persist theme preference']),
  shellControl('shell.mobile.theme-light', 'app.navigation', 'MobileModuleSheet', 'Choose light theme from More', 'More sheet open', 'light theme active', ['Persist theme preference']),
  shellControl('shell.mobile.theme-dark', 'app.navigation', 'MobileModuleSheet', 'Choose dark theme from More', 'More sheet open', 'dark theme active', ['Persist theme preference']),
  shellControl('shell.mobile.theme-high-contrast', 'app.navigation', 'MobileModuleSheet', 'Choose high contrast theme from More', 'More sheet open', 'high contrast theme active', ['Persist theme preference']),
];

export function validateUxFlowContracts(contracts: UxFlowContract[]) {
  const issues: string[] = [];
  const seen = new Set<string>();
  for (const contract of contracts) {
    if (seen.has(contract.id)) issues.push(`Duplicate flow id: ${contract.id}`);
    seen.add(contract.id);
    if (!contract.owner.trim()) issues.push(`${contract.id} has no owner`);
    if (!contract.expectedTransition.trim()) issues.push(`${contract.id} has no expected transition`);
    if (!contract.evidence.length) issues.push(`${contract.id} has no executable evidence`);
  }
  return issues;
}

export function validateUxControlContracts(
  contracts: UxControlContract[],
  rootDir = process.cwd(),
) {
  const issues: string[] = [];
  const seen = new Set<string>();
  const flowIds = new Set(UX_FLOW_CONTRACTS.map((contract) => contract.id));

  for (const contract of contracts) {
    if (seen.has(contract.id)) issues.push(`Duplicate control id: ${contract.id}`);
    seen.add(contract.id);
    if (!contract.owner.trim()) issues.push(`${contract.id} has no owner`);
    if (!contract.action.trim()) issues.push(`${contract.id} has no action`);
    if (!contract.beforeState.trim()) issues.push(`${contract.id} has no before state`);
    if (!contract.afterState.trim()) issues.push(`${contract.id} has no after state`);
    if (!flowIds.has(contract.flowId)) {
      issues.push(`${contract.id} references unknown UX flow ${contract.flowId}`);
    }
    if (!contract.evidence.length) {
      issues.push(`${contract.id} has no executable evidence`);
      continue;
    }

    for (const evidence of contract.evidence) {
      const evidencePath = resolve(rootDir, evidence);
      if (!existsSync(evidencePath)) {
        issues.push(`${contract.id} evidence is missing: ${evidence}`);
        continue;
      }
      const evidenceSource = readFileSync(evidencePath, 'utf8');
      if (!evidenceSource.includes(contract.id)) {
        issues.push(`${contract.id} evidence does not mention control id: ${evidence}`);
      }
    }
  }

  return issues;
}

const INTERACTIVE_TAGS = new Set(['button', 'a', 'input', 'select', 'textarea', 'form']);

function findJsxAttribute(node: ts.JsxOpeningLikeElement, name: string) {
  return node.attributes.properties.find((property) =>
    ts.isJsxAttribute(property) && property.name.getText() === name,
  );
}

function sourceLocation(sourceFile: ts.SourceFile, node: ts.Node, fileName: string) {
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return `${fileName}:${position.line + 1}`;
}

function isJsxOpeningLikeElement(node: ts.Node): node is ts.JsxOpeningLikeElement {
  return ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node);
}

function literalAttributeValue(
  node: ts.JsxOpeningLikeElement,
  name: string,
  sourceFile: ts.SourceFile,
): string | null | undefined {
  const attribute = findJsxAttribute(node, name);
  if (!attribute) return null;
  if (!ts.isJsxAttribute(attribute) || !attribute.initializer) return undefined;
  if (!ts.isStringLiteral(attribute.initializer)) return undefined;
  return attribute.initializer.text;
}

function hasNoopHandler(
  node: ts.JsxOpeningLikeElement,
  sourceFile: ts.SourceFile,
): boolean {
  for (const name of ['onClick', 'onMouseDown', 'onPointerDown', 'onKeyDown', 'onChange', 'onInput', 'onBlur', 'onSubmit']) {
    const attribute = findJsxAttribute(node, name);
    if (!attribute || !ts.isJsxAttribute(attribute) || !attribute.initializer) continue;
    const expressionNode = ts.isJsxExpression(attribute.initializer)
      ? attribute.initializer.expression
      : attribute.initializer;
    if (!expressionNode) continue;
    const expression = expressionNode.getText(sourceFile).replace(/\s/g, '');
    if (/^(?:\([^)]*\)|[A-Za-z_$][\w$]*)=>(?:\{(?:undefined|null|true|false)?\}|undefined|null|true|false)$/.test(expression)) {
      return true;
    }
  }
  return false;
}

function auditInteractiveElement(
  node: ts.JsxOpeningLikeElement,
  sourceFile: ts.SourceFile,
  fileName: string,
  flowContracts: UxFlowContract[],
): string[] {
  const tag = node.tagName.getText(sourceFile);
  if (!INTERACTIVE_TAGS.has(tag)) return [];
  const location = sourceLocation(sourceFile, node, fileName);
  const issues: string[] = [];
  const contractIds = new Set(flowContracts.map((contract) => contract.id));
  const flowAttribute = findJsxAttribute(node, 'data-ux-flow');
  if (!flowAttribute || !ts.isJsxAttribute(flowAttribute) || !flowAttribute.initializer) {
    issues.push(`${location} <${tag}> is missing data-ux-flow`);
  } else if (ts.isStringLiteral(flowAttribute.initializer)) {
    const flowId = flowAttribute.initializer.text;
    if (!contractIds.has(flowId)) issues.push(`${location} <${tag}> references unknown UX flow ${flowId}`);
  } else {
    issues.push(`${location} <${tag}> must use a literal data-ux-flow id`);
  }

  const isIntentionallyDisabled = Boolean(findJsxAttribute(node, 'disabled'));
  if (tag === 'a' && !isIntentionallyDisabled && !findJsxAttribute(node, 'href')) {
    issues.push(`${location} <a> has no href and cannot trigger its declared transition`);
  }
  if (tag === 'button' && !isIntentionallyDisabled) {
    const hasDirectHandler = ['onClick', 'onMouseDown', 'onPointerDown', 'onKeyDown']
      .some((name) => Boolean(findJsxAttribute(node, name)));
    const typeAttribute = findJsxAttribute(node, 'type');
    const isExplicitSubmit = Boolean(
      typeAttribute
      && ts.isJsxAttribute(typeAttribute)
      && typeAttribute.initializer
      && ts.isStringLiteral(typeAttribute.initializer)
      && typeAttribute.initializer.text === 'submit',
    );
    const canSubmitForm = hasSubmitFormAncestor(node) && (!typeAttribute || isExplicitSubmit);
    if (!hasDirectHandler && !canSubmitForm) {
      issues.push(`${location} <button> has no action handler or submit transition`);
    }
    if (hasNoopHandler(node, sourceFile)) {
      issues.push(`${location} <button> has a decorative or no-op transition`);
    }
  }
  if (tag === 'form' && !findJsxAttribute(node, 'onSubmit') && !findJsxAttribute(node, 'action')) {
    issues.push(`${location} <form> has no submit handler or action`);
  }
  if (['input', 'select', 'textarea'].includes(tag) && !isIntentionallyDisabled) {
    const isReadOnly = Boolean(findJsxAttribute(node, 'readOnly'));
    const hasChangeHandler = ['onChange', 'onInput', 'onBlur']
      .some((name) => Boolean(findJsxAttribute(node, name)));
    if (!isReadOnly && !hasChangeHandler && !hasSubmitFormAncestor(node)) {
      issues.push(`${location} <${tag}> has no change handler or submit transition`);
    }
  }
  return issues;
}

function hasSubmitFormAncestor(node: ts.Node) {
  let current = node.parent;
  while (current) {
    if (ts.isJsxElement(current) && current.openingElement.tagName.getText() === 'form') {
      return Boolean(findJsxAttribute(current.openingElement, 'onSubmit'));
    }
    current = current.parent;
  }
  return false;
}

function isJsxElementNode(node: ts.Node): node is ts.JsxElement | ts.JsxSelfClosingElement {
  return ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node);
}

function isMigratedScope(
  node: ts.JsxElement | ts.JsxSelfClosingElement,
  sourceFile: ts.SourceFile,
) {
  const opening = ts.isJsxElement(node) ? node.openingElement : node;
  return literalAttributeValue(opening, 'data-ux-scope', sourceFile) === 'app-shell-v2';
}

export function auditMigratedControlScope(
  source: string,
  fileName: string,
  contracts: UxControlContract[],
) {
  const issues: string[] = [];
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const contractIds = new Set(contracts.map((contract) => contract.id));
  const seenControlIds = new Set<string>();
  const roots: Array<ts.JsxElement | ts.JsxSelfClosingElement> = [];

  const collectRoots = (node: ts.Node) => {
    if (isJsxElementNode(node) && isMigratedScope(node, sourceFile)) roots.push(node);
    ts.forEachChild(node, collectRoots);
  };
  collectRoots(sourceFile);

  const inspectScope = (root: ts.JsxElement | ts.JsxSelfClosingElement) => {
    const inspect = (node: ts.Node) => {
      if (node !== root && isJsxElementNode(node) && isMigratedScope(node, sourceFile)) return;
      if (isJsxOpeningLikeElement(node)) {
        const tag = node.tagName.getText(sourceFile);
        if (INTERACTIVE_TAGS.has(tag)) {
          const location = sourceLocation(sourceFile, node, fileName);
          const controlAttribute = findJsxAttribute(node, 'data-ux-control');
          const controlId = literalAttributeValue(node, 'data-ux-control', sourceFile);
          if (!controlAttribute) {
            issues.push(`${location} <${tag}> is missing data-ux-control`);
          } else if (controlId === undefined) {
            issues.push(`${location} <${tag}> must use a literal data-ux-control id`);
          } else if (controlId !== null) {
            if (seenControlIds.has(controlId)) {
              issues.push(`Duplicate data-ux-control "${controlId}" in ${fileName}`);
            }
            seenControlIds.add(controlId);
            if (!contractIds.has(controlId)) {
              issues.push(`${location} <${tag}> references unknown UX control ${controlId}`);
            }
          }
          issues.push(...auditInteractiveElement(node, sourceFile, fileName, UX_FLOW_CONTRACTS));
        }
      }
      ts.forEachChild(node, inspect);
    };
    inspect(root);
  };

  roots.forEach(inspectScope);
  return issues;
}

export function auditInteractiveSource(source: string, fileName: string, contracts: UxFlowContract[]) {
  const issues: string[] = [];
  const contractIds = new Set(contracts.map((contract) => contract.id));
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  const inspect = (node: ts.Node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(sourceFile);
      if (INTERACTIVE_TAGS.has(tag)) {
        const flowAttribute = node.attributes.properties.find((property) =>
          ts.isJsxAttribute(property) && property.name.getText(sourceFile) === 'data-ux-flow',
        );
        const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        const location = `${fileName}:${position.line + 1}`;
        if (!flowAttribute || !ts.isJsxAttribute(flowAttribute) || !flowAttribute.initializer) {
          issues.push(`${location} <${tag}> is missing data-ux-flow`);
        } else if (ts.isStringLiteral(flowAttribute.initializer)) {
          const flowId = flowAttribute.initializer.text;
          if (!contractIds.has(flowId)) issues.push(`${location} <${tag}> references unknown UX flow ${flowId}`);
        } else {
          issues.push(`${location} <${tag}> must use a literal data-ux-flow id`);
        }

        const isIntentionallyDisabled = Boolean(findJsxAttribute(node, 'disabled'));
        if (tag === 'a' && !isIntentionallyDisabled && !findJsxAttribute(node, 'href')) {
          issues.push(`${location} <a> has no href and cannot trigger its declared transition`);
        }
        if (tag === 'button' && !isIntentionallyDisabled) {
          const hasDirectHandler = ['onClick', 'onMouseDown', 'onPointerDown', 'onKeyDown']
            .some((name) => Boolean(findJsxAttribute(node, name)));
          const typeAttribute = findJsxAttribute(node, 'type');
          const isExplicitSubmit = Boolean(
            typeAttribute
            && ts.isJsxAttribute(typeAttribute)
            && typeAttribute.initializer
            && ts.isStringLiteral(typeAttribute.initializer)
            && typeAttribute.initializer.text === 'submit',
          );
          const canSubmitForm = hasSubmitFormAncestor(node) && (!typeAttribute || isExplicitSubmit);
          if (!hasDirectHandler && !canSubmitForm) {
            issues.push(`${location} <button> has no action handler or submit transition`);
          }
        }
        if (tag === 'form' && !findJsxAttribute(node, 'onSubmit') && !findJsxAttribute(node, 'action')) {
          issues.push(`${location} <form> has no submit handler or action`);
        }
        if (['input', 'select', 'textarea'].includes(tag) && !isIntentionallyDisabled) {
          const isReadOnly = Boolean(findJsxAttribute(node, 'readOnly'));
          const hasChangeHandler = ['onChange', 'onInput', 'onBlur']
            .some((name) => Boolean(findJsxAttribute(node, name)));
          if (!isReadOnly && !hasChangeHandler && !hasSubmitFormAncestor(node)) {
            issues.push(`${location} <${tag}> has no change handler or submit transition`);
          }
        }
      }
    }
    ts.forEachChild(node, inspect);
  };
  inspect(sourceFile);
  return issues;
}
