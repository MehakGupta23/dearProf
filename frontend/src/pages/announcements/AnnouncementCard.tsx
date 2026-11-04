import './AnnouncementDetail.css';
import type { Announcement } from '../../lib/api';
import { formatDate } from '../../lib/format';

export function AnnouncementCard({ a }: { a: Announcement }) {
  const date = formatDate((a as Announcement & { createdAt?: string }).createdAt);
  return (
    <li className="announcement-card">
      <h3>{a.title}</h3>
      {date && <span className="announcement-date">{date}</span>}
      <p>{a.body}</p>
    </li>
  );
}