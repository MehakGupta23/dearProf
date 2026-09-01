import { useEffect, useState, type FormEvent } from 'react';
import { getUsers, getSubjects, getTerms, getTeachingAssignments, createTeachingAssignment, type User, type Subject, type Term, type Assignment } from '../../lib/api';
import './Admin.css';

export function TeachingAssignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [professors, setProfessors] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [professorId, setProfessorId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [termId, setTermId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getTeachingAssignments(), getUsers(), getSubjects(), getTerms()]).then(
      ([a, u, s, t]) => {
        setAssignments(a);
        setProfessors(u.filter((user) => user.role === 'professor'));
        setSubjects(s);
        setTerms(t);
        setLoading(false);
      }
    );
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!professorId || !subjectId || !termId) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createTeachingAssignment({ professorId, subjectId, termId });
      setAssignments((prev) => [...prev, created]);
      setProfessorId(''); setSubjectId(''); setTermId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create assignment.');
    } finally {
      setSaving(false);
    }
  }

  const profById = new Map(professors.map((p) => [p.id, p.fullName]));
  const subjById = new Map(subjects.map((s) => [s.id, s.name]));
  const termById = new Map(terms.map((t) => [t.id, t.name]));

  if (loading) return <p>Loading assignments...</p>;

  return (
    <div className="admin-page">
      <h1>Teaching Assignments</h1>
      <form onSubmit={handleCreate} className="admin-form">
        <select value={professorId} onChange={(e) => setProfessorId(e.target.value)}>
          <option value="">Select professor</option>
          {professors.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}
        </select>
        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          <option value="">Select subject</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={termId} onChange={(e) => setTermId(e.target.value)}>
          <option value="">Select term</option>
          {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" disabled={saving}>{saving ? 'Assigning...' : 'Assign'}</button>
      </form>
      <table className="admin-table">
        <thead><tr><th>Professor</th><th>Subject</th><th>Term</th></tr></thead>
        <tbody>
          {assignments.map((a) => (
            <tr key={a.id}>
              <td>{profById.get(a.professorId) ?? '—'}</td>
              <td>{subjById.get(a.subjectId) ?? '—'}</td>
              <td>{termById.get(a.termId) ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}