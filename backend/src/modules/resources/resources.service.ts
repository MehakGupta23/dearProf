import { db } from '../../db';
import { resources } from '../../db/schema';
import { eq } from 'drizzle-orm';

export async function getResourcesForSubject(subjectId: string) {
  return db.select().from(resources).where(eq(resources.subjectId, subjectId));
}

export async function createResourceRecord(data: { subjectId: string; uploadedBy: string; title: string; fileUrl: string }) {
  const [created] = await db.insert(resources).values(data).returning();
  return created;
}