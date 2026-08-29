import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const docs = [
  'docs/product/PRODUCT_STRATEGY.md',
  'docs/product/LEARNING_AND_ASSESSMENT_FRAMEWORK.md',
  'docs/product/CAPABILITY_REGISTRY.md',
  'docs/product/PRD.md',
  'docs/product/TRACEABILITY_MATRIX.md',
];
const forbidden = [
  /\bTBD\b/i,
  /\bTODO\b/i,
  /implement later/i,
  /fill in/i,
  /appropriate error handling/i,
];
const domainSpecOwners = new Set([
  'platform',
  'sources',
  'vocabulary',
  'grammar_strategy',
  'media',
  'practice',
  'mock',
  'review_progress',
]);
const architectureOwners = new Set([
  'Identity & Privacy',
  'Source Ingestion',
  'Content & Provenance',
  'Curriculum',
  'Learning Activity',
  'Assessment',
  'Mastery & Scheduling',
  'Mistake Lifecycle',
  'Mock Exam',
  'AI Orchestration',
  'Voice & Media',
  'Progress & Analytics',
]);
const owner = new Map<string, string>();
const issues: string[] = [];

const normalize = (value: string) => value.replace(/\r\n?/g, '\n');
const readDoc = (path: string) => normalize(readFileSync(resolve(root, path), 'utf8'));
const record = (category: string, subject: string, file: string, detail?: string) => {
  issues.push(`${category}: ${subject} (${file})${detail ? ` — ${detail}` : ''}`);
};

for (const path of docs) {
  const content = readDoc(path);
  for (const pattern of forbidden) {
    if (pattern.test(content)) {
      record('placeholder', pattern.toString(), path);
    }
  }
}

const definitionPatterns = [
  {
    path: 'docs/product/PRODUCT_STRATEGY.md',
    pattern: /^### ((?:METRIC|GUARD)-[A-Z0-9-]+)\b/gm,
  },
  {
    path: 'docs/product/CAPABILITY_REGISTRY.md',
    pattern: /^\| (CAP-[A-Z0-9-]+) \|/gm,
  },
  {
    path: 'docs/product/PRD.md',
    pattern: /^### ((?:PRD|NFR)-[A-Z0-9-]+)\b/gm,
  },
];

for (const definition of definitionPatterns) {
  const content = readDoc(definition.path);
  for (const match of content.matchAll(definition.pattern)) {
    const id = match[1];
    const previous = owner.get(id);
    if (previous) record('duplicate_definition', id, definition.path, `already defined in ${previous}`);
    else owner.set(id, definition.path);
  }
}

const prd = readDoc('docs/product/PRD.md');
const definedRequirements = [...prd.matchAll(/^### ((?:PRD|NFR)-[A-Z0-9-]+)\b/gm)].map(
  (match) => match[1],
);
const definedRequirementSet = new Set(definedRequirements);

const strategy = readDoc('docs/product/PRODUCT_STRATEGY.md');
const definedMetrics = new Set(
  [...strategy.matchAll(/^### ((?:METRIC|GUARD)-[A-Z0-9-]+)\b/gm)].map((match) => match[1]),
);

const registry = readDoc('docs/product/CAPABILITY_REGISTRY.md');
const capabilityPriority = new Map<string, string>();
for (const line of registry.split('\n')) {
  if (!/^\| CAP-[A-Z0-9-]+ \|/.test(line)) continue;
  const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
  const id = cells[0] ?? '';
  capabilityPriority.set(id, cells[5] ?? '');
}

const matrixPath = 'docs/product/TRACEABILITY_MATRIX.md';
const matrix = readDoc(matrixPath);
type MatrixRow = {
  id: string;
  cells: string[];
  line: string;
};
const matrixRows: MatrixRow[] = [];
for (const line of matrix.split('\n')) {
  if (!/^\| (?:PRD|NFR)-/.test(line)) continue;
  const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
  matrixRows.push({ id: cells[0] ?? '', cells, line });
}

const matrixCounts = new Map<string, number>();
for (const row of matrixRows) {
  matrixCounts.set(row.id, (matrixCounts.get(row.id) ?? 0) + 1);
}

for (const id of definedRequirements) {
  const count = matrixCounts.get(id) ?? 0;
  if (count === 0) record('missing_matrix_row', id, matrixPath);
  if (count > 1) record('duplicate_matrix_row', id, matrixPath, `${count} rows`);
}

for (const row of matrixRows) {
  if (!definedRequirementSet.has(row.id)) {
    record('unknown_requirement', row.id || '(empty requirement id)', matrixPath);
  }
  if (row.cells.length !== 6) {
    record('malformed_row', row.id || '(empty requirement id)', matrixPath, `${row.cells.length} cells`);
    continue;
  }
  const [requirement, capabilities, metrics, domain, architecture, status] = row.cells;
  const fields = [
    ['Requirement', requirement],
    ['Capabilities', capabilities],
    ['Metric/Guardrail', metrics],
    ['Domain SPEC Owner', domain],
    ['Architecture Owner', architecture],
    ['Delivery Status', status],
  ] as const;
  for (const [field, value] of fields) {
    if (!value) record('empty_field', row.id, matrixPath, field);
  }
  const capRefs = capabilities.match(/CAP-[A-Z0-9-]+/g) ?? [];
  if (capRefs.length === 0) record('missing_capability_reference', row.id, matrixPath);
  for (const cap of capRefs) {
    if (!capabilityPriority.has(cap)) record('unknown_capability', cap, matrixPath, row.id);
  }
  const metricRefs = metrics.match(/(?:METRIC|GUARD)-[A-Z0-9-]+/g) ?? [];
  if (metricRefs.length === 0) record('missing_metric_reference', row.id, matrixPath);
  for (const metric of metricRefs) {
    if (!definedMetrics.has(metric)) record('unknown_metric', metric, matrixPath, row.id);
  }
  if (domain && !domainSpecOwners.has(domain)) {
    record('invalid_domain_spec_owner', row.id, matrixPath, domain);
  }
  if (architecture && !architectureOwners.has(architecture)) {
    record('invalid_architecture_owner', row.id, matrixPath, architecture);
  }
  if (status && status !== 'product_approved') {
    record('invalid_delivery_status', row.id, matrixPath, status);
  }
  if (/\b(implemented|verified|released)\b/i.test(status)) {
    record('implementation_claim', row.id, matrixPath, status);
  }
}

const coveredCore = new Set<string>();
for (const row of matrixRows) {
  for (const cap of row.cells[1]?.match(/CAP-[A-Z0-9-]+/g) ?? []) {
    if (capabilityPriority.get(cap) === 'core') coveredCore.add(cap);
  }
}
for (const [id, priority] of [...capabilityPriority.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  if (priority === 'core' && !coveredCore.has(id)) {
    record('orphaned_core_capability', id, 'docs/product/CAPABILITY_REGISTRY.md');
  }
}

if (issues.length) {
  console.error(`Product documentation gate failed with ${issues.length} issue(s):`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log(`Product documentation gate passed: ${docs.length} documents, ${owner.size} stable IDs.`);
