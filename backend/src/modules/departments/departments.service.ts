import { db } from '../../db';
import { departments } from '../../db/schema';
import { eq } from 'drizzle-orm';

export async function getAllDepartments() {
  return db.select().from(departments);
}

export async function getDepartmentById(id: string) {
  const [department] = await db.select().from(departments).where(eq(departments.id, id));
  return department;
}

export async function createDepartment(data: { name: string; code?: string }) {
  const [created] = await db.insert(departments).values(data).returning();
  return created;
}