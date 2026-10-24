import { db } from '../../db';
import { eq, and } from 'drizzle-orm';
import { getCurrentTerm } from '../terms/terms.service';
import { ticketMessages } from '../../db/schema';
import { tickets, enrollments, professorSubjectMap } from '../../db/schema';

export async function createTicket(data: {
    studentId: string;
    professorId: string;
    subjectId: string;
    title: string;
}) {
    // Automatically attach the current academic term
    const currentTerm = await getCurrentTerm();
    if(!currentTerm) throw new Error('No current term is set');

    const [enrollment] = await db
    .select()
    .from(enrollments)
    .where(
        and(
            eq(enrollments.studentId, data.studentId),
            eq(enrollments.subjectId, data.subjectId),
            eq(enrollments.termId, currentTerm.id),
        ),
    );

if (!enrollment) {
    throw new Error('STUDENT_NOT_ENROLLED');
}

const [assignment] = await db.select().from(professorSubjectMap).where(and(
            eq(professorSubjectMap.professorId, data.professorId),
            eq(professorSubjectMap.subjectId, data.subjectId),
            eq(professorSubjectMap.termId, currentTerm.id),
        ));

if (!assignment) {
    throw new Error('PROFESSOR_NOT_ASSIGNED');
}

    const [ticket] = await db.insert(tickets).values({ ...data, termId: currentTerm.id }).returning();
    return ticket;
}
export async function getTickets(user: {
    id: string;
    role: 'student' | 'professor' | 'admin';
}) {
    if (user.role === 'admin') {
        return db.select().from(tickets);
    }

    if (user.role === 'student') {
        return db.select().from(tickets).where(eq(tickets.studentId, user.id));
    }

    return db.select().from(tickets).where(eq(tickets.professorId, user.id));
}

export async function getTicketById(id: string) {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id,id));
    return ticket;
}

export async function canAccessTicket(
    ticketId: string,
    user: { id: string; role: 'student' | 'professor' | 'admin' },
) {
    const ticket = await getTicketById(ticketId);

    if (!ticket) {
        return { ticket: null, allowed: false };
    }

    const allowed =
        user.role === 'admin' ||
        (user.role === 'student' && ticket.studentId === user.id) ||
        (user.role === 'professor' && ticket.professorId === user.id);

    return { ticket, allowed };
}

export async function resolveTicket(id: string) {
    const [ticket] = await db.update(tickets).set({ status: 'resolved' }).where(eq(tickets.id, id)).returning();
    return ticket;
}
export async function closeTicket(id: string) {
    const [ticket] = await db.update(tickets).set({
        status: 'closed', closedAt: new Date(),
    }).where(eq(tickets.id, id)).returning();
    return ticket;
}
export async function reopenTicket(id: string) {
    const [ticket] = await db.update(tickets).set({
        status: 'pending',
        closedAt: null }).where(eq(tickets.id,id)).returning();
    return ticket;
}

export async function createTicketMessage(data: {
    ticketId: string;
    senderId: string;
    body: string;
    attachmentUrl?: string;
}) {
    const [message] = await db.insert(ticketMessages).values(data).returning();
    return message;
}
export async function getTicketMessages(ticketId: string) {
    return db.select().from(ticketMessages).where(eq(ticketMessages.ticketId,ticketId));
}

