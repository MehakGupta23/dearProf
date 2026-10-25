import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '../../lib/auth';
import {
  getMyAttendance,
  getTerms,
  getSubjects,
  getTeachingAssignments,
  getAttendanceSessions,
  createAttendanceSession,
  getAttendanceForSession,
  saveSessionAttendance,
  type StudentAttendanceData,
  type Term,
  type Subject,
  type Assignment,
  type AttendanceSession,
  type SessionDetailsResponse,
} from '../../lib/api';
import './Attendance.css';

/**
 * Format date string (YYYY-MM-DD) into readable localized format
 */
function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get current date string in local YYYY-MM-DD
 */
function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function Attendance() {
  const { profile } = useAuth();

  if (!profile) {
    return <div className="attendance-page loading-skeleton">Loading user profile...</div>;
  }

  if (profile.role === 'student') {
    return <StudentAttendanceView />;
  }

  if (profile.role === 'professor') {
    return <ProfessorAttendanceView professorId={profile.id} />;
  }

  return (
    <div className="attendance-page">
      <div className="attendance-header">
        <p className="attendance-eyebrow">ATTENDANCE</p>
        <h1>Attendance Management</h1>
        <p className="attendance-subtitle">
          Attendance tracking is managed directly by course professors and viewed by enrolled students.
        </p>
      </div>
      <div className="empty-attendance">
        <div className="empty-icon">ℹ</div>
        <h3>Admin Notice</h3>
        <p>
          Administrators do not mark attendance directly. You can manage subject enrollments and professor teaching
          assignments via the admin dashboard.
        </p>
      </div>
    </div>
  );
}

/* ==========================================================================
   STUDENT ATTENDANCE VIEW
   ========================================================================== */
