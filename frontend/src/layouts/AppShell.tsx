import { useEffect, useState } from 'react';
import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { getUnreadNotificationCount } from '../lib/api';
import { supabase } from '../lib/supabase';
import './AppShell.css';

export function AppShell() {
  const { profile, session, loading, signOut } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  // Unread count: Realtime subscription (Rule 8) + a slow poll underneath as fallback
  useEffect(() => {
    if (!profile?.id) return;

    const fetchCount = () => {
      getUnreadNotificationCount(profile.id).then(setUnreadCount).catch(() => {});
    };

    fetchCount(); // initial load

    const channel = supabase
      .channel(`notifications-${profile.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
        fetchCount
      )
      .subscribe();

    const pollInterval = setInterval(fetchCount, 60000); // fallback per Rule 8

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [profile?.id]);

  // ---- guards: all hooks are above this line ----
  if (loading) { return <div>Loading...</div>; }
  if (!session) { return <Navigate to="/login" replace />; }
  if (!profile) { return <div>Unable to load your profile.</div>; }

  const isAdmin = profile.role === 'admin';
  const onAdminPath = location.pathname.startsWith('/admin');
  if (isAdmin && !onAdminPath) { return <Navigate to="/admin" replace />; }
  if (!isAdmin && onAdminPath) { return <Navigate to="/" replace />; }

  const roleIdentifier =
    profile.role === 'student' ? profile.rollNo :
    profile.role === 'professor' ? profile.facultyId :
    profile.email;

  return (
    <div className="app-shell">
      <header className="top-bar">
        <span className="wordmark">dearProf</span>
        <div className="top-bar-right">
          <span className="user-name">{profile.fullName}</span>
          <span className="user-identifier">{roleIdentifier}</span>
          <button className="inbox-btn" aria-label="Notifications">
            🔔 {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
          </button>
        </div>
      </header>

      <div className="shell-body">
        <nav className="sidebar">
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
          <button onClick={() => setIsDark((d) => !d)}>Toggle theme</button>
          <button onClick={signOut}>Logout</button>
        </nav>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}