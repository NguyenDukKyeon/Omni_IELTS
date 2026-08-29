import { useId } from 'react';
import {
  getOmniNodeCenters,
  OMNI_BRAND,
  OMNI_RING_PATH,
} from '../../brand/omniBrand';

export interface OmniMarkProps {
  title?: string;
  className?: string;
  'aria-hidden'?: boolean | 'false' | 'true';
}

export function OmniMark({ title, className, 'aria-hidden': ariaHidden }: OmniMarkProps) {
  const titleId = useId();
  const nodes = getOmniNodeCenters();

  return (
    <svg
      className={className ?? 'omni-mark'}
      viewBox={`0 0 ${OMNI_BRAND.markSize} ${OMNI_BRAND.markSize}`}
      aria-labelledby={title ? titleId : undefined}
      aria-hidden={title ? undefined : ariaHidden ?? true}
      focusable="false"
    >
      {title && <title id={titleId}>{title}</title>}
      <path
        d={OMNI_RING_PATH}
        fill="none"
        stroke="var(--omni-brand-500)"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      {nodes.map(({ x, y }, index) => (
        <circle
          key={index}
          cx={x}
          cy={y}
          fill="var(--omni-brand-500)"
          r={OMNI_BRAND.nodeRadius}
        />
      ))}
    </svg>
  );
}
