import { supabase } from './supabase';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';

async function apiFetch(path: string, init: RequestInit = {}) {
    const { data: { session } } = await supabase.auth.getSession();

    const headers = new Headers(init.headers);

    if (session) headers.set('Authorization', `Bearer ${session.access_token}`);

    const url = path.startsWith('http')
      ? path
      : `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

    return fetch(url, { ...init, headers });
}

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

export interface Ticket {
  id: string;
  studentId: string;
  professorId: string;
  subjectId: string;
  termId: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
} 

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  message: string;
  createdAt: string;
}

export async function getUserById(id: string) {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await apiFetch(`${API_BASE_URL}/users/${id}`, {
    headers: { Authorization: `Bearer ${session?.access_token}`}});
  if (!response.ok) { throw new Error(`Failed to apiFetch user ${id}: ${response.status}`)}
  return response.json();
}

export interface NotificationCount {
  count: number;
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const res = await apiFetch(`${API_BASE_URL}/notifications/user/${userId}/unread-count`);
  if (!res.ok) throw new Error(`Failed to apiFetch unread count: ${res.status}`);
  const data: NotificationCount = await res.json();
  return data.count;
}

export interface Subject { id: string; name: string; code: string | null; departmentId: string | null; }
export interface Enrollment { id: string; studentId: string; subjectId: string; termId: string; }
export interface Assignment { id: string; professorId: string; subjectId: string; termId: string; }
export interface Resource { id: string; subjectId: string; uploadedBy: string; title: string; fileUrl: string; createdAt: string; }

export async function getSubjects(): Promise<Subject[]> {
  const res = await apiFetch(`${API_BASE_URL}/subjects`);
  if (!res.ok) throw new Error(`Failed to apiFetch subjects: ${res.status}`);
  return res.json();
}

export async function getEnrollmentsForStudent(studentId: string): Promise<Enrollment[]> {
  const res = await apiFetch(`${API_BASE_URL}/enrollments/student/${studentId}`);
  if (!res.ok) throw new Error(`Failed to apiFetch enrollments: ${res.status}`);
  return res.json();
}

export async function getTeachingAssignments(): Promise<Assignment[]> {
  const res = await apiFetch(`${API_BASE_URL}/teaching-assignments`);
  if (!res.ok) throw new Error(`Failed to apiFetch teaching assignments: ${res.status}`);
  return res.json();
}

export async function getResourcesBySubject(subjectId: string): Promise<Resource[]> {
  const res = await apiFetch(`${API_BASE_URL}/resources/subject/${subjectId}`);
  if (!res.ok) throw new Error(`Failed to apiFetch resources: ${res.status}`);
  return res.json();
}

export async function getResourceUploadUrl(subjectId: string, fileName: string) {
  const res = await apiFetch(`${API_BASE_URL}/resources/upload-url`, {
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
  const res = await apiFetch(`${API_BASE_URL}/resources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to save resource: ${res.status}`);
  return res.json();
}

export async function getResourceDownloadUrl(resourceId: string): Promise<string> {
  const res = await apiFetch(`${API_BASE_URL}/resources/${resourceId}/download-url`);
  if (!res.ok) throw new Error(`Failed to get download URL: ${res.status}`);
  const data = await res.json();
  return data.url;
}

export async function getSubjectsForUser(profile: User): Promise<Subject[]> {
  const allSubjects = await getSubjects();
  const byId = new Map(allSubjects.map((s) => [s.id, s]));
  let ids: string[] = [];
  if (profile.role === 'student') {
    ids = (await getEnrollmentsForStudent(profile.id)).map((e) => e.subjectId);
  } else if (profile.role === 'professor') {
    ids = (await getTeachingAssignments())
      .filter((a) => a.professorId === profile.id)
      .map((a) => a.subjectId);
  }
  return ids.map((id) => byId.get(id)).filter(Boolean) as Subject[];
}

export interface Announcement {
  id: string;
  subjectId: string | null;
  title: string;
  body: string;
  postedBy: string;
  termId: string;
  createdAt: string;
}

export async function getAnnouncementsBySubject(subjectId: string): Promise<Announcement[]> {
  const res = await apiFetch(`${API_BASE_URL}/announcements/subject/${subjectId}`);
  if (!res.ok) throw new Error(`Failed to apiFetch announcements: ${res.status}`);
  return res.json();
}

export async function getGeneralAnnouncements(departmentId: string): Promise<Announcement[]> {
  const res = await apiFetch(`${API_BASE_URL}/announcements/general/${departmentId}`);
  if (!res.ok) throw new Error(`Failed to apiFetch general announcements: ${res.status}`);
  return res.json();
}

export async function createAnnouncement(data: {
  subjectId?: string; title: string; body: string; postedBy: string;
}): Promise<Announcement> {
  const res = await apiFetch(`${API_BASE_URL}/announcements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    if (res.status === 409) throw new Error('No current term set — cannot post right now.');
    throw new Error(`Failed to create announcement: ${res.status}`);
  }
  return res.json();
}

