import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function inviteUser(email: string) {
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.FRONTEND_URL}/set-password`,
  });
  if (error) throw error;
  return data.user;
}

export async function deleteAuthUser(authUserId: string) {
  await supabaseAdmin.auth.admin.deleteUser(authUserId);
}