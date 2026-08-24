import { Router } from 'express';
import { z } from 'zod';
import { getAllSubjects, getSubjectById, createSubject } from './subjects.service';

const router = Router();

const createSubjectSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  departmentId: z.string().uuid()
});

router.get('/', async (req, res) => {
  const result = await getAllSubjects();
  res.json(result);
});

router.get('/:id', async (req, res) => {
  const subject = await getSubjectById(req.params.id);
  if (!subject) return res.status(404).json({ error: 'Subject not found' });
  res.json(subject);
});

router.post('/', async (req, res) => {
  const result = createSubjectSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ errors: result.error.issues });
  try {
    const created = await createSubject(result.data);
    res.status(201).json(created);
  } catch (err: any) {
    if (err?.cause?.code === '23505') {
      return res.status(409).json({ error: 'A subject with this code already exists' });
    }
    throw err;
  }
});

export default router;