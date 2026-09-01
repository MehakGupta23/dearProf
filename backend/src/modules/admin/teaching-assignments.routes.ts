import { Router } from 'express';
import { z } from 'zod';
import { getAllTeachingAssignments, getTeachingAssignmentById, createTeachingAssignment } from './teaching-assignments.service';

const router = Router();

router.get('/', async (req, res) => {
  res.json(await getAllTeachingAssignments());
});

router.get('/:id', async (req, res) => {
  const assignment = await getTeachingAssignmentById(req.params.id);
  if (!assignment) return res.status(404).json({ error: 'Teaching assignment not found' });
  res.json(assignment);
});

const createTeachingAssignmentSchema = z.object({
  professorId: z.string().uuid(),
  subjectId: z.string().uuid(),
  termId: z.string().uuid(),
});

router.post('/', async (req, res) => {
  const parsed = createTeachingAssignmentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.issues });

  try {
    const created = await createTeachingAssignment(parsed.data);
    res.status(201).json(created);
  } catch (err: any) {
    if (err?.cause?.code === '23505') {
      const constraint = err.cause.constraint || '';
      if (constraint.includes('subject_id') && constraint.includes('term_id') && !constraint.includes('professor_id')) {
        return res.status(409).json({ error: 'This subject already has a professor assigned for this term' });
      }
      return res.status(409).json({ error: 'This professor is already assigned to this exact subject and term' });
    }
    throw err;
  }
});

export default router;