import { Router } from 'express';
import { z } from 'zod';
import { auth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import {
  createAttendanceSession,
  getAttendanceSessions,
  getAttendanceForSession,
  getEnrolledStudents,
  saveAttendanceRecords,
  getAttendanceForStudent,
} from './attendance.service';

const router = Router();

const createSessionSchema = z.object({
  subjectId: z.string().uuid('Invalid subject ID'),
  termId: z.string().uuid('Invalid term ID'),
  sessionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid session date'),
  sessionLabel: z.string().trim().max(100).optional().nullable(),
});

const markRecordsSchema = z.union([
  z.object({
    sessionId: z.string().uuid('Invalid session ID'),
    records: z
      .array(
        z.object({
          studentId: z.string().uuid('Invalid student ID'),
          status: z.enum(['present', 'absent']),
        })
      )
      .min(1, 'Records list cannot be empty'),
  }),
  z.object({
    sessionId: z.string().uuid('Invalid session ID'),
    studentId: z.string().uuid('Invalid student ID'),
    status: z.enum(['present', 'absent']),
  }),
]);

/**
 * Professor creates a new attendance session.
 */
router.post('/sessions', auth, requireRole('professor'), async (req, res) => {
  const parsed = createSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.issues });
  }

  try {
    const session = await createAttendanceSession({
      subjectId: parsed.data.subjectId,
      termId: parsed.data.termId,
      sessionDate: parsed.data.sessionDate,
      sessionLabel: parsed.data.sessionLabel,
      professorId: req.user.id,
    });
    return res.status(201).json(session);
  } catch (err: any) {
    if (err.message === 'PROFESSOR_NOT_ASSIGNED') {
      return res.status(403).json({
        error: 'You are not assigned to teach this subject in this term',
      });
    }
    throw err;
  }
});

/**
 * Professor retrieves sessions for a subject (and optionally a specific term).
 */
router.get('/sessions/:subjectId', auth, requireRole('professor'), async (req, res) => {
  const subjectIdParam = z.string().uuid('Invalid subject ID').safeParse(req.params.subjectId);
  if (!subjectIdParam.success) {
    return res.status(400).json({ errors: subjectIdParam.error.issues });
  }

  const termIdQuery = req.query.termId
    ? z.string().uuid('Invalid term ID').safeParse(req.query.termId)
    : null;

  if (termIdQuery && !termIdQuery.success) {
    return res.status(400).json({ errors: termIdQuery.error.issues });
  }

  try {
    const sessions = await getAttendanceSessions(
      subjectIdParam.data,
      termIdQuery?.data,
      req.user.id
    );
    return res.json(sessions);
  } catch (err: any) {
    if (err.message === 'PROFESSOR_NOT_ASSIGNED') {
      return res.status(403).json({
        error: 'You are not assigned to teach this subject',
      });
    }
    throw err;
  }
});

/**
 * Professor gets enrolled students for a subject and term.
 */
router.get('/roster', auth, requireRole('professor'), async (req, res) => {
  const parsed = z
    .object({
      subjectId: z.string().uuid('Invalid subject ID'),
      termId: z.string().uuid('Invalid term ID'),
    })
    .safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.issues });
  }

  try {
    const roster = await getEnrolledStudents(
      parsed.data.subjectId,
      parsed.data.termId,
      req.user.id
    );
    return res.json(roster);
  } catch (err: any) {
    if (err.message === 'PROFESSOR_NOT_ASSIGNED') {
      return res.status(403).json({
        error: 'You are not assigned to teach this subject in this term',
      });
    }
    throw err;
  }
});

/**
 * Professor gets attendance records and roster for a specific session.
 */
router.get('/sessions/:sessionId/records', auth, requireRole('professor'), async (req, res) => {
  const parsed = z.string().uuid('Invalid session ID').safeParse(req.params.sessionId);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.issues });
  }

  try {
    const data = await getAttendanceForSession(parsed.data, req.user.id);
    return res.json(data);
  } catch (err: any) {
    if (err.message === 'SESSION_NOT_FOUND') {
      return res.status(404).json({ error: 'Attendance session not found' });
    }
    if (err.message === 'FORBIDDEN') {
      return res.status(403).json({
        error: 'You are not authorized to view records for this session',
      });
    }
    throw err;
  }
});

/**
 * Professor marks or updates attendance records (single or batch).
 */
router.post('/records', auth, requireRole('professor'), async (req, res) => {
  const parsed = markRecordsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.issues });
  }

  const sessionId = parsed.data.sessionId;
  const records =
    'records' in parsed.data
      ? parsed.data.records
      : [{ studentId: parsed.data.studentId, status: parsed.data.status }];

  try {
    const saved = await saveAttendanceRecords({
      sessionId,
      professorId: req.user.id,
      records,
    });
    return res.status(200).json(saved);
  } catch (err: any) {
    if (err.message === 'SESSION_NOT_FOUND') {
      return res.status(404).json({ error: 'Attendance session not found' });
    }
    if (err.message === 'FORBIDDEN') {
      return res.status(403).json({
        error: 'You are not authorized to manage attendance for this session',
      });
    }
    if (err.message === 'NOT_LATEST_SESSION') {
      return res.status(403).json({
        error: 'Only the latest attendance session for this subject can be edited',
      });
    }
    if (err.message === 'STUDENT_NOT_ENROLLED') {
      return res.status(400).json({
        error: 'One or more students are not enrolled in this subject for this term',
      });
    }
    throw err;
  }
});

/**
 * Student retrieves their own attendance history and percentage.
 */
router.get('/my', auth, requireRole('student'), async (req, res) => {
  try {
    const data = await getAttendanceForStudent(req.user.id);
    return res.json(data);
  } catch (err: any) {
    throw err;
  }
});

export default router;
