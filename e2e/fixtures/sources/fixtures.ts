import type {
  SourceArtifactJob,
  SourceBlock,
  SourceCollection,
  SourceProvenance,
  SourceRecord,
  SourceSpan,
  SourceVersion,
} from '../../../src/types/sources';

export const TASK12_USER_ID = 'task12-learner';
export const TASK12_ACCESS_TOKEN = 'task12-deterministic-token';
export const TASK12_TIMESTAMP = '2026-09-01T00:00:00.000Z';

export const TASK12_TEXT = [
  'Renewable subsidy policy can reduce transition risk when public investment is tied to transparent outcomes.',
  'A city can compare long-term resilience benefits with near-term fiscal cost without treating a draft as a scored exam result.',
].join('\n\n');

export const TASK12_VTT = `WEBVTT\n\n00:00:01.000 --> 00:00:03.000\nPolicy begins with clear evidence.\n\n00:00:04.000 --> 00:00:06.000\nLearners can cite the exact turn.`;

export const TASK12_URL_HTML = `<!doctype html><html><head><title>Renewable policy brief</title></head><body><article><h1>Renewable policy brief</h1><p>Public investment can reduce transition risk when outcomes remain transparent.</p><p>Resilience benefits should be compared with near-term fiscal cost.</p></article></body></html>`;
export const TASK12_BLOCKED_HTML = '<!doctype html><html><body><h1>Access denied</h1><p>Challenge page fixture only.</p></body></html>';
export const TASK12_YOUTUBE_URL = 'https://www.youtube.com/watch?v=task12fixture';
export const TASK12_AUDIO_REFERENCE = 'task12-audio-reference.mp3';
export const TASK12_CHART_REFERENCE = 'task12-chart-reference.svg';

function crc32(bytes: Uint8Array): number {
  let crc = ~0;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ ~0) >>> 0;
}

function u16(value: number): Buffer {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function u32(value: number): Buffer {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value);
  return buffer;
}

function buildZip(files: Record<string, string>): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const nameBytes = Buffer.from(name, 'utf8');
    const data = Buffer.from(content, 'utf8');
    const crc = crc32(data);
    const local = Buffer.concat([
      Buffer.from('PK\x03\x04'), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(data.length), u32(data.length), u16(nameBytes.length), u16(0),
      nameBytes, data,
    ]);
    const central = Buffer.concat([
      Buffer.from('PK\x01\x02'), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(data.length), u32(data.length), u16(nameBytes.length), u16(0),
      u16(0), u16(0), u16(0), u32(0), u32(offset), nameBytes,
    ]);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }
  const centralDirectory = Buffer.concat(centrals);
  const end = Buffer.concat([
    Buffer.from('PK\x05\x06'), u16(0), u16(0), u16(centrals.length), u16(centrals.length),
    u32(centralDirectory.length), u32(offset), u16(0),
  ]);
  return Buffer.concat([...locals, centralDirectory, end]);
}

function buildPdf(pageTexts: string[]): Buffer {
  const objects: string[] = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n',
    `2 0 obj << /Type /Pages /Kids [${pageTexts.map((_, index) => `${3 + index * 2} 0 R`).join(' ')}] /Count ${pageTexts.length} >> endobj\n`,
  ];
  pageTexts.forEach((text, index) => {
    const pageObject = 3 + index * 2;
    const contentObject = pageObject + 1;
    const stream = text ? `BT /F1 12 Tf 72 720 Td (${text}) Tj ET` : '';
    objects.push(
      `${pageObject} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentObject} 0 R /Resources << /Font << /F1 ${3 + pageTexts.length * 2} 0 R >> >> >> endobj\n`,
      `${contentObject} 0 obj << /Length ${Buffer.byteLength(stream)} >> stream\n${stream}\nendstream endobj\n`,
    );
  });
  objects.push(`${3 + pageTexts.length * 2} 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n`);

  let body = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(body));
    body += object;
  }
  const xrefStart = Buffer.byteLength(body);
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) {
    body += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(body, 'utf8');
}

