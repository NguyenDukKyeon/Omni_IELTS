import { createClient, Session } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase = url && anonKey
  ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;

export const isSupabaseConfigured = Boolean(supabase);

export async function signInWithGoogle(): Promise<void> {
  if (!supabase) throw new Error('Supabase chưa được cấu hình trong biến môi trường.');
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
}
export async function signOut(): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function syncPrivateSnapshot(payload: Record<string, unknown>): Promise<void> {
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Hãy đăng nhập Google trước khi đồng bộ.');
  const { error } = await supabase.from('user_snapshots').upsert({
    user_id: user.id,
    payload,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function savePrivateArtifactIfAuthenticated(
  artifactType: 'source' | 'transcript' | 'generated_audio' | 'mock_package' | 'mock_attempt',
  content: unknown,
  provenance: Record<string, unknown> = {},
): Promise<boolean> {
  if (!supabase) return false;
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return false;
  const { error } = await supabase.from('private_artifacts').insert({
    user_id: user.id,
    artifact_type: artifactType,
    provenance,
    content,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  return true;
}
