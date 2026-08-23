import { json, createServiceClient } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true });

  try {
    const service = createServiceClient();

    const { data, error: rpcError } = await service.rpc('mark_degraded_sessions', {
      p_timeout_seconds: 20,
      p_deadzone_radius_m: 400,
    });

    if (rpcError) return json({ ok: false, error: rpcError.message }, 500);

    return json({ ok: true, marked: data });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});
