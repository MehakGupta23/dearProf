import { Router } from 'express';
import { z } from 'zod';
import { getAllDepartments, getDepartmentById, createDepartment } from './departments.service';

const router = Router();

const createDepartmentSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
});

router.get('/', async (req, res) => {
  res.json(await getAllDepartments());
});

router.get('/:id', async (req, res) => {
  const department = await getDepartmentById(req.params.id);
  if (!department) return res.status(404).json({ error: 'Department not found' });
  res.json(department);
});

router.post('/', async (req, res) => {
  const parsed = createDepartmentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.issues });
  
  try {
    const created = await createDepartment(parsed.data);
    res.status(201).json(created);
  } catch (err: any) {
    if (err?.cause?.code === '23505') {
      return res.status(409).json({ error: 'A department with this code already exists' });
    }
    throw err;
  }
});

export default router;