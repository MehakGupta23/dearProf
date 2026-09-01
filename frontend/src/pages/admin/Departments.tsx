import { useEffect, useState, type FormEvent } from 'react';
import { getDepartments, createDepartment, type Department } from '../../lib/api';
import './Admin.css';

export function Departments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDepartments().then((data) => {
      setDepartments(data);
      setLoading(false);
    });
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createDepartment({ name: name.trim(), code: code.trim() || undefined });
      setDepartments((prev) => [...prev, created]);
      setName('');
      setCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create department.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Loading departments...</p>;

  return (
    <div className="admin-page">
      <h1>Departments</h1>
      <form onSubmit={handleCreate} className="admin-form">
        <input type="text" placeholder="Department name" value={name} onChange={(e) => setName(e.target.value)} />
        <input type="text" placeholder="Code (optional)" value={code} onChange={(e) => setCode(e.target.value)} />
        {error && <p className="form-error">{error}</p>}
        <button type="submit" disabled={saving}>{saving ? 'Adding...' : 'Add department'}</button>
      </form>
      <table className="admin-table">
        <thead><tr><th>Name</th><th>Code</th></tr></thead>
        <tbody>
          {departments.map((d) => (
            <tr key={d.id}><td>{d.name}</td><td>{d.code ?? '—'}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}