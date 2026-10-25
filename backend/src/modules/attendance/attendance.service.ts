import { db } from '../../db';
import {
  attendanceSessions,
  attendanceRecords,
  professorSubjectMap,
  enrollments,
  users,
  subjects,
  academicTerms,
} from '../../db/schema';
import { eq, and, desc, asc, sql, inArray } from 'drizzle-orm';

/**
 * Verify whether a professor is assigned to teach a subject for a specific term.
 */
export async function verifyProfessorAssignment(
  professorId: string,
  subjectId: string,
  termId: string
): Promise<boolean> {
  const [assignment] = await db
    .select({ id: professorSubjectMap.id })
    .from(professorSubjectMap)
    .where(
      and(
        eq(professorSubjectMap.professorId, professorId),
        eq(professorSubjectMap.subjectId, subjectId),
        eq(professorSubjectMap.termId, termId)
      )
    )
    .limit(1);

  return Boolean(assignment);
}

/**
 * Verify whether a professor is assigned to teach a subject (in any term or specific term).
 */
export async function isProfessorAssignedToSubject(
  professorId: string,
  subjectId: string,
  termId?: string
): Promise<boolean> {
  const conditions = [
    eq(professorSubjectMap.professorId, professorId),
    eq(professorSubjectMap.subjectId, subjectId),
  ];

  if (termId) {
    conditions.push(eq(professorSubjectMap.termId, termId));
  }

  const [assignment] = await db
    .select({ id: professorSubjectMap.id })
    .from(professorSubjectMap)
    .where(and(...conditions))
    .limit(1);

  return Boolean(assignment);
}

/**
 * Check if the given session is the latest session created for its subject and term.
 */
export async function isLatestSession(
  sessionId: string,
  subjectId: string,
  termId: string
): Promise<boolean> {
  const [latest] = await db
    .select({ id: attendanceSessions.id })
    .from(attendanceSessions)
    .where(
      and(
        eq(attendanceSessions.subjectId, subjectId),
        eq(attendanceSessions.termId, termId)
      )
    )
    .orderBy(desc(attendanceSessions.createdAt))
    .limit(1);

  return latest ? latest.id === sessionId : true;
}

/**
 * Create a new attendance session after validating professor assignment.
 */
export async function createAttendanceSession(data: {
  subjectId: string;
  termId: string;
  professorId: string;
  sessionDate: string;
  sessionLabel?: string | null;
}) {
  const isAssigned = await verifyProfessorAssignment(
    data.professorId,
    data.subjectId,
    data.termId
  );
  if (!isAssigned) {
    throw new Error('PROFESSOR_NOT_ASSIGNED');
  }

  const [session] = await db
    .insert(attendanceSessions)
    .values({
      subjectId: data.subjectId,
      termId: data.termId,
      professorId: data.professorId,
      sessionDate: data.sessionDate,
      sessionLabel: data.sessionLabel ?? null,
    })
    .returning();

  return session;
}

/**
 * Get attendance sessions for a subject, with stats and editable status.
 */
