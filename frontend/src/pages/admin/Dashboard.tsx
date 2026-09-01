import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import './Admin.css';

const sections = [
  { to: '/admin/students', label: 'Students' },
  { to: '/admin/professors', label: 'Professors' },
  { to: '/admin/departments', label: 'Departments' },
  { to: '/admin/subjects', label: 'Subjects' },
  { to: '/admin/terms', label: 'Terms' },
  { to: '/admin/teaching-assignments', label: 'Teaching Assignments' },
  { to: '/admin/enrollments', label: 'Enrollments' },
];

export function Dashboard() {
  const { profile } = useAuth();

  return (
    <div className="admin-page">
      <h1>Welcome, {profile?.fullName}</h1>
      <div className="dashboard-grid">
        {sections.map((s) => (
          <Link key={s.to} to={s.to} className="dashboard-card">{s.label}</Link>
        ))}
      </div>
    </div>
  );
}