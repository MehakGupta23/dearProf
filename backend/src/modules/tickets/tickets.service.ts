import { db } from '../../db';
import { tickets } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentTerm } from '../terms/terms.service';
import { ticketMessages } from '../../db/schema';

export async function createTicket(data: {
    studentId: string;
    professorId: string;
    subjectId: string;
    title: string;
}) {
    // Automatically attach the current academic term
    const currentTerm = await getCurrentTerm();
    if(!currentTerm) throw new Error('No current term is set');

    const [ticket] = await db.insert(tickets).values({ ...data, termId: currentTerm.id }).returning();
    return ticket;
}
export async function getTickets() { return db.select().from(tickets) }

export async function getTicketById(id: string) {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id,id));
    return ticket;
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

