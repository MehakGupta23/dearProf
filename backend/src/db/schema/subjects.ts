import { pgTable, uuid, text } from 'drizzle-orm/pg-core';
import { departments } from './departments';

export const subjects = pgTable('subjects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  code: text('code').unique(),
  departmentId: uuid('department_id').references(() => departments.id),
});