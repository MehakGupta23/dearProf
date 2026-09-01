import './Resources.css';
import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { getSubjects, getEnrollmentsForStudent, getTeachingAssignments, type Subject } from '../../lib/api';

export function Resources() {
  const { profile } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    async function load() {
      const allSubjects = await getSubjects();
      const byId = new Map(allSubjects.map((s) => [s.id, s]));
      let ids: string[] = [];
      if (profile!.role === 'student') {
        ids = (await getEnrollmentsForStudent(profile!.id)).map((e) => e.subjectId);
      } else if (profile!.role === 'professor') {
        ids = (await getTeachingAssignments())
          .filter((a) => a.professorId === profile!.id)
          .map((a) => a.subjectId);
      }
      setSubjects(ids.map((id) => byId.get(id)).filter(Boolean) as Subject[]);
      setLoading(false);
    }
    load();
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