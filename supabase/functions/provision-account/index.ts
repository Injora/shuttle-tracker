import { json, createServiceClient, requireUser, error } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true });

  try {
    // Admin-only: the authenticated user must have role = admin in metadata.
    const { error: authError, user } = await requireUser(req);
    if (authError) return authError;

    const service = createServiceClient();
    const { data: authUser } = await service.auth.admin.getUserById(user!.id);
    const meta = authUser?.user?.user_metadata as Record<string, unknown> | undefined;

    if (meta?.role !== 'admin') {
      return error('Admin access required.', 403);
    }

    const body = await req.json();
    const { role, identifier, full_name, password, hostel_stop_id, carrier } = body;

    if (!role || !identifier || !full_name || !password) {
      return error('role, identifier, full_name, and password are required.', 400);
    }

    if (role !== 'student' && role !== 'driver') {
      return error('role must be student or driver.', 400);
    }

    if (role === 'student' && !hostel_stop_id) {
      return error('hostel_stop_id is required for students.', 400);
    }

    const email = `${String(identifier).trim().toLowerCase()}@shuttletracker.local`;

    // Create auth account (or update if already exists).
    const { data: existing, error: lookupError } = await service.auth.admin.listUsers();
    if (lookupError) return error(lookupError.message, 500);

    const existingUser = existing.users.find((u) => u.email === email);
    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      await service.auth.admin.updateUserById(userId, {
        password,
        user_metadata: { role },
      });
    } else {
      const { data: created, error: createError } = await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role },
      });
      if (createError) return error(createError.message, 500);
      userId = created.user.id;
    }

    if (role === 'student') {
      await service.from('students').upsert({
        user_id: userId,
        student_number: String(identifier),
        full_name,
        hostel_stop_id,
      });
    } else {
      await service.from('drivers').upsert({
        user_id: userId,
        driver_number: String(identifier),
        full_name,
        carrier: carrier || 'Other',
      });
    }

    return json({ ok: true, user_id: userId, email });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});
