import { pgTable, uuid, text, date, boolean } from 'drizzle-orm/pg-core';

export const academicTerms = pgTable('academic_terms', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  startDate: date('start_date'),
  endDate: date('end_date'),
  isCurrent: boolean('is_current').notNull().default(false),
});