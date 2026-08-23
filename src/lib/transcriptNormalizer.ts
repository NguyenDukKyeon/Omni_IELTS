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
function parseVttCues(vtt: string): NormalizedTranscriptSegment[] {
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

  return parsed;
}

export function normalizeRollingVtt(vtt: string): NormalizedTranscriptSegment[] {
  const parsed = parseVttCues(vtt);

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

const comparableToken = (value: string) => value.toLocaleLowerCase().replace(/[^\p{L}\p{N}']/gu, '');

function rollingCaptionDeltas(cues: NormalizedTranscriptSegment[]) {
  const deltas: NormalizedTranscriptSegment[] = [];
  let previousCue: NormalizedTranscriptSegment | undefined;

  for (const cue of cues) {
    if (!previousCue) {
      deltas.push({ ...cue });
      previousCue = cue;
      continue;
    }

    const previousWords = previousCue.text.split(/\s+/);
    const currentWords = cue.text.split(/\s+/);
    const maxOverlap = Math.min(previousWords.length, currentWords.length);
    let overlap = 0;
    for (let size = maxOverlap; size > 0; size -= 1) {
      const previousSuffix = previousWords.slice(-size).map(comparableToken).join(' ');
      const currentPrefix = currentWords.slice(0, size).map(comparableToken).join(' ');
      if (previousSuffix && previousSuffix === currentPrefix) {
        overlap = size;
        break;
      }
    }

    const novelText = currentWords.slice(overlap).join(' ').trim();
    if (novelText) {
      deltas.push({
        start: overlap > 0 ? Math.min(cue.end, Math.max(cue.start, previousCue.end)) : cue.start,
        end: cue.end,
        text: novelText,
      });
    }
    previousCue = cue;
  }

  return deltas;
}

function splitTimedSentences(cues: NormalizedTranscriptSegment[]): NormalizedTranscriptSegment[] {
  return cues.flatMap((cue) => {
    const sentences = cue.text.match(/[^.!?]+[.!?]+(?:[\]"')]*)|[^.!?]+$/g)
      ?.map((sentence) => sentence.trim())
      .filter(Boolean) || [cue.text];
    if (sentences.length <= 1) return [cue];

    const weights = sentences.map((sentence) => Math.max(1, sentence.split(/\s+/).length));
    const totalWeight = weights.reduce((total, weight) => total + weight, 0);
    const duration = Math.max(0, cue.end - cue.start);
    let consumedWeight = 0;
    return sentences.map((text, index) => {
      const start = cue.start + duration * (consumedWeight / totalWeight);
      consumedWeight += weights[index];
      const end = index === sentences.length - 1
        ? cue.end
        : cue.start + duration * (consumedWeight / totalWeight);
      return { start, end, text };
    });
  });
}

export function alignTranscriptSentences(cues: NormalizedTranscriptSegment[]): NormalizedTranscriptSegment[] {
  const result: NormalizedTranscriptSegment[] = [];
  let pending: NormalizedTranscriptSegment | null = null;
  for (const cue of cues) {
    pending = pending
      ? { start: pending.start, end: cue.end, text: `${pending.text} ${cue.text}`.replace(/\s+/g, ' ').trim() }
      : { ...cue };
    const complete = /[.!?][\]"')]*$/.test(pending.text);
    if (complete || pending.end - pending.start >= 18 || pending.text.length >= 260) {
      result.push(pending);
      pending = null;
    }
  }
  if (pending) result.push(pending);
  return result;
}

export function normalizeAndAlignVtt(vtt: string) {
  return alignTranscriptSentences(splitTimedSentences(rollingCaptionDeltas(parseVttCues(vtt))));
}
