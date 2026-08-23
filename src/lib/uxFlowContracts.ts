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
    errorStates: ['auth_missing', 'quota_exhausted', 'network_failed', 'schema_invalid'], evidence: ['e2e/live-hub.spec.ts'],
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
    precondition: 'Gemini quota is exhausted', trigger: 'Learner opens quota management',
    expectedTransition: 'quota alert -> external quota page', sideEffect: 'Open Google AI Studio in a new tab',
    errorStates: ['popup_blocked'], evidence: ['e2e/live-hub.spec.ts'],
  },
  {
    id: 'live-hub.toggle-enrichment', module: 'live-hub', owner: 'ForecastLiveHub',
    precondition: 'A sourced item already has generated enrichment', trigger: 'Learner expands or collapses analysis',
    expectedTransition: 'collapsed <-> expanded', sideEffect: 'Update local presentation state',
    errorStates: [], evidence: ['e2e/live-hub.spec.ts'],
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

const INTERACTIVE_TAGS = new Set(['button', 'a', 'input', 'select', 'textarea', 'form']);

function findJsxAttribute(node: ts.JsxOpeningLikeElement, name: string) {
  return node.attributes.properties.find((property) =>
    ts.isJsxAttribute(property) && property.name.getText() === name,
  );
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
