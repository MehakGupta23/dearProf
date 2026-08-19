import { Router } from 'express';
import { z } from 'zod';
import { getResourcesForSubject, createResourceRecord } from './resources.service';
import { createSignedUploadUrl } from '../../services/storage.service';

const router = Router();

router.get('/subject/:subjectId', async (req, res) => {
  res.json(await getResourcesForSubject(req.params.subjectId));
});

const uploadRequestSchema = z.object({
  subjectId: z.string().uuid(),
  fileName: z.string().min(1),
});

router.post('/upload-url', async (req, res) => {
  const parsed = uploadRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.issues });
  const result = await createSignedUploadUrl(parsed.data.subjectId, parsed.data.fileName);
  res.json(result);
});

const createResourceSchema = z.object({
  subjectId: z.string().uuid(),
  uploadedBy: z.string().uuid(),
  title: z.string().min(1),
  fileUrl: z.string().min(1),
});

router.post('/', async (req, res) => {
  const parsed = createResourceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.issues });
  const created = await createResourceRecord(parsed.data);
  res.status(201).json(created);
});

export default router;