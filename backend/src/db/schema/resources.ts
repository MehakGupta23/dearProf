import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { subjects } from './subjects';
import { users } from './users';

export const resources = pgTable('resources', {
  id: uuid('id').primaryKey().defaultRandom(),
  subjectId: uuid('subject_id').references(() => subjects.id).notNull(),
  uploadedBy: uuid('uploaded_by').references(() => users.id).notNull(),
  title: text('title').notNull(),
  fileUrl: text('file_url').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});