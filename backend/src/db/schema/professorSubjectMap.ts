import { pgTable, uuid, timestamp, unique } from 'drizzle-orm/pg-core';
import { users } from './users';
import { subjects } from './subjects';
import { academicTerms } from './academicTerms';

export const professorSubjectMap = pgTable('professor_subject_map', {
  id: uuid('id').primaryKey().defaultRandom(),
  professorId: uuid('professor_id').notNull().references(() => users.id),
  subjectId: uuid('subject_id').notNull().references(() => subjects.id),
  termId: uuid('term_id').notNull().references(() => academicTerms.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueAssignment: unique().on(table.professorId, table.subjectId, table.termId),
  uniqueSubjectTerm: unique().on(table.subjectId, table.termId),
}));

// table fn assigned because we want the three columns together to be unique, not individually unique. This is to ensure that a professor can only be assigned to a subject once per term, and that a subject can only be assigned to one professor per term.