import { pgTable, uuid, timestamp, unique } from 'drizzle-orm/pg-core';
import { users } from './users';
import { subjects } from './subjects';
import { academicTerms } from './academicTerms';

export const enrollments = pgTable('enrollments', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => users.id),
  subjectId: uuid('subject_id').notNull().references(() => subjects.id),
  termId: uuid('term_id').notNull().references(() => academicTerms.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueEnrollment: unique().on(table.studentId, table.subjectId, table.termId),
}));


// table fn assigned because we want the three columns together to be unique, not individually unique. This is to ensure that a student can only be enrolled in a subject once per term, and that a subject can only have one enrollment per student per term.