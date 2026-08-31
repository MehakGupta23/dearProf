import { Router } from 'express';
import subjectsRoutes from '../modules/subjects/subjects.routes';
import enrollmentsRoutes from '../modules/enrollments/enrollments.routes';
import termsRoutes from '../modules/terms/terms.routes';
import departmentsRoutes from '../modules/departments/departments.routes';
import resourcesRoutes from '../modules/resources/resources.routes';
import announcementsRoutes from '../modules/announcements/announcements.routes';
import notificationsRoutes from '../modules/notifications/notifications.routes';
import usersRoutes from '../modules/users/users.routes';
import teachingAssignmentsRoutes from '../modules/teaching-assignments/teaching-assignments.routes';

const router = Router();

router.use('/subjects', subjectsRoutes);
router.use('/enrollments', enrollmentsRoutes);
router.use('/terms', termsRoutes);
router.use('/departments', departmentsRoutes);
router.use('/resources', resourcesRoutes);
router.use('/announcements', announcementsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/users', usersRoutes);
router.use('/teaching-assignments', teachingAssignmentsRoutes);

export default router;