import { Router } from 'express';
import { z } from 'zod';
import { getAllUsers, getUserById, createUser } from './users.service';

const router = Router();

router.get('/', async (req, res) => {
  res.json(await getAllUsers());
});

router.get('/:id', async (req, res) => {
  const user = await getUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

const createUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  role: z.enum(['student', 'professor', 'admin']),
  departmentId: z.string().uuid().optional(),
  rollNo: z.string().optional(),
  facultyId: z.string().optional(),
  admissionYear: z.number().int().optional(),
});

router.post('/', async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.issues });

  try {
    const created = await createUser(parsed.data);
    res.status(201).json(created);
  } catch (err: any) {
    if (err?.cause?.code === '23505') {
      return res.status(409).json({ error: 'A user with this email or roll number already exists' });
    }
    throw err;
  }
});

export default router;