export const REAL_STOPS = [
  {
    id: 'college',
    name: 'D Y Patil School Of Management',
    kind: 'college' as const,
    lat: 18.6204503,
    lng: 73.9114378,
    geofence_radius_m: 150,
    order_index: 0,
  },
  {
    id: 'hostel_1',
    name: 'YourSpace 2 Hostel',
    kind: 'hostel' as const,
    lat: 18.6141596,
    lng: 73.9116837,
    geofence_radius_m: 150,
    order_index: 1,
  },
  {
    id: 'hostel_2',
    name: 'Your Space Students Hostel (Lohegaon)',
    kind: 'hostel' as const,
    lat: 18.6119308,
    lng: 73.9117003,
    geofence_radius_m: 150,
    order_index: 2,
  },
  {
    id: 'hostel_3',
    name: 'Tribe Loka Hostel & CoLiving',
    kind: 'hostel' as const,
    lat: 18.6037817,
    lng: 73.9153888,
    geofence_radius_m: 150,
    order_index: 3,
  },
  {
    id: 'deadzone_1',
    name: 'Lohegaon road — Jio dropout zone',
    kind: 'hostel' as const,
    lat: 18.61744,
    lng: 73.910439,
    geofence_radius_m: 400,
    order_index: 4,
  },
] as const;

export const DEFAULT_GEOFENCE_RADIUS_M = 150;
export const DEFAULT_DEADZONE_RADIUS_M = 400;
export const DEFAULT_SIGNAL_TIMEOUT_S = 20;
export const DEFAULT_REQUEST_EXPIRY_MIN = 90;
export const QUORUM_SIZE = 10;

export const COLLEGE_STOP_ID = 'college';
export const TRIBE_STOP_ID = 'hostel_3';
export const DEADZONE_STOP_ID = 'deadzone_1';

export const TRIP_TYPE_STOPS: Record<
  'hostel_run' | 'tribe_run',
  { college: string; hostels: string[] }
> = {
  hostel_run: {
    college: COLLEGE_STOP_ID,
    hostels: ['hostel_1', 'hostel_2'],
  },
  tribe_run: {
    college: COLLEGE_STOP_ID,
    hostels: [TRIBE_STOP_ID],
  },
};

export const TRIP_TYPE_LABEL: Record<'hostel_run' | 'tribe_run', string> = {
  hostel_run: 'Hostel Run',
  tribe_run: 'Tribe Run',
};

export const PICKUP_STATUS_LABEL: Record<
  'pending' | 'dispatched' | 'expired' | 'cancelled',
  string
> = {
  pending: 'Pending',
  dispatched: 'Dispatched',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

export const SIGNAL_STATUS_LABEL: Record<'ok' | 'degraded', string> = {
  ok: 'Live',
  degraded: 'Signal degraded',
};
