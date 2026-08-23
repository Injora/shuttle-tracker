import { json, requireUser } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true });

  try {
    const { error: authError, user, client } = await requireUser(req);
    if (authError) return authError;

    const body = await req.json();
    const { action, trip_type, session_id } = body;

    if (action === 'activate') {
      if (!trip_type) return json({ ok: false, error: 'trip_type is required.' }, 400);
      const { data, error: rpcError } = await client.rpc('activate_shuttle_session', {
        p_driver_id: user.id,
        p_trip_type: trip_type,
      });
      if (rpcError) return json({ ok: false, error: rpcError.message }, 500);
      return json(data);
    }

    if (action === 'end') {
      if (!session_id) return json({ ok: false, error: 'session_id is required.' }, 400);
      const { data, error: rpcError } = await client.rpc('end_shuttle_session', {
        p_session_id: session_id,
        p_driver_id: user.id,
      });
      if (rpcError) return json({ ok: false, error: rpcError.message }, 500);
      return json(data);
    }

    return json({ ok: false, error: 'Invalid action.' }, 400);
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});
