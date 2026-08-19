import { Router } from 'express';
import { getNotificationsForUser, getUnreadCountForUser, markAsRead } from './notifications.service';

const router = Router();

router.get('/user/:userId', async (req, res) => {
  res.json(await getNotificationsForUser(req.params.userId));
});

router.get('/user/:userId/unread-count', async (req, res) => {
  const count = await getUnreadCountForUser(req.params.userId);
  res.json({ count });
});

router.patch('/:id/read', async (req, res) => {
  const updated = await markAsRead(req.params.id);
  if (!updated) return res.status(404).json({ error: 'Notification not found' });
  res.json(updated);
});

export default router;