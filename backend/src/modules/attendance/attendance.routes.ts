import { Router } from 'express';
import { z } from 'zod';
import { auth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { createAttendanceSession,getAttendanceSessions,markAttendance,getAttendanceForSession,getAttendanceForStudent } from './attendance.service';

const router = Router();

router.post('/sessions', auth, requireRole('professor'), async(req,res) => {
    const parsed = z.object({
        subjectId: z.string().uuid(),
        termId: z.string().uuid(),
        sessionDate: z.string(),
        sessionLabel: z.string().optional(),
    }).safeParse(req.body);
    if(!parsed.success){
        return res.status(400).json({
            errors: parsed.error.issues,
        });
    }
    const session = await createAttendanceSession({
        ...parsed.data, professorId: req.user.id,
    });
    res.status(201).json(session);
});
router.get('/sessions/:subjectId', auth, async(req,res) => {
    const sessions = await getAttendanceSessions(req.params.subjectId as string);
    res.json(sessions);
});
router.post('/records', auth, requireRole('professor'), async(req,res) => {
    const parsed = z.object({
        sessionId: z.string().uuid(),
        studentId: z.string().uuid(),
        status: z.enum(['present','absent']),
    }).safeParse(req.body);
    if(!parsed.success){
        return res.status(400).json({
            errors: parsed.error.issues,
        });
    }
    const record = await markAttendance(parsed.data);
    res.status(201).json(record);
});
router.get('/sessions/:sessionId/records', auth, async(req,res) => {
    const records = await getAttendanceForSession( req.params.sessionId as string);
    res.json(records);
});
router.get('/my', auth, requireRole('student'), async(req,res) => {
    const records = await getAttendanceForStudent(req.user.id);
    res.json(records);
});
export default router;