export function buildTask12Docx(): Buffer {
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Renewable policy brief</w:t></w:r></w:p>
<w:p><w:r><w:t>Transparent investment can reduce transition risk.</w:t></w:r></w:p>
<w:tbl><w:tr><w:tc><w:p><w:r><w:t>Fiscal cost</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Resilience benefit</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
</w:body></w:document>`;
  return buildZip({
    '[Content_Types].xml': '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    '_rels/.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    'word/document.xml': documentXml,
  });
}

export const TASK12_FILES = {
  pdf: { name: 'fix-src-pdf-01.pdf', mimeType: 'application/pdf', buffer: buildPdf(['Urban heat islands change city policy.', 'Transparent evidence improves resilience.']) },
  scannedPdf: { name: 'fix-src-pdf-scanned.pdf', mimeType: 'application/pdf', buffer: buildPdf(['']) },
  malformedPdf: { name: 'fix-src-pdf-malformed.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\nmalformed fixture', 'utf8') },
  docx: { name: 'fix-src-docx-01.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: buildTask12Docx() },
  audio: { name: 'fix-src-audio-01.mp3', mimeType: 'audio/mpeg', buffer: Buffer.from('test-only audio reference', 'utf8') },
  chart: { name: 'fix-src-chart-01.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" role="img"><title>Test-only chart reference</title></svg>', 'utf8') },
} as const;

const baseProvenance: SourceProvenance = {
  originType: 'pasted_text',
  retrievalDate: TASK12_TIMESTAMP,
  rightsState: 'owned_by_learner',
  rawContentHash: 'task12-hash-text-v1',
  canonicalCitation: 'Renewable policy brief fixture',
  owningModule: 'sources',
};

function blocksFor(texts: string[], prefix = 'b'): SourceBlock[] {
  return texts.map((text, index) => ({ id: `${prefix}_${String(index + 1).padStart(3, '0')}`, order: index + 1, type: 'paragraph', text }));
}

export const TASK12_TEXT_VERSION: SourceVersion = {
  id: 'task12-version-text-v1',
  sourceId: 'task12-source-text',
  versionNumber: 1,
  stage: 'normalised',
  contentHash: 'task12-hash-text-v1',
  plainText: TASK12_TEXT,
  blocks: blocksFor(TASK12_TEXT.split('\n\n')),
  wordCount: TASK12_TEXT.split(/\s+/).length,
  createdAt: TASK12_TIMESTAMP,
};

export const TASK12_EDITED_VERSION: SourceVersion = {
  ...TASK12_TEXT_VERSION,
  id: 'task12-version-text-v2',
  versionNumber: 2,
  stage: 'edited',
  contentHash: 'task12-hash-text-v2',
  plainText: `${TASK12_TEXT}\n\nEdited conclusion keeps the citation boundary explicit.`,
  blocks: blocksFor([...TASK12_TEXT.split('\n\n'), 'Edited conclusion keeps the citation boundary explicit.']),
};

export const TASK12_OTHER_VERSIONS: Record<string, SourceVersion> = {
  'task12-version-pdf': {
    id: 'task12-version-pdf', sourceId: 'task12-source-pdf', versionNumber: 1, stage: 'normalised', contentHash: 'task12-hash-pdf',
    plainText: 'Urban heat islands change city policy.\n\nTransparent evidence improves resilience.', blocks: blocksFor(['Urban heat islands change city policy.', 'Transparent evidence improves resilience.']), wordCount: 9, pageCount: 2, createdAt: TASK12_TIMESTAMP,
  },
  'task12-version-docx': {
    id: 'task12-version-docx', sourceId: 'task12-source-docx', versionNumber: 1, stage: 'normalised', contentHash: 'task12-hash-docx',
    plainText: 'Renewable policy brief\n\nTransparent investment can reduce transition risk.\n\nFiscal cost\n\nResilience benefit', blocks: blocksFor(['Renewable policy brief', 'Transparent investment can reduce transition risk.', 'Fiscal cost', 'Resilience benefit']), wordCount: 11, createdAt: TASK12_TIMESTAMP,
  },
  'task12-version-url': {
    id: 'task12-version-url', sourceId: 'task12-source-url', versionNumber: 1, stage: 'normalised', contentHash: 'task12-hash-url',
    plainText: 'Public investment can reduce transition risk when outcomes remain transparent.\n\nResilience benefits should be compared with near-term fiscal cost.', blocks: blocksFor(['Public investment can reduce transition risk when outcomes remain transparent.', 'Resilience benefits should be compared with near-term fiscal cost.']), wordCount: 20, createdAt: TASK12_TIMESTAMP,
  },
  'task12-version-vtt': {
    id: 'task12-version-vtt', sourceId: 'task12-source-vtt', versionNumber: 1, stage: 'normalised', contentHash: 'task12-hash-vtt',
    plainText: 'Policy begins with clear evidence.\n\nLearners can cite the exact turn.', blocks: blocksFor(['Policy begins with clear evidence.', 'Learners can cite the exact turn.']).map((block, index) => ({ ...block, type: 'transcript_turn', startMs: index ? 4_000 : 1_000, endMs: index ? 6_000 : 3_000 })), wordCount: 10, durationMs: 6_000, createdAt: TASK12_TIMESTAMP,
  },
};

function sourceRecord(input: Pick<SourceRecord, 'id' | 'title' | 'type' | 'processingState' | 'currentVersionId' | 'provenance'> & Partial<Pick<SourceRecord, 'summary' | 'collectionIds' | 'tags'>>): SourceRecord {
  return {
    id: input.id,
    userId: TASK12_USER_ID,
    title: input.title,
    summary: input.summary || '',
    type: input.type,
    collectionIds: input.collectionIds || [],
    tags: input.tags || [],
    provenance: input.provenance,
    currentVersionId: input.currentVersionId,
    processingState: input.processingState,
    lastUsedAt: TASK12_TIMESTAMP,
    createdAt: TASK12_TIMESTAMP,
    updatedAt: TASK12_TIMESTAMP,
  };
}

export const TASK12_RECORDS: SourceRecord[] = [
  sourceRecord({ id: 'task12-source-text', title: 'Renewable policy brief', summary: TASK12_TEXT, type: 'text', currentVersionId: TASK12_TEXT_VERSION.id, processingState: 'ready', collectionIds: ['task12-collection'], tags: ['policy', 'renewable'], provenance: baseProvenance }),
  sourceRecord({ id: 'task12-source-pdf', title: 'Urban heat islands PDF', summary: 'Two-page text-layer PDF fixture.', type: 'pdf', currentVersionId: 'task12-version-pdf', processingState: 'ready', collectionIds: ['task12-collection'], tags: ['cities'], provenance: { ...baseProvenance, originType: 'user_upload', originalFilename: TASK12_FILES.pdf.name, rawContentHash: 'task12-hash-pdf', canonicalCitation: 'Urban heat islands PDF fixture' } }),
  sourceRecord({ id: 'task12-source-docx', title: 'Renewable policy DOCX', summary: 'DOCX heading and table fixture.', type: 'docx', currentVersionId: 'task12-version-docx', processingState: 'ready', collectionIds: ['task12-collection'], tags: ['report'], provenance: { ...baseProvenance, originType: 'user_upload', originalFilename: TASK12_FILES.docx.name, rawContentHash: 'task12-hash-docx', canonicalCitation: 'Renewable policy DOCX fixture' } }),
  sourceRecord({ id: 'task12-source-url', title: 'Renewable policy URL', summary: 'Local article HTML fixture.', type: 'url', currentVersionId: 'task12-version-url', processingState: 'ready', collectionIds: ['task12-collection'], tags: ['article'], provenance: { ...baseProvenance, originType: 'web_fetch', originalUrl: 'https://fixture.invalid/renewable-policy', rawContentHash: 'task12-hash-url', canonicalCitation: 'Renewable policy URL fixture' } }),
  sourceRecord({ id: 'task12-source-vtt', title: 'Policy captions', summary: 'Two-cue VTT fixture.', type: 'vtt_srt', currentVersionId: 'task12-version-vtt', processingState: 'ready', tags: ['captions'], provenance: { ...baseProvenance, originType: 'user_upload', originalFilename: 'fix-src-vtt-01.vtt', rawContentHash: 'task12-hash-vtt', canonicalCitation: 'Policy captions fixture' } }),
  sourceRecord({ id: 'task12-source-youtube', title: 'YouTube handoff fixture', summary: '', type: 'youtube', currentVersionId: '', processingState: 'handoff_required', provenance: { ...baseProvenance, originType: 'youtube_import', owningModule: 'media', rawContentHash: 'task12-hash-youtube', canonicalCitation: TASK12_YOUTUBE_URL, handoffReasonVi: 'Media Lab phụ trách phát và chép lời nguồn YouTube.' } }),
  sourceRecord({ id: 'task12-source-audio', title: 'Audio handoff fixture', summary: '', type: 'audio', currentVersionId: '', processingState: 'handoff_required', provenance: { ...baseProvenance, originType: 'user_upload', owningModule: 'media', rawContentHash: 'task12-hash-audio', canonicalCitation: TASK12_AUDIO_REFERENCE, handoffReasonVi: 'Media Lab phụ trách âm thanh của nguồn này.' } }),
  sourceRecord({ id: 'task12-source-chart', title: 'Chart handoff fixture', summary: '', type: 'chart_image', currentVersionId: '', processingState: 'handoff_required', provenance: { ...baseProvenance, originType: 'user_upload', owningModule: 'mock', rawContentHash: 'task12-hash-chart', canonicalCitation: TASK12_CHART_REFERENCE, handoffReasonVi: 'Academic Mock phụ trách hiển thị biểu đồ.' } }),
  sourceRecord({ id: 'task12-source-degraded', title: 'Degraded source fixture', summary: 'Text preview remains available.', type: 'text', currentVersionId: '', processingState: 'degraded', provenance: { ...baseProvenance, rawContentHash: 'task12-hash-degraded', canonicalCitation: 'Degraded source fixture' } }),
  sourceRecord({ id: 'task12-source-failed', title: 'Rejected source fixture', summary: 'This source was rejected.', type: 'pdf', currentVersionId: '', processingState: 'failed', provenance: { ...baseProvenance, originType: 'user_upload', rawContentHash: 'task12-hash-failed', canonicalCitation: 'Rejected source fixture' } }),
  sourceRecord({ id: 'task12-source-unavailable', title: 'Unavailable source fixture', summary: 'Cloud copy is unavailable.', type: 'pdf', currentVersionId: '', processingState: 'unavailable', provenance: { ...baseProvenance, originType: 'user_upload', rawContentHash: 'task12-hash-unavailable', canonicalCitation: 'Unavailable source fixture' } }),
];

export const TASK12_COLLECTIONS: SourceCollection[] = [{
  id: 'task12-collection', userId: TASK12_USER_ID, name: 'Policy fixtures', color: 'vermilion', icon: 'folder',
  sourceIds: ['task12-source-text', 'task12-source-pdf', 'task12-source-docx', 'task12-source-url'],
  createdAt: TASK12_TIMESTAMP, updatedAt: TASK12_TIMESTAMP, lastUsedAt: TASK12_TIMESTAMP,
}];

export function task12VersionFor(sourceVersionId: string): SourceVersion | undefined {
  if (sourceVersionId === TASK12_TEXT_VERSION.id) return TASK12_TEXT_VERSION;
  if (sourceVersionId === TASK12_EDITED_VERSION.id) return TASK12_EDITED_VERSION;
  return TASK12_OTHER_VERSIONS[sourceVersionId];
}

export function task12RecordFor(sourceId: string): SourceRecord | undefined {
  return TASK12_RECORDS.find((record) => record.id === sourceId);
}

export function task12Span(sourceVersionId = TASK12_TEXT_VERSION.id, blockIds = ['b_001']): SourceSpan {
  const version = task12VersionFor(sourceVersionId);
  return { sourceId: version?.sourceId || TASK12_TEXT_VERSION.sourceId, sourceVersionId, blockIds };
}

export function task12ReadyArtifactJob(
  destination: SourceArtifactJob['destination'] = 'practice',
  sourceVersionId = TASK12_TEXT_VERSION.id,
  selection = task12Span(sourceVersionId),
): SourceArtifactJob {
  const source = task12RecordFor(selection.sourceId) || TASK12_RECORDS[0];
  const provenance = source.provenance;
  const draft = {
    id: `task12-draft-${destination}`,
    destination,
    payload: {
      skill: 'reading' as const,
      targetBand: 7,
      activityTitle: 'Renewable policy reading',
      sourceSpanRef: selection,
      questionPayload: { type: 'true_false_not_given', questions: [{ id: 'task12-q1', statement: 'The source discusses transparent outcomes.', correctAnswer: 'TRUE' }] },
      provenance,
    },
  };
  return {
    id: `task12-job-${destination}`,
    userId: TASK12_USER_ID,
    sourceVersionId,
    selection,
    destination,
    targetBand: 7,
    state: 'ready',
    artifactDraft: draft,
    createdAt: TASK12_TIMESTAMP,
    updatedAt: TASK12_TIMESTAMP,
  };
}
