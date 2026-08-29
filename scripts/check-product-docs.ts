import { readFileSync } from 'node:fs';
import path, { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PRODUCT_DOCS = [
  'docs/product/PRODUCT_STRATEGY.md',
  'docs/product/LEARNING_AND_ASSESSMENT_FRAMEWORK.md',
  'docs/product/CAPABILITY_REGISTRY.md',
  'docs/product/PRD.md',
  'docs/product/TRACEABILITY_MATRIX.md',
] as const;

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
const nfrMetricExpectations: Record<string, string[]> = {
  'NFR-001': ['METRIC-006'],
  'NFR-002': ['METRIC-006', 'GUARD-001'],
  'NFR-003': ['METRIC-005'],
  'NFR-004': ['GUARD-002', 'GUARD-003', 'GUARD-004'],
  'NFR-005': ['METRIC-006', 'GUARD-001', 'GUARD-004'],
};

const REQUIREMENT_LOOKING = /^\s*\|\s*(?:PRD|NFR)(?:[-_ ]|$)/i;
const CANONICAL_REQUIREMENT_ROW = /^\| ((?:PRD|NFR)-[A-Z0-9-]+) \|/;

const normalize = (value: string) => value.replace(/\r\n?/g, '\n');

function headingBlock(document: string, heading: string) {
  const start = document.search(new RegExp(`^### ${heading}\\b`, 'm'));
  if (start < 0) return '';
  const rest = document.slice(start);
  const next = rest.search(/\n### /);
  return next === -1 ? rest : rest.slice(0, next);
}

function labeledField(block: string, label: string) {
  const match = block.match(
    new RegExp(`\\*\\*${label}\\*\\*\\n+([\\s\\S]*?)(?=\\n\\*\\*|\\n### |\\n## |$)`),
  );
  return match?.[1]?.trim() ?? '';
}

function extractIds(text: string, pattern: RegExp) {
  return text.match(pattern) ?? [];
}

function duplicates(ids: string[]) {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) repeated.add(id);
    seen.add(id);
  }
  return [...repeated].sort();
}

function setDiff(expected: string[], actual: string[]) {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  return {
    missing: [...expectedSet].filter((id) => !actualSet.has(id)).sort(),
    extra: [...actualSet].filter((id) => !expectedSet.has(id)).sort(),
  };
}

