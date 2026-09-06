import { requireUser } from "@/lib/auth/require-user";
import { hasGroupPermission } from "@/lib/groups/permissions";
import { createClient } from "@/lib/supabase/server";
import { isSupportedPdf } from "@/lib/validation/materials";
import { z } from "zod";
import { randomUUID } from "node:crypto";

const groupIdSchema = z.string().uuid();

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const form = await request.formData();
    const groupId = groupIdSchema.parse(String(form.get("groupId") ?? "").trim());
    const file = form.get("file");
    if (!(await hasGroupPermission(user.id, groupId, "manageMaterials"))) return Response.json({ error: "Permission denied" }, { status: 403 });
    if (!(file instanceof File)) return Response.json({ error: "PDF file is required" }, { status: 400 });
    if (!isSupportedPdf(file.type, file.size)) return Response.json({ error: "Only PDF files up to 25 MB are supported" }, { status: 400 });

    const storageKey = `groups/${groupId}/${randomUUID()}.pdf`;
    const supabase = await createClient();
    const { error } = await supabase.storage.from("materials").upload(storageKey, file, { contentType: "application/pdf", upsert: false });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ success: true, storageKey, originalFileName: file.name, mimeType: file.type, fileSizeBytes: file.size });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 400 });
  }
}
