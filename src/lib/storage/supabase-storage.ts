import { createClient } from "@/lib/supabase/server";

export const STORAGE_BUCKETS = {
  groupMaterials: "materials",
  personalMaterials: "personal-materials",
} as const;

export function getMaterialBucket(personal = false) {
  return personal ? STORAGE_BUCKETS.personalMaterials : STORAGE_BUCKETS.groupMaterials;
}

export async function createSignedFileUrl(
  storageKey: string,
  personal = false,
  expiresInSeconds = 300,
) {
  const supabase = await createClient();
  const bucket = getMaterialBucket(personal);
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storageKey, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Unable to create signed file URL");
  }
  return data.signedUrl;
}

export async function removeStoredFile(storageKey: string, personal = false) {
  const supabase = await createClient();
  const bucket = getMaterialBucket(personal);
  const { error } = await supabase.storage.from(bucket).remove([storageKey]);

  if (error) throw new Error(error.message);
}
