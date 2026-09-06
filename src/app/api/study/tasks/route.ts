import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { personalTasks } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { personalTaskSchema } from "@/lib/validation/study";

export async function GET() {
  const user = await requireUser();
  const tasks = await db.select().from(personalTasks).where(eq(personalTasks.userId, user.id)).orderBy(desc(personalTasks.createdAt));
  return Response.json({ tasks });
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = personalTaskSchema.parse(await request.json());
    const [task] = await db.insert(personalTasks).values({ userId: user.id, title: input.title, description: input.description ?? null, dueAt: input.dueAt ?? null, completed: input.completed ?? false }).returning();
    return Response.json({ success: true, task });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid task" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const input = personalTaskSchema.parse(body);
    const taskId = String(body.id ?? "");
    if (!taskId) return Response.json({ error: "id is required" }, { status: 400 });
    const [task] = await db.update(personalTasks).set({ title: input.title, description: input.description ?? null, dueAt: input.dueAt ?? null, completed: input.completed ?? false, updatedAt: new Date() }).where(and(eq(personalTasks.id, taskId), eq(personalTasks.userId, user.id))).returning();
    return task ? Response.json({ success: true, task }) : Response.json({ error: "Task not found" }, { status: 404 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid task" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const user = await requireUser();
  const taskId = String((await request.json()).id ?? "");
  if (!taskId) return Response.json({ error: "id is required" }, { status: 400 });
  const [task] = await db.delete(personalTasks).where(and(eq(personalTasks.id, taskId), eq(personalTasks.userId, user.id))).returning();
  return task ? Response.json({ success: true }) : Response.json({ error: "Task not found" }, { status: 404 });
}