export function collectProductDocIssues(rootDir = process.cwd()): string[] {
  const issues: string[] = [];
  const owner = new Map<string, string>();
  const readDoc = (relativePath: string) =>
    normalize(readFileSync(resolve(rootDir, relativePath), 'utf8'));
  const record = (category: string, subject: string, file: string, detail?: string) => {
    issues.push(`${category}: ${subject} (${file})${detail ? ` — ${detail}` : ''}`);
  };

  for (const docPath of PRODUCT_DOCS) {
    const content = readDoc(docPath);
    for (const pattern of forbidden) {
      if (pattern.test(content)) record('placeholder', pattern.toString(), docPath);
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
    capabilityPriority.set(cells[0] ?? '', cells[5] ?? '');
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
    if (REQUIREMENT_LOOKING.test(line) && !CANONICAL_REQUIREMENT_ROW.test(line)) {
      record('malformed_requirement_row', line.trim(), matrixPath);
      continue;
    }
    if (!CANONICAL_REQUIREMENT_ROW.test(line)) continue;
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
    const capRefs = extractIds(capabilities, /CAP-[A-Z0-9-]+/g);
    if (capRefs.length === 0) record('missing_capability_reference', row.id, matrixPath);
    for (const cap of duplicates(capRefs)) {
      record('duplicate_capability_reference', cap, matrixPath, row.id);
    }
    for (const cap of capRefs) {
      if (!capabilityPriority.has(cap)) record('unknown_capability', cap, matrixPath, row.id);
    }
    const metricRefs = extractIds(metrics, /(?:METRIC|GUARD)-[A-Z0-9-]+/g);
    if (metricRefs.length === 0) record('missing_metric_reference', row.id, matrixPath);
    for (const metric of duplicates(metricRefs)) {
      record('duplicate_metric_reference', metric, matrixPath, row.id);
    }
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

    const prdBlock = headingBlock(prd, row.id);
    const expectedCaps = extractIds(
      labeledField(prdBlock, row.id.startsWith('NFR-') ? 'Affected capabilities' : 'Linked capabilities'),
      /CAP-[A-Z0-9-]+/g,
    );
    for (const cap of duplicates(expectedCaps)) {
      record('duplicate_capability_reference', cap, 'docs/product/PRD.md', row.id);
    }
    const capDiff = setDiff(expectedCaps, capRefs);
    if (capDiff.missing.length || capDiff.extra.length) {
      record(
        'capability_set_mismatch',
        row.id,
        matrixPath,
        `missing ${capDiff.missing.join(', ') || 'none'}; extra ${capDiff.extra.join(', ') || 'none'}`,
      );
    }

    const expectedMetrics = row.id.startsWith('NFR-')
      ? nfrMetricExpectations[row.id] ?? []
      : extractIds(labeledField(prdBlock, 'Metrics and guardrails'), /(?:METRIC|GUARD)-[A-Z0-9-]+/g);
    if (row.id.startsWith('PRD-')) {
      for (const metric of duplicates(expectedMetrics)) {
        record('duplicate_metric_reference', metric, 'docs/product/PRD.md', row.id);
      }
    }
    const metricDiff = setDiff(expectedMetrics, metricRefs);
    if (metricDiff.missing.length || metricDiff.extra.length) {
      record(
        'metric_set_mismatch',
        row.id,
        matrixPath,
        `missing ${metricDiff.missing.join(', ') || 'none'}; extra ${metricDiff.extra.join(', ') || 'none'}`,
      );
    }
  }

  const coveredCore = new Set<string>();
  for (const row of matrixRows) {
    for (const cap of row.cells[1]?.match(/CAP-[A-Z0-9-]+/g) ?? []) {
      if (capabilityPriority.get(cap) === 'core') coveredCore.add(cap);
    }
  }
  for (const [id, priority] of [...capabilityPriority.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    if (priority === 'core' && !coveredCore.has(id)) {
      record('orphaned_core_capability', id, 'docs/product/CAPABILITY_REGISTRY.md');
    }
  }

  return issues;
}

export function reportProductDocs(rootDir = process.cwd()) {
  const issues = collectProductDocIssues(rootDir);
  if (issues.length) {
    console.error(`Product documentation gate failed with ${issues.length} issue(s):`);
    for (const issue of issues) console.error(`- ${issue}`);
    process.exit(1);
  }
  const owner = new Set<string>();
  const definitionPatterns = [
    [PRODUCT_DOCS[0], /^### ((?:METRIC|GUARD)-[A-Z0-9-]+)\b/gm],
    [PRODUCT_DOCS[2], /^\| (CAP-[A-Z0-9-]+) \|/gm],
    [PRODUCT_DOCS[3], /^### ((?:PRD|NFR)-[A-Z0-9-]+)\b/gm],
  ] as const;
  for (const [docPath, pattern] of definitionPatterns) {
    const content = normalize(readFileSync(resolve(rootDir, docPath), 'utf8'));
    for (const match of content.matchAll(pattern)) owner.add(match[1]);
  }
  console.log(
    `Product documentation gate passed: ${PRODUCT_DOCS.length} documents, ${owner.size} stable IDs.`,
  );
}

const currentFilePath = fileURLToPath(import.meta.url);
const isDirectExecution =
  Boolean(process.argv[1]) && path.resolve(process.argv[1]) === path.resolve(currentFilePath);
if (isDirectExecution) {
  reportProductDocs();
}
