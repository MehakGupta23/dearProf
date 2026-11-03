import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { getUnreadNotificationCount } from '../lib/api';
import { supabase } from '../lib/supabase';
import './AppShell.css';

// Saved choice wins; otherwise follow the device's light/dark setting.
function getInitialTheme(): boolean {
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
  } catch {
    /* storage can be blocked; fall through */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function AppShell() {
  const { profile, session, loading, signOut } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDark, setIsDark] = useState(getInitialTheme);
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Apply + remember the theme
  useEffect(() => {
    const theme = isDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme); } catch { /* ignore */ }
  }, [isDark]);

  // Close the menu and the mobile drawer whenever the page changes
  useEffect(() => {
    setMenuOpen(false);
    setNavOpen(false);
  }, [location.pathname]);

  // User menu: close on outside click or Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  // Unread count: Realtime subscription (Rule 8) + a slow poll underneath as fallback
  useEffect(() => {
    if (!profile?.id) return;

    const fetchCount = () => {
      getUnreadNotificationCount(profile.id).then(setUnreadCount).catch(() => {});
    };

    fetchCount();

    const channel = supabase
      .channel(`notifications-${profile.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
        fetchCount
      )
      .subscribe();

    const pollInterval = setInterval(fetchCount, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [profile?.id]);

  // ---- guards: all hooks are above this line ----
  if (loading) { return <div>Loading...</div>; }
  if (!session) { return <Navigate to="/login" replace />; }
  if (!profile) {
    return (
      <div style={{ padding: 24 }}>
        <p>Unable to load your profile.</p>
        <p style={{ margin: '8px 0 16px', opacity: 0.6 }}>
          The server may be waking up. Wait a few seconds and retry.
        </p>
        <button onClick={() => window.location.reload()}>Retry</button>{' '}
        <button onClick={signOut}>Log out</button>
      </div>
    );
  }

  const isAdmin = profile.role === 'admin';
  const onAdminPath = location.pathname.startsWith('/admin');
  if (!isAdmin && onAdminPath) { return <Navigate to="/" replace />; }

  const roleIdentifier =
    profile.role === 'student' ? profile.rollNo :
    profile.role === 'professor' ? profile.facultyId :
    profile.email;

  const initials = profile.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="top-bar-left">
          <button
            className="nav-toggle"
            aria-label="Toggle navigation"
            aria-expanded={navOpen}
            onClick={() => setNavOpen((o) => !o)}
          >
            ☰
          </button>
          <span className="wordmark">dearProf</span>
        </div>

        <div className="top-bar-right">
          <button className="inbox-btn" aria-label="Notifications">
            🔔 {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
          </button>

          <div className="user-menu" ref={menuRef}>
            <button
              className="user-menu-btn"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <span className="avatar">{initials}</span>
              <span className="user-meta">
                <span className="user-name">{profile.fullName}</span>
                <span className="user-identifier">{roleIdentifier}</span>
              </span>
            </button>

            {menuOpen && (
              <div className="user-dropdown" role="menu">
                <div className="user-dropdown-head">
                  <strong>{profile.fullName}</strong>
                  <span>{roleIdentifier}</span>
                </div>
                <button role="menuitem" onClick={() => setIsDark((d) => !d)}>
                  {isDark ? 'Light mode' : 'Dark mode'}
                </button>
                <button role="menuitem" onClick={signOut}>Log out</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="shell-body">
        {navOpen && <div className="nav-backdrop" onClick={() => setNavOpen(false)} />}

        <nav className={`sidebar${navOpen ? ' open' : ''}`}>
          {isAdmin ? (
            <>
              <NavLink to="/admin" end>Dashboard</NavLink>
              <NavLink to="/admin/students">Students</NavLink>
              <NavLink to="/admin/professors">Professors</NavLink>
              <NavLink to="/admin/departments">Departments</NavLink>
              <NavLink to="/admin/subjects">Subjects</NavLink>
              <NavLink to="/admin/terms">Terms</NavLink>
              <NavLink to="/admin/teaching-assignments">Teaching Assignments</NavLink>
              <NavLink to="/admin/enrollments">Enrollments</NavLink>
            </>
          ) : (
            <>
              <NavLink to="/" end>Home</NavLink>
              <NavLink to="/attendance">Attendance</NavLink>
              <NavLink to="/resources">Resources</NavLink>
              <NavLink to="/announcements">Announcements</NavLink>
              <NavLink to="/queries">Queries</NavLink>
            </>
          )}
        </nav>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}