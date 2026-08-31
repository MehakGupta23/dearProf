import { db } from '../../db';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { inviteUser, deleteAuthUser } from '../../services/auth-admin.service';
import { parse } from 'csv-parse/sync';

export async function getAllUsers() {
  return db.select().from(users);
}

export async function getUserById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
}

type CreateUserInput = {
  email: string;
  fullName: string;
  role: 'student' | 'professor' | 'admin';
  departmentId?: string;
  rollNo?: string;
  facultyId?: string;
  admissionYear?: number;
};

type BulkImportResult = {
  success: { row: number; rollNo: string; email: string }[];
  failed: { row: number; rollNo?: string; error: string }[];
};


export async function createUser(input: CreateUserInput) {
  const authUser = await inviteUser(input.email);

  try {
    const [created] = await db
      .insert(users)
      .values({
        id: authUser.id,
        email: input.email,
        fullName: input.fullName,
        role: input.role,
        departmentId: input.departmentId,
        rollNo: input.rollNo,
        facultyId: input.facultyId,
        admissionYear: input.admissionYear,
      })
      .returning();
    return created;
  } catch (dbError) {
    await deleteAuthUser(authUser.id);
    throw dbError;
  }
}

export async function bulkCreateStudents(
  csvBuffer: Buffer,
  departmentId: string,
  admissionYear: number
): Promise<BulkImportResult> {
  const rows: { roll_no: string; full_name: string; email: string }[] = parse(csvBuffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const result: BulkImportResult = { success: [], failed: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // +2: row 1 is the header, humans count from 1 not 0

    if (!row.roll_no || !row.full_name || !row.email) {
      result.failed.push({ row: rowNumber, rollNo: row.roll_no, error: 'Missing roll_no, full_name, or email' });
      continue;
    }

    try {
      await createUser({
        email: row.email,
        fullName: row.full_name,
        role: 'student',
        rollNo: row.roll_no,
        departmentId,
        admissionYear,
      });
      result.success.push({ row: rowNumber, rollNo: row.roll_no, email: row.email });
    } catch (err: any) {
      const message = err?.cause?.code === '23505'
        ? 'A user with this roll number or email already exists'
        : err?.message || 'Unknown error';
      result.failed.push({ row: rowNumber, rollNo: row.roll_no, error: message });
    }
  }

  return result;
}