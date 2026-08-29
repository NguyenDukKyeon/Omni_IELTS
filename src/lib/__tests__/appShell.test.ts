import { describe, expect, it } from 'vitest';
import {
  CANONICAL_MODULES,
  MOBILE_DESTINATIONS,
  migrateLegacyTheme,
  resolveTheme,
} from '../appShell';

describe('app shell contracts', () => {
  it('exposes Dashboard plus exactly seven canonical modules', () => {
    expect(CANONICAL_MODULES.map(({ id }) => id)).toEqual([
      'sources',
      'vocabulary',
      'grammar',
      'media',
      'practice',
      'mock_test',
      'review_progress',
    ]);
  });

  it('uses five non-scrolling mobile destinations', () => {
    expect(MOBILE_DESTINATIONS.map(({ id }) => id)).toEqual([
      'home',
      'learn',
      'practice',
      'review',
      'more',
    ]);
  });

  it('resolves system and migrates the old boolean theme', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('high_contrast', false)).toBe('high_contrast');
    expect(migrateLegacyTheme('true')).toBe('dark');
    expect(migrateLegacyTheme('false')).toBe('light');
  });
});
