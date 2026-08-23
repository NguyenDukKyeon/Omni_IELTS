import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const interactiveTags = new Set(['button', 'a', 'input', 'select', 'textarea', 'form']);

function collectTsxFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectTsxFiles(absolute);
    return entry.isFile() && entry.name.endsWith('.tsx') ? [absolute] : [];
  });
}

function flowForFile(file) {
  const relative = path.relative(root, file).replaceAll('\\', '/').toLowerCase();
  if (relative.includes('forecast')) return 'live-hub.refresh';
  if (relative.includes('/mock/') || relative.includes('mocktest') || relative.includes('mockorchestrator')) return 'mock.exam';
  if (/(media|shadowing|dictation|youtube|audiotranscribe)/.test(relative)) return 'media.learning';
  if (/(vocabulary|vocab|flashcard)/.test(relative)) return 'vocabulary.srs';
  if (/(grammar|mistake)/.test(relative)) return 'grammar.learning';
  if (/(practice|readingquestion|listeningquestion|speakingquestion|writingquestion|grader|itemwriter)/.test(relative)) return 'practice.skills';
  if (/(knowledge|lesson|annotatedmodel|pitfalls|bandcalculator|strategy)/.test(relative)) return 'knowledge.learn';
  if (relative.includes('tutor')) return 'tutor.chat';
  if (relative.includes('profile')) return 'profile.settings';
  if (relative.includes('source')) return 'sources.manage';
  if (/(dashboard|diagnostic|speeddrill|mentor)/.test(relative)) return 'dashboard.daily';
  if (/(header|bottomnav|sidebar|app\.tsx)/.test(relative)) return 'app.navigation';
  return 'app.shared';
}

let changedFiles = 0;
let annotatedControls = 0;
for (const file of collectTsxFiles(path.join(root, 'src'))) {
  const source = readFileSync(file, 'utf8');
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const inserts = [];
  const flowId = flowForFile(file);
  const visit = (node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(sourceFile);
      if (interactiveTags.has(tag)) {
        const hasFlow = node.attributes.properties.some((property) =>
          ts.isJsxAttribute(property) && property.name.getText(sourceFile) === 'data-ux-flow',
        );
        if (!hasFlow) inserts.push({ position: node.tagName.end, text: ` data-ux-flow="${flowId}"` });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  if (!inserts.length) continue;
  let updated = source;
  for (const insert of inserts.sort((a, b) => b.position - a.position)) {
    updated = `${updated.slice(0, insert.position)}${insert.text}${updated.slice(insert.position)}`;
  }
  writeFileSync(file, updated, 'utf8');
  changedFiles += 1;
  annotatedControls += inserts.length;
}

console.log(`Annotated ${annotatedControls} controls across ${changedFiles} files.`);
