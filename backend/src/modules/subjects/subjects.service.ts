import { db } from '../../db';
import { subjects } from '../../db/schema';
import { eq } from 'drizzle-orm';

export async function getAllSubjects() {
  return db.select().from(subjects);
}

export async function getSubjectById(id: string) {
  const [subject] = await db.select().from(subjects).where(eq(subjects.id, id));
  return subject;
}

export async function createSubject(data: { name: string; code?: string; departmentId?: string }) {
  const [created] = await db.insert(subjects).values(data).returning();
  return created;
}