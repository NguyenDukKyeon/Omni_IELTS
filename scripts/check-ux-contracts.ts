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
for (const file of collectTsxFiles(path.join(root, 'src'))) {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  const source = readFileSync(file, 'utf8');
  controls += (source.match(/<(button|a|input|select|textarea|form)(?=[\s>])/g) || []).length;
  issues.push(...auditInteractiveSource(source, relative, UX_FLOW_CONTRACTS));
}

if (issues.length) {
  console.error(`UX flow contract gate failed with ${issues.length} issue(s):`);
  for (const issue of issues.slice(0, 200)) console.error(`- ${issue}`);
  if (issues.length > 200) console.error(`- ... ${issues.length - 200} additional issue(s)`);
  process.exit(1);
}

console.log(`UX flow contract gate passed: ${controls} native controls mapped to ${UX_FLOW_CONTRACTS.length} contracts.`);
