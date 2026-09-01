import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getUserById, getDepartments, type User, type Department } from '../../lib/api';
import './Admin.css';

export function ProfessorDetail() {
  const { id } = useParams<{ id: string }>();
  const [professor, setProfessor] = useState<User | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([getUserById(id), getDepartments()]).then(([u, d]) => {
      setProfessor(u);
      setDepartments(d);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <p>Loading...</p>;
  if (!professor) return <p>Professor not found.</p>;

  const departmentName = departments.find((d) => d.id === professor.departmentId)?.name ?? '—';

  return (
    <div className="admin-page">
      <h1>{professor.fullName}</h1>
      <dl className="detail-list">
        <dt>Faculty ID</dt><dd>{professor.facultyId ?? '—'}</dd>
        <dt>Email</dt><dd>{professor.email}</dd>
        <dt>Department</dt><dd>{departmentName}</dd>
        <dt>Status</dt><dd>{professor.isActive ? 'Active' : 'Inactive'}</dd>
      </dl>
    </div>
  );
}