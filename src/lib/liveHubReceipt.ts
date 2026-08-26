import crypto from 'node:crypto';

type ReceiptItem = Record<string, unknown> & { sourceReceipt?: unknown };

function normalizedCitation(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const citation = value as Record<string, unknown>;
  return {
    claimId: String(citation.claimId || ''),
    title: String(citation.title || ''),
    url: String(citation.url || ''),
    snippet: String(citation.snippet || ''),
  };
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, nestedValue]) => nestedValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nestedValue]) => [key, stableValue(nestedValue)]),
  );
}

function canonicalLiveHubItem(item: ReceiptItem): string {
  const citations = Array.isArray(item.citations)
    ? item.citations
      .map(normalizedCitation)
      .filter(Boolean)
      .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)))
    : [];
  return JSON.stringify({
    id: String(item.id || ''),
    title: String(item.title || ''),
    skill: String(item.skill || ''),
    promptStatement: String(item.promptStatement || ''),
    cueCardPoints: stableValue(item.cueCardPoints),
    cueCard: stableValue(item.cueCard),
    passage: stableValue(item.passage),
    questions: stableValue(item.questions),
    audioUrl: String(item.audioUrl || ''),
    mediaUrl: String(item.mediaUrl || ''),
    audioArtifact: stableValue(item.audioArtifact),
    evidenceType: String(item.evidenceType || 'forecast'),
    groundingSourceTitle: String(item.groundingSourceTitle || ''),
    groundingSourceUrl: String(item.groundingSourceUrl || ''),
    citations,
  });
}

export function signLiveHubItem(item: ReceiptItem, secret: string): string {
  if (!secret) throw new Error('LIVE_HUB_RECEIPT_SECRET_REQUIRED');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(canonicalLiveHubItem(item))
    .digest('base64url');
  return `v1.${signature}`;
}

export function verifyLiveHubItemReceipt(item: ReceiptItem, secret: string): boolean {
  if (!secret || typeof item.sourceReceipt !== 'string' || !item.sourceReceipt.startsWith('v1.')) return false;
  const expected = signLiveHubItem(item, secret);
  const actualBuffer = Buffer.from(item.sourceReceipt);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}
