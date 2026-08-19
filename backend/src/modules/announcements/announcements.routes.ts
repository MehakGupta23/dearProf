import { Router } from 'express';
import { z } from 'zod';
import { getAnnouncementsForSubject, getGeneralAnnouncementsForDepartment, createAnnouncement } from './announcements.service';

const router = Router();

router.get('/subject/:subjectId', async (req, res) => {
  res.json(await getAnnouncementsForSubject(req.params.subjectId));
});

router.get('/general/:departmentId', async (req, res) => {
  res.json(await getGeneralAnnouncementsForDepartment(req.params.departmentId));
});

const createAnnouncementSchema = z.object({
  subjectId: z.string().uuid().optional(),
  title: z.string().min(1),
  body: z.string().min(1),
  postedBy: z.string().uuid(),
});

router.post('/', async (req, res) => {
  const parsed = createAnnouncementSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.issues });

  try {
    const created = await createAnnouncement(parsed.data);
    res.status(201).json(created);
  } catch (err: any) {
    if (err.message === 'No current term is set') {
      return res.status(409).json({ error: 'Cannot post — no current term is set' });
    }
    throw err;
  }
});

export default router;