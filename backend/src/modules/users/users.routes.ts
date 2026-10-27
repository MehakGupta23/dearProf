import { Router } from 'express';
import { z } from 'zod';
import { getAllUsers, getUserById, createUser, bulkCreateStudents } from './users.service';
import { auth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.get('/', auth, requireRole('admin'), async (req, res) => {
  res.json(await getAllUsers());
});

router.get<{ id:string }>('/:id', auth, async (req, res) => {
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

router.post('/', auth, async (req, res) => {
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

const bulkImportSchema = z.object({
  departmentId: z.string().uuid(),
  admissionYear: z.coerce.number().int(),
});

router.post('/bulk-import', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No CSV file uploaded' });

  const parsed = bulkImportSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.issues });

  const result = await bulkCreateStudents(req.file.buffer, parsed.data.departmentId, parsed.data.admissionYear);
  res.status(200).json(result);
});

export default router;