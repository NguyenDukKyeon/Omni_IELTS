import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const docs = [
  'docs/product/PRODUCT_STRATEGY.md',
  'docs/product/LEARNING_AND_ASSESSMENT_FRAMEWORK.md',
  'docs/product/CAPABILITY_REGISTRY.md',
  'docs/product/PRD.md',
];
const forbidden = [
  /\bTBD\b/i,
  /\bTODO\b/i,
  /implement later/i,
  /fill in/i,
  /appropriate error handling/i,
];
const owner = new Map<string, string>();
const issues: string[] = [];

for (const path of docs) {
  const content = readFileSync(resolve(root, path), 'utf8');
  for (const pattern of forbidden) {
    if (pattern.test(content)) issues.push(`${path} contains forbidden placeholder language: ${pattern}`);
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
  const content = readFileSync(resolve(root, definition.path), 'utf8');
  for (const match of content.matchAll(definition.pattern)) {
    const id = match[1];
    const previous = owner.get(id);
    if (previous) issues.push(`${id} is defined more than once (${previous}, ${definition.path})`);
    else owner.set(id, definition.path);
  }
}

if (issues.length) {
  console.error(`Product documentation gate failed with ${issues.length} issue(s):`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log(`Product documentation gate passed: ${docs.length} documents, ${owner.size} stable IDs.`);
