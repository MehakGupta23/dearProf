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

export interface NotificationCount {
  count: number;
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const res = await fetch(`${API_BASE_URL}/notifications/user/${userId}/unread-count`);
  if (!res.ok) throw new Error(`Failed to fetch unread count: ${res.status}`);
  const data: NotificationCount = await res.json();
  return data.count;
}

export interface Subject { id: string; name: string; code: string | null; departmentId: string | null; }
export interface Enrollment { id: string; studentId: string; subjectId: string; termId: string; }
export interface Assignment { id: string; professorId: string; subjectId: string; termId: string; }
export interface Resource { id: string; subjectId: string; uploadedBy: string; title: string; fileUrl: string; createdAt: string; }

export async function getSubjects(): Promise<Subject[]> {
  const res = await fetch(`${API_BASE_URL}/subjects`);
  if (!res.ok) throw new Error(`Failed to fetch subjects: ${res.status}`);
  return res.json();
}

export async function getEnrollmentsForStudent(studentId: string): Promise<Enrollment[]> {
  const res = await fetch(`${API_BASE_URL}/enrollments/student/${studentId}`);
  if (!res.ok) throw new Error(`Failed to fetch enrollments: ${res.status}`);
  return res.json();
}

export async function getTeachingAssignments(): Promise<Assignment[]> {
  const res = await fetch(`${API_BASE_URL}/teaching-assignments`);
  if (!res.ok) throw new Error(`Failed to fetch teaching assignments: ${res.status}`);
  return res.json();
}

export async function getResourcesBySubject(subjectId: string): Promise<Resource[]> {
  const res = await fetch(`${API_BASE_URL}/resources/subject/${subjectId}`);
  if (!res.ok) throw new Error(`Failed to fetch resources: ${res.status}`);
  return res.json();
}

export async function getResourceUploadUrl(subjectId: string, fileName: string) {
  const res = await fetch(`${API_BASE_URL}/resources/upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subjectId, fileName }),
  });
  if (!res.ok) throw new Error(`Failed to get upload URL: ${res.status}`);
  return res.json() as Promise<{ path: string; uploadUrl: string; token: string }>;
}

export async function saveResourceMetadata(data: {
  subjectId: string; uploadedBy: string; title: string; fileUrl: string;
}): Promise<Resource> {
  const res = await fetch(`${API_BASE_URL}/resources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to save resource: ${res.status}`);
  return res.json();
}

export async function getResourceDownloadUrl(resourceId: string): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/resources/${resourceId}/download-url`);
  if (!res.ok) throw new Error(`Failed to get download URL: ${res.status}`);
  const data = await res.json();
  return data.url;
}