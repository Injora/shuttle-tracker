import { json, requireUser, createServiceClient } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true });

  try {
    const { error: authError, user, client } = await requireUser(req);
    if (authError) return authError;

    const body = await req.json();
    const { student_id, stop_id, lat, lng } = body;

    if (!student_id || !stop_id || lat == null || lng == null) {
      return json({ ok: false, error: 'Missing required fields.' }, 400);
    }

    // Verify the caller is the student (or service role for admin testing)
    if (student_id !== user.id) {
      const service = createServiceClient();
      const { data: profile } = await service
        .from('students')
        .select('user_id')
        .eq('user_id', student_id)
        .maybeSingle();
      if (!profile) return json({ ok: false, error: 'Forbidden.' }, 403);
    }

    const { data, error: rpcError } = await client.rpc('submit_pickup_request', {
      p_student_id: student_id,
      p_stop_id: stop_id,
      p_lat: lat,
      p_lng: lng,
    });

    if (rpcError) {
      return json({ ok: false, error: rpcError.message }, 500);
    }

    return json(data);
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});
