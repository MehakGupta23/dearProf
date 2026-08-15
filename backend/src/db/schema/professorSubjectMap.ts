import { pgTable, uuid, timestamp, unique } from 'drizzle-orm/pg-core';
import { users } from './users';
import { subjects } from './subjects';
import { academicTerms } from './academicTerms';

export const professorSubjectMap = pgTable('professor_subject_map',{
  id: uuid('id').primaryKey().defaultRandom(),
  professorId: uuid('professor_id').references(() => users.id).notNull(),
  subjectId: uuid('subject_id').references(() => subjects.id).notNull(),
  termId: uuid('term_id').references(() => academicTerms.id).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true}).notNull().defaultNow(),
},(table) => [
  unique('unique_professor_subject_term').on(table.professorId,table.subjectId,table.termId), //The same professor cannot be assigned to the same subject in the same term twice.
  unique('one_professor_per_subject_per_term').on(table.subjectId,table.termId, //For a particular subject in a particular term, there can be only one professor.
)]);

    