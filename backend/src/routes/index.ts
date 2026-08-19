import { Router } from 'express';
import subjectsRoutes from '../modules/subjects/subjects.routes';
import enrollmentsRoutes from '../modules/enrollments/enrollments.routes';
import termsRoutes from '../modules/terms/terms.routes';
import departmentsRoutes from '../modules/departments/departments.routes';
import resourcesRoutes from '../modules/resources/resources.routes';
const router = Router();

router.use('/subjects', subjectsRoutes);
router.use('/enrollments', enrollmentsRoutes);
router.use('/terms', termsRoutes);
router.use('/departments', departmentsRoutes);
router.use('/resources', resourcesRoutes)

export default router;