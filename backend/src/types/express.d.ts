import type { users } from 'db/schema/users';

declare global { namespace Express { interface Request { user: typeof users.$inferSelect }}}