import { db } from '../../db';
import { announcements, users } from '../../db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { getCurrentTerm } from '../terms/terms.service';

export async function getAnnouncementsForSubject(subjectId: string) {
  const currentTerm = await getCurrentTerm();
  if (!currentTerm) return [];
  return db
    .select()
    .from(announcements)
    .where(and(eq(announcements.subjectId, subjectId), eq(announcements.termId, currentTerm.id)));
}

export async function getGeneralAnnouncementsForDepartment(departmentId: string) {
  const currentTerm = await getCurrentTerm();
  if (!currentTerm) return [];
  return db
    .select({
      id: announcements.id,
      title: announcements.title,
      body: announcements.body,
      postedBy: announcements.postedBy,
      createdAt: announcements.createdAt,
    })
    .from(announcements)
    .innerJoin(users, eq(announcements.postedBy, users.id))
    .where(
      and(
        isNull(announcements.subjectId),
        eq(announcements.termId, currentTerm.id),
        eq(users.departmentId, departmentId)
      )
    );
}

export async function createAnnouncement(data: { subjectId?: string; title: string; body: string; postedBy: string }) {
  const currentTerm = await getCurrentTerm();
  if (!currentTerm) throw new Error('No current term is set');
  const [created] = await db.insert(announcements).values({ ...data, termId: currentTerm.id }).returning();
  return created;
}