# Campus Communication Portal — FINAL V1.2 Architecture

> **Status:** Reconciled with Database Schema V2. The only functional
> change from V1.1 is that the attendance model is now backed by
> `attendance_sessions` + `attendance_records` instead of a single
> `attendance` table — which V1.1's own summary diagram already implied
> but the schema hadn't caught up to. Everything else below is unchanged
> from V1.1 unless marked **[V1.2]**.

---

# 1. Project Goal

The Campus Communication Portal bridges the communication gap between
students and professors.

Four major modules: Attendance, Announcements, Queries/Tickets, Academic
Documents.

Three roles: Student, Professor, Admin.

---

# 2. Technology Architecture

```text
React + Vite + TypeScript
          |
          | REST / JSON
          v
Node.js + Express + TypeScript
          |
          +----------------------+
          |                      |
          v                      v
     Drizzle ORM           Supabase Services
          |                /       |       \
          v              Auth   Storage   Realtime*
      PostgreSQL

* Realtime is used for `tickets`, `ticket_messages`, and
  `notifications` — live ticket threads, live ticket lists, and a live
  inbox count. Everything else still goes through the REST/backend
  path only. See §18.1 for the full design and §19 of the schema doc
  for the actual RLS policies this requires (Realtime evaluates RLS to
  decide what a subscribed client receives, so these 3 tables have
  real granting policies — the other 10 stay RLS-enabled with zero
  policies, deny-all except the backend's service role key).
```

**Frontend** — Routing, role-based UI, forms/validation, course/module
views, attendance UI, query threads, announcement/document views, inbox.

**Backend** — Auth/session verification, authorization, validation,
business logic, REST APIs, DB access via Drizzle, notification creation,
attendance processing, signed Storage URL generation.

**PostgreSQL** — Academic relationships, enrollments, teaching
assignments, attendance sessions/records, tickets/messages,
announcements, resources, notifications.

**Supabase** — Auth, file storage, Auth UUID identity foundation.

---

# 3. Identity Architecture (unchanged)

```text
auth.users.id = public.users.id
```

Every person-related FK points to `users.id`. `roll_no` and
`faculty_id` are display/login-lookup attributes only — never FKs.

---

# 4. Academic Architecture (unchanged)

```text
Department
     |
     v
  Subject
   /    \
  /      \
Professor  Students
   |         |
   v         v
Teaching   Enrollment
Assignment
```

V1 assumption: a subject has one professor per academic term. A student
can have multiple enrolled subjects.

---

# 5. Semester / Academic-Term Architecture

## Decision (unchanged)

Do **not** store a mutable `current_semester` on every student — that
forces the admin to update every student every term.

Instead, the student stores `admission_year` **[V1.2: now a real
column, `users.admission_year`, not just a conceptual field]**.

The academic-term table stores actual academic periods, and expected
semester is derived at query time:

```text
admission year + current academic term → expected semester
```

Example: admission year 2024, term `2026-27 Odd` → expected Semester 5.

**[V1.2] `academic_terms.is_current` is now backed by a partial unique
index**, so exactly zero or one term can be current at a time — this
was an open question in the review pass and is now enforced by the
database, not just application discipline.

### Critical rule (unchanged)

The calculated semester is a convenience/display value only.
**Enrollment remains the source of truth** for which courses a student
actually has — this is what makes backlog/repeat cases work without
extra schema.

---

# 6. Login Workflow (unchanged)

```text
Login
  +--> Student → roll_no + password
  +--> Professor → faculty_id + password
  +--> Admin → admin credentials
             ↓
        Supabase Auth → authenticated UUID → public.users → role-based access
```

---

# 7. Global Application Shell (unchanged)

```text
Top Bar: user name/profile, inbox icon + unread count
Sidebar: navigation, theme toggle, logout
Main Content: current module
```

Student and professor share the shell; admin gets the shell plus
administrative controls.

## 7.1. Interaction states — noted for reference

