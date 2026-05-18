import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Trim values and strip accidental trailing commas from .env lines. */
function env(name: string): string {
  const raw = process.env[name];
  if (raw == null) return '';
  return raw.trim().replace(/,+$/, '');
}

function normalizeSupabaseUrl(url: string): string {
  return url.replace(/\/rest\/v1\/?$/i, '').replace(/\/$/, '');
}

const supabaseUrl = normalizeSupabaseUrl(env('EXPO_PUBLIC_SUPABASE_URL'));
const supabaseAnonKey = env('EXPO_PUBLIC_SUPABASE_ANON_KEY');

if (__DEV__ && (!supabaseUrl || !supabaseAnonKey)) {
  console.error(
    '[Supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Add them to .env and restart with: npx expo start -c',
  );
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
