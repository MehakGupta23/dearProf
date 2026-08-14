import { pgTable, uuid, text, integer, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { departments } from './departments';

export const userRoleEnum = pgEnum('user_role', ['student', 'professor', 'admin']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // no defaultRandom(), must match auth.users.id
  email: text('email').notNull().unique(),
  fullName: text('full_name').notNull(),
  role: userRoleEnum('role').notNull(),
  departmentId: uuid('department_id').references(() => departments.id),  // null allowed as admins will have no dept id
  rollNo: text('roll_no').unique(),
  facultyId: text('faculty_id').unique(),
  admissionYear: integer('admission_year'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});