Every primary button across the app carries three visual states:
default, hover (brightened), and active/pressed (dimmed + slight
scale-down on click). This is a design note for the record, not an
instruction to implement it in any particular file right now — it's
just documented here so it doesn't get forgotten when the actual
components get built.

---

# 8. Home Page (unchanged)

Four sections: Attendance, Queries, Documents, Announcements. Inbox is
powered by `notifications`.

---

# 9. Course Visibility — FINAL, term-scoping made explicit

Student: `users(student) → enrollments → subjects`
Professor: `users(professor) → professor_subject_map → subjects`

**Both filtered to the current term, explicitly — not just implied.**
`enrollments` and `professor_subject_map` both carry `term_id`; every
course-list query joins against `academic_terms.is_current = true`.
Without this stated explicitly, a 3rd-year student's course list would
silently include every subject they've ever been enrolled in since
1st year, not just this term's.

Frontend never maintains a separate permanent course list.

---

# 9.5. Navigation Pattern — FINALIZED

Not every "select a course → see more" interaction gets the same
treatment. The rule: **route content that's a list or a conversation
with unbounded length (tickets, resources, announcements). Keep
content that's small and fixed as an in-place expand (attendance).**
An in-place expand only becomes a mobile problem when it's a fixed-
height box measuring/animating variable-length content — attendance's
detail is a handful of numbers or a marking form, so it expands the
page naturally (pushes content down, normal scroll) with no such risk.

**Every route below is shared between Student and Professor — there is
no `/student/...` vs `/professor/...` split.** Role is never read from
the URL. Each page component reads the logged-in user's role from
session/auth context and branches on it — same route, same component,
different controls and different data query (`enrollments` for a
student's course list vs `professor_subject_map` for a professor's).
**Admin is the one exception:** its functionality (manage users,
departments, terms) isn't a course concept, so it keeps its own
`/admin/...` routes rather than being forced into this shape.

## Route map

```text
Attendance — no route change, inline expand only
  /attendance                          → course list; click a course,
                                          panel expands in place
                                          (student: stats; professor:
                                          marking form + "which class
                                          today" picker)

Resources
  /resources                           → course list
  /resources/:subjectId                → file list (+ professor-only
                                          upload control)

Announcements
  /announcements                       → course tiles + "General" tile
  /announcements/:subjectId            → announcement list (+
                                          professor-only post form)
  /announcements/general               → department-general
                                          announcements (professor-only
                                          post form for their dept)

Queries
  /queries                             → course list
  /queries/:subjectId/pending          → pending tickets (+
                                          student-only "add new" form,
                                          inline — not its own route)
  /queries/:subjectId/resolved         → resolved + closed tickets
  /queries/:subjectId/ticket/:ticketId → thread view
```

**Why routing for the other three, not an accordion:** an in-place
expand relies on measuring/animating a container's height, which
doesn't hold up against variable-length content on a small viewport (a
2-message ticket vs a 40-message thread), has no back-button behavior,
and can't be deep-linked or refreshed back into. Routing sidesteps all
of that for free.

## Desktop vs. mobile — same routes, different layout

The split-pane feel on desktop and the drill-down feel on mobile come
from **one CSS breakpoint**, not two implementations:

- **≥768px:** a parent layout renders the course list on the left and
  `<Outlet />` (whichever detail route is active) on the right — both
  visible at once, master-detail style, like an email client.
- **<768px:** the exact same routes render single-column — navigating
  to a detail route replaces the whole screen, with a back action;
  nothing is duplicated, it's the same route tree.

Nesting stops at one level: the top split is *course list ↔ subject
detail area*. Anything deeper (pending/resolved tabs, the ticket
thread, the add-new form) is just further routing **within** that
detail area, on both breakpoints — not a second split-pane level. This
keeps the layout manageable instead of needing a 3-pane desktop view.

One detail component per module (`AttendanceDetail` — not routed,
`ResourceDetail`, `AnnouncementDetail`, `TicketList`, `TicketThread`),
shared across both roles and both breakpoints.