export interface Department { id: string; name: string; code: string | null; }

export async function getDepartments(): Promise<Department[]> {
  const res = await apiFetch(`${API_BASE_URL}/departments`);
  if (!res.ok) throw new Error(`Failed to apiFetch departments: ${res.status}`);
  return res.json();
}

export async function createDepartment(data: { name: string; code?: string }): Promise<Department> {
  const res = await apiFetch(`${API_BASE_URL}/departments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (res.status === 409) throw new Error('A department with that code already exists.');
  if (!res.ok) throw new Error(`Failed to create department: ${res.status}`);
  return res.json();
}

export async function createSubject(data: { name: string; code?: string; departmentId?: string }): Promise<Subject> {
  const res = await apiFetch(`${API_BASE_URL}/subjects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (res.status === 409) throw new Error('A subject with that code already exists.');
  if (!res.ok) throw new Error(`Failed to create subject: ${res.status}`);
  return res.json();
}

export interface Term { id: string; name: string; startDate: string | null; endDate: string | null; isCurrent: boolean; }

export async function getTerms(): Promise<Term[]> {
  const res = await apiFetch(`${API_BASE_URL}/terms`);
  if (!res.ok) throw new Error(`Failed to apiFetch terms: ${res.status}`);
  return res.json();
}

export async function createTerm(data: { name: string; startDate?: string; endDate?: string }): Promise<Term> {
  const res = await apiFetch(`${API_BASE_URL}/terms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create term: ${res.status}`);
  return res.json();
}

export async function setCurrentTerm(id: string): Promise<Term> {
  const res = await apiFetch(`${API_BASE_URL}/terms/${id}/set-current`, { method: 'PATCH' });
  if (!res.ok) throw new Error(`Failed to set current term: ${res.status}`);
  return res.json();
}

export async function getUsers(): Promise<User[]> {
  const res = await apiFetch(`${API_BASE_URL}/users`);
  if (!res.ok) throw new Error(`Failed to apiFetch users: ${res.status}`);
  return res.json();
}

export async function createTeachingAssignment(data: {
  professorId: string; subjectId: string; termId: string;
}): Promise<Assignment> {
  const res = await apiFetch(`${API_BASE_URL}/teaching-assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (res.status === 409) throw new Error('This subject already has a professor for that term, or this exact assignment already exists.');
  if (!res.ok) throw new Error(`Failed to create assignment: ${res.status}`);
  return res.json();
}

export async function createEnrollment(data: { studentId: string; subjectId: string; termId: string }): Promise<Enrollment> {
  const res = await apiFetch(`${API_BASE_URL}/enrollments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (res.status === 409) throw new Error('This student is already enrolled in that subject for that term.');
  if (!res.ok) throw new Error(`Failed to create enrollment: ${res.status}`);
  return res.json();
}

export async function createUser(data: {
  email: string; fullName: string; role: UserRole; departmentId?: string;
  rollNo?: string; facultyId?: string; admissionYear?: number;
}): Promise<User> {
  const res = await apiFetch(`${API_BASE_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (res.status === 409) throw new Error('A user with that email, roll number, or faculty ID already exists.');
  if (!res.ok) throw new Error(`Failed to create user: ${res.status}`);
  return res.json();
}

export interface BulkImportResult {
  success: { row: number; rollNo: string; email: string }[];
  failed: { row: number; rollNo?: string; error: string }[];
}

export async function bulkImportStudents(file: File, departmentId: string, admissionYear: string): Promise<BulkImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('departmentId', departmentId);
  formData.append('admissionYear', admissionYear);
  const res = await apiFetch(`${API_BASE_URL}/users/bulk-import`, {
    method: 'POST',
    body: formData, // no Content-Type header — browser sets the multipart boundary itself; setting it manually breaks parsing
  });
  if (!res.ok) throw new Error(`Bulk import failed: ${res.status}`);
  return res.json();
}

export async function getTickets(): Promise<Ticket[]> {
  const response = await apiFetch('/tickets');

  if (!response.ok) {
    throw new Error('Failed to load tickets');
  }

  return response.json();
}

export async function getTicketById(id: string): Promise<Ticket> {
  const response = await apiFetch(`/tickets/${id}`);

  if (!response.ok) {
    throw new Error('Failed to load ticket');
  }

  return response.json();
}

export async function createTicket(data: {
  professorId: string;
  subjectId: string;
  title: string;
}): Promise<Ticket> {
  const response = await apiFetch('/tickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to create ticket');
  }

  return response.json();
}


export interface AttendanceSession {
  id: string;
  subjectId: string;
  termId: string;
  professorId: string;
  sessionDate: string;
  sessionLabel: string | null;
  createdAt?: string;
  isLatest?: boolean;
  totalMarked?: number;
  presentCount?: number;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  status: 'present' | 'absent';
  createdAt?: string;
  updatedAt?: string;
}

export interface StudentAttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  status: 'present' | 'absent';
  sessionDate: string;
  sessionLabel: string | null;
  subjectId: string;
  subjectName: string;
  subjectCode: string | null;
  termId: string;
  termName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectAttendanceSummary {
  subjectId: string;
  subjectName: string;
  subjectCode: string | null;
  totalSessions: number;
  presentSessions: number;
  absentSessions: number;
  percentage: number;
}

export interface StudentAttendanceData {
  records: StudentAttendanceRecord[];
  summary: SubjectAttendanceSummary[];
  overall: {
    totalSessions: number;
    presentSessions: number;
    absentSessions: number;
    percentage: number;
  };
}

export interface EnrolledStudent {
  studentId: string;
  fullName: string;
  rollNo: string | null;
  email: string;
}

export interface SessionRosterRecord {
  studentId: string;
  fullName: string;
  rollNo: string | null;
  email: string;
  status: 'present' | 'absent' | null;
  recordId: string | null;
  updatedAt: string | null;
}

export interface SessionDetailsResponse {
  session: AttendanceSession & { isLatest: boolean };
  records: SessionRosterRecord[];
}

export async function getMyAttendance(): Promise<StudentAttendanceData> {
  const res = await apiFetch(`${API_BASE_URL}/attendance/my`);

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `Failed to load attendance: ${res.status}`);
  }

  return res.json();
}

export async function getAttendanceSessions(
  subjectId: string,
  termId?: string
): Promise<AttendanceSession[]> {
  const url = termId
    ? `${API_BASE_URL}/attendance/sessions/${subjectId}?termId=${encodeURIComponent(termId)}`
    : `${API_BASE_URL}/attendance/sessions/${subjectId}`;

  const res = await apiFetch(url);

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `Failed to load sessions: ${res.status}`);
  }

  return res.json();
}

export async function createAttendanceSession(data: {
  subjectId: string;
  termId: string;
  sessionDate: string;
  sessionLabel?: string;
}): Promise<AttendanceSession> {
  const res = await apiFetch(`${API_BASE_URL}/attendance/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `Failed to create session: ${res.status}`);
  }

  return res.json();
}

export async function getAttendanceForSession(
  sessionId: string
): Promise<SessionDetailsResponse> {
  const res = await apiFetch(
    `${API_BASE_URL}/attendance/sessions/${sessionId}/records`
  );

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `Failed to load attendance records: ${res.status}`);
  }

  return res.json();
}

export async function getAttendanceRoster(
  subjectId: string,
  termId: string
): Promise<EnrolledStudent[]> {
  const res = await apiFetch(
    `${API_BASE_URL}/attendance/roster?subjectId=${encodeURIComponent(
      subjectId
    )}&termId=${encodeURIComponent(termId)}`
  );

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `Failed to load roster: ${res.status}`);
  }

  return res.json();
}

export async function markAttendance(data: {
  sessionId: string;
  studentId: string;
  status: 'present' | 'absent';
}): Promise<AttendanceRecord> {
  const res = await apiFetch(`${API_BASE_URL}/attendance/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `Failed to mark attendance: ${res.status}`);
  }

  return res.json();
}

export async function saveSessionAttendance(data: {
  sessionId: string;
  records: Array<{
    studentId: string;
    status: 'present' | 'absent';
  }>;
}): Promise<AttendanceRecord[]> {
  const res = await apiFetch(`${API_BASE_URL}/attendance/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `Failed to save attendance: ${res.status}`);
  }

  return res.json();
}
