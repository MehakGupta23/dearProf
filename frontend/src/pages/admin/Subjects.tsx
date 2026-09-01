import { useEffect, useState, type FormEvent } from 'react';
import { getSubjects, createSubject, getDepartments, type Subject, type Department } from '../../lib/api';
import './Admin.css';

export function Subjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getSubjects(), getDepartments()]).then(([s, d]) => {
      setSubjects(s);
      setDepartments(d);
      setLoading(false);
    });
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createSubject({
        name: name.trim(),
        code: code.trim() || undefined,
        departmentId: departmentId || undefined,
      });
      setSubjects((prev) => [...prev, created]);
      setName(''); setCode(''); setDepartmentId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create subject.');
    } finally {
      setSaving(false);
    }
  }

  const deptById = new Map(departments.map((d) => [d.id, d.name]));

  if (loading) return <p>Loading subjects...</p>;

  return (
    <div className="admin-page">
      <h1>Subjects</h1>
      <form onSubmit={handleCreate} className="admin-form">
        <input type="text" placeholder="Subject name" value={name} onChange={(e) => setName(e.target.value)} />
        <input type="text" placeholder="Code (optional)" value={code} onChange={(e) => setCode(e.target.value)} />
        <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
          <option value="">No department</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" disabled={saving}>{saving ? 'Adding...' : 'Add subject'}</button>
      </form>
      <table className="admin-table">
        <thead><tr><th>Name</th><th>Code</th><th>Department</th></tr></thead>
        <tbody>
          {subjects.map((s) => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td>{s.code ?? '—'}</td>
              <td>{s.departmentId ? deptById.get(s.departmentId) ?? '—' : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}