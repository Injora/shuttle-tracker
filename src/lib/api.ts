import { supabase } from '@/lib/supabase';
import { Stop, ShuttleSession, ShuttleLocation, PickupRequest, TripType } from '@/types';

export async function fetchStops(): Promise<Stop[]> {
  const { data, error } = await supabase
    .from('stops')
    .select('*')
    .neq('id', 'deadzone_1')
    .order('order_index', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Stop[];
}

export async function fetchAllStops(): Promise<Stop[]> {
  const { data, error } = await supabase
    .from('stops')
    .select('*')
    .order('order_index', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Stop[];
}

export async function fetchStop(id: string): Promise<Stop | null> {
  const { data, error } = await supabase.from('stops').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as unknown as Stop) ?? null;
}

export async function fetchActiveSessions(): Promise<ShuttleSession[]> {
  const { data, error } = await supabase
    .from('shuttle_sessions')
    .select('*')
    .eq('status', 'active');
  if (error) throw error;
  return (data ?? []) as ShuttleSession[];
}

export async function fetchMyActiveSession(driverId: string): Promise<ShuttleSession | null> {
  const { data, error } = await supabase
    .from('shuttle_sessions')
    .select('*')
    .eq('driver_id', driverId)
    .eq('status', 'active')
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as ShuttleSession) ?? null;
}

export async function fetchSessionLocation(sessionId: string): Promise<ShuttleLocation | null> {
  const { data, error } = await supabase
    .from('shuttle_locations')
    .select('*')
    .eq('session_id', sessionId)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as ShuttleLocation) ?? null;
}

export async function fetchMyActiveRequest(studentId: string): Promise<PickupRequest | null> {
  const { data, error } = await supabase
    .from('pickup_requests')
    .select('*')
    .eq('student_id', studentId)
    .in('status', ['pending', 'dispatched'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as PickupRequest) ?? null;
}

export async function fetchPendingCount(stopId: string): Promise<number> {
  const { count, error } = await supabase
    .from('pickup_requests')
    .select('*', { count: 'exact', head: true })
    .eq('stop_id', stopId)
    .eq('status', 'pending');
  if (error) throw error;
  return count ?? 0;
}

export async function callEdgeFunction<T>(name: string, body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body: body as Record<string, unknown> });
  if (error) throw new Error(error.message);
  return data as T;
}

export function subscribeToChannel<T>(
  table: string,
  callback: (payload: T) => void,
) {
  return supabase
    .channel(`${table}-channel`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) =>
      callback(payload.new as T),
    )
    .subscribe();
}

export const TRIP_STOPS: Record<TripType, string[]> = {
  hostel_run: ['college', 'hostel_1', 'hostel_2'],
  tribe_run: ['college', 'hostel_3'],
};
