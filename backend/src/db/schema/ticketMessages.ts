import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { tickets } from './tickets';
import { users } from './users';

export const ticketMessages = pgTable('ticket_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticketId: uuid('ticket_id').references(() => tickets.id).notNull(),
  senderId: uuid('sender_id').references(() => users.id).notNull(),
  body: text('body').notNull(),
  attachmentUrl: text('attachment_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});