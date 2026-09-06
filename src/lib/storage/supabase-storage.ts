import { createClient } from "@/lib/supabase/server";

const MATERIAL_BUCKET = "materials";
const PERSONAL_MATERIAL_BUCKET = "personal-materials";

export function getMaterialBucket(personal = false) {
  return personal ? PERSONAL_MATERIAL_BUCKET : MATERIAL_BUCKET;
}

export async function createSignedFileUrl(storageKey: string, personal = false, expiresInSeconds = 300) {
  const supabase = await createClient();
  const bucket = getMaterialBucket(personal);
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storageKey, expiresInSeconds);

  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function removeStoredFile(storageKey: string, personal = false) {
  const supabase = await createClient();
  const bucket = getMaterialBucket(personal);
  const { error } = await supabase.storage.from(bucket).remove([storageKey]);

  if (error) throw new Error(error.message);
}
