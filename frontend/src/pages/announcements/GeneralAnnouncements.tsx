import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../lib/auth';
import { getGeneralAnnouncements, createAnnouncement, type Announcement } from '../../lib/api';
import './AnnouncementDetail.css';

export function GeneralAnnouncements() {
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.departmentId) return;
    setLoading(true);
    getGeneralAnnouncements(profile.departmentId).then((data) => {
      setAnnouncements(data);
      setLoading(false);
    });
  }, [profile?.departmentId]);

  async function handlePost(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim() || !profile) return;
    setPosting(true);
    setError(null);
    try {
      // subjectId omitted entirely — this is what makes it a general/department post (§12)
      const created = await createAnnouncement({ title: title.trim(), body: body.trim(), postedBy: profile.id });
      setAnnouncements((prev) => [created, ...prev]);
      setTitle('');
      setBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post.');
    } finally {
      setPosting(false);
    }
  }

  if (loading) return <p>Loading announcements...</p>;

  return (
    <div>
      {profile?.role === 'professor' && (
        <form onSubmit={handlePost} className="announcement-form">
          <input type="text" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea placeholder="Write a department announcement..." value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
          {error && <p className="form-error">{error}</p>}
          <button type="submit" disabled={posting}>{posting ? 'Posting...' : 'Post'}</button>
        </form>
      )}
      <ul className="announcement-list">
        {announcements.map((a) => (
          <li key={a.id}><h3>{a.title}</h3><p>{a.body}</p></li>
        ))}
      </ul>
    </div>
  );
}