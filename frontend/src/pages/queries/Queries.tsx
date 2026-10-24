import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTickets, type Ticket } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import './Queries.css';

export function Queries() {
  const { profile } = useAuth();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadTickets() {
      try {
        setLoading(true);
        const data = await getTickets();

        // Current backend returns all tickets.
        // Filter them on the frontend to show only
        // tickets relevant to the logged-in user.
        const relevantTickets =
          profile?.role === 'student'
            ? data.filter((ticket) => ticket.studentId === profile.id)
            : profile?.role === 'professor'
              ? data.filter((ticket) => ticket.professorId === profile.id)
              : data;

        setTickets(relevantTickets);
      } catch (err) {
        setError('Unable to load your queries.');
      } finally {
        setLoading(false);
      }
    }

    if (profile) {
      loadTickets();
    }
  }, [profile]);

  if (loading) {
    return <div className="queries-page">Loading queries...</div>;
  }

  if (error) {
    return <div className="queries-page">{error}</div>;
  }

  return (
    <div className="queries-page">
      <div className="queries-header">
        <div>
          <p className="queries-eyebrow">QUERIES</p>
          <h1>My Queries</h1>
          <p>
            Keep track of your conversations with professors.
          </p>
        </div>
      </div>

      {tickets.length === 0 ? (
        <div className="empty-queries">
          <div className="empty-icon">?</div>
          <h2>No queries yet</h2>
          <p>
            You don't have any queries at the moment.
          </p>
        </div>
      ) : (
        <div className="queries-list">
          {tickets.map((ticket) => (
            <Link
              key={ticket.id}
              to={`/queries/${ticket.id}`}
              className="query-card"
            >
              <div className="query-card-main">
                <h2>{ticket.title}</h2>

                <p className="query-date">
                  {new Date(ticket.createdAt).toLocaleDateString()}
                </p>
              </div>

              <span className={`query-status ${ticket.status}`}>
                {ticket.status}
              </span>

              <span className="query-arrow">→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}