# API Endpoints

> Reference for every route currently built. See `Backend_Setup_Journal.md`
> (`docs/backend/`) for the reasoning behind each design decision, and
> `API_Testing_Checklist.md` (`docs/api/`) for confirmed test results.
> Base URL: `http://localhost:3000/api` locally.

---

## `subjects`

| Method | Path | Purpose | Body |
|---|---|---|---|
| `GET` | `/subjects` | List all subjects | — |
| `GET` | `/subjects/:id` | Get one subject | — |
| `POST` | `/subjects` | Create a subject | `{ name, code?, departmentId? }` |

`code` is unique — duplicate `POST` returns `409`.

---

## `departments`

| Method | Path | Purpose | Body |
|---|---|---|---|
| `GET` | `/departments` | List all departments | — |
| `GET` | `/departments/:id` | Get one department | — |
| `POST` | `/departments` | Create a department | `{ name, code? }` |

`code` is unique — duplicate `POST` returns `409`.

---

## `terms` (academicTerms)

| Method | Path | Purpose | Body |
|---|---|---|---|
| `GET` | `/terms` | List all terms | — |
| `GET` | `/terms/current` | Get the current term | — |
| `POST` | `/terms` | Create a term | `{ name, startDate?, endDate? }` |
| `PATCH` | `/terms/:id/set-current` | Set this term as current | — |

`set-current` runs inside a DB transaction — unsets the old current
term and sets the new one together, so there's never a moment with
zero current terms. `GET /terms/current` returns `404` if none is set.

---

## `enrollments`

| Method | Path | Purpose | Body |
|---|---|---|---|
| `GET` | `/enrollments/student/:studentId` | Get a student's **current-term** enrollments | — |
| `POST` | `/enrollments` | Enroll a student in a subject/term | `{ studentId, subjectId, termId }` |

`GET` only returns enrollments where the linked term `isCurrent =
true` — a student's full history isn't returned here by design.
`(studentId, subjectId, termId)` is unique — duplicate `POST` returns
`409`.

---

## `resources`

| Method | Path | Purpose | Body |
|---|---|---|---|
| `GET` | `/resources/subject/:subjectId` | List files for a subject | — |
| `POST` | `/resources/upload-url` | Get a signed Supabase Storage upload URL | `{ subjectId, fileName }` |
| `POST` | `/resources` | Save file metadata after upload | `{ subjectId, uploadedBy, title, fileUrl }` |

The actual file upload happens **directly to Supabase Storage** using
the signed URL from `/upload-url` — never through this Express server.
`/upload-url` and `POST /` are two separate steps in the real flow,
not interchangeable.

---

## `announcements`

| Method | Path | Purpose | Body |
|---|---|---|---|
| `GET` | `/announcements/subject/:subjectId` | Course-specific announcements | — |
| `GET` | `/announcements/general/:departmentId` | Department-wide ("General") announcements | — |
| `POST` | `/announcements` | Create an announcement | `{ subjectId?, title, body, postedBy }` |

Omitting `subjectId` on `POST` makes it a general/department
announcement instead of a course one. `termId` is always resolved
server-side to whatever's current — never accepted from the request.
`POST` returns `409` if no current term is set.

---

## `notifications`

| Method | Path | Purpose | Body |
|---|---|---|---|
| `GET` | `/notifications/user/:userId` | List a user's notifications | — |
| `GET` | `/notifications/user/:userId/unread-count` | Unread count only (for the inbox badge) | — |
| `PATCH` | `/notifications/:id/read` | Mark one notification read | — |

**No `POST` route on purpose** — notifications are only ever created
internally, by other services calling `createNotification()` directly
(e.g. when a ticket or announcement is created), never by a direct
user-facing endpoint.

---

## `users`

| Method | Path | Purpose | Body |
|---|---|---|---|
| `GET` | `/users` | List all users | — |
| `GET` | `/users/:id` | Get one user | — |
| `POST` | `/users` | Create a user (professor/admin, one at a time) | `{ email, fullName, role, departmentId?, rollNo?, facultyId?, admissionYear? }` |

**⚠️ `POST` sends a real Supabase Auth invite email and creates a real
login-capable account** — not a plain database insert like every other
module's `POST`. If the database insert fails after the Auth account
was created, the Auth account is automatically deleted as cleanup, so
no orphaned accounts are left behind. `email`/`rollNo`/`facultyId` are
all unique — duplicates return `409`.

**Known limitation, not yet fixed:** Supabase's default email sender
has a very low rate limit (a handful of emails/hour), meant only for
dev testing — this will block real bulk admin CSV imports (§19,
architecture doc) until a real SMTP provider is configured in the
Supabase dashboard. See the journal's Part 9 for details.

**Not yet built:** CSV bulk-import for creating many student accounts
at once (§19). This `POST /` is the single-account path only.

---

## Not yet built at all

- Auth middleware / role-checking on any route above (Tripti's side —
  every route listed here is currently open, no login required)
- `tickets`, `ticket_messages`, `attendance_sessions`,
  `attendance_records` modules (Tripti's side)
- CSV bulk-import endpoint for `users`
