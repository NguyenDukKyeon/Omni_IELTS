export const OMNI_BRAND = {
  name: 'OMNI',
  descriptor: 'IELTS PREPARATION',
  nodeCount: 7,
  markSize: 64,
  markCenter: 32,
  ringRadius: 22,
  nodeRadius: 4,
  startAngleDegrees: -90,
  colors: {
    vividVermilion: '#EE1D23',
    action: '#E31B23',
    actionHover: '#C9151E',
    darkAccent: '#FF5A57',
    deepCharcoal: '#121418',
    warmWhite: '#FAF7F2',
  },
} as const;

export const OMNI_RING_PATH =
  'M32 10 A22 22 0 1 1 32 54 A22 22 0 1 1 32 10';

export const OMNI_WORDMARK_VIEWBOX = '0 0 480 128';

export const OMNI_WORDMARK_PATHS = [
  'M52 4C20 4 0 28 0 64s20 60 52 60 52-24 52-60S84 4 52 4Zm0 24c16 0 26 14 26 36s-10 36-26 36S26 86 26 64s10-36 26-36Z',
  'M120 124V4h29l39 55 39-55h29v120h-28V49l-28 41h-24l-28-41v75h-28Z',
  'M270 124V4h28l48 73V4h28v120h-28l-48-73v73h-28Z',
  'M402 4h36v120h-36V4Z',
] as const;

export function getOmniNodeCenters(): ReadonlyArray<{ x: number; y: number }> {
  return Array.from({ length: OMNI_BRAND.nodeCount }, (_, index) => {
    const angle = (
      OMNI_BRAND.startAngleDegrees
      + index * (360 / OMNI_BRAND.nodeCount)
    ) * Math.PI / 180;
    return {
      x: OMNI_BRAND.markCenter + OMNI_BRAND.ringRadius * Math.cos(angle),
      y: OMNI_BRAND.markCenter + OMNI_BRAND.ringRadius * Math.sin(angle),
    };
  });
}
