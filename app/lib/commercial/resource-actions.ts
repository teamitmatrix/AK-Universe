"use server";

import { createClient } from "@/lib/supabase/server";
import { BUCKET } from "@/lib/admin/documents";
import { isLibraryPath } from "./resources";
import { getCommercial } from "./session";

/**
 * "Télécharger" in the resource library: a signed URL valid 2 minutes, created with the rep's own session — the
 * storage policy re-checks that the caller is active staff, and only files of the shared library (library/…) are
 * accepted, never a project folder or any other path.
 */
export async function getResourceUrl(path: string): Promise<{ success: true; url: string } | { success: false; error: "forbidden" | "invalid" | "notFound" }> {
  const me = await getCommercial();
  if (!me) return { success: false, error: "forbidden" };
  if (!isLibraryPath(path)) return { success: false, error: "invalid" };
  const supabase = await createClient();
  const name = path.split("/").pop()!;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 120, { download: name });
  if (error || !data?.signedUrl) return { success: false, error: "notFound" };
  return { success: true, url: data.signedUrl };
}
