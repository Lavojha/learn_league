import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { personalMaterials } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { isSupportedPdf } from "@/lib/validation/materials";
import { randomUUID } from "node:crypto";

export async function GET() {
  const user = await requireUser();
  const materials = await db.select().from(personalMaterials).where(eq(personalMaterials.userId, user.id)).orderBy(desc(personalMaterials.createdAt));
  return Response.json({ materials });
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const form = await request.formData();
    const file = form.get("file");
    const title = String(form.get("title") ?? "").trim();
    const description = String(form.get("description") ?? "").trim() || null;
    if (!(file instanceof File) || !title) return Response.json({ error: "title and PDF file are required" }, { status: 400 });
    if (title.length > 200) return Response.json({ error: "Title must be 200 characters or fewer" }, { status: 400 });
    if (description && description.length > 5000) return Response.json({ error: "Description must be 5000 characters or fewer" }, { status: 400 });
    if (!isSupportedPdf(file.type, file.size)) return Response.json({ error: "Only PDF files up to 25 MB are supported" }, { status: 400 });
    const storageKey = `users/${user.id}/${randomUUID()}.pdf`;
    const supabase = await createClient();
    const { error } = await supabase.storage.from("personal-materials").upload(storageKey, file, { contentType: "application/pdf", upsert: false });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    try {
      const [material] = await db.insert(personalMaterials).values({ userId: user.id, title, description, storageKey, originalFileName: file.name.slice(0, 255), mimeType: file.type, fileSizeBytes: file.size }).returning();
      return Response.json({ success: true, material });
    } catch (databaseError) {
      await supabase.storage.from("personal-materials").remove([storageKey]).catch((cleanupError) => console.error("Personal upload cleanup failed:", cleanupError));
      throw databaseError;
    }
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 400 });
  }
}