function StudentAttendanceView() {
  const [data, setData] = useState<StudentAttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');

  const loadData = useCallback(() => {
    let active = true;
    getMyAttendance()
      .then((res) => {
        if (active) {
          setData(res);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to load attendance records.');
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return loadData();
  }, [loadData]);

  const filteredRecords = useMemo(() => {
    if (!data) return [];
    if (selectedSubjectId === 'all') return data.records;
    return data.records.filter((r) => r.subjectId === selectedSubjectId);
  }, [data, selectedSubjectId]);

  if (loading) {
    return (
      <div className="attendance-page">
        <div className="attendance-header">
          <p className="attendance-eyebrow">ACADEMIC PROGRESS</p>
          <h1>My Attendance</h1>
          <p className="attendance-subtitle">Loading your attendance records...</p>
        </div>
        <div className="loading-skeleton">Fetching session data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="attendance-page">
        <div className="attendance-header">
          <p className="attendance-eyebrow">ACADEMIC PROGRESS</p>
          <h1>My Attendance</h1>
        </div>
        <div className="alert-banner error">
          <span>{error}</span>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setLoading(true);
              loadData();
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const overall = data?.overall ?? { totalSessions: 0, presentSessions: 0, absentSessions: 0, percentage: 100 };
  const summaries = data?.summary ?? [];

  return (
    <div className="attendance-page">
      <div className="attendance-header">
        <p className="attendance-eyebrow">ACADEMIC PROGRESS</p>
        <h1>My Attendance</h1>
        <p className="attendance-subtitle">
          Review your attendance records, track subject percentages, and monitor session history.
        </p>
      </div>

      {/* Overall Stats Cards */}
      <div className="attendance-stat-grid">
        <div className="stat-card">
          <span className="stat-card-label">Overall Attendance</span>
          <div className="stat-card-value">
            {overall.percentage}%
            <span className={`stat-badge ${overall.percentage >= 75 ? 'good' : 'warning'}`}>
              {overall.percentage >= 75 ? 'On Track' : 'Needs Attention'}
            </span>
          </div>
          <span className="stat-card-caption">Target minimum: 75%</span>
        </div>

        <div className="stat-card">
          <span className="stat-card-label">Attended Classes</span>
          <div className="stat-card-value">{overall.presentSessions}</div>
          <span className="stat-card-caption">Out of {overall.totalSessions} total held</span>
        </div>

        <div className="stat-card">
          <span className="stat-card-label">Absences</span>
          <div className="stat-card-value">{overall.absentSessions}</div>
          <span className="stat-card-caption">
            {overall.absentSessions === 0 ? 'No recorded absences' : 'Missed class sessions'}
          </span>
        </div>
      </div>

      {/* Subject-wise Cards */}
      {summaries.length > 0 && (
        <div className="subject-summary-section">
          <div className="section-heading">
            <span>Course Attendance</span>
            {selectedSubjectId !== 'all' && (
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setSelectedSubjectId('all')}
              >
                Clear Filter (Show All)
              </button>
            )}
          </div>

          <div className="subject-cards-grid">
            {summaries.map((s) => {
              const isSelected = selectedSubjectId === s.subjectId;
              const isGood = s.percentage >= 75;
              return (
                <div
                  key={s.subjectId}
                  className={`subject-attendance-card ${isSelected ? 'active' : ''}`}
                  onClick={() =>
                    setSelectedSubjectId((curr) => (curr === s.subjectId ? 'all' : s.subjectId))
                  }
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setSelectedSubjectId((curr) => (curr === s.subjectId ? 'all' : s.subjectId));
                    }
                  }}
                >
                  <div className="subject-code-tag">{s.subjectCode || 'SUBJECT'}</div>
                  <h3 className="subject-card-title">{s.subjectName}</h3>
                  <div className="subject-card-stats">
                    <span className="subject-pct">{s.percentage}%</span>
                    <span className="subject-count">
                      {s.presentSessions} / {s.totalSessions} sessions
                    </span>
                  </div>
                  <div className="progress-bar-track">
                    <div
                      className={`progress-bar-fill ${isGood ? 'good' : 'warning'}`}
                      style={{ width: `${Math.min(s.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Session History Table */}
      <div className="session-history-section">
        <div className="table-toolbar">
          <h2 className="section-heading" style={{ margin: 0 }}>
            {selectedSubjectId === 'all'
              ? 'Session Records'
              : `Records: ${summaries.find((s) => s.subjectId === selectedSubjectId)?.subjectName || ''}`}
          </h2>

          <div className="filter-chip-group">
            <button
              type="button"
              className={`filter-chip ${selectedSubjectId === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedSubjectId('all')}
            >
              All Subjects
            </button>
            {summaries.map((s) => (
              <button
                key={s.subjectId}
                type="button"
                className={`filter-chip ${selectedSubjectId === s.subjectId ? 'active' : ''}`}
                onClick={() => setSelectedSubjectId(s.subjectId)}
              >
                {s.subjectCode || s.subjectName}
              </button>
            ))}
          </div>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="empty-attendance">
            <div className="empty-icon">✓</div>
            <h3>No Attendance Records</h3>
            <p>
              {summaries.length === 0
                ? 'Your professors have not published any attendance sessions for your courses yet.'
                : 'No session records found for the selected course filter.'}
            </p>
          </div>
        ) : (
          <div className="attendance-table-container">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Course</th>
                  <th>Session Label</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{formatDate(r.sessionDate)}</strong>
                    </td>
                    <td>
                      <div>
                        <strong>{r.subjectCode ? `${r.subjectCode} — ` : ''}</strong>
                        {r.subjectName}
                      </div>
                    </td>
                    <td>{r.sessionLabel || <span style={{ color: 'var(--ink-40)' }}>Regular Session</span>}</td>
                    <td>
                      <span className={`status-pill ${r.status}`}>
                        <span className="status-dot" />
                        {r.status === 'present' ? 'Present' : 'Absent'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ==========================================================================
   PROFESSOR ATTENDANCE VIEW
   ========================================================================== */
function ProfessorAttendanceView({ professorId }: { professorId: string }) {
  // Term & Subject selector states
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  // Sessions list
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // Active Session Details & Roster
  const [sessionDetails, setSessionDetails] = useState<SessionDetailsResponse | null>(null);
  const [rosterStatus, setRosterStatus] = useState<Record<string, 'present' | 'absent'>>({});
  const [saving, setSaving] = useState(false);

  // New Session Creation Form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSessionDate, setNewSessionDate] = useState(getTodayDateString());
  const [newSessionLabel, setNewSessionLabel] = useState('');
  const [creatingSession, setCreatingSession] = useState(false);

  // Notification Banner
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Initial load: terms, subjects, assignments
  useEffect(() => {
    let active = true;
    Promise.all([getTerms(), getSubjects(), getTeachingAssignments()])
      .then(([termsData, subjectsData, assignmentsData]) => {
        if (!active) return;
        setTerms(termsData);
        setAllSubjects(subjectsData);
        setAssignments(assignmentsData);

        const currentTerm = termsData.find((t) => t.isCurrent) || termsData[0];
        if (currentTerm) {
          setSelectedTermId(currentTerm.id);
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        setFeedback({
          message: err instanceof Error ? err.message : 'Failed to load initial terms and courses.',
          type: 'error',
        });
      });

    return () => {
      active = false;
    };
  }, []);

  // Compute subjects assigned to this professor for the selected term
  const assignedSubjects = useMemo(() => {
    if (!selectedTermId || !professorId) return [];
    const assignedIds = new Set(
      assignments
        .filter((a) => a.professorId === professorId && a.termId === selectedTermId)
        .map((a) => a.subjectId)
    );
    return allSubjects.filter((s) => assignedIds.has(s.id));
  }, [assignments, professorId, selectedTermId, allSubjects]);

  // Derived active subject ID
  const effectiveSubjectId = useMemo(() => {
    if (selectedSubjectId && assignedSubjects.some((s) => s.id === selectedSubjectId)) {
      return selectedSubjectId;
    }
    return assignedSubjects[0]?.id || '';
  }, [assignedSubjects, selectedSubjectId]);

  // Load sessions when subject or term changes
  const fetchSessions = useCallback((subjectIdToLoad: string, termIdToLoad: string) => {
    if (!subjectIdToLoad || !termIdToLoad) return () => {};
    let active = true;

    getAttendanceSessions(subjectIdToLoad, termIdToLoad)
      .then((sessionList) => {
        if (!active) return;
        setSessions(sessionList);
        if (sessionList.length > 0) {
          setSelectedSessionId((curr) => {
            const exists = sessionList.find((s) => s.id === curr);
            return exists ? exists.id : sessionList[0].id;
          });
        } else {
          setSelectedSessionId(null);
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        setFeedback({
          message: err instanceof Error ? err.message : 'Failed to load attendance sessions.',
          type: 'error',
        });
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (effectiveSubjectId && selectedTermId) {
      return fetchSessions(effectiveSubjectId, selectedTermId);
    }
  }, [effectiveSubjectId, selectedTermId, fetchSessions]);

  // Load session records when selectedSessionId changes
  useEffect(() => {
    if (!selectedSessionId) return;

    let active = true;

    getAttendanceForSession(selectedSessionId)
      .then((details) => {
        if (!active) return;
        setSessionDetails(details);

        const initialStatus: Record<string, 'present' | 'absent'> = {};
        for (const student of details.records) {
          initialStatus[student.studentId] = student.status || 'present';
        }
        setRosterStatus(initialStatus);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setFeedback({
          message: err instanceof Error ? err.message : 'Failed to load attendance roster for session.',
          type: 'error',
        });
      });

    return () => {
      active = false;
    };
  }, [selectedSessionId]);

  // Create new session handler
  async function handleCreateSession(e: React.FormEvent) {
    e.preventDefault();
    if (!effectiveSubjectId || !selectedTermId || !newSessionDate) {
      setFeedback({ message: 'Please select course, term, and session date.', type: 'error' });
      return;
    }

    try {
      setCreatingSession(true);
      setFeedback(null);
      const created = await createAttendanceSession({
        subjectId: effectiveSubjectId,
        termId: selectedTermId,
        sessionDate: newSessionDate,
        sessionLabel: newSessionLabel.trim() || undefined,
      });

      setShowCreateForm(false);
      setNewSessionLabel('');
      setFeedback({
        message: `Attendance session for ${formatDate(created.sessionDate)} created successfully!`,
        type: 'success',
      });

      // Reload sessions and select the newly created session
      fetchSessions(effectiveSubjectId, selectedTermId);
      setSelectedSessionId(created.id);
    } catch (err: unknown) {
      setFeedback({
        message: err instanceof Error ? err.message : 'Failed to create attendance session.',
        type: 'error',
      });
    } finally {
      setCreatingSession(false);
    }
  }

  // Save / Update Attendance Records
  async function handleSaveAttendance() {
    if (!selectedSessionId || !sessionDetails) return;

    const recordsToSave = sessionDetails.records.map((r) => ({
      studentId: r.studentId,
      status: rosterStatus[r.studentId] || 'present',
    }));

    try {
      setSaving(true);
      setFeedback(null);
      await saveSessionAttendance({
        sessionId: selectedSessionId,
        records: recordsToSave,
      });

      setFeedback({
        message: 'Attendance saved successfully.',
        type: 'success',
      });

      // Reload session details and sessions list to update counts
      const updatedDetails = await getAttendanceForSession(selectedSessionId);
      setSessionDetails(updatedDetails);
      fetchSessions(effectiveSubjectId, selectedTermId);
    } catch (err: unknown) {
      setFeedback({
        message: err instanceof Error ? err.message : 'Failed to save attendance.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  // Quick mark helpers
  function markAll(status: 'present' | 'absent') {
    if (!sessionDetails) return;
    const updated: Record<string, 'present' | 'absent'> = {};
    for (const r of sessionDetails.records) {
      updated[r.studentId] = status;
    }
    setRosterStatus(updated);
  }

  const selectedSubject = assignedSubjects.find((s) => s.id === effectiveSubjectId);
  const isEditable = sessionDetails?.session.isLatest ?? false;

  const totalStudents = sessionDetails?.records.length ?? 0;
  const presentStudentsCount = useMemo(() => {
    return Object.values(rosterStatus).filter((s) => s === 'present').length;
  }, [rosterStatus]);

  return (
    <div className="attendance-page">
      <div className="attendance-header">
        <p className="attendance-eyebrow">ATTENDANCE MANAGEMENT</p>
        <h1>Course Attendance</h1>
        <p className="attendance-subtitle">
          Record, correct, and review session attendance for your assigned academic subjects.
        </p>
      </div>

      {feedback && (
        <div className={`alert-banner ${feedback.type}`}>
          <span>{feedback.message}</span>
          <button type="button" className="btn-ghost" onClick={() => setFeedback(null)}>
            Dismiss
          </button>
        </div>
      )}

      {/* Term & Subject Selectors */}
      <div className="professor-controls-bar">
        <div className="control-field">
          <label htmlFor="term-select">Academic Term</label>
          <select
            id="term-select"
            value={selectedTermId}
            onChange={(e) => setSelectedTermId(e.target.value)}
          >
            {terms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} {t.isCurrent ? '(Current)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="control-field">
          <label htmlFor="subject-select">Assigned Course</label>
          <select
            id="subject-select"
            value={effectiveSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            disabled={assignedSubjects.length === 0}
          >
            {assignedSubjects.length === 0 ? (
              <option value="">No subjects assigned for this term</option>
            ) : (
              assignedSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code ? `${s.code} — ` : ''}
                  {s.name}
                </option>
              ))
            )}
          </select>
        </div>

        {effectiveSubjectId && (
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setShowCreateForm((prev) => !prev);
              setNewSessionDate(getTodayDateString());
            }}
          >
            {showCreateForm ? 'Cancel' : '+ Take Attendance'}
          </button>
        )}
      </div>

      {/* Create Session Form Drawer */}
      {showCreateForm && (
        <form className="create-session-card" onSubmit={handleCreateSession}>
          <h2>New Attendance Session</h2>
          <div className="create-session-grid">
            <div className="control-field">
              <label htmlFor="new-session-date">Session Date</label>
              <input
                id="new-session-date"
                type="date"
                value={newSessionDate}
                onChange={(e) => setNewSessionDate(e.target.value)}
                required
              />
            </div>

            <div className="control-field">
              <label htmlFor="new-session-label">Session Label (Optional)</label>
              <input
                id="new-session-label"
                type="text"
                placeholder="e.g. Lecture 12, Lab Practical 2, Quiz"
                value={newSessionLabel}
                maxLength={100}
                onChange={(e) => setNewSessionLabel(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={creatingSession}>
              {creatingSession ? 'Creating...' : 'Create & Take Attendance'}
            </button>
          </div>
        </form>
      )}

      {/* Main Workspace: Session history sidebar + Roster Marking panel */}
      {assignedSubjects.length === 0 ? (
        <div className="empty-attendance">
          <div className="empty-icon">📚</div>
          <h3>No Teaching Assignments</h3>
          <p>
            You are not assigned to teach any subjects for the selected academic term. Please check the active term or
            contact the administrator.
          </p>
        </div>
      ) : (
        <div className="professor-workspace">
          {/* Sessions Sidebar */}
          <div className="sessions-sidebar">
            <div className="sessions-sidebar-header">
              <h3>Sessions ({sessions.length})</h3>
            </div>

            {sessions.length === 0 ? (
              <div style={{ padding: '24px 18px', textAlign: 'center', color: 'var(--ink-60)', fontSize: '13px' }}>
                No sessions yet. Click "+ Take Attendance" to start.
              </div>
            ) : (
              <ul className="session-list">
                {sessions.map((s) => {
                  const isActive = s.id === selectedSessionId;
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        className={`session-item-btn ${isActive ? 'active' : ''}`}
                        onClick={() => setSelectedSessionId(s.id)}
                      >
                        <div className="session-item-top">
                          <span className="session-item-date">{formatDate(s.sessionDate)}</span>
                          <span className={`badge-tag ${s.isLatest ? 'editable' : 'locked'}`}>
                            {s.isLatest ? 'Latest (Editable)' : 'Locked'}
                          </span>
                        </div>
                        <div className="session-item-sub">
                          <span>{s.sessionLabel || 'Regular Class'}</span>
                          {s.totalMarked !== undefined && s.totalMarked > 0 && (
                            <span>
                              {s.presentCount}/{s.totalMarked} Present
                            </span>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Roster & Marking Canvas */}
          <div className="marking-panel">
            {!selectedSessionId || !sessionDetails ? (
              <div className="empty-attendance" style={{ padding: '60px 20px' }}>
                <div className="empty-icon">✓</div>
                <h3>Select a Session</h3>
                <p>
                  {sessions.length === 0
                    ? 'Create an attendance session above to begin taking attendance.'
                    : 'Select a session from the list on the left to review or edit attendance.'}
                </p>
              </div>
            ) : (
              <>
                <div className="marking-panel-header">
                  <div>
                    <h2 className="session-meta-title">
                      {formatDate(sessionDetails.session.sessionDate)}
                      {sessionDetails.session.sessionLabel ? ` — ${sessionDetails.session.sessionLabel}` : ''}
                    </h2>
                    <p className="session-meta-sub">
                      Course: <strong>{selectedSubject?.name}</strong>{' '}
                      {selectedSubject?.code ? `(${selectedSubject.code})` : ''}
                    </p>
                  </div>

                  <span className={`badge-tag ${isEditable ? 'editable' : 'locked'}`} style={{ fontSize: '12px' }}>
                    {isEditable ? '✏️ Latest Session (Editable)' : '🔒 Locked (Past Session)'}
                  </span>
                </div>

                {!isEditable && (
                  <div className="alert-banner info" style={{ marginBottom: '18px' }}>
                    <span>
                      <strong>Locked:</strong> This is a finalized past session. Under portal policy, only the most
                      recent attendance session for this subject can be edited.
                    </span>
                  </div>
                )}

                {totalStudents === 0 ? (
                  <div className="empty-attendance">
                    <div className="empty-icon">👥</div>
                    <h3>No Students Enrolled</h3>
                    <p>
                      No active students are currently enrolled in this subject for this academic term. Enrollments must
                      be configured before attendance can be taken.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="marking-toolbar">
                      <span className="roster-summary-count">
                        Present: <strong>{presentStudentsCount}</strong> / {totalStudents} (
                        {totalStudents > 0 ? Math.round((presentStudentsCount / totalStudents) * 100) : 0}%)
                      </span>

                      {isEditable && (
                        <div className="quick-mark-actions">
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => markAll('present')}
                          >
                            Mark All Present
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => markAll('absent')}
                          >
                            Mark All Absent
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="roster-table-container">
                      <table className="roster-table">
                        <thead>
                          <tr>
                            <th>Roll Number</th>
                            <th>Student Name</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sessionDetails.records.map((student) => {
                            const currentStatus = rosterStatus[student.studentId] || 'present';
                            return (
                              <tr key={student.studentId}>
                                <td className="roster-roll">{student.rollNo || '—'}</td>
                                <td>
                                  <strong>{student.fullName}</strong>
                                </td>
                                <td>
                                  {isEditable ? (
                                    <div className="status-toggle-group">
                                      <button
                                        type="button"
                                        className={`status-toggle-btn ${
                                          currentStatus === 'present' ? 'active present' : ''
                                        }`}
                                        onClick={() =>
                                          setRosterStatus((prev) => ({
                                            ...prev,
                                            [student.studentId]: 'present',
                                          }))
                                        }
                                      >
                                        Present
                                      </button>
                                      <button
                                        type="button"
                                        className={`status-toggle-btn ${
                                          currentStatus === 'absent' ? 'active absent' : ''
                                        }`}
                                        onClick={() =>
                                          setRosterStatus((prev) => ({
                                            ...prev,
                                            [student.studentId]: 'absent',
                                          }))
                                        }
                                      >
                                        Absent
                                      </button>
                                    </div>
                                  ) : (
                                    <span className={`status-pill ${currentStatus}`}>
                                      <span className="status-dot" />
                                      {currentStatus === 'present' ? 'Present' : 'Absent'}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {isEditable && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={handleSaveAttendance}
                          disabled={saving}
                        >
                          {saving ? 'Saving...' : 'Save Attendance'}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
