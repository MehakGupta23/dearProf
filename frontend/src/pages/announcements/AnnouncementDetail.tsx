import { useParams } from 'react-router-dom';
import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../lib/auth';
import { getAnnouncementsBySubject, createAnnouncement, type Announcement } from '../../lib/api';
import './AnnouncementDetail.css';

export function AnnouncementDetail() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!subjectId) return;
    setLoading(true);
    getAnnouncementsBySubject(subjectId).then((data) => {
      setAnnouncements(data);
      setLoading(false);
    });
  }, [subjectId]);

  async function handlePost(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim() || !subjectId || !profile) return;
    setPosting(true);
    setError(null);
    try {
      const created = await createAnnouncement({
        subjectId, title: title.trim(), body: body.trim(), postedBy: profile.id,
      });
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
          <textarea placeholder="Write an announcement..." value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
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