---

# 10. Attendance — FINAL V2 Workflow **[V1.2: restructured]**

## Student workflow (unchanged behavior, new backing tables)

```text
Attendance → Registered Courses → Select Course
  → Panel expands in place, same page (see §9.5 — not routed)
  → Show: classes held, classes attended, classes absent, attendance %
```

No editing permission for students. No `leave` status in V1.

```text
attendance percentage = classes attended / classes held × 100
```

Under the hood this is now:
`attendance_records` joined to `attendance_sessions`, filtered by
student + subject + term.

## Professor workflow — FINAL V1.3: checklist only, no typing, no upload

```text
Attendance → Professor's Courses → Select Course
  → Latest attendance class/session
  → Checklist of enrolled students, tap to mark absent
  → Mark those absent, mark all other enrolled students present
```

**Changed from typed roll-suffixes to a checklist — this fully
replaces the old input form, not adds to it.** Typing suffixes from
memory silently breaks for backlog students, whose roll number doesn't
match the pattern the professor expects for that batch — the professor
would need to already know a backlog student is in the room to type
their suffix correctly. A checklist sidesteps this entirely: the
backend pulls the actual enrolled roster for that subject+term (which
already correctly includes backlog students — `enrollments` is the
source of truth regardless of expected semester, per §5), and the
professor taps names instead of typing anything. There is no text
input, no file upload, and no ambiguity-matching step anywhere in this
screen — just the checklist.

**[V1.2, still true]** Each act of marking attendance creates one
`attendance_sessions` row plus one `attendance_records` row per
enrolled student, rather than writing directly into a flat table keyed
by date — this is what makes multiple sessions of the same subject on
the same day representable without a future migration.

### Resolution rule — FINAL V1.3

1. Find students enrolled in the selected subject for the current term
   — this roster is what populates the checklist.
2. Absent students: whichever were tapped in the checklist.
3. Mark absent students `absent`, all other enrolled students
   `present`, all attached to the one session created for this marking
   action.

---

# 11. Attendance Editing — FINAL V2 Rule **[V1.2]**

A professor can edit only the **latest `attendance_sessions` row** for
a given subject + term, defined as the row with the max `created_at`.
Older sessions (and their records) are read-only.

The backend enforces this by checking the session being edited is
actually the latest one for that subject/term before allowing writes —
never trust the frontend hiding the edit button.

**Still open (college policy, not schema):** does "latest" stay
editable forever until a newer session exists, or does it lock after a
fixed window (e.g. end of day)? Pick one before launch; either is a
one-line backend check against `attendance_sessions`.

---

# 12. Announcement — FINAL V1.4 Workflow

Two destinations: Course, or General (department, derived from
`posted_by → users.department_id`). No global/institution-wide
announcement in V1 — confirmed, not adding a `scope` field.

```text
subject_id != NULL → course announcement
subject_id == NULL → department/general announcement
```

**[V1.3] Missing navigation entry point, now fixed:** the data model
always supported department-general announcements
(`subject_id IS NULL`), but the course-list page never gave anyone a
way to actually reach them — only individual subjects had a tile.
Fixed by adding a **"General" tile** alongside the course tiles on
`/announcements`, routing to its own detail view:

```text
/announcements          → course tiles + one "General" tile
/announcements/:subjectId → that course's announcements
/announcements/general    → department-general announcements
                             (subject_id IS NULL, filtered to the
                             viewer's own department)
```

**[V1.4] Term-scoping gap, now fixed:** `announcements` now carries
`term_id`, resolved to the current term at posting time — for both
course and general announcements. Without this, a stale "class shifted
to Room 204" from last term would read as true today, since nothing
marked it as old. Both `/announcements/:subjectId` and
`/announcements/general` filter by current `term_id` by default.

Professors post; admin does not (§19). The "General" tile is visible
to both roles — professors can post to it (their own department's
general feed), students only read it.

---

