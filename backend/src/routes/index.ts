import { Router, type Request, type Response, type NextFunction } from 'express';
import subjectsRoutes from '../modules/subjects/subjects.routes';
import enrollmentsRoutes from '../modules/enrollments/enrollments.routes';
import termsRoutes from '../modules/terms/terms.routes';
import departmentsRoutes from '../modules/departments/departments.routes';
import resourcesRoutes from '../modules/resources/resources.routes';
import announcementsRoutes from '../modules/announcements/announcements.routes';
import notificationsRoutes from '../modules/notifications/notifications.routes';
import usersRoutes from '../modules/users/users.routes';
import teachingAssignmentsRoutes from '../modules/admin/teaching-assignments.routes';
import ticketsRoutes from '../modules/tickets/tickets.routes';
import attendanceRoutes from '../modules/attendance/attendance.routes';
import { auth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';

const router = Router();

// Reading is open to any logged-in user; creating/changing/deleting is admin-only.
function adminWrites(req: Request, res: Response, next: NextFunction) {
  if (req.method === 'GET') return next();
  return requireRole('admin')(req, res, next);
}

// Everything below this line needs a valid login token.
router.use(auth);

router.use('/subjects', adminWrites, subjectsRoutes);
router.use('/enrollments', adminWrites, enrollmentsRoutes);
router.use('/terms', adminWrites, termsRoutes);
router.use('/departments', adminWrites, departmentsRoutes);
router.use('/resources', resourcesRoutes);
router.use('/announcements', announcementsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/users', adminWrites, usersRoutes);
router.use('/teaching-assignments', adminWrites, teachingAssignmentsRoutes);
router.use('/tickets', ticketsRoutes);
router.use('/attendance', attendanceRoutes);

export default router;