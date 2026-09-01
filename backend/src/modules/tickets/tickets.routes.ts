import { Router } from 'express';
import { z } from 'zod';
import { auth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { createTicket,getTickets,getTicketById,resolveTicket,closeTicket,reopenTicket,createTicketMessage,getTicketMessages } from './tickets.service';

const router = Router();

const createTicketSchema = z.object({
    professorId: z.string().uuid(),
    subjectId: z.string().uuid(),
    title: z.string().min(1),
});

router.post('/', auth, requireRole('student'), async(req,res) => { 
    const parsed = createTicketSchema.safeParse(req.body);
    if(!parsed.success) {
        return res.status(400).json({
            errors: parsed.error.issues,
        });
    }
    const ticket = await createTicket({
        studentId: req.user.id,
        professorId: parsed.data.professorId,
        subjectId: parsed.data.subjectId,
        title: parsed.data.title,
    });
    res.status(201).json(ticket);
});
router.get('/', auth, async(req,res) => {
    const tickets = await getTickets();
    res.json(tickets);
});
router.get('/:id', auth, async(req,res) => {
    const ticket = await getTicketById(req.params.id as string);
    if(!ticket){
        return res.status(404).json({
            error: 'Ticket not found',
        });
    }
    res.json(ticket);
});
router.post('/:id/messages', auth, async(req,res) => {
    const parsed = z.object({
        body: z.string().min(1),
        attachmentUrl: z.string().url().optional(),
    }).safeParse(req.body);
    if(!parsed.success) {
        return res.status(400).json({
            errors: parsed.error.issues,
        });
    }
    const message = await createTicketMessage({
        ticketId: req.params.id as string,
        senderId: req.user.id,
        body: parsed.data.body,
        attachmentUrl: parsed.data.attachmentUrl,
    });
    res.status(201).json(message);
});
router.get('/:id/messages', auth, async(req,res) => {
    const messages = await getTicketMessages(req.params.id as string);
    res.json(messages);
});
router.patch('/:id/resolve', auth, requireRole('professor','admin'), async(req,res) => {
    const ticket = await resolveTicket(req.params.id as string);
    if(!ticket){
        return res.status(404).json({
            error: 'Ticket not found',
        });
    }
    res.json(ticket);
});
router.patch('/:id/close', auth, requireRole('student','admin'), async(req,res) => {
    const ticket = await closeTicket(req.params.id as string);
    if(!ticket){
        return res.status(404).json({
            error: 'Ticket not found',
        });
    }
    res.json(ticket);
});
router.patch('/:id/reopen', auth, requireRole('student'), async(req,res) => {
    const ticket = await reopenTicket(req.params.id as string);
    if(!ticket) {
        return res.status(404).json({
            error: 'Ticket not found',
        });
    }
    res.json(ticket);
});

export default router;