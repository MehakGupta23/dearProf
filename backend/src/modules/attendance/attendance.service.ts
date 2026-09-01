import { db } from '../../db';
import { attendanceSessions, attendanceRecords } from '../../db/schema';
import { eq } from 'drizzle-orm';

export async function createAttendanceSession(data: {
    subjectId: string;
    termId: string;
    professorId: string;
    sessionDate: string;
    sessionLabel?: string;
}) {
    const [session] = await db.insert(attendanceSessions).values(data).returning();
    return session;
}
export async function getAttendanceSessions(subjectId: string){
    return db.select().from(attendanceSessions).where(eq(attendanceSessions.subjectId,subjectId));
}
export async function markAttendance(data: {
    sessionId: string;
    studentId: string;
    status: 'present' | 'absent';
}) {
    const [record] = await db.insert(attendanceRecords).values(data).returning();
    return record;
}
export async function getAttendanceForSession(sessionId: string){
    return db.select().from(attendanceRecords).where(eq(attendanceRecords.sessionId,sessionId));
}
export async function getAttendanceForStudent(studentId: string){
    return db.select().from(attendanceRecords).where(eq(attendanceRecords.studentId,studentId));
}