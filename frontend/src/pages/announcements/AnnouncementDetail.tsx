import { useParams } from 'react-router-dom';
import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../lib/auth';
import { getAnnouncementsBySubject, createAnnouncement, type Announcement } from '../../lib/api';
import './AnnouncementDetail.css';
import { AnnouncementCard } from './AnnouncementCard';

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
    <div className="announcement-page">
      {profile?.role === 'professor' && (
        <form onSubmit={handlePost} className="announcement-form">
          <h3>Post an announcement</h3>
          <input type="text" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea placeholder="Write an announcement..." value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
          {error && <p className="form-error">{error}</p>}
          <button type="submit" disabled={posting}>{posting ? 'Posting...' : 'Post'}</button>
        </form>
      )}

      {announcements.length === 0 ? (
        <p className="empty-note">No announcements yet.</p>
      ) : (
        <ul className="announcement-list">
          {announcements.map((a) => <AnnouncementCard key={a.id} a={a} />)}
        </ul>
      )}
    </div>
  );
}