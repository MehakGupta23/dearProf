import { Router } from 'express';
import subjectsRoutes from '../modules/subjects/subjects.routes';
import enrollmentsRoutes from '../modules/enrollments/enrollments.routes';
import termsRoutes from '../modules/terms/terms.routes';

const router = Router();

router.use('/subjects', subjectsRoutes);
router.use('/enrollments', enrollmentsRoutes);
router.use('/terms', termsRoutes);

export default router;