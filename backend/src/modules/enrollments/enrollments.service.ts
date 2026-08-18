import { db } from '../../db';
import { enrollments, academicTerms } from '../../db/schema';
import { eq, and } from 'drizzle-orm';

export async function getEnrollmentsForStudent(studentId: string) {
  return db
    .select({
      id: enrollments.id,
      subjectId: enrollments.subjectId,
      termId: enrollments.termId,
      createdAt: enrollments.createdAt,
    })
    .from(enrollments)
    .innerJoin(academicTerms, eq(enrollments.termId, academicTerms.id))
    .where(and(eq(enrollments.studentId, studentId), eq(academicTerms.isCurrent, true)));
}

export async function createEnrollment(data: { studentId: string; subjectId: string; termId: string }) {
  const [created] = await db.insert(enrollments).values(data).returning();
  return created;
}