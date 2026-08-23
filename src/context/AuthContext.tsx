import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { supabase } from '@/lib/supabase';
import { AppUser, DriverProfile, Role, StudentProfile } from '@/types';
import { registerForPushNotifications } from '@/services/notifications';

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
  signIn: (identifier: string, password: string, role: Role) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  error: null,
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          await hydrateUser(session.user.id);
        } else {
          setUser(null);
        }
        setLoading(false);
      },
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function loadSession() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        await hydrateUser(session.user.id);
      }
    } catch (e) {
      setError('Unable to restore session.');
    } finally {
      setLoading(false);
    }
  }

  async function hydrateUser(userId: string) {
    const [studentRes, driverRes] = await Promise.all([
      supabase.from('students').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('drivers').select('*').eq('user_id', userId).maybeSingle(),
    ]);

    let role: Role = 'student';
    let student: StudentProfile | undefined;
    let driver: DriverProfile | undefined;

    if (driverRes.data) {
      role = 'driver';
      driver = driverRes.data as DriverProfile;
    } else if (studentRes.data) {
      role = 'student';
      student = studentRes.data as StudentProfile;
    } else {
      // Provisioned admin is represented by a driver role with admin flag,
      // but for simplicity admin is identified via user metadata / role.
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      const meta = authUser?.user_metadata as Record<string, unknown> | undefined;
      if (meta?.role === 'admin') {
        role = 'admin';
      }
    }

    setUser({
      id: userId,
      email: (await supabase.auth.getUser()).data.user?.email ?? '',
      role,
      student,
      driver,
    });
  }

  async function signIn(identifier: string, password: string, role: Role) {
    setError(null);

    if (role === 'admin') {
      const {
        data: { session },
        error: signInErr,
      } = await supabase.auth.signInWithPassword({
        email: identifier,
        password,
      });
      if (signInErr || !session) {
        throw new Error('Invalid admin credentials.');
      }
      const meta = session.user.user_metadata as Record<string, unknown>;
      if (meta?.role !== 'admin') {
        await supabase.auth.signOut();
        throw new Error('This account does not have admin access.');
      }
      await hydrateUser(session.user.id);
      return;
    }

    // Students and drivers are provisioned with a synthetic email derived from
    // their number. The admin flow creates these accounts via the Edge Function.
    const email = `${identifier.trim().toLowerCase()}@shuttletracker.local`;
    const {
      data: { session },
      error: signInErr,
    } = await supabase.auth.signInWithPassword({ email, password });

    if (signInErr || !session) {
      throw new Error('Invalid ID or password.');
    }

    const profile = await (role === 'driver'
      ? supabase.from('drivers').select('*').eq('user_id', session.user.id).maybeSingle()
      : supabase.from('students').select('*').eq('user_id', session.user.id).maybeSingle());

    if (!profile.data) {
      await supabase.auth.signOut();
      throw new Error(`No ${role} profile exists for this account.`);
    }

    await hydrateUser(session.user.id);

    if (role === 'driver') {
      try {
        await registerForPushNotifications();
      } catch (e) {
        // Push registration failure should not block login.
      }
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, loading, error, signIn, signOut }),
    [user, loading, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
