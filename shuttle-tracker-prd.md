# Shuttle Tracker — Build Prompt for Claude Code

Paste everything below this line into Claude Code as your starting instruction.

---

## 0. What you're building

A live shuttle-tracking app for a college with an off-campus hostel network. Two
user roles — **Student** and **Driver** — plus a lightweight **Admin** role for
provisioning accounts. Students request a pickup from their hostel; once 10
students at the same stop have requested, the driver gets alerted; once the
driver activates the shuttle, everyone can see it moving live on a map.

Build this as a **React Native (Expo) app**, single codebase, with role-based
navigation (student view vs driver view vs admin view based on the logged-in
account). Backend is **Supabase** (Postgres + PostGIS, Auth, Realtime, Edge
Functions). Maps via `react-native-maps`.

Do not use Firebase, plain socket.io, or a custom Node server — Supabase covers
Auth + DB + geospatial queries + Realtime broadcast + serverless functions in
one place, which is the right amount of infrastructure for ~500 concurrent
users and a small team maintaining this.

---

## 1. Real-world locations (use these exact coordinates — do not invent placeholder ones)

| id | name | role | lat | lng |
|---|---|---|---|---|
| `college` | D Y Patil School Of Management | pickup/dropoff point | 18.6204503 | 73.9114378 |
| `hostel_1` | YourSpace 2 Hostel | pickup/dropoff point | 18.6141596 | 73.9116837 |
| `hostel_2` | Your Space Students Hostel (Lohegaon) | pickup/dropoff point | 18.6119308 | 73.9117003 |
| `hostel_3` | Tribe Loka Hostel & CoLiving | pickup/dropoff point, **isolated route** | 18.6037817 | 73.9153888 |
| `deadzone_1` | Lohegaon road — Jio dropout zone | network dead-zone reference point | 18.617440 | 73.910439 |

Route geography (confirmed from coordinates): the road runs roughly
College → deadzone_1 → hostel_1 → hostel_2 → hostel_3 (Tribe), north to south.
Tribe is the outermost stop, which is why it gets its own isolated trip type
(see Rule 4 below).

Seed the `stops` table with these five rows on first migration. Do not hardcode
them in the frontend — the map and geofence logic should read from this table
so an admin can adjust coordinates/radii later without a code change.

---

## 2. Roles

- **Student**: logs in with a student ID + password (provisioned by admin, not
  self-signup). Belongs to exactly one hostel. Can request a pickup, see request
  status, see the live bus location once dispatched.
- **Driver**: logs in with a driver ID + password (provisioned by admin). Can
  activate/deactivate a shuttle session, see live stop-request counts, gets
  pushed an alert when a stop hits quorum, sees a manifest warning if the Tribe
  isolation rule is at risk.
- **Admin** (basic — doesn't need to be pretty, just functional): create/deactivate
  student and driver accounts, assign a student to a hostel, view/adjust stop
  coordinates and geofence radii, view trip history.

---

## 3. Core flows

### Student flow
1. Student opens app, logs in.
2. App checks GPS location against the student's registered hostel stop (and
   `college`, for the return trip) using the geofence rule below.
3. If inside an allowed geofence, student sees a "Request Pickup" button for
   that stop, showing current request count (e.g. "6 / 10 requested").
4. Student taps request. Backend rejects it if the student already has an open
   request (Rule 2) or if they're outside every allowed geofence (Rule 1).
5. When the count at that stop hits 10, all 10 requests flip to `dispatched`,
   and the driver gets a push notification + in-app alert.
6. Once the driver activates the shuttle for that stop, every student (not just
   the 10 who requested — anyone in the app) can see the bus moving live on the
   map, with an ETA estimate to their stop if reasonably computable, and driver
   name/contact.
7. If the driver's location updates stop arriving (silence + last-known-position
   heuristic, Rule 5), students see a banner instead of a frozen/misleading
   marker.

### Driver flow
1. Driver logs in, sees a dashboard listing all stops with live request counts.
2. Driver taps "Activate Shuttle" — this starts a `shuttle_session` and begins
   streaming the driver's live GPS to all connected clients.
