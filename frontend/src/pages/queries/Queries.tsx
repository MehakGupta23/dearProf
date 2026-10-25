
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getTickets,
  getSubjectsForUser,
  getTeachingAssignments,
  createTicket,
  type Ticket,
  type Subject,
  type Assignment,
} from '../../lib/api';
import { useAuth } from '../../lib/auth';
import './Queries.css';

export function Queries() {
  const { profile } = useAuth();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [subjectId, setSubjectId] = useState('');
  const [professorId, setProfessorId] = useState('');
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  async function loadTickets() {
    const data = await getTickets();

    const relevantTickets =
      profile?.role === 'student'
        ? data.filter((ticket) => ticket.studentId === profile.id)
        : profile?.role === 'professor'
          ? data.filter((ticket) => ticket.professorId === profile.id)
          : data;

    setTickets(relevantTickets);
  }

  useEffect(() => {
    async function loadPage() {
      try {
        setLoading(true);
        setError('');

        await loadTickets();

        if (profile?.role === 'student') {
          const [subjectData, assignmentData] = await Promise.all([
            getSubjectsForUser(profile),
            getTeachingAssignments(),
          ]);

          setSubjects(subjectData);

          const enrolledSubjectIds = new Set(
            subjectData.map((subject) => subject.id)
          );

          setAssignments(
            assignmentData.filter((assignment) =>
              enrolledSubjectIds.has(assignment.subjectId)
            )
          );
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load your queries.'
        );
      } finally {
        setLoading(false);
      }
    }

    if (profile) {
      loadPage();
    }
  }, [profile]);

  const availableProfessorIds = useMemo(() => {
    return new Set(
      assignments
        .filter((assignment) => assignment.subjectId === subjectId)
        .map((assignment) => assignment.professorId)
    );
  }, [assignments, subjectId]);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');

    if (!subjectId || !professorId || !title.trim()) {
      setFormError('Please complete all fields.');
      return;
    }

    try {
      setSubmitting(true);

      await createTicket({
        subjectId,
        professorId,
        title: title.trim(),
      });

      await loadTickets();

      setTitle('');
      setSubjectId('');
      setProfessorId('');
      setShowForm(false);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'Unable to create your query.'
      );
    } finally {
      setSubmitting(false);
    }
  }

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
          <p>Keep track of your conversations with professors.</p>
        </div>

        {profile?.role === 'student' && (
          <button
            type="button"
            onClick={() => {
              setShowForm((current) => !current);
              setFormError('');
            }}
          >
            {showForm ? 'Cancel' : '+ New Query'}
          </button>
        )}
      </div>

      {showForm && profile?.role === 'student' && (
        <form className="query-form" onSubmit={handleCreate}>
          <h2>Start a conversation</h2>

          <label htmlFor="query-subject">Subject</label>
          <select
            id="query-subject"
            value={subjectId}
            onChange={(event) => {
              setSubjectId(event.target.value);
              setProfessorId('');
            }}
            required
          >
            <option value="">Choose a subject</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.code ? `${subject.code} — ` : ''}
                {subject.name}
              </option>
            ))}
          </select>

          <label htmlFor="query-professor">Professor</label>
          <select
            id="query-professor"
            value={professorId}
            onChange={(event) => setProfessorId(event.target.value)}
            disabled={!subjectId}
            required
          >
            <option value="">
              {subjectId
                ? 'Choose a professor'
                : 'Choose a subject first'}
            </option>

            {Array.from(availableProfessorIds).map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>

          {subjectId && availableProfessorIds.size === 0 && (
            <p>No professor is assigned to this subject.</p>
          )}

          <label htmlFor="query-title">What do you need help with?</label>
          <textarea
            id="query-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Briefly describe your query..."
            rows={4}
            maxLength={2000}
            required
          />

          {formError && <p role="alert">{formError}</p>}

          <button type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Query'}
          </button>
        </form>
      )}

      {tickets.length === 0 ? (
        <div className="empty-queries">
          <div className="empty-icon">?</div>
          <h2>No queries yet</h2>
          <p>
            {profile?.role === 'student'
              ? 'Start a new query to begin a conversation with a professor.'
              : "You don't have any queries at the moment."}
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
