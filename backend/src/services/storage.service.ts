import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function createSignedUploadUrl(subjectId: string, fileName: string) {
  const path = `${subjectId}/${Date.now()}-${fileName}`;
  const { data, error } = await supabase.storage.from('resources').createSignedUploadUrl(path);
  if (error) throw error;
  return { path, uploadUrl: data.signedUrl, token: data.token };
}

export async function createSignedDownloadUrl(path: string, opts?: { download?: boolean }) {
  // stored name looks like "<timestamp>-<original name>"; strip the timestamp for the saved file name
  const friendlyName = (path.split('/').pop() ?? 'file').replace(/^\d+-/, '');

  const { data, error } = await supabase.storage
    .from('resources')
    .createSignedUrl(path, 60 * 5, opts?.download ? { download: friendlyName } : undefined);
  if (error) throw error;
  return data.signedUrl;
}