3. Driver picks a trip type when activating: **Hostel Run** (serves college,
   hostel_1, hostel_2 in any combination) or **Tribe Run** (college ↔ hostel_3
   only). This selection is what enforces Rule 4.
4. As stops hit quorum, driver sees alerts in real time (with sound/vibration,
   not just a silent badge).
5. Driver deactivates the shuttle at end of trip, which closes the session and
   stops the broadcast.

---

## 4. Business rules — implement these precisely

**Rule 1 — Location-locked requests.**
A student can only submit a pickup request while their live device GPS is
within the geofence of one of the 5 seeded stops (default radius: 150m,
stored per-stop and admin-editable — do not hardcode). Reject with a clear
error otherwise ("You must be at a registered stop to request a pickup").
Do this check server-side (Edge Function), never trust a client-reported
"I'm at the stop" flag alone.

**Rule 2 — One active request per student.**
A student cannot have more than one request in `pending` or `dispatched`
status at a time. Enforce with a partial unique constraint or an Edge
Function check before insert, not just client-side disabling of the button
(students will find ways around client-only checks). A request should expire
automatically (e.g. after 90 minutes, admin-configurable) if never dispatched,
freeing the student to request again.

**Rule 3 — Quorum-triggered dispatch.**
When the count of `pending` requests at a single stop reaches 10, atomically
(single transaction / Edge Function) flip all 10 to `dispatched`, write a row
to `dispatch_alerts`, and push a notification to any driver with an active
session whose trip type covers that stop. If more than 10 are pending when
the 10th lands (race condition with concurrent requests), the first 10 by
timestamp get dispatched; the rest stay pending toward the next batch.

**Rule 4 — Tribe isolation.**
Hostel_3 (Tribe) must never share a bus with hostel_1 or hostel_2 passengers.
Implement this structurally, not just as a UI warning:
- A `shuttle_session` has a `trip_type` of `hostel_run` (covers `college`,
  `hostel_1`, `hostel_2`) or `tribe_run` (covers `college`, `hostel_3` only).
- The dispatch logic in Rule 3 only pushes an alert to sessions whose
  `trip_type` matches the stop. A `tribe_run` session never receives a
  hostel_1/hostel_2 alert and vice versa.
- If no active session of the right `trip_type` exists when a stop hits
  quorum, the alert queues and fires the moment a matching session activates.
- Driver dashboard should visibly label which trip type is currently active
  so there's no ambiguity about who can be picked up.

**Rule 5 — Dead-zone / signal-loss handling.**
This is a heuristic, not literal carrier detection — no mobile OS API exposes
"this SIM is Jio and Jio is down here," so build it as: driver location
updates stop arriving + last known position was at/approaching the known
dead-zone point.
- Each driver profile stores a `carrier` field (set at account creation,
  e.g. "Jio", "Airtel", "Other"). This is informational only, used purely to
  phrase the message correctly — it's not what triggers the detection.
- Server-side, if no location ping has arrived from an active session for
  more than a threshold (default 20s, admin-configurable) AND the last known
  point was within a configurable radius (default 400m) of `deadzone_1`,
  mark the session `signal: degraded`.
- Determine direction of travel from the last 2–3 GPS points before signal
  loss (bearing toward `college` vs away from it).
- Students then see, instead of a frozen marker: *"Driver's network is
  unavailable (last seen near [nearest known stop], heading toward
  [College / hostels])"* rather than an implication of the bus being stuck
  or the app being broken.
- The moment a new ping arrives, clear the degraded state and resume normal
  live tracking.
- Note in the admin panel that the 400m radius is a starting guess — flag it
  as something to tune after a few real trips through that stretch.

---

## 5. Data model (Postgres / Supabase)

