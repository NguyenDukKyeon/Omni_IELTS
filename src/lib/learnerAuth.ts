import { createHash, timingSafeEqual } from 'node:crypto';

export interface LearnerIdentity {
  userId: string;
  source: 'supabase' | 'canary';
}

export interface LearnerAuthEnv {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  OMNI_SPEAKING_CANARY_TOKEN?: string;
}

export function extractBearerToken(header: string | undefined): string | undefined {
  if (!header) return undefined;
  const match = header.trim().match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || undefined;
}

export function timingSafeEqualString(left: string, right: string): boolean {
  const leftHash = createHash('sha256').update(left).digest();
  const rightHash = createHash('sha256').update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

export async function verifyLearnerAccessToken(
  token: string | undefined,
  env: LearnerAuthEnv,
  supabaseGetUser?: (accessToken: string) => Promise<{ id: string } | null>,
): Promise<LearnerIdentity | null> {
  if (!token) return null;

  const canary = env.OMNI_SPEAKING_CANARY_TOKEN?.trim();
  if (canary && timingSafeEqualString(token, canary)) {
    return { userId: 'canary-speaker', source: 'canary' };
  }

  if (supabaseGetUser) {
    const user = await supabaseGetUser(token);
    return user?.id ? { userId: user.id, source: 'supabase' } : null;
  }

  const url = env.SUPABASE_URL?.trim() || env.VITE_SUPABASE_URL?.trim();
  const anon = env.SUPABASE_ANON_KEY?.trim() || env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) return null;

  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user?.id) return null;
  return { userId: data.user.id, source: 'supabase' };
}
