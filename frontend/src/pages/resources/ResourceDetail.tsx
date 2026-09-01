import './ResourceDetail.css';
import { useParams } from 'react-router-dom';
import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import {getResourceDownloadUrl, getResourcesBySubject, getResourceUploadUrl, saveResourceMetadata, type Resource,} from '../../lib/api';

export function ResourceDetail() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const { profile } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!subjectId) return;
    setLoading(true);
    getResourcesBySubject(subjectId).then((data) => {
      setResources(data);
      setLoading(false);
    });
  }, [subjectId]);

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!file || !title.trim()) {
      setError('Select a file and enter a title first.');
      return;
    }
    if (!subjectId || !profile) return;

    setUploading(true);
    setError(null);
    try {
      const { path, token } = await getResourceUploadUrl(subjectId, file.name);
      const { error: uploadError } = await supabase.storage
        .from('resources')
        .uploadToSignedUrl(path, token, file);
      if (uploadError) throw uploadError;

      
      const created = await saveResourceMetadata({
        subjectId, uploadedBy: profile.id, title: title.trim(), fileUrl: path,
      });

      setResources((prev) => [created, ...prev]);
      setFile(null);
      setTitle('');
    } catch {
      setError('Upload failed. Try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(resourceId: string) {
  const url = await getResourceDownloadUrl(resourceId);
  window.open(url, '_blank');
}

  if (loading) return <p>Loading files...</p>;

  return (
    <div>
      <ul className="resource-list">
        {resources.map((r) => (
          <li key={r.id}><button onClick={() => handleDownload(r.id)}>{r.title}</button></li>
        ))}
      </ul>

      {profile?.role === 'professor' && (
        <form onSubmit={handleUpload} className="upload-form">
          <input
            type="text"
            placeholder="File title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          {error && <p className="form-error">{error}</p>}
          <button type="submit" disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </form>
      )}
    </div>
  );
}