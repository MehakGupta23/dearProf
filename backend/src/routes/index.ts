import { Router } from 'express';
import subjectsRoutes from '../modules/subjects/subjects.routes';
import enrollmentsRoutes from '../modules/enrollments/enrollments.routes';

const router = Router();

router.use('/subjects', subjectsRoutes);
router.use('/enrollments', enrollmentsRoutes);

export default router;