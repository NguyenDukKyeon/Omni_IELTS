import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { UX_FLOW_CONTRACTS, auditInteractiveSource, validateUxFlowContracts } from '../src/lib/uxFlowContracts';

const root = process.cwd();

function collectTsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectTsxFiles(absolute);
    return entry.isFile() && entry.name.endsWith('.tsx') ? [absolute] : [];
  });
}

const issues = validateUxFlowContracts(UX_FLOW_CONTRACTS);
for (const contract of UX_FLOW_CONTRACTS) {
  for (const evidence of contract.evidence) {
    if (!existsSync(path.join(root, evidence))) issues.push(`${contract.id} evidence is missing: ${evidence}`);
  }
}

let controls = 0;
const seenUxControls = new Map<string, string>();
const REQUIRED_CONSENT_CONTROL_MAPPINGS: Record<string, string> = {
  'live-hub.consent.close-button': 'live-hub.consent.dismiss',
  'live-hub.consent.search-more-button': 'live-hub.consent.search-more',
  'live-hub.consent.practice-available-button': 'live-hub.consent.practice-available',
  'live-hub.consent.ai-fill-missing-button': 'live-hub.consent.ai-fill-missing',
  'live-hub.consent.create-ai-variant-button': 'live-hub.consent.create-ai-variant',
};

const REQUIRED_SPEAKING_CONTROL_MAPPINGS: Record<string, string> = {
  'start-realtime-session': 'speaking.realtime',
  'switch-to-turn-based': 'speaking.realtime',
  'switch-to-turn-based-from-permission': 'speaking.realtime',
  'switch-to-turn-based-from-quota': 'speaking.realtime',
  'switch-to-turn-based-from-provider': 'speaking.realtime',
  'microphone-permission': 'speaking.realtime',
  'begin-recording': 'speaking.realtime',
  'retry-provider': 'speaking.realtime',
  'retry-failed': 'speaking.realtime',
  'reconnect': 'speaking.realtime',
  'resume-interrupted-session': 'speaking.realtime',
  'end-answer': 'speaking.realtime',
  'end-exam': 'speaking.realtime',
  'consent-storage': 'speaking.realtime',
  'restart-exam': 'speaking.realtime',
};

const REQUIRED_CONTROL_MAPPINGS = {
  ...REQUIRED_CONSENT_CONTROL_MAPPINGS,
  ...REQUIRED_SPEAKING_CONTROL_MAPPINGS,
};

for (const file of collectTsxFiles(path.join(root, 'src'))) {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  const source = readFileSync(file, 'utf8');
  controls += (source.match(/<(button|a|input|select|textarea|form)(?=[\s>])/g) || []).length;
  issues.push(...auditInteractiveSource(source, relative, UX_FLOW_CONTRACTS));

  // Audit data-ux-control literals for uniqueness
  const controlMatches = source.matchAll(/data-ux-control=["']([^"']+)["']/g);
  for (const match of controlMatches) {
    const controlId = match[1];
    if (seenUxControls.has(controlId)) {
      issues.push(`Duplicate data-ux-control "${controlId}" in ${relative}, already defined in ${seenUxControls.get(controlId)}`);
    } else {
      seenUxControls.set(controlId, relative);
    }
  }
}

for (const [requiredControl, declaredFlowId] of Object.entries(REQUIRED_CONTROL_MAPPINGS)) {
  if (!seenUxControls.has(requiredControl)) {
    issues.push(`Required consent control "${requiredControl}" is missing from the codebase.`);
    continue;
  }

  const matchingContract = UX_FLOW_CONTRACTS.find((c) => c.id === declaredFlowId);
  if (!matchingContract) {
    issues.push(`Consent control "${requiredControl}" maps to declared contract "${declaredFlowId}", but contract is not registered.`);
    continue;
  }

  let foundInEvidence = false;
  for (const evidencePath of matchingContract.evidence) {
    const fullEvidencePath = path.join(root, evidencePath);
    if (existsSync(fullEvidencePath)) {
      const evidenceContent = readFileSync(fullEvidencePath, 'utf8');
      if (evidenceContent.includes(`data-ux-control="${requiredControl}"`) || evidenceContent.includes(requiredControl)) {
        foundInEvidence = true;
        break;
      }
    }
  }

  if (!foundInEvidence) {
    issues.push(`Consent control "${requiredControl}" lacks executable test evidence in contract "${declaredFlowId}" evidence files.`);
  }
}

if (issues.length) {
  console.error(`UX flow contract gate failed with ${issues.length} issue(s):`);
  for (const issue of issues.slice(0, 200)) console.error(`- ${issue}`);
  if (issues.length > 200) console.error(`- ... ${issues.length - 200} additional issue(s)`);
  process.exit(1);
}

console.log(
  `UX flow contract gate passed: ${controls} native controls mapped to ${UX_FLOW_CONTRACTS.length} contracts; ${Object.keys(REQUIRED_CONTROL_MAPPINGS).length} required controls verified with flow mapping and test evidence.`
);
