import { pgTable, uuid, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';
import { subjects } from './subjects';
import { academicTerms } from './academicTerms';

export const ticketStatusEnum = pgEnum('ticket_status', ['pending','resolved','closed']);

export const tickets = pgTable('tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').references(() => users.id).notNull(),
  professorId: uuid('professor_id').references(() => users.id).notNull(),
  subjectId: uuid('subject_id').references(() => subjects.id).notNull(),
  termId: uuid('term_id').references(() => academicTerms.id).notNull(),
  title: text('title').notNull(),
  status: ticketStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
});