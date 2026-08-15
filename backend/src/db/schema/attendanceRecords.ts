import { pgTable, uuid, timestamp, pgEnum, unique } from 'drizzle-orm/pg-core';
import { attendanceSessions } from './attendanceSessions';
import { users } from './users';

export const attendanceStatusEnum = pgEnum('attendance_status', ['present', 'absent']);
export const attendanceRecords = pgTable('attendance_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => attendanceSessions.id).notNull(),
  studentId: uuid('student_id').references(() => users.id).notNull(),
  status: attendanceStatusEnum('status').notNull(),
  createdAt: timestamp('created_at', {withTimezone: true,}).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', {withTimezone: true,}).notNull().defaultNow(),
},(table) => [
  unique('unique_session_student').on(table.sessionId,table.studentId, //guarantees one attendance record per student per session.
)]);
