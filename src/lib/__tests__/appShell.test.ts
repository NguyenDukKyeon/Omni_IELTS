import { describe, expect, it } from 'vitest';
import {
  CANONICAL_MODULES,
  destinationForModule,
  MOBILE_DESTINATIONS,
  migrateLegacyTheme,
  modulesInMobileGroup,
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

  it('maps modules onto Home Learn Practice Review More groups', () => {
    expect(destinationForModule('dashboard')).toBe('home');
    expect(destinationForModule('sources')).toBe('learn');
    expect(destinationForModule('mock_test')).toBe('practice');
    expect(destinationForModule('review_progress')).toBe('review');
    expect(destinationForModule('profile')).toBe('more');
    expect(destinationForModule('knowledge')).toBeNull();
    expect(modulesInMobileGroup('learn').map(({ id }) => id)).toEqual([
      'sources',
      'vocabulary',
      'grammar',
      'media',
    ]);
    expect(modulesInMobileGroup('practice').map(({ id }) => id)).toEqual([
      'practice',
      'mock_test',
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
