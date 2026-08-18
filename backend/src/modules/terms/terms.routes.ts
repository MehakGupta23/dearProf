import { Router } from 'express';
import { z } from 'zod';
import { getAllTerms, getCurrentTerm, createTerm, setCurrentTerm } from './terms.service';

const router = Router();

const createTermSchema = z.object({
  name: z.string().min(1),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
});

router.get('/', async (req, res) => {
  res.json(await getAllTerms());
});

router.get('/current', async (req, res) => {
  const term = await getCurrentTerm();
  if (!term) return res.status(404).json({ error: 'No current term is set' });
  res.json(term);
});

router.post('/', async (req, res) => {
  const parsed = createTermSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.issues });
  const created = await createTerm(parsed.data);
  res.status(201).json(created);
});

router.patch('/:id/set-current', async (req, res) => {
  const updated = await setCurrentTerm(req.params.id);
  res.json(updated);
});

export default router;