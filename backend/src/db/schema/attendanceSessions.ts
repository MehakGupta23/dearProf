import { pgTable, uuid, date, text, timestamp } from 'drizzle-orm/pg-core';
import { subjects } from './subjects';
import { academicTerms } from './academicTerms';
import { users } from './users';

export const attendanceSessions = pgTable('attendance_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  subjectId: uuid('subject_id').references(() => subjects.id).notNull(),
  termId: uuid('term_id').references(() => academicTerms.id).notNull(),
  professorId: uuid('professor_id').references(() => users.id).notNull(),
  sessionDate: date('session_date').notNull(),
  sessionLabel: text('session_label'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),   //MAX(created_at) to be implemented in backend
});                                                                                    // such that only the latest session is editable