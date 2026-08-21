# Campus Communication Portal — Database Schema FINAL

> **Decision:** No multiple sections. One subject, one professor, one
> term — back to the simple model. `course_offerings` from the V3 draft
> is dropped; `professor_subject_map` is back, unchanged in spirit from
> V1/V2.
>
> **Kept as-is:** the `attendance_sessions` / `attendance_records`
> split. This wasn't part of the sections complexity — it's what makes
> "professor can edit the latest attendance they took" a real,
> enforceable rule instead of a guess. That requirement is confirmed,
> so this stays.
>
> **Gap fixed:** `professor_subject_map` allows a subject to have a
> different professor next term, but `tickets` and `announcements` had
> no `term_id` — meaning a professor changeover would leave stale
> tickets/announcements from the previous term showing as if current.
> Both tables now carry `term_id`; see §7 and §12. `resources`
> deliberately does **not** get this — old study material staying
> visible across terms is treated as a feature, not a bug.

This is the schema to build against.

---

## 0. Identity convention

`users.id = auth.users.id`. Every person-referencing FK points to
`users.id`. Never use `roll_no` or `faculty_id` as a foreign key.

---

## 1. `users`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | Same as `auth.users.id` |
| `email` | text UNIQUE NOT NULL | Synced from Auth |
| `full_name` | text NOT NULL | |
| `role` | enum | `student`, `professor`, `admin` |
| `department_id` | uuid FK → departments.id | Nullable for admin |
| `roll_no` | text UNIQUE NULL | Students only |
| `faculty_id` | text UNIQUE NULL | Professors only |
| `admission_year` | int NULL | Students only. Used with the current term to derive expected semester at query time — never stored as a mutable "current semester" field. |
| `is_active` | boolean DEFAULT true | Soft deactivation |
| `created_at` | timestamptz | |

---

## 2. `departments`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text NOT NULL | |
| `code` | text UNIQUE | e.g. `ECE` |

---

## 3. `academic_terms`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text NOT NULL | e.g. `2026-27 Odd` |
| `start_date` | date | |
| `end_date` | date | |
| `is_current` | boolean DEFAULT false | |

```sql
CREATE UNIQUE INDEX one_current_term
ON academic_terms (is_current)
WHERE is_current = true;
```

Guarantees at most one term is current at a time — enforced at the
database level.

**Confirmed semantics:**
- **Odd term** = July 1 – December 31.
- **Even term** = January 1 – June 30. (June is included deliberately —
  excluding it would leave that month matching no term at all.)
- **No overlap between terms.** The moment one term stops being
  current, the next one becomes current immediately — there's no
  transition window where two terms are both active.
- Admin maintains this manually — flipping `is_current` from the
  outgoing term's row to the incoming term's row is an explicit admin
  action (e.g. at term changeover), not something the system infers
  automatically from today's date. The partial unique index above just
  guarantees that action can never leave two terms current at once.

Example rows:

| `name` | `start_date` | `end_date` |
|---|---|---|
| `2026-27 Odd` | `2026-07-01` | `2026-12-31` |
| `2026-27 Even` | `2027-01-01` | `2027-06-30` |

**Semester is never stored.** Expected semester = `admission_year` +
current term, computed at query/display time. `enrollments` remains
the source of truth for what a student is actually taking, so backlog/
repeat cases just work without any special-casing.

---

## 4. `subjects`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text NOT NULL | |
| `code` | text UNIQUE | e.g. `EC301` |
| `department_id` | uuid FK → departments.id | |

---

## 5. `professor_subject_map`

One professor teaches one subject in a given term. No sections.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `professor_id` | uuid FK → users.id | Must reference professor |
| `subject_id` | uuid FK → subjects.id | |
| `term_id` | uuid FK → academic_terms.id | |
| `created_at` | timestamptz | |
| UNIQUE | (`professor_id`, `subject_id`, `term_id`) | |
| UNIQUE | (`subject_id`, `term_id`) | **Confirmed.** Hard-blocks a second professor being assigned to the same subject in the same term — the database now refuses this, not just app logic. |

```sql
ALTER TABLE professor_subject_map
ADD CONSTRAINT one_professor_per_subject_per_term
UNIQUE (subject_id, term_id);
```

---

## 6. `enrollments`

