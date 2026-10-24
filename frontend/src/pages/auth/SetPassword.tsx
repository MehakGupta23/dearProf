import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import './Login.css';

export function SetPassword() {
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkInvitationSession() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');

        // PKCE flow: exchange the callback code for a session.
        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) throw exchangeError;

          // Remove the one-time code from the visible URL.
          window.history.replaceState(
            {},
            document.title,
            '/set-password',
          );
        }

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (active) {
          setHasSession(Boolean(session));
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to verify your invitation.',
          );
        }
      } finally {
        if (active) setCheckingSession(false);
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (active && session) {
        setHasSession(true);
        setError('');
      }
    });

    void checkInvitationSession();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSetPassword(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (!session || !hasSession) {
        setError(
          'Your invitation session is missing or expired. Ask your administrator to send a new invitation.',
        );
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) throw updateError;

      navigate('/');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to set your password. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="login-page">
        <div className="login-card">
          <p>Verifying your invitation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <span className="login-wordmark">dearProf</span>
          <h1>Set your password.</h1>
          <p>Create a password to access your campus portal.</p>
        </div>

        <form onSubmit={handleSetPassword} className="login-form">
          <div className="form-field">
            <label htmlFor="password">New password</label>
            <input
              id="password"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              autoComplete="new-password"
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              autoComplete="new-password"
              required
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" disabled={loading || !hasSession}>
            {loading ? 'Setting password...' : 'Set password'}
          </button>

          {!hasSession && !error && (
            <p className="form-error">
              No active invitation session was found.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}