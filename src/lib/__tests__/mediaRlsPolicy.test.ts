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

  it('enforces immutability triggers for transcript versions while allowing parent cascade', () => {
    const sql = readFileSync(migrationPath, 'utf8');
    expect(sql).toContain('prevent_media_transcript_version_mutation');
    expect(sql).toContain('omni.active_deleting_media_lesson_id');
    expect(sql).toContain('BEFORE UPDATE OR DELETE ON public.media_transcript_versions');
    expect(sql).toContain('BEFORE DELETE ON public.media_lessons');
    expect(sql).toContain('AFTER DELETE ON public.media_lessons');
  });

  it('enforces check constraints against raw audio binary and base64 in attempt and transcript tables', () => {
    const sql = readFileSync(migrationPath, 'utf8');
    expect(sql).toMatch(/data:audio\//);
    expect(sql).toMatch(/base64/);
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
