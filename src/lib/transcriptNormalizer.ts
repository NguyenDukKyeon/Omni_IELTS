export interface NormalizedTranscriptSegment {
  start: number;
  end: number;
  text: string;
}
const decodeEntities = (value: string) => value
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'");

const cleanCaptionText = (value: string) => decodeEntities(value)
  .replace(/<\/?c(?:\.[^>]*)?>/gi, '')
  .replace(/<\/?[^>]+>/g, '')
  .replace(/\{\\an\d+}/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const parseTime = (value: string): number => {
  const parts = value.trim().replace(',', '.').split(':').map(Number);
  if (parts.some(Number.isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return parts[0] * 60 + parts[1];
};

/** Parse VTT captions and collapse YouTube's rolling-caption duplicates. */
export function normalizeRollingVtt(vtt: string): NormalizedTranscriptSegment[] {
  const blocks = vtt.replace(/^\uFEFF/, '').split(/\r?\n\s*\r?\n/);
  const parsed: NormalizedTranscriptSegment[] = [];

  for (const block of blocks) {
    const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const timingIndex = lines.findIndex((line) => line.includes('-->'));
    if (timingIndex < 0) continue;
    const timing = lines[timingIndex].match(/([^\s]+)\s+-->\s+([^\s]+)/);
    if (!timing) continue;
    const text = cleanCaptionText(lines.slice(timingIndex + 1).join(' '));
    if (!text || /^\[(music|applause|laughter)\]$/i.test(text)) continue;
    parsed.push({ start: parseTime(timing[1]), end: parseTime(timing[2]), text });
  }

  const normalized: NormalizedTranscriptSegment[] = [];
  for (const cue of parsed) {
    const previous = normalized.at(-1);
    if (!previous) {
      normalized.push(cue);
      continue;
    }

    const previousKey = previous.text.toLocaleLowerCase();
    const cueKey = cue.text.toLocaleLowerCase();
    const overlapsInTime = cue.start <= previous.end + 0.15;
    if (overlapsInTime && cueKey.startsWith(previousKey)) {
      normalized[normalized.length - 1] = { ...cue, start: previous.start };
    } else if (overlapsInTime && previousKey.startsWith(cueKey)) {
      previous.end = Math.max(previous.end, cue.end);
    } else if (cueKey === previousKey) {
      previous.end = Math.max(previous.end, cue.end);
    } else {
      normalized.push(cue);
    }
  }

  return normalized;
}
