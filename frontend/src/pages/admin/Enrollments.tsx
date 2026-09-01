import { useEffect, useState, type FormEvent } from 'react';
import { getUsers, getSubjects, getTerms, getEnrollmentsForStudent, createEnrollment, type User, type Subject, type Term, type Enrollment } from '../../lib/api';
import './Admin.css';

export function Enrollments() {
  const [students, setStudents] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);

  const [subjectId, setSubjectId] = useState('');
  const [termId, setTermId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getUsers(), getSubjects(), getTerms()]).then(([u, s, t]) => {
      setStudents(u.filter((user) => user.role === 'student'));
      setSubjects(s);
      setTerms(t);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedStudentId) { setEnrollments([]); return; }
    setLoadingEnrollments(true);
    getEnrollmentsForStudent(selectedStudentId).then((data) => {
      setEnrollments(data);
      setLoadingEnrollments(false);
    });
  }, [selectedStudentId]);

  async function handleEnroll(e: FormEvent) {
    e.preventDefault();
    if (!selectedStudentId || !subjectId || !termId) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createEnrollment({ studentId: selectedStudentId, subjectId, termId });
      setEnrollments((prev) => [...prev, created]);
      setSubjectId(''); setTermId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enroll.');
    } finally {
      setSaving(false);
    }
  }

  const subjById = new Map(subjects.map((s) => [s.id, s.name]));
  const termById = new Map(terms.map((t) => [t.id, t.name]));

  if (loading) return <p>Loading...</p>;

  return (
    <div className="admin-page">
      <h1>Enrollments</h1>

      <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} className="admin-select-standalone">
        <option value="">Select a student</option>
        {students.map((s) => <option key={s.id} value={s.id}>{s.fullName} ({s.rollNo})</option>)}
      </select>

      {selectedStudentId && (
        <>
          <form onSubmit={handleEnroll} className="admin-form">
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">Select subject</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={termId} onChange={(e) => setTermId(e.target.value)}>
              <option value="">Select term</option>
              {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {error && <p className="form-error">{error}</p>}
            <button type="submit" disabled={saving}>{saving ? 'Enrolling...' : 'Enroll'}</button>
          </form>

          {loadingEnrollments ? <p>Loading enrollments...</p> : (
            <table className="admin-table">
              <thead><tr><th>Subject</th><th>Term</th></tr></thead>
              <tbody>
                {enrollments.map((en) => (
                  <tr key={en.id}><td>{subjById.get(en.subjectId) ?? '—'}</td><td>{termById.get(en.termId) ?? '—'}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}