export async function getAttendanceSessions(
  subjectId: string,
  termId?: string,
  professorId?: string
) {
  if (professorId) {
    const isAssigned = await isProfessorAssignedToSubject(
      professorId,
      subjectId,
      termId
    );
    if (!isAssigned) {
      throw new Error('PROFESSOR_NOT_ASSIGNED');
    }
  }

  const conditions = [eq(attendanceSessions.subjectId, subjectId)];
  if (termId) {
    conditions.push(eq(attendanceSessions.termId, termId));
  }

  const sessions = await db
    .select({
      id: attendanceSessions.id,
      subjectId: attendanceSessions.subjectId,
      termId: attendanceSessions.termId,
      professorId: attendanceSessions.professorId,
      sessionDate: attendanceSessions.sessionDate,
      sessionLabel: attendanceSessions.sessionLabel,
      createdAt: attendanceSessions.createdAt,
    })
    .from(attendanceSessions)
    .where(and(...conditions))
    .orderBy(desc(attendanceSessions.sessionDate), desc(attendanceSessions.createdAt));

  if (sessions.length === 0) {
    return [];
  }

  // Determine latest session per term for subject
  const latestByTerm = new Map<string, string>();
  for (const s of sessions) {
    if (!latestByTerm.has(s.termId)) {
      latestByTerm.set(s.termId, s.id);
    }
  }

  // Fetch record counts for each session
  const sessionIds = sessions.map((s) => s.id);
  const recordCounts = await db
    .select({
      sessionId: attendanceRecords.sessionId,
      totalCount: sql<number>`count(*)::int`,
      presentCount: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'present')::int`,
    })
    .from(attendanceRecords)
    .where(inArray(attendanceRecords.sessionId, sessionIds))
    .groupBy(attendanceRecords.sessionId);

  const countsMap = new Map(
    recordCounts.map((r) => [r.sessionId, { total: r.totalCount, present: r.presentCount }])
  );

  return sessions.map((s) => {
    const isLatest = latestByTerm.get(s.termId) === s.id;
    const counts = countsMap.get(s.id) || { total: 0, present: 0 };
    return {
      ...s,
      isLatest,
      totalMarked: counts.total,
      presentCount: counts.present,
    };
  });
}

/**
 * Get enrolled students for a specific subject and term.
 */
export async function getEnrolledStudents(
  subjectId: string,
  termId: string,
  professorId?: string
) {
  if (professorId) {
    const isAssigned = await verifyProfessorAssignment(professorId, subjectId, termId);
    if (!isAssigned) {
      throw new Error('PROFESSOR_NOT_ASSIGNED');
    }
  }

  return db
    .select({
      studentId: users.id,
      fullName: users.fullName,
      rollNo: users.rollNo,
      email: users.email,
    })
    .from(enrollments)
    .innerJoin(users, eq(enrollments.studentId, users.id))
    .where(
      and(
        eq(enrollments.subjectId, subjectId),
        eq(enrollments.termId, termId),
        eq(users.isActive, true)
      )
    )
    .orderBy(asc(users.rollNo), asc(users.fullName));
}

/**
 * Get session details and its attendance roster.
 */
export async function getAttendanceForSession(
  sessionId: string,
  professorId?: string
) {
  const [session] = await db
    .select()
    .from(attendanceSessions)
    .where(eq(attendanceSessions.id, sessionId));

  if (!session) {
    throw new Error('SESSION_NOT_FOUND');
  }

  if (professorId && session.professorId !== professorId) {
    throw new Error('FORBIDDEN');
  }

  const isLatest = await isLatestSession(
    session.id,
    session.subjectId,
    session.termId
  );

  // Get enrolled students for the session's subject and term
  const enrolledStudents = await getEnrolledStudents(
    session.subjectId,
    session.termId
  );

  // Get existing records for this session
  const records = await db
    .select({
      id: attendanceRecords.id,
      studentId: attendanceRecords.studentId,
      status: attendanceRecords.status,
      updatedAt: attendanceRecords.updatedAt,
    })
    .from(attendanceRecords)
    .where(eq(attendanceRecords.sessionId, sessionId));

  const recordMap = new Map(records.map((r) => [r.studentId, r]));

  const rosterRecords = enrolledStudents.map((student) => {
    const rec = recordMap.get(student.studentId);
    return {
      studentId: student.studentId,
      fullName: student.fullName,
      rollNo: student.rollNo,
      email: student.email,
      status: rec ? rec.status : null,
      recordId: rec ? rec.id : null,
      updatedAt: rec ? rec.updatedAt : null,
    };
  });

  return {
    session: {
      ...session,
      isLatest,
    },
    records: rosterRecords,
  };
}

/**
 * Save / update attendance records safely using upsert.
 * Enforces latest session rule, professor ownership, and student enrollment check.
 */
export async function saveAttendanceRecords(data: {
  sessionId: string;
  professorId: string;
  records: Array<{
    studentId: string;
    status: 'present' | 'absent';
  }>;
}) {
  const [session] = await db
    .select()
    .from(attendanceSessions)
    .where(eq(attendanceSessions.id, data.sessionId));

  if (!session) {
    throw new Error('SESSION_NOT_FOUND');
  }

  if (session.professorId !== data.professorId) {
    throw new Error('FORBIDDEN');
  }

  const isLatest = await isLatestSession(
    session.id,
    session.subjectId,
    session.termId
  );
  if (!isLatest) {
    throw new Error('NOT_LATEST_SESSION');
  }

  // Validate that all students being marked are actually enrolled in this subject and term
  const enrolledStudents = await getEnrolledStudents(
    session.subjectId,
    session.termId
  );
  const enrolledSet = new Set(enrolledStudents.map((s) => s.studentId));

  for (const item of data.records) {
    if (!enrolledSet.has(item.studentId)) {
      throw new Error('STUDENT_NOT_ENROLLED');
    }
  }

  // Upsert all records safely without duplicates
  const saved = await db.transaction(async (tx) => {
    const results = [];
    const now = new Date();
    for (const item of data.records) {
      const [record] = await tx
        .insert(attendanceRecords)
        .values({
          sessionId: session.id,
          studentId: item.studentId,
          status: item.status,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [attendanceRecords.sessionId, attendanceRecords.studentId],
          set: {
            status: sql`excluded.status`,
            updatedAt: now,
          },
        })
        .returning();
      results.push(record);
    }
    return results;
  });

  return saved;
}

/**
 * Mark a single student's attendance.
 */
export async function markAttendance(data: {
  sessionId: string;
  studentId: string;
  status: 'present' | 'absent';
  professorId: string;
}) {
  const [saved] = await saveAttendanceRecords({
    sessionId: data.sessionId,
    professorId: data.professorId,
    records: [{ studentId: data.studentId, status: data.status }],
  });
  return saved;
}

/**
 * Get attendance history and statistics for a student.
 */
export async function getAttendanceForStudent(studentId: string) {
  const records = await db
    .select({
      id: attendanceRecords.id,
      sessionId: attendanceRecords.sessionId,
      studentId: attendanceRecords.studentId,
      status: attendanceRecords.status,
      createdAt: attendanceRecords.createdAt,
      updatedAt: attendanceRecords.updatedAt,
      sessionDate: attendanceSessions.sessionDate,
      sessionLabel: attendanceSessions.sessionLabel,
      subjectId: attendanceSessions.subjectId,
      subjectName: subjects.name,
      subjectCode: subjects.code,
      termId: attendanceSessions.termId,
      termName: academicTerms.name,
    })
    .from(attendanceRecords)
    .innerJoin(
      attendanceSessions,
      eq(attendanceRecords.sessionId, attendanceSessions.id)
    )
    .innerJoin(subjects, eq(attendanceSessions.subjectId, subjects.id))
    .leftJoin(academicTerms, eq(attendanceSessions.termId, academicTerms.id))
    .where(eq(attendanceRecords.studentId, studentId))
    .orderBy(
      desc(attendanceSessions.sessionDate),
      desc(attendanceSessions.createdAt)
    );

  // Group summary by subject
  const summaryMap = new Map<
    string,
    {
      subjectId: string;
      subjectName: string;
      subjectCode: string | null;
      totalSessions: number;
      presentSessions: number;
      absentSessions: number;
      percentage: number;
    }
  >();

  let overallTotal = 0;
  let overallPresent = 0;
  let overallAbsent = 0;

  for (const r of records) {
    overallTotal++;
    if (r.status === 'present') {
      overallPresent++;
    } else {
      overallAbsent++;
    }

    let item = summaryMap.get(r.subjectId);
    if (!item) {
      item = {
        subjectId: r.subjectId,
        subjectName: r.subjectName,
        subjectCode: r.subjectCode,
        totalSessions: 0,
        presentSessions: 0,
        absentSessions: 0,
        percentage: 0,
      };
      summaryMap.set(r.subjectId, item);
    }

    item.totalSessions++;
    if (r.status === 'present') {
      item.presentSessions++;
    } else {
      item.absentSessions++;
    }
  }

  const summary = Array.from(summaryMap.values()).map((s) => ({
    ...s,
    percentage:
      s.totalSessions > 0
        ? Math.round((s.presentSessions / s.totalSessions) * 100)
        : 0,
  }));

  const overall = {
    totalSessions: overallTotal,
    presentSessions: overallPresent,
    absentSessions: overallAbsent,
    percentage:
      overallTotal > 0
        ? Math.round((overallPresent / overallTotal) * 100)
        : 100,
  };

  return {
    records,
    summary,
    overall,
  };
}