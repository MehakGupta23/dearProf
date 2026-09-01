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

  return (
    <ul className="course-list">
      {subjects.map((s) => (
        <li key={s.id}><NavLink to={`/resources/${s.id}`}>{s.name}</NavLink></li>
      ))}
    </ul>
  );
}