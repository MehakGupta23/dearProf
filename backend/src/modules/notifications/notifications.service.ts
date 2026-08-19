import { db } from '../../db';
import { notifications } from '../../db/schema';
import { eq, and } from 'drizzle-orm';

export async function getNotificationsForUser(userId: string) {
  return db.select().from(notifications).where(eq(notifications.userId, userId));
}

export async function getUnreadCountForUser(userId: string) {
  const rows = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return rows.length;
}

export async function markAsRead(notificationId: string) {
  const [updated] = await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.id, notificationId))
    .returning();
  return updated;
}

export async function createNotification(data: { userId: string; type: string; referenceId?: string; message: string }) {
  const [created] = await db.insert(notifications).values(data).returning();
  return created;
}