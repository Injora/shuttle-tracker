import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Database } from '@/types/database';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn(
    'Supabase environment variables are missing. Copy .env.example to .env and fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
  );
}

// Supabase syncs auth state across tabs via a shared storage key + a
// BroadcastChannel of the same name. On web, give each tab its own key so
// separate tabs can hold different accounts while testing. `sessionStorage`
// is per-tab and survives reloads, so a login stays within its tab.
const TAB_ID_KEY = 'shuttle-tracker.tab-id';

function getStorageKey(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    let tabId = window.sessionStorage.getItem(TAB_ID_KEY);
    if (!tabId) {
      tabId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      window.sessionStorage.setItem(TAB_ID_KEY, tabId);
    }
    return `supabase.auth.token.${tabId}`;
  }
  return 'supabase.auth.token';
}

export const supabase: SupabaseClient<Database> = createClient<Database>(
  url ?? 'https://placeholder.supabase.co',
  anonKey ?? 'placeholder-anon-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      storageKey: getStorageKey(),
    },
  },
);
