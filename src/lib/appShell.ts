import type { ModuleId } from '../types';

export type ThemePreference = 'system' | 'light' | 'dark' | 'high_contrast';
export type ResolvedTheme = 'light' | 'dark' | 'high_contrast';
export type EvidenceDockState = 'open' | 'collapsed' | 'hidden';
export type MobileDestinationId = 'home' | 'learn' | 'practice' | 'review' | 'more';
export type ConnectivityState = 'online' | 'offline' | 'syncing' | 'needs_attention';
export type MobileGroupId = 'learn' | 'practice' | 'review';

export interface CanonicalModule {
  id: ModuleId;
  label: string;
  description: string;
  mobileGroup: MobileGroupId;
}

export const CANONICAL_MODULES: readonly CanonicalModule[] = [
  { id: 'sources', label: 'Sources & Library', description: 'Nguồn và xuất xứ', mobileGroup: 'learn' },
  { id: 'vocabulary', label: 'Vocabulary', description: 'Ôn tập thích ứng', mobileGroup: 'learn' },
  { id: 'grammar', label: 'Grammar & Strategy', description: 'Curriculum và chiến thuật', mobileGroup: 'learn' },
  { id: 'media', label: 'Media Lab', description: 'Nghe, chép và shadowing', mobileGroup: 'learn' },
  { id: 'practice', label: 'IELTS Practice', description: 'Bốn kỹ năng', mobileGroup: 'practice' },
  { id: 'mock_test', label: 'IELTS Mock', description: 'Mini và Full Mock', mobileGroup: 'practice' },
  { id: 'review_progress', label: 'Review & Progress', description: 'Ôn lỗi và bằng chứng', mobileGroup: 'review' },
] as const;

export const MOBILE_DESTINATIONS = [
  { id: 'home', label: 'Home' },
  { id: 'learn', label: 'Learn' },
  { id: 'practice', label: 'Practice' },
  { id: 'review', label: 'Review' },
  { id: 'more', label: 'More' },
] as const;

export function resolveTheme(
  preference: ThemePreference,
  systemDark: boolean,
): ResolvedTheme {
  if (preference === 'system') return systemDark ? 'dark' : 'light';
  return preference;
}

export function migrateLegacyTheme(value: string | null): ThemePreference {
  if (value === 'true') return 'dark';
  if (value === 'false') return 'light';
  return 'system';
}

export function destinationForModule(moduleId: ModuleId): MobileDestinationId | null {
  if (moduleId === 'dashboard') return 'home';
  if (moduleId === 'profile') return 'more';
  const found = CANONICAL_MODULES.find((module) => module.id === moduleId);
  return found?.mobileGroup ?? null;
}

export function modulesInMobileGroup(group: MobileGroupId): CanonicalModule[] {
  return CANONICAL_MODULES.filter((module) => module.mobileGroup === group);
}
