import { useEffect, useState, type FormEvent } from 'react';
import { getTerms, createTerm, setCurrentTerm, type Term } from '../../lib/api';
import './Admin.css';

export function Terms() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingId, setSettingId] = useState<string | null>(null);

  useEffect(() => {
    getTerms().then((data) => {
      setTerms(data);
      setLoading(false);
    });
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createTerm({ name: name.trim(), startDate: startDate || undefined, endDate: endDate || undefined });
      setTerms((prev) => [...prev, created]);
      setName(''); setStartDate(''); setEndDate('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create term.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSetCurrent(id: string) {
    setSettingId(id);
    try {
      await setCurrentTerm(id);
      setTerms((prev) => prev.map((t) => ({ ...t, isCurrent: t.id === id })));
    } catch {
      setError('Failed to set current term.');
    } finally {
      setSettingId(null);
    }
  }

  if (loading) return <p>Loading terms...</p>;

  return (
    <div className="admin-page">
      <h1>Academic Terms</h1>
      <form onSubmit={handleCreate} className="admin-form">
        <input type="text" placeholder="Term name (e.g. 2026-27 Odd)" value={name} onChange={(e) => setName(e.target.value)} />
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        {error && <p className="form-error">{error}</p>}
        <button type="submit" disabled={saving}>{saving ? 'Adding...' : 'Add term'}</button>
      </form>
      <table className="admin-table">
        <thead><tr><th>Name</th><th>Start</th><th>End</th><th>Current</th><th></th></tr></thead>
        <tbody>
          {terms.map((t) => (
            <tr key={t.id}>
              <td>{t.name}</td>
              <td>{t.startDate ?? '—'}</td>
              <td>{t.endDate ?? '—'}</td>
              <td>{t.isCurrent ? 'Yes' : '—'}</td>
              <td>
                {!t.isCurrent && (
                  <button onClick={() => handleSetCurrent(t.id)} disabled={settingId === t.id}>
                    {settingId === t.id ? 'Setting...' : 'Set current'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}