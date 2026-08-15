import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { subjects } from './subjects';
import { academicTerms } from './academicTerms';
import { users } from './users';

export const announcements = pgTable('announcements', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  subjectId: uuid('subject_id').references(() => subjects.id),
  termId: uuid('term_id').references(() => academicTerms.id).notNull(),
  postedBy: uuid('posted_by').references(() => users.id).notNull(),   //to be enforced in backend: professor-only
  createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
});