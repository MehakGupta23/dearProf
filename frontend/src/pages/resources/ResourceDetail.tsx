import './ResourceDetail.css';
import { useParams } from 'react-router-dom';
import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import {
  getResourceDownloadUrl,
  getResourcesBySubject,
  getResourceUploadUrl,
  saveResourceMetadata,
  type Resource,
} from '../../lib/api';

export function ResourceDetail() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const { profile } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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

  // Open in a new tab. The tab is opened synchronously (inside the click) so popup blockers allow it.
  async function handleView(resourceId: string) {
    setActionError(null);
    setBusyId(resourceId);
    const tab = window.open('', '_blank');
    try {
      const url = await getResourceDownloadUrl(resourceId);
      if (tab) tab.location.href = url;
      else window.location.assign(url);
    } catch {
      tab?.close();
      setActionError('Could not open the file. Try again.');
    } finally {
      setBusyId(null);
    }
  }

  // Save to disk: the signed URL is requested with ?download=1, so the browser downloads it.
  async function handleDownload(resourceId: string) {
    setActionError(null);
    setBusyId(resourceId);
    try {
      const url = await getResourceDownloadUrl(resourceId, { download: true });
      window.location.assign(url);
    } catch {
      setActionError('Could not download the file. Try again.');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <p>Loading files...</p>;

  return (
    <div>
      <ul className="resource-list">
        {resources.map((r) => (
          <li key={r.id} className="resource-item">
            <span className="resource-title">{r.title}</span>
            <span className="resource-actions">
              <button
                type="button"
                className="resource-btn"
                onClick={() => handleView(r.id)}
                disabled={busyId === r.id}
              >
                View
              </button>
              <button
                type="button"
                className="resource-btn resource-btn-primary"
                onClick={() => handleDownload(r.id)}
                disabled={busyId === r.id}
              >
                Download
              </button>
            </span>
          </li>
        ))}
      </ul>

      {resources.length === 0 && <p className="resource-empty">No files uploaded yet.</p>}
      {actionError && <p className="form-error">{actionError}</p>}

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
