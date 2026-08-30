import {
  OMNI_BRAND,
  OMNI_WORDMARK_PATHS,
  OMNI_WORDMARK_VIEWBOX,
} from '../../brand/omniBrand';
import { OmniMark } from './OmniMark';

export interface OmniLogoProps {
  variant?: 'horizontal' | 'stacked' | 'symbol';
  className?: string;
  descriptor?: boolean;
  inverse?: boolean;
}

export function OmniLogo({
  variant = 'horizontal',
  className,
  descriptor = true,
  inverse = false,
}: OmniLogoProps) {
  const accessibleLabel = descriptor
    ? `${OMNI_BRAND.name} ${OMNI_BRAND.descriptor}`
    : OMNI_BRAND.name;
  const classes = ['omni-logo', `omni-logo--${variant}`, className]
    .filter(Boolean)
    .join(' ');

  if (variant === 'symbol') {
    return (
      <span className={classes} role="img" aria-label={accessibleLabel}>
        <OmniMark aria-hidden="true" />
      </span>
    );
  }

  return (
    <span
      className={classes}
      data-variant={variant}
      data-inverse={inverse ? 'true' : 'false'}
      role="img"
      aria-label={accessibleLabel}
    >
      <OmniMark className="omni-logo__mark" aria-hidden="true" />
      <span className="omni-logo__type" aria-hidden="true">
        <svg
          className="omni-logo__wordmark"
          viewBox={OMNI_WORDMARK_VIEWBOX}
          focusable="false"
        >
          {OMNI_WORDMARK_PATHS.map((path, index) => (
            <path
              key={path}
              d={path}
              fill="currentColor"
              fillRule={index === 0 ? 'evenodd' : undefined}
            />
          ))}
        </svg>
        {descriptor && (
          <span className="omni-logo__descriptor">{OMNI_BRAND.descriptor}</span>
        )}
      </span>
    </span>
  );
}
