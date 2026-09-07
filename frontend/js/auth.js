// ─── Career OS: Supabase Auth ───
import { createClient } from '@supabase/supabase-js';

// These match the values in backend/.env.example — the anon key is safe to
// expose client-side since RLS enforces per-user access.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://dsfgnizwhzzadzurdrna.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzZmduaXp3aHp6YWR6dXJkcm5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3NjUxNzgsImV4cCI6MjEwMTM0MTE3OH0.4rYOrmZ9mYJi9wHejdYW74WljAXSs71F6-QZpCcIsco';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/** Get the current session's access token for API calls. */
export async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token ?? null;
}

/** Get the current user object, or null. */
export async function getUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}

/** Sign up with email + password. Returns { user, session, error }. */
export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { user: data?.user, session: data?.session, error };
}

/** Sign in with email + password. Returns { user, error }. */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { user: data?.user, error };
}

/** Sign in with an OAuth provider (e.g. 'google', 'github'). */
export async function signInWithOAuth(provider) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: window.location.origin,
    },
  });
  return { data, error };
}

/** Sign out the current session. */
export async function signOut() {
  await supabase.auth.signOut();
}

/** Subscribe to auth state changes. Returns unsubscribe fn. */
export function onAuthChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return data.subscription.unsubscribe;
}
