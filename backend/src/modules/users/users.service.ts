import { db } from '../../db';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { inviteUser, deleteAuthUser } from '../../services/auth-admin.service';

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