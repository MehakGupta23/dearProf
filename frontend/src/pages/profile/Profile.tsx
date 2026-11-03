import './Profile.css';
import { useEffect, useState, type FormEvent } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { getDepartments } from '../../lib/api';

// A second client used ONLY to check the current password. It never saves a session,
// so the main login (and the app's auth listener) is not disturbed.
const verifier = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'password-verifier' } }
);

export function Profile() {
  const { profile } = useAuth();
  const [departmentName, setDepartmentName] = useState<string | null>(null);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    if (!profile?.departmentId) return;
    getDepartments().then((list) => {
      setDepartmentName(list.find((d) => d.id === profile.departmentId)?.name ?? null);
    });
  }, [profile?.departmentId]);

  if (!profile) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setMessage(null);

    if (next.length < 8) return setMessage({ type: 'error', text: 'New password must be at least 8 characters.' });
    if (next !== confirm) return setMessage({ type: 'error', text: 'New passwords do not match.' });
    if (next === current) return setMessage({ type: 'error', text: 'New password must be different from the current one.' });

    setSaving(true);
    try {
      const { error: verifyError } = await verifier.auth.signInWithPassword({
        email: profile.email,
        password: current,
      });
      if (verifyError) {
        setMessage({ type: 'error', text: 'Current password is incorrect.' });
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: next });
      if (updateError) throw updateError;

      setCurrent('');
      setNext('');
      setConfirm('');
      setMessage({ type: 'success', text: 'Password changed.' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Could not change password.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="profile-page">
      <h1>My profile</h1>

      <dl className="profile-details">
        <dt>Name</dt><dd>{profile.fullName}</dd>
        <dt>Email</dt><dd>{profile.email}</dd>
        <dt>Role</dt><dd className="profile-role">{profile.role}</dd>
        {profile.rollNo && (<><dt>Roll no</dt><dd>{profile.rollNo}</dd></>)}
        {profile.facultyId && (<><dt>Faculty ID</dt><dd>{profile.facultyId}</dd></>)}
        {departmentName && (<><dt>Department</dt><dd>{departmentName}</dd></>)}
        {profile.admissionYear && (<><dt>Admission year</dt><dd>{profile.admissionYear}</dd></>)}
      </dl>

      <h2>Change password</h2>
      <form onSubmit={handleSubmit} className="profile-form">
        <input type="password" placeholder="Current password" value={current}
          onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />
        <input type="password" placeholder="New password (min 8 characters)" value={next}
          onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required />
        <input type="password" placeholder="Confirm new password" value={confirm}
          onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
        {message && (
          <p className={message.type === 'error' ? 'form-error' : 'profile-success'}>{message.text}</p>
        )}
        <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Change password'}</button>
      </form>
    </div>
  );
}