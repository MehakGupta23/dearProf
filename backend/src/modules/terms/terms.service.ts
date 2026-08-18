import { db } from '../../db';
import { academicTerms } from '../../db/schema';
import { eq } from 'drizzle-orm';

export async function getAllTerms() {
  return db.select().from(academicTerms);
}

export async function getCurrentTerm() {
  const [term] = await db.select().from(academicTerms).where(eq(academicTerms.isCurrent, true));
  return term;
}

export async function createTerm(data: { name: string; startDate?: string; endDate?: string }) {
  const [created] = await db.insert(academicTerms).values(data).returning();
  return created;
}

export async function setCurrentTerm(termId: string) {
  return db.transaction(async (tx) => {
    await tx.update(academicTerms).set({ isCurrent: false }).where(eq(academicTerms.isCurrent, true));
    const [updated] = await tx.update(academicTerms).set({ isCurrent: true }).where(eq(academicTerms.id, termId)).returning();
    return updated;
  });
}