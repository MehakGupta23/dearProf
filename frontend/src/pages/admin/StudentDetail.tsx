import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getUserById, getDepartments, type User, type Department } from '../../lib/api';
import './Admin.css';

export function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<User | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([getUserById(id), getDepartments()]).then(([u, d]) => {
      setStudent(u);
      setDepartments(d);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <p>Loading...</p>;
  if (!student) return <p>Student not found.</p>;

  const departmentName = departments.find((d) => d.id === student.departmentId)?.name ?? '—';

  return (
    <div className="admin-page">
      <h1>{student.fullName}</h1>
      <dl className="detail-list">
        <dt>Roll number</dt><dd>{student.rollNo ?? '—'}</dd>
        <dt>Email</dt><dd>{student.email}</dd>
        <dt>Department</dt><dd>{departmentName}</dd>
        <dt>Admission year</dt><dd>{student.admissionYear ?? '—'}</dd>
        <dt>Status</dt><dd>{student.isActive ? 'Active' : 'Inactive'}</dd>
      </dl>
    </div>
  );
}