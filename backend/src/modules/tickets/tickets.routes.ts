import { Router } from 'express';
import { z } from 'zod';
import { auth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { createTicket,getTickets,getTicketById,resolveTicket,closeTicket,reopenTicket,createTicketMessage,getTicketMessages,canAccessTicket } from './tickets.service';

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
    
try {
    const ticket = await createTicket({
        studentId: req.user.id,
        professorId: parsed.data.professorId,
        subjectId: parsed.data.subjectId,
        title: parsed.data.title,
    });

    return res.status(201).json(ticket);
} catch (error) {
    if (error instanceof Error) {
        if (error.message === 'STUDENT_NOT_ENROLLED') {
            return res.status(403).json({
                error: 'You are not enrolled in this subject',
            });
        }

        if (error.message === 'PROFESSOR_NOT_ASSIGNED') {
            return res.status(400).json({
                error: 'Professor is not assigned to this subject',
            });
        }

        if (error.message === 'NO_CURRENT_TERM') {
            return res.status(409).json({
                error: 'No current academic term is set',
            });
        }
    }

    throw error;
}

});
router.get('/', auth, async(req,res) => {
    const tickets = await getTickets(req.user);
    res.json(tickets);
});
router.get('/:id', auth, async (req, res) => {
    const { ticket, allowed } = await canAccessTicket(
        req.params.id as string,
        req.user,
    );
    if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
    }
    if (!allowed) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    return res.json(ticket);
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
    
    const { ticket, allowed } = await canAccessTicket(
        req.params.id as string,
        req.user,
    );

    if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
    }

    if (!allowed) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const message = await createTicketMessage({
        ticketId: req.params.id as string,
        senderId: req.user.id,
        body: parsed.data.body,
        attachmentUrl: parsed.data.attachmentUrl,
    });
    res.status(201).json(message);
});

router.get('/:id/messages', auth, async (req, res) => {
    const { ticket, allowed } = await canAccessTicket(
        req.params.id as string,
        req.user,
    );

    if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
    }

    if (!allowed) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const messages = await getTicketMessages(req.params.id as string);
    return res.json(messages);
});


router.patch('/:id/resolve', auth, requireRole('professor', 'admin'), async (req, res) => {
    const { ticket, allowed } = await canAccessTicket(
        req.params.id as string,
        req.user,
    );

    if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
    }

    if (!allowed) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const updatedTicket = await resolveTicket(req.params.id as string);
    return res.json(updatedTicket);
});


router.patch('/:id/close', auth, requireRole('student', 'admin'), async (req, res) => {
    const { ticket, allowed } = await canAccessTicket(
        req.params.id as string,
        req.user,
    );

    if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
    }

    if (!allowed) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const updatedTicket = await closeTicket(req.params.id as string);
    return res.json(updatedTicket);
});


router.patch('/:id/reopen', auth, requireRole('student'), async (req, res) => {
    const { ticket, allowed } = await canAccessTicket(
        req.params.id as string,
        req.user,
    );

    if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
    }

    if (!allowed) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const updatedTicket = await reopenTicket(req.params.id as string);
    return res.json(updatedTicket);
});


export default router;