Student ↔ subject for a term.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `student_id` | uuid FK → users.id | Must reference student |
| `subject_id` | uuid FK → subjects.id | |
| `term_id` | uuid FK → academic_terms.id | |
| `created_at` | timestamptz | |
| UNIQUE | (`student_id`, `subject_id`, `term_id`) | Prevents duplicate enrollment |

Old term rows remain for history — this is what makes backlog/repeat
students work with zero extra schema: they're just enrolled in a
subject outside their expected-semester term, nothing special.

---

## 7. `tickets`

`ticket_categories` stays removed.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `student_id` | uuid FK → users.id | Student who created thread |
| `professor_id` | uuid FK → users.id | Resolved server-side |
| `subject_id` | uuid FK → subjects.id NOT NULL | Course-based routing |
| `term_id` | uuid FK → academic_terms.id NOT NULL | **Added.** See below. |
| `title` | text NOT NULL | |
| `status` | enum | `pending`, `resolved`, `closed` |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |
| `closed_at` | timestamptz NULL | |

`professor_id` **and** `term_id` are both resolved backend-side from
`professor_subject_map` (subject + current term → the one professor
teaching it, and that term's id), never trusted from the frontend.

**Why `term_id` is needed here — gap fixed:** `professor_subject_map`
already allows a *different* professor to teach the same subject next
term. Without `term_id`, `/queries/:subjectId/pending` would show
every unresolved ticket for that subject code ever filed — including
ones addressed to whoever taught it last term. Every list query
(`pending`, `resolved`) now filters by `subject_id` **and** `term_id`,
scoped to the current term by default.

---

## 8. `ticket_messages`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `ticket_id` | uuid FK → tickets.id | |
| `sender_id` | uuid FK → users.id | Student or professor |
| `body` | text NOT NULL | |
| `attachment_url` | text NULL | Supabase Storage path |
| `created_at` | timestamptz | |

A follow-up message reuses the same `ticket_id` — never opens a new ticket.

---

## 9. `attendance_sessions`

One row per class actually held.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `subject_id` | uuid FK → subjects.id | |
| `term_id` | uuid FK → academic_terms.id | |
| `professor_id` | uuid FK → users.id | Who conducted/marked this session |
| `session_date` | date NOT NULL | |
| `session_label` | text NULL | Optional, e.g. `Practical`, `09:00 Lecture` — not required, but lets a "which class today" picker (see below) show something meaningful without a schema change later |
| `created_at` | timestamptz | Determines which session is "latest" |

No uniqueness constraint on `(subject_id, term_id, session_date)` —
multiple sessions of the same subject on the same day are just
multiple rows.

### The editable-latest-session rule (confirmed requirement)

**A professor can edit only the session with the max `created_at` for
a given `subject_id` + `term_id`.** Enforce this in the backend:
before allowing a write, check that the session being edited is
actually the one with `created_at = MAX(created_at)` for that
subject/term — never rely on the frontend hiding the edit control,
since that's trivially bypassable.

**Correction window — confirmed:** a session stays editable
indefinitely, for as long as it remains the latest one. It only
becomes locked the moment a newer session is created for that same
`subject_id` + `term_id` — not after any time-based cutoff. So the
backend check is purely relational (is this the max `created_at` row?),
with no clock/date logic involved at all.

**UI note:** the "which class today" picker on the marking screen
should be populated from existing `attendance_sessions` rows for that
`subject_id` + date (e.g. "Class 1 (created 9:04am)"), with a
"+ Mark new class" option that creates a fresh row — not a free-typed
number, so two markings on the same day can't collide or overwrite
each other by accident. Creating that new row is also the action that
locks the previous session out of editing, per the rule above.

---

## 10. `attendance_records`

One row per student per session.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `session_id` | uuid FK → attendance_sessions.id | |
| `student_id` | uuid FK → users.id | |
| `status` | enum | `present`, `absent` — no `leave` in V1 |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | Bumped when a professor edits the latest session |
| UNIQUE | (`session_id`, `student_id`) | |

**Marking workflow — FINAL V1.3 (checklist only, no typing, no upload):**
1. Pull all students enrolled (via `enrollments`) in `subject_id` for
   the current `term_id` — this roster is the source of truth
   regardless of expected semester, so backlog students are correctly
   included automatically.
2. Professor marks absentees via a checklist of that roster (tap to
   select) — no free text, no suffix-matching, no ambiguity case, and
   no CSV upload on this screen.
3. Insert one `attendance_sessions` row (or reuse the one selected via
   the "which class today" picker if editing), then one
   `attendance_records` row per enrolled student — selected students
   marked `absent`, everyone else `present`.

**CSV upload exists elsewhere, not here:** admin (not professor) can
bulk-import student accounts via CSV (`roll_no, full_name`) into
`users` — see the FINAL architecture doc §19. That's a separate
feature writing into a separate table; it has nothing to do with
attendance marking.

**Attendance %** = `count(status='present') / count(*)` across
`attendance_records` joined to `attendance_sessions`, filtered by
student + subject + term.

---

## 11. `resources`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `subject_id` | uuid FK → subjects.id | |
| `uploaded_by` | uuid FK → users.id | Professor |
| `title` | text NOT NULL | |
| `file_url` | text NOT NULL | Supabase Storage path |
| `created_at` | timestamptz | |

---

## 12. `announcements`

`department_id` stays removed. No `scope` field — global/institution-
wide announcements confirmed not needed.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `title` | text NOT NULL | |
| `body` | text NOT NULL | |
| `subject_id` | uuid FK → subjects.id NULL | Course-specific when present |
| `term_id` | uuid FK → academic_terms.id NOT NULL | **Added.** See below. |
| `posted_by` | uuid FK → users.id | Professor only — enforced at backend |
| `created_at` | timestamptz | |

`subject_id IS NULL` → department/general, derived via
`posted_by → users.department_id`. Admin does not post announcements.

**Why `term_id` is needed here — gap fixed:** this one matters more
than the ticket case, since a stale announcement doesn't just clutter
a list — it actively misleads ("class shifted to Room 204" from last
term reads as true today if nothing marks it as old). `term_id` is set
to the current term at posting time for **both** course and general
announcements — even general ones can go stale (e.g. an exam-schedule
notice), so it's not limited to course-specific posts. Default display
filters to the current term; nothing is deleted, so past announcements
stay queryable as history if that view is ever wanted.

---

## 13. `notifications`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → users.id | Recipient |
| `type` | text / enum | e.g. `ticket_reply`, `announcement` |
| `reference_id` | uuid NULL | Related ticket/announcement |
| `message` | text | Display message |
| `is_read` | boolean DEFAULT false | |
| `created_at` | timestamptz | |

Move `type` to a real enum once event types settle.

---

## 14. Relationship map

```text
departments
   |
   +---- users (admission_year for students)
   |
   +---- subjects
            |
            +---- professor_subject_map ---- users(professor)
            |
            +---- enrollments -------------- users(student)
            |
            +---- attendance_sessions
            |         |
            |         +---- attendance_records ---- users(student)
            |
            +---- resources
            |
            +---- announcements   (+ term_id — current-term scoped)
            |
            +---- tickets         (+ term_id — current-term scoped)
                     |
                     +---- ticket_messages

academic_terms is referenced directly by: enrollments,
professor_subject_map, attendance_sessions, tickets, announcements —
i.e. everything except resources, which is deliberately not
term-scoped.
```

---

## 15. Tables — final V1 set

- `users` (+ `admission_year`)
- `departments`
- `academic_terms` (+ single-current-term index)
- `subjects`
- `professor_subject_map` (one professor per subject per term)
- `enrollments`
- `tickets`
- `ticket_messages`
- `attendance_sessions`
- `attendance_records`
- `resources`
- `announcements`
- `notifications`

## 16. Removed (final)

- `ticket_categories`
- `attendance` single-table proposal — replaced by sessions/records
- `course_offerings` — dropped, no sections needed

## 17. Genuinely open — business calls, not schema blockers

Resolved by this pass (no longer open):
- ~~Academic-term semantics~~ → confirmed: Odd = Jul–Dec, Even =
  Jan–Jun, no overlap, admin-maintained switchover (§3).
- ~~`UNIQUE(subject_id, term_id)` on `professor_subject_map`~~ →
  confirmed and locked in (§5).

Still open:
1. **Backlog/repeat policy** — `enrollments` already supports it with
   zero schema changes. Only open question is whether the UI should
   visually flag such enrollments — not required to launch.

## 18. Implementation checklist

1. `UNIQUE(student_id, subject_id, term_id)` on `enrollments`. ✅
2. `tickets.subject_id` NOT NULL. ✅
3. `attendance_sessions` + `attendance_records`, not a flat table. ✅
4. `users.admission_year` added. ✅
5. Partial unique index for single current term. ✅
6. `announcements.department_id` stays removed; no `scope` field.
7. Enforce "professor-only" posting and all role rules at backend/RLS,
   not schema.
8. `UNIQUE(subject_id, term_id)` on `professor_subject_map`. ✅
9. `tickets.term_id` NOT NULL, resolved server-side alongside
   `professor_id`. ✅
10. `announcements.term_id` NOT NULL, resolved server-side at posting
    time — applies to both course and general announcements. ✅
11. **Course-list and detail-list queries filter to the current term
    everywhere** — not just implied by "select a course," explicitly
    scoped:
    - Student's `/attendance`, `/resources`, `/announcements`,
      `/queries` course lists → `enrollments` filtered to current
      `term_id`.
    - Professor's equivalents → `professor_subject_map` filtered to
      current `term_id`.
    - `/queries/:subjectId/pending` and `/resolved` → filtered by
      `subject_id` **and** current `term_id`.
    - `/announcements/:subjectId` and `/announcements/general` →
      filtered by current `term_id`.
12. Indexes: `enrollments` by (`student_id`, `term_id`);
    `professor_subject_map` by (`professor_id`, `term_id`); `tickets`
    by (`subject_id`, `term_id`, `status`) and (`professor_id`,
    `status`); `ticket_messages` by (`ticket_id`);
    `attendance_sessions` by (`subject_id`, `term_id`, `created_at`);
    `attendance_records` by (`session_id`); `announcements` by
    (`subject_id`, `term_id`); `notifications` by (`user_id`,
    `is_read`).

## 19. Row Level Security — 10 tables deny-all, 3 tables have real policies

**Decision:** Supabase Realtime is used for `tickets`,
`ticket_messages`, and `notifications` (live ticket threads, live
ticket lists, live inbox count — see §18.1 of the architecture doc).
Realtime evaluates RLS to decide what a subscribed client receives, so
these 3 tables need real *granting* policies, not the deny-all default.
**All other 10 tables stay RLS-enabled with zero policies** (deny-all
to anything but the backend's service role key) — this hasn't changed.

### `notifications` — single table, no join

```sql
create policy "users see own notifications"
on notifications for select
using (user_id = auth.uid());
```

### `tickets` — participant check, no join needed

```sql
create policy "participants see their tickets"
on tickets for select
using (student_id = auth.uid() or professor_id = auth.uid());
```

### `ticket_messages` — needs a join, hence the helper function

A message doesn't carry `student_id`/`professor_id` directly — has to
check who owns the *ticket* it belongs to. A policy subquerying another
RLS-protected table directly gets messy, so wrap the check in a
`security definer` function instead:

```sql
create function is_ticket_participant(t_id uuid) returns boolean
language sql security definer as $$
  select exists (
    select 1 from tickets
    where id = t_id and (student_id = auth.uid() or professor_id = auth.uid())
  );
$$;

create policy "participants see thread messages"
on ticket_messages for select
using (is_ticket_participant(ticket_id));
```

### Also required — adding tables to the Realtime publication

RLS policies alone don't make Realtime fire. Each of the 3 tables also
needs to be added to Supabase's realtime publication:

```sql
alter publication supabase_realtime add table tickets;
alter publication supabase_realtime add table ticket_messages;
alter publication supabase_realtime add table notifications;
```

(Or via the dashboard: **Database → Replication** → toggle these 3
tables on.) Easy to write correct policies and still see nothing
happen because this step got skipped — see the setup guide's debugging
checklist if that happens.

### What RLS does *not* handle here — still the app's job

- **Term-scoping.** These policies check ownership (`student_id = auth.uid()`),
  not "is this ticket in the current term." That's correct for
  security — you own a ticket regardless of term — but it means the
  **subscription filter on the frontend**, not RLS, is what has to
  match the current-term scoping decided in §7/§12. Don't expect RLS
  to do this filtering for you.
- **INSERT/UPDATE policies.** The policies above are `for select`
  only — reads for Realtime. Actual writes still go exclusively
  through the backend (service role key, bypasses RLS), so no
  `insert`/`update` policies are needed on these 3 tables either.
