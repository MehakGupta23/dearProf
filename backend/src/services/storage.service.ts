import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function createSignedUploadUrl(subjectId: string, fileName: string) {
  const path = `${subjectId}/${Date.now()}-${fileName}`;
  const { data, error } = await supabase.storage.from('resources').createSignedUploadUrl(path);
  if (error) throw error;
  return { path, uploadUrl: data.signedUrl, token: data.token };
}