export interface TextAnnotationRange {
  id: string;
  startOffset: number;
  endOffset: number;
  color: 'yellow' | 'green';
}

export interface AnnotatedTextPart {
  text: string;
  color?: 'yellow' | 'green';
  highlightIds: string[];
}

export function splitTextByAnnotations(text: string, annotations: TextAnnotationRange[]): AnnotatedTextPart[] {
  const valid = annotations.filter(annotation =>
    Number.isInteger(annotation.startOffset)
    && Number.isInteger(annotation.endOffset)
    && annotation.startOffset >= 0
    && annotation.endOffset > annotation.startOffset
    && annotation.startOffset < text.length
  );
  if (!valid.length) return [{ text, highlightIds: [] }];

  const boundaries = [...new Set([
    0,
    text.length,
    ...valid.flatMap(annotation => [
      Math.min(annotation.startOffset, text.length),
      Math.min(annotation.endOffset, text.length),
    ]),
  ])].sort((a, b) => a - b);

  return boundaries.slice(0, -1).map((start, index) => {
    const end = boundaries[index + 1];
    const active = valid.filter(annotation => annotation.startOffset < end && annotation.endOffset > start);
    return {
      text: text.slice(start, end),
      color: active.at(-1)?.color,
      highlightIds: active.map(annotation => annotation.id),
    };
  }).filter(part => part.text.length > 0);
}
