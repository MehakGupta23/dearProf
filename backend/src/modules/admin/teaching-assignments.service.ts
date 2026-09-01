import { db } from '../../db';
import { professorSubjectMap } from '../../db/schema';
import { eq } from 'drizzle-orm';

export async function getAllTeachingAssignments() {
  return db.select().from(professorSubjectMap);
}

export async function getTeachingAssignmentById(id: string) {
  const [assignment] = await db.select().from(professorSubjectMap).where(eq(professorSubjectMap.id, id));
  return assignment;
}

export async function createTeachingAssignment(data: { professorId: string; subjectId: string; termId: string }) {
  const [created] = await db.insert(professorSubjectMap).values(data).returning();
  return created;
}