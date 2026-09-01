import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { getUsers, getDepartments, createUser, bulkImportStudents, type User, type Department, type BulkImportResult } from '../../lib/api';
import './Admin.css';

export function Students() {
  const [students, setStudents] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [admissionYear, setAdmissionYear] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvDepartmentId, setCsvDepartmentId] = useState('');
  const [csvAdmissionYear, setCsvAdmissionYear] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getUsers(), getDepartments()]).then(([u, d]) => {
      setStudents(u.filter((user) => user.role === 'student'));
      setDepartments(d);
      setLoading(false);
    });
  }, []);

  async function handleAddStudent(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !fullName.trim() || !rollNo.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createUser({
        email: email.trim(), fullName: fullName.trim(), role: 'student',
        rollNo: rollNo.trim(), departmentId: departmentId || undefined,
        admissionYear: admissionYear ? Number(admissionYear) : undefined,
      });
      setStudents((prev) => [...prev, created]);
      setEmail(''); setFullName(''); setRollNo(''); setDepartmentId(''); setAdmissionYear('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add student.');
    } finally {
      setSaving(false);
    }
  }

  async function handleImport(e: FormEvent) {
    e.preventDefault();
    if (!csvFile || !csvDepartmentId || !csvAdmissionYear) return;
    setImporting(true);
    setImportError(null);
    setImportResult(null);
    try {
      const result = await bulkImportStudents(csvFile, csvDepartmentId, csvAdmissionYear);
      setImportResult(result);
      const updated = await getUsers();
      setStudents(updated.filter((u) => u.role === 'student'));
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setImporting(false);
    }
  }

  if (loading) return <p>Loading students...</p>;

  return (
    <div className="admin-page">
      <h1>Students</h1>

      <h2>Add one student</h2>
      <form onSubmit={handleAddStudent} className="admin-form">
        <input type="text" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="text" placeholder="Roll number" value={rollNo} onChange={(e) => setRollNo(e.target.value)} />
        <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
          <option value="">Department</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <input type="number" placeholder="Admission year" value={admissionYear} onChange={(e) => setAdmissionYear(e.target.value)} />
        {error && <p className="form-error">{error}</p>}
        <button type="submit" disabled={saving}>{saving ? 'Adding...' : 'Add student'}</button>
      </form>

      <h2>Import CSV batch</h2>
      <form onSubmit={handleImport} className="admin-form">
        <select value={csvDepartmentId} onChange={(e) => setCsvDepartmentId(e.target.value)}>
          <option value="">Department</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <input type="number" placeholder="Admission year" value={csvAdmissionYear} onChange={(e) => setCsvAdmissionYear(e.target.value)} />
        <input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)} />
        {importError && <p className="form-error">{importError}</p>}
        <button type="submit" disabled={importing}>{importing ? 'Importing...' : 'Import CSV'}</button>
      </form>

      {importResult && (
        <div className="import-result">
          <p>{importResult.success.length} succeeded, {importResult.failed.length} failed.</p>
          {importResult.failed.length > 0 && (
            <ul>{importResult.failed.map((f, i) => <li key={i}>Row {f.row}{f.rollNo ? ` (${f.rollNo})` : ''}: {f.error}</li>)}</ul>
          )}
        </div>
      )}

      <table className="admin-table">
        <thead><tr><th>Name</th><th>Roll No</th><th>Email</th></tr></thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id}>
              <td><Link to={`/admin/students/${s.id}`}>{s.fullName}</Link></td>
              <td>{s.rollNo ?? '—'}</td>
              <td>{s.email}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}