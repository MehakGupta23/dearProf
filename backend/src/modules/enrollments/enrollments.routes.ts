import { Router } from 'express';
import { z } from 'zod';
import { getEnrollmentsForStudent, createEnrollment } from './enrollments.service';

const router = Router();

const createEnrollmentSchema = z.object({
  studentId: z.string().uuid(),
  subjectId: z.string().uuid(),
  termId: z.string().uuid(),
});

router.get('/student/:studentId', async (req, res) => {
  const result = await getEnrollmentsForStudent(req.params.studentId);
  res.json(result);
});

router.post('/', async (req, res) => {
  const parsed = createEnrollmentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.issues });

  try {
    const created = await createEnrollment(parsed.data);
    res.status(201).json(created);
  } catch (err: any) {
    if (err?.cause?.code === '23505') {
      return res.status(409).json({ error: 'Student is already enrolled in this subject for this term' });
    }
    throw err; // anything else, let the real error handler deal with it
  }
});

export default router;