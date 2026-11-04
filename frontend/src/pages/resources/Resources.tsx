import './Resources.css';
import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { getSubjectsForUser, type Subject } from '../../lib/api';

export function Resources() {
  const { profile } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    getSubjectsForUser(profile).then((s) => {
      setSubjects(s);
      setLoading(false);
    });
  }, [profile]);

  if (loading) return <p>Loading courses...</p>;
  if (subjects.length === 0) return <p className="empty-note">No courses yet.</p>;

  return (
    <ul className="course-list">
      {subjects.map((s) => (
        <li key={s.id}>
          <NavLink to={`/resources/${s.id}`}>
            {s.code && <span className="course-code">{s.code}</span>}
            <span className="course-name">{s.name}</span>
          </NavLink>
        </li>
      ))}
    </ul>
  );
}