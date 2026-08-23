# Shuttle Tracker

A live shuttle-tracking app for a college with an off-campus hostel network.
Built with **React Native (Expo)** and **Supabase** (Postgres + PostGIS, Auth,
Realtime, Edge Functions).

Three roles:

- **Student** — request a pickup from their hostel, see live shuttle location.
- **Driver** — activate a shuttle session, stream live GPS, get dispatch alerts.
- **Admin** — provision accounts, edit stop coordinates/geofence radii, view history.

---

## Architecture

```
Expo app (single codebase)
  ├── src/screens/{auth,student,driver,admin}  Role-based views
  ├── src/components/                          Shared UI + live map
  ├── src/context/AuthContext.tsx              Auth + role hydration
  ├── src/services/                            Location, notifications
  └── src/lib/                                 Supabase client + API helpers

Supabase
  ├── supabase/migrations/                     Schema, PostGIS, RLS, RPC functions
  └── supabase/functions/                      Edge Functions (Deno)
```

The business rules are enforced **server-side**, never client-side alone:

| Rule | Enforcement |
|------|-------------|
| Location-locked requests | `submit_pickup_request` RPC does a PostGIS `st_distance` geofence check |
| One active request per student | Partial unique index + RPC pre-insert check |
| Quorum-triggered dispatch | Atomic RPC flips first 10 pending by timestamp, enqueues alert |
| Tribe isolation | `trip_type` gating in `activate_shuttle_session`; alerts only claim matching stops |
| Dead-zone signal loss | `mark_degraded_sessions` RPC (cron) + configurable radius |

---

## Prerequisites

- Node 18+ and npm/yarn
- A [Supabase](https://supabase.com) project
- Google Maps API key (for `react-native-maps`)
- Expo Go (or a dev build) for testing

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`

### 3. Configure Google Maps keys in `app.json`

Set `YOUR_IOS_GOOGLE_MAPS_API_KEY` and `YOUR_ANDROID_GOOGLE_MAPS_API_KEY`
inside `app.json` (or use EAS secrets).

### 4. Set up the Supabase database

Option A — Supabase CLI (recommended):

```bash
npm i -g supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

Option B — SQL editor: run the files in `supabase/migrations/` in order.

### 5. Deploy Edge Functions

```bash
supabase functions deploy submit-request
supabase functions deploy manage-session
supabase functions deploy record-location
supabase functions deploy deadzone-check
supabase functions deploy provision-account
```

Or deploy all:

```bash
for fn in submit-request manage-session record-location deadzone-check provision-account; do
  supabase functions deploy "$fn" --no-verify-jwt=false
done
```

### 6. Create an admin account

In the Supabase dashboard → Authentication → Users → Add user, set:

- Email: `admin@shuttletracker.local` (or any email)
- Password: something strong
- `user_metadata`: `{"role": "admin"}`

The admin login screen uses the admin email + password.

### 7. Run the app

```bash
npm start
```

---

## Provisioning accounts

Students and drivers are provisioned by an admin (no self-signup). The admin
"Accounts" tab calls the `provision-account` Edge Function, which:

1. Creates an auth user with email `<id>@shuttletracker.local`
2. Inserts a row in `students` or `drivers`
3. Links the student to a hostel stop

Students/drivers then log in with their ID + password.

---

## How the flows work

### Student

1. Log in with student ID + password.
2. The app checks GPS against the student's registered hostel geofence.
3. Inside the geofence → "Request Pickup" shows the live count (`6 / 10`).
4. Backend rejects if already pending or outside every geofence.
5. At quorum (10), the batch flips to `dispatched`, driver gets alerted.
6. Once the driver activates, anyone in the app sees the live bus on the map.

### Driver

1. Log in, see live stop-request counts.
2. Tap "Activate Shuttle" and pick **Hostel Run** or **Tribe Run**.
3. Live GPS streams to all clients (background-capable).
4. Alerts arrive in real time with sound/vibration.
5. Tap "End Shuttle Session" to stop broadcasting.

### Admin

- Create/deactivate student & driver accounts.
- Edit stop coordinates and geofence radii (no code change).
- View trip history.
- Tune dead-zone detection radius.

---

## Data model

See `supabase/migrations/20260823000100_init.sql` for the full schema. Key tables:

- `stops` — the 5 seeded stops (read from DB, admin-editable)
- `students`, `drivers` — profiles tied to `auth.users`
- `shuttle_sessions` — `trip_type`, `status`, `signal`
- `shuttle_locations` — durable history (~every 10–15s)
- `pickup_requests` — `pending`/`dispatched`/`expired`/`cancelled`
- `dispatch_alerts` — queued until a matching session claims them
- `deadzones` — configurable radius/notes

---

## Dead-zone handling

The app never claims to detect a specific carrier. It uses a heuristic:

- No location ping from an active session for a threshold (default 20s), **and**
- Last known position within a configurable radius (default 400m) of the dead zone.

The session is marked `signal: degraded`. Students see an honest banner:

> Driver's network is unavailable (last seen near [nearest stop], heading toward [College/hostels])

A fresh ping clears the degraded state automatically. The 400m radius is a
starting guess — tune it in Admin → Settings after real trips.

---

## Live Realtime

Supabase Realtime broadcasts location pings (client → channel) without requiring
a DB write per ping. DB writes happen sparingly (~every 12s in the app) for
history. This keeps the ~500 concurrent client target achievable.

---

## Load-testing the Realtime channel

A 500-client simulation is a recommended pre-launch step. A minimal approach:

```bash
# Using a small Node script against the Supabase Realtime endpoint
node scripts/load-test-realtime.js
```

See the PRD (Section 7, step 10) — a production load test should use the real
anon key and a temporary project, and ramp up gradually.

---

## Assumptions (from the PRD)

- Multiple concurrent `shuttle_sessions` are supported (e.g. one Hostel Run + one Tribe Run at the same time).
- Hostel_1 and hostel_2 may share a bus; only Tribe is isolated.
- Geofence radii (150m stops, 400m dead zone) are starting guesses to tune in the admin panel.

---

## Commands

```bash
npm start        # start Expo dev server
npm run typecheck # TypeScript check
npm run lint     # lint (if configured)
```