# 13. Documents Workflow (unchanged, routed per §9.5)

Student: `Documents → Registered courses → Select course (navigates) → View → Download`
Professor: `Documents → Professor's courses → Select course (navigates) → Upload → Supabase Storage → resources row`

---

# 14–17. Query / Ticket Architecture — FINAL, term-scoping added

Threaded conversation, one ticket = one thread, structured as:

```text
/queries/:subjectId/pending  → pending tickets (+ student "add new" form)
/queries/:subjectId/resolved → resolved + closed tickets
/queries/:subjectId/ticket/:ticketId → thread view
```

`student_id`, `subject_id`, `professor_id`, and `term_id`
(backend-resolved) on ticket creation; every reply is a
`ticket_messages` row on the same `ticket_id`, never a new ticket.

**Term-scoping gap, now fixed:** `professor_subject_map` allows a
different professor to teach the same subject next term. Without
`term_id` on `tickets`, `/queries/:subjectId/pending` would show every
unresolved ticket ever filed for that subject code — including ones
addressed to whoever taught it last term. Both `pending` and
`resolved` list queries now filter by `subject_id` **and** current
`term_id`.

Lifecycle: `PENDING → RESOLVED → (reopen → PENDING | student satisfied → CLOSED)`.
No separate `answered` state. `ticket_categories` stays removed.

---

# 18. Notifications / Inbox — FINAL, with live-update strategy

Notifications are event records, not source of truth — the underlying
ticket/announcement row remains canonical; a `notifications` row is
created alongside it for the recipient's inbox.

## 18.1. Live updates — Supabase Realtime (tickets, ticket_messages, notifications)

The problem: without something pushing updates, a professor viewing
`/queries/:subjectId/pending` wouldn't see a new ticket a student just
filed until they manually refresh. Same for a student waiting on a
reply, and for the inbox unread count in the top bar (§7).

**Decision: Supabase Realtime, scoped to exactly 3 tables** — `tickets`,
`ticket_messages`, `notifications`. Every other table in the app stays
on the plain REST path with no subscription, no exception.

- **Ticket thread open** (`/queries/:subjectId/ticket/:ticketId`):
  subscribed to `ticket_messages` for that `ticket_id` — new replies
  appear without a refresh.
- **Pending/resolved ticket lists**: subscribed to `tickets` (insert/
  update events) — a new ticket or a status change appears in the list
  live.
- **Inbox unread count** (top bar): subscribed to `notifications` for
  the logged-in user.