```
stops
  id (pk), name, kind (college|hostel), lat, lng, geofence_radius_m, order_index

students
  user_id (fk -> auth.users), student_number, full_name, hostel_stop_id (fk -> stops)

drivers
  user_id (fk -> auth.users), driver_number, full_name, carrier (text)

shuttle_sessions
  id (pk), driver_id (fk), trip_type (hostel_run|tribe_run), status (active|ended),
  started_at, ended_at

shuttle_locations
  id (pk), session_id (fk), lat, lng, heading, speed, accuracy, recorded_at
  -- write sparingly (e.g. every 10–15s) for history; broadcast every ping live via Realtime channel, don't require a DB write per ping

pickup_requests
  id (pk), student_id (fk), stop_id (fk), status (pending|dispatched|expired|cancelled),
  created_at, dispatched_at, expires_at

dispatch_alerts
  id (pk), stop_id (fk), session_id (fk, nullable until a matching session claims it),
  request_count, triggered_at, claimed_at

deadzones
  id (pk), name, lat, lng, radius_m, notes
```

Row Level Security: students can only read/write their own `pickup_requests`
and read `shuttle_locations` for active sessions; drivers can only write to
their own `shuttle_sessions`/`shuttle_locations`; admin role bypasses via a
service key used only in the admin panel.

---

## 6. Non-functional requirements

- Support ~500 concurrent connected clients on the live-map Realtime channel.
  Supabase Realtime handles this natively — don't build a custom WebSocket
  layer on top.
- Use `enableHighAccuracy` GPS mode (Expo Location's `Accuracy.BestForNavigation`
  or `.High`) for the driver's tracking stream; smooth jitter with a simple
  moving-average or basic Kalman filter before rendering the marker, so the
  bus icon doesn't jump around on the map from raw GPS noise.
- Driver location tracking must keep working with the app backgrounded
  (`expo-location` background permissions + `expo-task-manager`) — this is
  the main reason this is a native app and not a PWA.
- All request/session state changes go through server-side validation
  (Edge Functions), never rely on client-side checks alone for the quorum,
  duplicate-request, or geofence rules.
- Accounts are provisioned by admin, not self-registration — build the admin
  flow to bulk-create student/driver logins (CSV import is a nice-to-have,
  not required for v1).

---

## 7. Suggested build order

1. Supabase project setup: schema/migrations for all tables above, seed the
   5 stops with the real coordinates, enable PostGIS, set up RLS policies.
2. Auth: student login, driver login, role-based routing in the Expo app.
3. Student flow: geofence check → request button → live request-count display
   → request-status polling/subscription.
4. Edge Functions: geofence validation, duplicate-request guard, quorum
   trigger + dispatch_alerts logic, Tribe trip_type gating.
5. Driver flow: activate/deactivate session, trip_type selector, live location
   streaming, incoming dispatch alerts (push + in-app), manifest view.
6. Live map: Realtime channel subscription, smoothed marker movement, stop
   markers with live counts, all 5 stops plotted at their real coordinates.
7. Dead-zone handling: signal-timeout detection, last-known-heading calc,
   the "signal unavailable, last seen heading toward X" banner.
8. Admin panel: account provisioning, stop/geofence radius editing, dead-zone
   radius tuning, basic trip history view.
9. Push notifications: Expo push setup for the driver dispatch alert.
10. Load-test the Realtime channel with a simulated 500 concurrent clients
    before calling it done.

---

## 8. Assumptions made — confirm or correct these before/while building

- Single active bus is the common case, but the schema supports multiple
  concurrent `shuttle_sessions` (e.g. two drivers, one on a Hostel Run and
  one on a Tribe Run, at the same time) — confirm if that's realistic for
  this college or if it should be locked to one active session at a time.
- Hostel_1 and hostel_2 are allowed to share a bus/run since no isolation
  rule was given between them — only Tribe is isolated. Confirm this is
  correct with actual college policy.
- Geofence radius defaults to 150m for stops, 400m for the dead zone — these
  are reasonable starting guesses, not measured values. Plan to walk/drive
  the actual radii and adjust in the admin panel.
- "Driver's network is unavailable" is inferred from signal timeout near the
  known dead-zone point, not actual carrier-level detection — no mobile OS
  exposes that. The UI copy should be phrased honestly (heading/last-seen),
  not as a claim about Jio specifically being down.
