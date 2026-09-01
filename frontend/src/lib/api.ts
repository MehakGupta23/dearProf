const API_BASE_URL = 'http://localhost:3000/api';

export type UserRole = 'student' | 'professor' | 'admin';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  departmentId: string | null;
  rollNo: string | null;
  facultyId: string | null;
  admissionYear: number | null;
  isActive: boolean;
  createdAt: string;
}

export async function getUserById(id: string): Promise<User | null> {
  const res = await fetch(`${API_BASE_URL}/users/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch user ${id}: ${res.status}`);
  return res.json();
}