import { db } from '../../db';
import { resources, enrollments, academicTerms } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { createNotification } from '../notifications/notifications.service';

export async function getResourcesForSubject(subjectId: string) {
  return db.select().from(resources).where(eq(resources.subjectId, subjectId));
}

export async function createResourceRecord(data: { subjectId: string; uploadedBy: string; title: string; fileUrl: string }) {
  const [created] = await db.insert(resources).values(data).returning();

  const currentTerm = await db.select().from(academicTerms).where(eq(academicTerms.isCurrent, true));
  if (currentTerm[0]) {
    const enrolledStudents = await db
      .select({ studentId: enrollments.studentId })
      .from(enrollments)
      .where(and(eq(enrollments.subjectId, data.subjectId), eq(enrollments.termId, currentTerm[0].id)));

    for (const student of enrolledStudents) {
      await createNotification({
        userId: student.studentId,
        type: 'new_resource',
        referenceId: created.id,
        message: `New resource uploaded: ${data.title}`,
      });
    }
  }

  return created;
}

export async function getResourceById(id: string) {
  const [resource] = await db.select().from(resources).where(eq(resources.id, id));
  return resource ?? null;
}