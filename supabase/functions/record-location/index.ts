import { json, requireUser } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true });

  try {
    const { error: authError, user, client } = await requireUser(req);
    if (authError) return authError;

    const body = await req.json();
    const { session_id, lat, lng, heading, speed, accuracy } = body;

    if (!session_id || lat == null || lng == null) {
      return json({ ok: false, error: 'Missing required fields.' }, 400);
    }

    // Verify the caller owns an active session.
    const { data: session, error: sessionError } = await client
      .from('shuttle_sessions')
      .select('id, driver_id, status')
      .eq('id', session_id)
      .eq('driver_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (sessionError || !session) {
      return json({ ok: false, error: 'No active session found for this driver.' }, 403);
    }

    // Write sparingly (~every 10-15s) for history. Live broadcast happens via
    // the Realtime channel directly from the client; this is the durable record.
    const { data, error: insertError } = await client
      .from('shuttle_locations')
      .insert({
        session_id,
        lat,
        lng,
        heading,
        speed,
        accuracy,
      })
      .select()
      .single();

    if (insertError) return json({ ok: false, error: insertError.message }, 500);

    // A fresh ping clears any degraded state.
    await client
      .from('shuttle_sessions')
      .update({ signal: 'ok' })
      .eq('id', session_id)
      .eq('signal', 'degraded');

    return json({ ok: true, location_id: data.id });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});
