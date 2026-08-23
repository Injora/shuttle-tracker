export type Role = 'student' | 'driver' | 'admin';

export type StopKind = 'college' | 'hostel';

export type TripType = 'hostel_run' | 'tribe_run';

export type SessionStatus = 'active' | 'ended';

export type SignalStatus = 'ok' | 'degraded';

export type PickupStatus = 'pending' | 'dispatched' | 'expired' | 'cancelled';

export interface Stop {
  id: string;
  name: string;
  kind: StopKind;
  lat: number;
  lng: number;
  geofence_radius_m: number;
  order_index: number;
}

export interface StudentProfile {
  user_id: string;
  student_number: string;
  full_name: string;
  hostel_stop_id: string;
}

export interface DriverProfile {
  user_id: string;
  driver_number: string;
  full_name: string;
  carrier: string;
}

export interface ShuttleSession {
  id: string;
  driver_id: string;
  trip_type: TripType;
  status: SessionStatus;
  signal: SignalStatus;
  started_at: string;
  ended_at: string | null;
}

export interface ShuttleLocation {
  id: string;
  session_id: string;
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  recorded_at: string;
}

export interface PickupRequest {
  id: string;
  student_id: string;
  stop_id: string;
  status: PickupStatus;
  created_at: string;
  dispatched_at: string | null;
  expires_at: string;
}

export interface DispatchAlert {
  id: string;
  stop_id: string;
  session_id: string | null;
  request_count: number;
  triggered_at: string;
  claimed_at: string | null;
}

export interface Deadzone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius_m: number;
  notes: string;
}

export interface AppUser {
  id: string;
  email: string;
  role: Role;
  student?: StudentProfile;
  driver?: DriverProfile;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface LiveSession extends ShuttleSession {
  driver?: DriverProfile;
  location?: ShuttleLocation | null;
}

export interface TripHistoryRow {
  id: string;
  driver_id: string;
  driver_name: string;
  trip_type: TripType;
  status: SessionStatus;
  started_at: string;
  ended_at: string | null;
}
