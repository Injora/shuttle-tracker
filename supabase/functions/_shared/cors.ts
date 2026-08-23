import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function error(message: string, status = 400): Response {
  return json({ error: message }, status);
}

export function createAdminClient(req: Request): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '');
  return createClient(url, anon, {
    global: { headers: authHeader ? { Authorization: `Bearer ${authHeader}` } : {} },
    auth: { persistSession: false },
  });
}

export function createServiceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, serviceRole, { auth: { persistSession: false } });
}

export async function requireUser(req: Request) {
  const client = createAdminClient(req);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    return { error: error('Unauthorized', 401), user: null, client };
  }
  return { error: null, user, client };
}