This requires real RLS *granting* policies on these 3 tables — see §19
of the schema doc for the actual policy SQL (participant-based checks,
plus a `security definer` helper function for `ticket_messages` since
it needs to check the parent ticket's ownership) — and adding all 3 to
the Realtime publication, which is a **separate step from writing the
policies** (see the setup guide if nothing fires after policies are in
place — that's almost always this step).

### Non-negotiable: unsubscribe on unmount

**Every component that opens a Realtime channel must remove it in a
`useEffect` cleanup function.** Skipping this is the single most common
Realtime bug — it doesn't crash anything, it just silently causes
duplicate listeners to stack up as someone navigates around, which
shows up as messages/notifications appearing two or three times
instead of once. If something is duplicating, this is the first thing
to check.

```tsx
useEffect(() => {
  const channel = supabase
    .channel(`ticket-${ticketId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticket_messages', filter: `ticket_id=eq.${ticketId}` }, handleNewMessage)
    .subscribe();

  return () => {
    supabase.removeChannel(channel); // ← required, not optional
  };
}, [ticketId]);
```

### What Realtime does *not* do — still the app's responsibility

- **Term-scoping.** RLS policies check *ownership* (is this your
  ticket), not *current term*. The subscription's filter, and the
  initial list fetch it's layered on top of, are what enforce the
  current-term scoping from §7/§14–17 — RLS doesn't do this for you.
- **A dead connection isn't obvious.** Websockets drop silently on
  flaky wifi/mobile networks more often than expected — nothing
  visibly errors, updates just stop arriving. Keep a slow background
  reconciliation poll (~60s) running underneath the Realtime
  subscription as a fallback, even though the subscription is doing
  the real work most of the time. This isn't a sign Realtime "isn't
  working" — it's normal production practice.
- **The subscribing client must carry the logged-in user's session.**
  `auth.uid()` in the RLS policies only resolves correctly if the
  Supabase client instance used for the subscription has that user's
  JWT attached — i.e. the same client instance used for
  login/session, not a fresh anonymous one. A silent "policy looks
  right but nothing arrives" bug is usually this.

### Debugging checklist, if Realtime isn't firing

1. Is the table actually in the Realtime publication? (Separate step
   from RLS — see §19, schema doc.)
2. Is the RLS policy actually matching — does `auth.uid()` equal the
   `student_id`/`professor_id` on the row being tested?
3. Is the subscription using the authenticated client, not the anon
   client?
4. Does the subscription's `filter` actually match the row (e.g.
   `ticket_id=eq.${ticketId}` — typo'd variable, wrong column)?
5. Duplicate events firing instead of nothing firing? → almost
   certainly a missing `removeChannel()` on unmount somewhere.

---

# 19. Admin Architecture — FINAL V1.4

Admin does not share routes with Student/Professor — it's a genuinely
different information architecture (`/admin/*`), not a role branch
inside the shared pages (§9.5). Scope: manage academic relationships
and user accounts; does **not** post announcements, does not touch
attendance/tickets/resources — those stay entirely inside the
Professor/Student workflows.

## Page structure

```text
People
  /admin/students                → list all students; "+ Import CSV",
                                    "+ Add student" (manual, one-off)
  /admin/students/:id            → read-only detail: enrollments,
                                    attendance summary, ticket count;
                                    "Reset password" action
  /admin/professors               → list all professors; "+ Add
                                    professor" (manual form)
  /admin/professors/:id          → read-only detail: assigned
                                    subjects; "Reset password" action

Academic setup
  /admin/departments              → CRUD
  /admin/subjects                 → CRUD, assign to department
  /admin/terms                    → CRUD, toggle `is_current`
                                    (single-current enforced by the
                                    partial unique index, §3)

Course mapping
  /admin/assignments              → assign one professor to one
                                    subject for a term (single-record
                                    form — low volume, no bulk needed;
                                    DB rejects a second professor on
                                    the same subject/term, §5)
  /admin/enrollments              → pick subject + term, bulk-enroll
                                    students via a searchable
                                    checklist (dual "not enrolled" /
                                    "enrolled" list), or CSV of
                                    roll_no as an alternative bulk path
```

`/admin/students/:id` and `/admin/professors/:id` are **not** the same
pages Student/Professor see for their own attendance/queries — they're
separate, admin-only read-only views built from admin-specific
queries. Admin visibility into someone's data is a summary page, not
literally stepping into their shoes.

## Creating accounts — students and professors both use real email

Every student from 2nd semester onward already has a college-issued
email — V1 is scoped to 2nd semester and above, so this is the only
path needed; 1st-semester onboarding (where that isn't true yet) is
explicitly out of scope for now.

**Students — CSV bulk import:**

```text
Admin → /admin/students → Import CSV
  → Select department + admission year for this batch
  → Upload CSV (roll_no, full_name, email)
  → Backend validates each row, creates one `users` row per valid
    row (role = student), and sends a Supabase invite link to each
    email — student sets their own password, admin never assigns one
```

Department and admission year are picked once for the whole upload
(not per row), since a batch is normally one department/year.

**Professors — manual, one at a time:** far fewer of them, added
irregularly rather than in a single batch, so a form (full name,
faculty ID, department, email) makes more sense than CSV. Same invite-
link mechanism as students — professor sets their own password.

**Validation, not silent best-effort (applies to the CSV path):**
- `roll_no` must be unique (enforced by the existing DB constraint,
  §1) — a row colliding with an existing student is rejected and
  reported, not skipped quietly.
- Malformed rows (missing name, empty roll number, missing/invalid
  email) are reported the same way.
- Successful rows and rejected rows are both shown back to the admin
  after the import — never a silent partial success.

**No schema change required.** Both paths write into the same `users`
table every other account-creation path writes into. This is entirely
separate from attendance (§10), which has no CSV or typed input
anywhere — checklist only.


---

# 20. Backend Request Workflow (unchanged)

```text
React UI → REST API → Express route → Auth middleware → Role/permission check
→ Validation → Business/service logic → Drizzle → PostgreSQL → Response → React UI
```

---

# 21. Authorization Rules (unchanged)

**Student** — own courses, own attendance (read-only), tickets for
enrolled courses only, own tickets only, resources for their courses,
announcements for their department/courses.

**Professor** — assigned courses only, mark attendance only for
assigned courses, edit only the latest attendance session, post
announcements for assigned courses or own department/general scope,
reply to routed tickets, upload resources for assigned courses.

**Admin** — manage academic relationships and users; does not post announcements.

---

# 22. Final V1.2 Architecture Summary

```text
                         SUPABASE AUTH
                              |
                              v
                            USERS (+ admission_year for students)
                         /    |    \
                        /     |     \
                  Student  Professor  Admin
                     |        |
                Enrollments   Teaching Assignment
                     |        |
                     +---- SUBJECTS ----+
                            / |  |  \
                           /  |  |   \
                          /   |  |    \
                 Attendance  Docs  Announcements
                 Sessions
                      |
               Attendance Records ---- users(student)

Student + Professor
        |
        v
      Tickets → Ticket Messages → Notifications / Inbox
```

---

# 23. Open Questions — All Resolved

Everything that was open in earlier passes is now confirmed:

- ~~Should `attendance` support multiple sessions/day?~~ → yes,
  structurally solved via `attendance_sessions`/`attendance_records`.
- ~~Should only one term be `is_current`?~~ → enforced via partial
  unique index.
- ~~Does `announcements` need a `scope` field for global posts?~~ →
  no, confirmed not required.
- **Backlog/repeat students** → confirmed: the UI does **not**
  visually flag such enrollments. `enrollments` already handles it
  with zero schema changes; no extra UI treatment needed.
- **Academic-term semantics** → confirmed (§3, schema doc): Odd term
  = July–December, Even term = January–June, no overlap — the moment
  one term stops being current, the next becomes current immediately.
  Admin maintains this manually by flipping `is_current`.
- **Attendance correction window** → confirmed: a session stays
  editable indefinitely, until the next class is marked for that
  subject — not a fixed time window (§11).
- **Roll-number matching/collisions** → no longer applicable. This
  was written when marking used typed suffixes, which was fully
  removed in favor of a checklist (§10). There's no free text to match
  and therefore no ambiguity case: the professor sees every enrolled
  student in the checklist and taps who's absent, nothing is typed.
- **Sections / multiple professors per subject** → confirmed: not
  needed. One professor per subject per term, and the database now
  rejects a second professor being assigned to the same subject/term
  (`UNIQUE(subject_id, term_id)` on `professor_subject_map`, §5).

Nothing remains open at the architecture level going into implementation.

---

# 24. Recommended Implementation Order (unchanged)

**Phase 1 — Foundation:** Supabase Auth, PostgreSQL, Drizzle,
Express+TS, auth middleware, role authorization.

**Phase 2 — Academic layer:** Departments, Subjects, Academic terms,
Professor-subject assignments, Student enrollments.

**Phase 3 — Modules:** Attendance (sessions + records), Announcements,
Documents, Queries.

**Phase 4 — Cross-cutting:** Notifications, Inbox, Storage permissions,
Validation, Error handling, Security/RLS.

**Phase 5 — Frontend integration:** Shared app shell, then each module
via the same course-selection interaction pattern.
