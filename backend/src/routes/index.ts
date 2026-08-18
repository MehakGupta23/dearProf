import { Router } from 'express';
import subjectsRoutes from '../modules/subjects/subjects.routes';

const router = Router();

router.use('/subjects', subjectsRoutes);

export default router;