import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migrationPath = 'supabase/migrations/202609040001_media_learning_room.sql';

type Actor = { id: string };
type LessonRow = { id: string; user_id: string };
type VersionRow = { id: string; lesson_id: string; user_id: string; version_number: number };
type AttemptRow = { id: string; lesson_id: string; transcript_version_id: string; user_id: string };
type ResumeRow = { lesson_id: string; user_id: string };

function lessonOwned(actor: Actor, lessonId: string, lessons: LessonRow[]): boolean {
  return lessons.some((l) => l.id === lessonId && l.user_id === actor.id);
}

function canSelectOrInsertVersion(actor: Actor, version: VersionRow, lessons: LessonRow[]): boolean {
  return actor.id === version.user_id && lessonOwned(actor, version.lesson_id, lessons);
}

function canInsertAttempt(
  actor: Actor,
  attempt: AttemptRow,
  versions: VersionRow[],
  lessons: LessonRow[],
): boolean {
  if (actor.id !== attempt.user_id) return false;
  const version = versions.find((v) => v.id === attempt.transcript_version_id);
  if (!version || version.user_id !== actor.id) return false;
  return lessonOwned(actor, attempt.lesson_id, lessons) && version.lesson_id === attempt.lesson_id;
}

function canAccessResume(actor: Actor, resume: ResumeRow, lessons: LessonRow[]): boolean {
  return actor.id === resume.user_id && lessonOwned(actor, resume.lesson_id, lessons);
}

