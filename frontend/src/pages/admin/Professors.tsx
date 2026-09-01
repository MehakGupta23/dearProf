import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { getUsers, getDepartments, createUser, type User, type Department } from '../../lib/api';
import './Admin.css';

export function Professors() {
  const [professors, setProfessors] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getUsers(), getDepartments()]).then(([u, d]) => {
      setProfessors(u.filter((user) => user.role === 'professor'));
      setDepartments(d);
      setLoading(false);
    });
  }, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !fullName.trim() || !facultyId.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createUser({
        email: email.trim(), fullName: fullName.trim(), role: 'professor',
        facultyId: facultyId.trim(), departmentId: departmentId || undefined,
      });
      setProfessors((prev) => [...prev, created]);
      setEmail(''); setFullName(''); setFacultyId(''); setDepartmentId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add professor.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Loading professors...</p>;

  return (
    <div className="admin-page">
      <h1>Professors</h1>

      <form onSubmit={handleAdd} className="admin-form">
        <input type="text" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="text" placeholder="Faculty ID" value={facultyId} onChange={(e) => setFacultyId(e.target.value)} />
        <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
          <option value="">Department</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" disabled={saving}>{saving ? 'Adding...' : 'Add professor'}</button>
      </form>

      <table className="admin-table">
        <thead><tr><th>Name</th><th>Faculty ID</th><th>Email</th></tr></thead>
        <tbody>
          {professors.map((p) => (
            <tr key={p.id}>
              <td><Link to={`/admin/professors/${p.id}`}>{p.fullName}</Link></td>
              <td>{p.facultyId ?? '—'}</td>
              <td>{p.email}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}