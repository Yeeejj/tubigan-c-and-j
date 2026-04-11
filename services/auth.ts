import { supabase } from './supabase';
import type { UserProfile } from '@/types/database';

// Internally maps username to email for Supabase Auth
const DOMAIN = 'cjwater.local';

function usernameToEmail(username: string): string {
  return `${username.toLowerCase().replace(/\s+/g, '')}@${DOMAIN}`;
}

export async function signIn(username: string, password: string) {
  const email = usernameToEmail(username);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error('Invalid username or password');
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getUserProfile(userId: string): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data as UserProfile;
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function createStaffAccount(
  username: string,
  password: string,
  profile: Omit<UserProfile, 'id' | 'created_at'>
) {
  const email = usernameToEmail(username);

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError) throw authError;

  const { error: profileError } = await supabase.from('users').insert({
    id: authData.user.id,
    ...profile,
  });
  if (profileError) throw profileError;

  return authData.user;
}
