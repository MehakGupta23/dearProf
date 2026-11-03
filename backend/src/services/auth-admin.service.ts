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

export async function getAuthUser(id: string) {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(id);
  if (error) throw error;
  return data.user;
}

// For someone who never accepted the invite: sends a fresh invite email.
export async function resendInvite(email: string) {
  const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.FRONTEND_URL}/set-password`,
  });
  if (error) throw error;
}

// For someone who opened the link but never set a password: sends a password-setup link.
export async function sendPasswordSetupEmail(email: string) {
  const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.FRONTEND_URL}/set-password`,
  });
  if (error) throw error;
}