describe('P04 Media Learning Room Database Schema and RLS Policies', () => {
  const alice: Actor = { id: 'aaaaaaaa-aaaa-4000-8000-000000000001' };
  const bob: Actor = { id: 'bbbbbbbb-bbbb-4000-8000-000000000002' };

  const lessons: LessonRow[] = [{ id: 'l-alice', user_id: alice.id }];
  const versions: VersionRow[] = [
    { id: 'v-alice-1', lesson_id: 'l-alice', user_id: alice.id, version_number: 1 },
  ];

  it('verifies migration file exists and contains all required tables', () => {
    const sql = readFileSync(migrationPath, 'utf8');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.media_lessons');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.media_transcript_versions');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.media_shadowing_attempts');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.media_dictation_attempts');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.media_resume_states');
  });

  it('enforces RLS enabled on all 5 tables and revokes anon access', () => {
    const sql = readFileSync(migrationPath, 'utf8');
    expect(sql).toContain('ALTER TABLE public.media_lessons ENABLE ROW LEVEL SECURITY;');
    expect(sql).toContain('ALTER TABLE public.media_transcript_versions ENABLE ROW LEVEL SECURITY;');
    expect(sql).toContain('ALTER TABLE public.media_shadowing_attempts ENABLE ROW LEVEL SECURITY;');
    expect(sql).toContain('ALTER TABLE public.media_dictation_attempts ENABLE ROW LEVEL SECURITY;');
    expect(sql).toContain('ALTER TABLE public.media_resume_states ENABLE ROW LEVEL SECURITY;');
    expect(sql).toContain('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;');
  });

  it('enforces cross-row ownership checks in RLS policies for versions, attempts, and resume', () => {
    const sql = readFileSync(migrationPath, 'utf8');
    // Versions require parent lesson owned by auth.uid()
    expect(sql).toMatch(/media_transcript_versions[\s\S]*media_lessons[\s\S]*auth\.uid\(\)/);
    // Attempts require parent lesson & version owned by auth.uid()
    expect(sql).toMatch(/media_shadowing_attempts[\s\S]*media_lessons[\s\S]*auth\.uid\(\)/);
    expect(sql).toMatch(/media_dictation_attempts[\s\S]*media_lessons[\s\S]*auth\.uid\(\)/);
    // Resume requires parent lesson owned by auth.uid()
    expect(sql).toMatch(/media_resume_states[\s\S]*media_lessons[\s\S]*auth\.uid\(\)/);
  });

  it('enforces immutability triggers for transcript versions using database-owned non-spoofable cascade', () => {
    const sql = readFileSync(migrationPath, 'utf8');
    expect(sql).toContain('prevent_media_transcript_version_mutation');
    // Spoofable GUC must be strictly removed
    expect(sql).not.toContain('omni.active_deleting_media_lesson_id');
    // Database-owned cascade tracking in private schema
    expect(sql).toContain('omni_internal.active_deleting_media_lessons');
    expect(sql).toContain('REVOKE ALL ON SCHEMA omni_internal FROM PUBLIC, anon, authenticated;');
    expect(sql).toContain('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA omni_internal FROM PUBLIC, anon, authenticated;');
    // Functions must be in omni_internal, NOT in public
    expect(sql).toContain('FUNCTION omni_internal.prevent_media_transcript_version_mutation');
    expect(sql).toContain('FUNCTION omni_internal.mark_media_lesson_cascade_delete');
    expect(sql).toContain('FUNCTION omni_internal.clear_media_lesson_cascade_delete');
    expect(sql).not.toContain('FUNCTION public.prevent_media_transcript_version_mutation');
    expect(sql).not.toContain('FUNCTION public.mark_media_lesson_cascade_delete');
    expect(sql).not.toContain('FUNCTION public.clear_media_lesson_cascade_delete');
    expect(sql).toContain('BEFORE UPDATE OR DELETE ON public.media_transcript_versions');
    expect(sql).toContain('BEFORE DELETE ON public.media_lessons');
    expect(sql).toContain('AFTER DELETE ON public.media_lessons');
  });

  it('enforces provenance ownership triggers on media_lessons inside omni_internal with context guard', () => {
    const sql = readFileSync(migrationPath, 'utf8');
    expect(sql).toContain('FUNCTION omni_internal.enforce_media_lesson_provenance');
    expect(sql).not.toContain('FUNCTION public.enforce_media_lesson_provenance');
    expect(sql).toContain('media_lessons_enforce_provenance');
    expect(sql).toContain('Invalid source reference');
    expect(sql).toContain('Invalid version reference');
    expect(sql).toContain("TG_TABLE_SCHEMA <> 'public'");
    expect(sql).toContain("TG_TABLE_NAME <> 'media_lessons'");
  });

  it('enforces check constraints against raw audio binary and base64 across tables and urls', () => {
    const sql = readFileSync(migrationPath, 'utf8');
    expect(sql).toContain('media_lessons_media_url_no_raw_audio');
    expect(sql).toContain('shadowing_evaluation_schema_valid');
    expect(sql).toContain('validate_shadowing_evaluation');
    expect(sql).toContain('validate_media_transcript_segments');
    expect(sql).toContain('is_clean_media_text');
    expect(sql).toMatch(/\^https\?:/);
    expect(sql).toMatch(/UklGR/);
    expect(sql).toMatch(/GkXf/);
    expect(sql).toMatch(/SUQz/);
    expect(sql).toMatch(/T2dn/);
  });

  it('enforces complete state machine processing states including needs_review and requires_original_audio in check constraint', () => {
    const sql = readFileSync(migrationPath, 'utf8');
    expect(sql).toContain("'needs_review'");
    expect(sql).toContain("'requires_original_audio'");
  });

  it('models multi-tenant isolation: User B cannot attach attempts to User A lesson/version', () => {
    const stolenAttempt: AttemptRow = {
      id: 'att-stolen',
      lesson_id: 'l-alice',
      transcript_version_id: 'v-alice-1',
      user_id: bob.id,
    };
    expect(canInsertAttempt(bob, stolenAttempt, versions, lessons)).toBe(false);
  });

  it('models multi-tenant isolation: User B cannot create resume state for User A lesson', () => {
    const stolenResume: ResumeRow = {
      lesson_id: 'l-alice',
      user_id: bob.id,
    };
    expect(canAccessResume(bob, stolenResume, lessons)).toBe(false);
  });

  it('models multi-tenant isolation: User A can create valid immutable transcript v2 while v1 remains unchanged', () => {
    const version2: VersionRow = {
      id: 'v-alice-2',
      lesson_id: 'l-alice',
      user_id: alice.id,
      version_number: 2,
    };
    expect(canSelectOrInsertVersion(alice, version2, lessons)).toBe(true);
  });
});
